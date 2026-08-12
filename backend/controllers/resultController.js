const Result = require('../models/Result');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const https = require('https');
const { parseResultFile } = require('../utils/parser');
const { generateResultPDF } = require('../utils/pdfGenerator');

function fetchChartImage(chartConfig, width = 600, height = 340) {
    return new Promise((resolve) => {
        try {
            const url = `https://quickchart.io/chart?w=${width}&h=${height}&bkg=white&f=png&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
            const req = https.get(url, (res) => {
                if (res.statusCode !== 200) return resolve(null);
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });
            req.on('error', () => resolve(null));
            req.setTimeout(4000, () => {
                req.destroy();
                resolve(null);
            });
        } catch (err) {
            resolve(null);
        }
    });
}

const uploadResult = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const parsed = await parseResultFile(req.file.buffer, req.file.originalname, req.file.mimetype);

        const result = new Result({
            filename: req.file.originalname,
            collegeName: parsed.collegeName || "KLE Society's KLE College of Engineering and Technology, Chikodi",
            subjects: parsed.subjects,
            toppers: parsed.toppers,
            overallStats: parsed.overallStats
        });

        const savedResult = await result.save();
        
        await Student.insertMany(parsed.studentDocs.map(s => ({ ...s, resultId: savedResult._id })));

        res.status(201).json(savedResult);
    } catch (err) {
        console.error('File Processing Error:', err);
        res.status(500).json({ error: err.message || 'Server error processing result file' });
    }
};

const getResults = async (req, res) => {
    try {
        const results = await Result.find().sort({ uploadDate: -1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

const getResultById = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id);
        const students = await Student.find({ resultId: req.params.id }).sort({ rank: 1 });
        res.json({ result, students });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

const exportExcel = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id);
        if (!result) return res.status(404).json({ error: 'Result not found' });
        const students = await Student.find({ resultId: req.params.id }).sort({ rank: 1 });

        const workbook = new ExcelJS.Workbook();
        const subjects = result.subjects || [];
        const stats = result.overallStats || { totalStudents: 0, passCount: 0, failCount: 0, passPercentage: 0 };

        // -------------------------------------------------------------
        // SHEET 1: Student Result Sheet (Pic 5 + Pic 2 Layout)
        // -------------------------------------------------------------
        const studentSheet = workbook.addWorksheet('Student Result Sheet');

        // Header Row 1 & Row 2
        const header1 = ['Sl. No.', 'Std. Name', 'USN'];
        const header2 = ['', '', ''];

        subjects.forEach(s => {
            header1.push(s.name, '', '', '');
            header2.push('IN', 'EX', 'T', 'R');
        });

        header1.push('Total', 'Percentage', 'No of Subjects Failed', 'Remark');
        header2.push('', '', '', '');

        studentSheet.addRow(header1);
        studentSheet.addRow(header2);

        // Merge Subject Headers in Row 1
        let colIdx = 4;
        subjects.forEach(() => {
            studentSheet.mergeCells(1, colIdx, 1, colIdx + 3);
            colIdx += 4;
        });

        // Merge Non-subject headers across Row 1 & Row 2
        studentSheet.mergeCells(1, 1, 2, 1); // Sl. No.
        studentSheet.mergeCells(1, 2, 2, 2); // Std. Name
        studentSheet.mergeCells(1, 3, 2, 3); // USN

        const totalCol = 4 + subjects.length * 4;
        studentSheet.mergeCells(1, totalCol, 2, totalCol);
        studentSheet.mergeCells(1, totalCol + 1, 2, totalCol + 1);
        studentSheet.mergeCells(1, totalCol + 2, 2, totalCol + 2);
        studentSheet.mergeCells(1, totalCol + 3, 2, totalCol + 3);

        // Header Styling
        [1, 2].forEach(rIdx => {
            const row = studentSheet.getRow(rIdx);
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            });
        });

        // Add Student Data Rows (Pic 5 format)
        students.forEach((s, sIdx) => {
            const rowData = [sIdx + 1, s.name, s.usn];
            const detailsMap = s.subjectDetails || {};

            subjects.forEach(sub => {
                const det = detailsMap[sub.name] || {
                    in: Math.min(s.marks[sub.name] || 0, 40),
                    ex: Math.max(0, (s.marks[sub.name] || 0) - 40),
                    total: s.marks[sub.name] || 0,
                    result: (s.marks[sub.name] || 0) >= 35 ? 'P' : 'F'
                };
                rowData.push(det.in, det.ex, det.total, det.result);
            });

            rowData.push(s.totalMarks, `${s.percentage}%`, s.failedSubjectsCount || 0, s.remark || (s.isPass ? 'PASS' : 'FAIL'));

            const addedRow = studentSheet.addRow(rowData);
            addedRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // Cell Highlight Styling for Fails (Light Red Background)
            let currC = 4;
            subjects.forEach(sub => {
                const resCell = addedRow.getCell(currC + 3);
                const markCell = addedRow.getCell(currC + 2);
                if (resCell.value === 'F' || (typeof markCell.value === 'number' && markCell.value < 35)) {
                    [currC, currC + 1, currC + 2, currC + 3].forEach(cNum => {
                        addedRow.getCell(cNum).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                        addedRow.getCell(cNum).font = { color: { argb: 'FF991B1B' }, bold: true };
                    });
                }
                currC += 4;
            });

            // Overall Remark Highlight (Fail: light red, Pass: default black)
            const remarkCell = addedRow.getCell(totalCol + 3);
            if (remarkCell.value === 'FAIL') {
                remarkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                remarkCell.font = { color: { argb: 'FF991B1B' }, bold: true };
            } else {
                remarkCell.font = { color: { argb: 'FF000000' }, bold: false };
            }
        });

        // Blank Divider Row
        studentSheet.addRow([]);

        // -------------------------------------------------------------
        // PIC 2: Subject Summary Rows Below Student Table
        // -------------------------------------------------------------
        const pic2Metrics = [
            { key: 'appearedCount', label: 'Appeared' },
            { key: 'fcdCount', label: 'FCD' },
            { key: 'fcCount', label: 'FC' },
            { key: 'scCount', label: 'SC' },
            { key: 'passClassCount', label: 'pass' },
            { key: 'failCount', label: 'Fail' },
            { key: 'abCount', label: 'AB' },
            { key: 'withHeldCount', label: 'With Held' },
            { key: 'passPercentage', label: 'Percentage' },
            { key: 'staffName', label: 'Staff Name' },
            { key: 'staffSig', label: 'Staff Signature' }
        ];

        const overallBoxValues = {
            'FCD': stats.fcdCount || 0,
            'FC': stats.fcCount || 0,
            'SC': stats.scCount || 0,
            'pass': stats.passClassCount || 0,
            'Fail': stats.failCount || 0,
            'Percentage': `${(stats.passPercentage || 0).toFixed(2)}%`
        };

        pic2Metrics.forEach((m, mIdx) => {
            const rowData = ['', '', m.label];
            subjects.forEach(sub => {
                let val = '';
                if (m.key === 'staffName' || m.key === 'staffSig') {
                    val = ''; // Left blank for manual entry as requested
                } else if (m.key === 'passPercentage') {
                    val = `${(sub.passPercentage || 0).toFixed(2)}%`;
                } else {
                    val = sub[m.key] || 0;
                }
                rowData.push(val, '', '', '');
            });

            // Right Side Overall Summary Box
            let boxKey = Object.keys(overallBoxValues)[mIdx];
            if (boxKey) {
                rowData.push('', boxKey, overallBoxValues[boxKey], '');
            }

            const row = studentSheet.addRow(rowData);

            // Merge per-subject 4 columns for Pic 2 metrics
            let cIdx = 4;
            subjects.forEach(() => {
                studentSheet.mergeCells(row.number, cIdx, row.number, cIdx + 3);
                cIdx += 4;
            });

            row.font = { bold: true };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // -------------------------------------------------------------
        // APPLY SECTION & COLUMN BORDERS FOR SHEET 1
        // -------------------------------------------------------------
        const totalSheetCols = totalCol + 3;
        studentSheet.eachRow((row) => {
            for (let colNumber = 1; colNumber <= totalSheetCols; colNumber++) {
                const cell = row.getCell(colNumber);

                // Default thin border for all cells
                const borderObj = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };

                // Section Boundary Borders (Medium Right Border)
                // 1. After USN Column (col 3)
                // 2. After each Subject block (col 7, 11, 15, 19...)
                // 3. After Total, Percentage, No of Failures, Remark columns
                const isUsnBoundary = colNumber === 3;
                const isSubjectBoundary = (colNumber - 3) % 4 === 0 && colNumber >= 7 && colNumber < totalCol;
                const isSummaryBoundary = colNumber >= totalCol && colNumber <= totalCol + 3;

                if (isUsnBoundary || isSubjectBoundary || isSummaryBoundary) {
                    borderObj.right = { style: 'medium', color: { argb: 'FF1E293B' } };
                }

                cell.border = borderObj;
            }
        });

        // Adjust Column Widths
        studentSheet.getColumn(1).width = 8;
        studentSheet.getColumn(2).width = 25;
        studentSheet.getColumn(3).width = 16;

        // -------------------------------------------------------------
        // SHEET 2: Subject Summary (Pic 4 Layout)
        // -------------------------------------------------------------
        const subjectSheet = workbook.addWorksheet('Subject Summary');
        subjectSheet.columns = [
            { header: 'Subject With Code', key: 'name', width: 25 },
            { header: 'Staff Name', key: 'staffName', width: 22 },
            { header: 'FCD', key: 'fcdCount', width: 10 },
            { header: 'FC', key: 'fcCount', width: 10 },
            { header: 'SC', key: 'scCount', width: 10 },
            { header: 'Pass', key: 'passClassCount', width: 10 },
            { header: 'AB', key: 'abCount', width: 10 },
            { header: 'With Held', key: 'withHeldCount', width: 12 },
            { header: 'Fail', key: 'failCount', width: 10 },
            { header: 'Total Pass', key: 'totalPassCount', width: 12 },
            { header: '%', key: 'passPercentage', width: 12 },
            { header: 'TotalStudent Appeared', key: 'appearedCount', width: 22 }
        ];

        // Format header
        const subHeaderRow = subjectSheet.getRow(1);
        subHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        subHeaderRow.eachCell(cell => cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } });

        subjects.forEach(sub => {
            subjectSheet.addRow({
                name: sub.name,
                staffName: '', // Blank for manual entry
                fcdCount: sub.fcdCount || 0,
                fcCount: sub.fcCount || 0,
                scCount: sub.scCount || 0,
                passClassCount: sub.passClassCount || 0,
                abCount: sub.abCount || 0,
                withHeldCount: sub.withHeldCount || 0,
                failCount: sub.failCount || 0,
                totalPassCount: sub.totalPassCount || 0,
                passPercentage: (sub.passPercentage || 0).toFixed(2),
                appearedCount: sub.appearedCount || stats.totalStudents || 0
            });
        });

        // -------------------------------------------------------------
        // SHEET 3: Overall Analysis & Charts (Pic 1 Summary Table & Bar Charts)
        // -------------------------------------------------------------
        const analysisSheet = workbook.addWorksheet('Overall Analysis & Charts');

        // Pic 1 Summary Table
        analysisSheet.addRow(['Appeared', 'FCD', 'FC', 'SC', 'Total Fail', 'Total Pass']);
        analysisSheet.addRow([
            stats.totalStudents || 0,
            stats.fcdCount || 0,
            stats.fcCount || 0,
            stats.scCount || 0,
            stats.failCount || 0,
            stats.passCount || 0
        ]);
        const tot = stats.totalStudents || 1;
        analysisSheet.addRow([
            '',
            ((stats.fcdCount / tot) * 100).toFixed(2),
            ((stats.fcCount / tot) * 100).toFixed(2),
            ((stats.scCount / tot) * 100).toFixed(2),
            ((stats.failCount / tot) * 100).toFixed(2),
            ((stats.passPercentage || 0)).toFixed(2)
        ]);

        const aHeaderRow = analysisSheet.getRow(1);
        aHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        aHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } });

        // Embed QuickChart Images into Sheet 3 if available
        try {
            const chart1Config = {
                type: 'bar',
                data: {
                    labels: ['Appeared', 'FCD', 'FC', 'SC', 'Total Fail', 'Total Pass'],
                    datasets: [
                        { label: 'Count', backgroundColor: '#3B82F6', data: [stats.totalStudents || 0, stats.fcdCount || 0, stats.fcCount || 0, stats.scCount || 0, stats.failCount || 0, stats.passCount || 0] },
                        { label: 'Percentage (%)', backgroundColor: '#B91C1C', data: [null, parseFloat(((stats.fcdCount / tot) * 100).toFixed(2)), parseFloat(((stats.fcCount / tot) * 100).toFixed(2)), parseFloat(((stats.scCount / tot) * 100).toFixed(2)), parseFloat(((stats.failCount / tot) * 100).toFixed(2)), parseFloat((stats.passPercentage || 0).toFixed(2))] }
                    ]
                },
                options: { plugins: { title: { display: true, text: 'Pic 1: Overall Class Performance' } } }
            };

            const chart1Buffer = await fetchChartImage(chart1Config, 650, 360);
            if (chart1Buffer) {
                const imgId1 = workbook.addImage({ buffer: chart1Buffer, extension: 'png' });
                analysisSheet.addImage(imgId1, 'A6:G20');
            }

            const chart3Config = {
                type: 'bar',
                data: {
                    labels: subjects.map(s => s.name.split(' ')[0]),
                    datasets: [
                        { label: 'FCD', backgroundColor: '#2563EB', data: subjects.map(s => s.fcdCount || 0) },
                        { label: 'FC', backgroundColor: '#DC2626', data: subjects.map(s => s.fcCount || 0) },
                        { label: 'SC', backgroundColor: '#16A34A', data: subjects.map(s => s.scCount || 0) },
                        { label: 'Pass', backgroundColor: '#8B5CF6', data: subjects.map(s => s.passClassCount || 0) },
                        { label: 'AB', backgroundColor: '#06B6D4', data: subjects.map(s => s.abCount || 0) },
                        { label: 'With Held', backgroundColor: '#F97316', data: subjects.map(s => s.withHeldCount || 0) },
                        { label: 'Fail', backgroundColor: '#93C5FD', data: subjects.map(s => s.failCount || 0) },
                        { label: 'Total Pass', backgroundColor: '#F43F5E', data: subjects.map(s => s.totalPassCount || 0) },
                        { label: '%', backgroundColor: '#84CC16', data: subjects.map(s => parseFloat((s.passPercentage || 0).toFixed(2))) }
                    ]
                },
                options: { plugins: { title: { display: true, text: 'Pic 3: Subject-Wise Performance Breakdown' } } }
            };

            const chart3Buffer = await fetchChartImage(chart3Config, 750, 380);
            if (chart3Buffer) {
                const imgId3 = workbook.addImage({ buffer: chart3Buffer, extension: 'png' });
                analysisSheet.addImage(imgId3, 'A22:J38');
            }
        } catch (chartErr) {
            console.error('Excel chart embedding skipped:', chartErr);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=result_${req.params.id}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Export Excel Error:', err);
        res.status(500).json({ error: 'Server error generating Excel report' });
    }
};

const exportPDF = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Result record not found' });
        }
        const students = await Student.find({ resultId: req.params.id }).sort({ rank: 1 });

        return generateResultPDF(result, students, res);
    } catch (err) {
        console.error('PDF Generation Error:', err);
        res.status(500).json({ error: 'Server error generating PDF report' });
    }
};

const deleteResult = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Result.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ error: 'Result record not found' });
        }
        await Student.deleteMany({ resultId: id });
        res.json({ message: 'Result file and all candidate records deleted permanently' });
    } catch (err) {
        console.error('Delete Result Error:', err);
        res.status(500).json({ error: 'Server error deleting result file' });
    }
};

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === 'basavaraj@kle.com' && password === 'Bk2004@kle') {
            return res.json({
                success: true,
                message: 'Admin authenticated successfully',
                admin: {
                    name: 'Basavaraj Kagale',
                    email: 'basavaraj@kle.com',
                    role: 'admin'
                }
            });
        }
        return res.status(401).json({ error: 'Invalid admin email or password' });
    } catch (err) {
        res.status(500).json({ error: 'Server error during authentication' });
    }
};

module.exports = {
    uploadResult,
    getResults,
    getResultById,
    exportExcel,
    exportPDF,
    deleteResult,
    adminLogin
};
