const mongoose = require('mongoose');
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

        const io = req.app.get('io');
        if (io) {
            io.emit('result_uploaded', savedResult);
        }

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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid result ID format' });
        }
        const result = await Result.findById(req.params.id);
        if (!result) return res.status(404).json({ error: 'Result not found' });
        const students = await Student.find({ resultId: req.params.id });
        students.sort((a, b) => (a.usn || '').localeCompare(b.usn || '', undefined, { numeric: true, sensitivity: 'base' }));
        res.json({ result, students });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

const exportExcel = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id);
        if (!result) return res.status(404).json({ error: 'Result not found' });
        const students = await Student.find({ resultId: req.params.id });
        students.sort((a, b) => (a.usn || '').localeCompare(b.usn || '', undefined, { numeric: true, sensitivity: 'base' }));

        const workbook = new ExcelJS.Workbook();
        const subjects = result.subjects || [];
        const stats = result.overallStats || { totalStudents: 0, passCount: 0, failCount: 0, passPercentage: 0 };
        const maxTotalMarks = (subjects.length || 1) * 100;

        // -------------------------------------------------------------
        // SINGLE UNIFIED WORKSHEET: Student Result Sheet & All Analytics
        // -------------------------------------------------------------
        const sheet = workbook.addWorksheet('Result Analysis & Directory');

        // SECTION 1: Banner Header
        const bannerRow = sheet.addRow([result.collegeName || "KLE Society's KLE College of Engineering and Technology, Chikodi"]);
        bannerRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        bannerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        bannerRow.height = 30;

        const subBannerRow = sheet.addRow(['Candidate Results & Comprehensive Performance Directory Report']);
        subBannerRow.font = { bold: true, size: 11, color: { argb: 'FF93C5FD' } };
        subBannerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        subBannerRow.height = 20;

        const totalCol = 4 + subjects.length * 4;
        const totalSheetCols = totalCol + 3;

        sheet.mergeCells(1, 1, 1, totalSheetCols);
        sheet.mergeCells(2, 1, 2, totalSheetCols);

        sheet.getRow(1).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        sheet.getRow(2).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

        sheet.addRow([]); // Blank line

        // -------------------------------------------------------------
        // SECTION 2: CANDIDATE RESULTS DIRECTORY (PIC 2 LAYOUT)
        // -------------------------------------------------------------
        const header1 = ['Sl. No.', 'Std. Name', 'USN'];
        const header2 = ['', '', ''];

        subjects.forEach(s => {
            header1.push(s.name, '', '', '');
            header2.push('IN', 'EX', 'T', 'R');
        });

        header1.push('Total', 'Percentage', 'No of Subjects Failed', 'Remark');
        header2.push('', '', '', '');

        const r1Idx = sheet.lastRow.number + 1;
        sheet.addRow(header1);
        const r2Idx = sheet.lastRow.number + 1;
        sheet.addRow(header2);

        // Merge Subject Headers in Row 1
        let colIdx = 4;
        subjects.forEach(() => {
            sheet.mergeCells(r1Idx, colIdx, r1Idx, colIdx + 3);
            colIdx += 4;
        });

        // Merge Non-subject headers across Row 1 & Row 2
        sheet.mergeCells(r1Idx, 1, r2Idx, 1); // Sl. No.
        sheet.mergeCells(r1Idx, 2, r2Idx, 2); // Std. Name
        sheet.mergeCells(r1Idx, 3, r2Idx, 3); // USN

        sheet.mergeCells(r1Idx, totalCol, r2Idx, totalCol);
        sheet.mergeCells(r1Idx, totalCol + 1, r2Idx, totalCol + 1);
        sheet.mergeCells(r1Idx, totalCol + 2, r2Idx, totalCol + 2);
        sheet.mergeCells(r1Idx, totalCol + 3, r2Idx, totalCol + 3);

        // Header Styling
        [r1Idx, r2Idx].forEach(rowIdx => {
            const row = sheet.getRow(rowIdx);
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            });
        });

        // Student Data Rows
        students.forEach((s, sIdx) => {
            const rowData = [sIdx + 1, s.name, s.usn];
            const detailsMap = s.subjectDetails || {};

            subjects.forEach(sub => {
                const det = detailsMap[sub.name] || {};
                const totalVal = s.marks[sub.name] !== undefined ? s.marks[sub.name] : (det.total || 0);
                const inVal = det.in !== undefined ? det.in : '';
                const exVal = det.ex !== undefined ? det.ex : '';
                let resVal = (det.result || '').toUpperCase();
                if (!resVal) {
                    resVal = totalVal >= 35 ? 'P' : 'F';
                } else if (resVal === 'PASS') resVal = 'P';
                else if (resVal === 'FAIL') resVal = 'F';

                rowData.push(inVal, exVal, totalVal, resVal);
            });

            rowData.push(s.totalMarks, `${s.percentage}%`, s.failedSubjectsCount || 0, s.remark || (s.isPass ? 'PASS' : 'FAIL'));

            const addedRow = sheet.addRow(rowData);
            addedRow.alignment = { vertical: 'middle', horizontal: 'center' };

            // Highlight failing sub-cells
            let currC = 4;
            subjects.forEach(sub => {
                const det = detailsMap[sub.name] || {};
                const totalVal = s.marks[sub.name] !== undefined ? s.marks[sub.name] : (det.total || 0);
                const inVal = det.in !== undefined ? det.in : 0;
                const exVal = det.ex !== undefined ? det.ex : 0;
                let resVal = (det.result || '').toUpperCase();
                if (!resVal) {
                    resVal = totalVal >= 35 ? 'P' : 'F';
                }

                const isResFail = resVal === 'F' || resVal === 'FAIL' || resVal === 'AB';
                const isTotalFail = totalVal < 35 || isResFail;
                const isInFail = inVal > 0 && inVal < 18 && isTotalFail;
                const isExFail = exVal > 0 && exVal < 18 && isTotalFail;

                const lightRedFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                const darkRedFont = { color: { argb: 'FF991B1B' }, bold: true };

                if (isInFail) {
                    addedRow.getCell(currC).fill = lightRedFill;
                    addedRow.getCell(currC).font = darkRedFont;
                }
                if (isExFail) {
                    addedRow.getCell(currC + 1).fill = lightRedFill;
                    addedRow.getCell(currC + 1).font = darkRedFont;
                }
                if (isTotalFail) {
                    addedRow.getCell(currC + 2).fill = lightRedFill;
                    addedRow.getCell(currC + 2).font = darkRedFont;
                }
                if (isResFail || isTotalFail) {
                    addedRow.getCell(currC + 3).fill = lightRedFill;
                    addedRow.getCell(currC + 3).font = darkRedFont;
                }

                currC += 4;
            });

            // Overall Remark Highlight
            const remarkCell = addedRow.getCell(totalCol + 3);
            if (s.remark === 'FAIL' || !s.isPass || (s.failedSubjectsCount && s.failedSubjectsCount > 0)) {
                remarkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                remarkCell.font = { color: { argb: 'FF991B1B' }, bold: true };
            } else {
                remarkCell.font = { color: { argb: 'FF15803D' }, bold: true };
            }

            // No of Subjects Failed Highlight
            const failCountCell = addedRow.getCell(totalCol + 2);
            if (s.failedSubjectsCount && s.failedSubjectsCount > 0) {
                failCountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                failCountCell.font = { color: { argb: 'FF991B1B' }, bold: true };
            }
        });

        sheet.addRow([]); // Blank line

        // -------------------------------------------------------------
        // SECTION 3: SUBJECT STATISTICS SUMMARY MATRIX
        // -------------------------------------------------------------
        const matrixTitleRow = sheet.addRow(['Subject Statistics Summary Matrix']);
        matrixTitleRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        matrixTitleRow.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.mergeCells(matrixTitleRow.number, 1, matrixTitleRow.number, totalSheetCols);
        sheet.getRow(matrixTitleRow.number).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

        const pic2Metrics = [
            { key: 'appearedCount', label: 'Appeared' },
            { key: 'fcdCount', label: 'FCD' },
            { key: 'fcCount', label: 'FC' },
            { key: 'scCount', label: 'SC' },
            { key: 'passClassCount', label: 'pass' },
            { key: 'failCount', label: 'Fail' },
            { key: 'abCount', label: 'AB' },
            { key: 'withHeldCount', label: 'With Held' },
            { key: 'passPercentage', label: 'Percentage' }
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
                if (m.key === 'passPercentage') {
                    val = `${(sub.passPercentage || 0).toFixed(2)}%`;
                } else {
                    val = sub[m.key] || 0;
                }
                rowData.push(val, '', '', '');
            });

            let boxKey = Object.keys(overallBoxValues)[mIdx];
            if (boxKey) {
                rowData.push('', boxKey, overallBoxValues[boxKey], '');
            }

            const row = sheet.addRow(rowData);

            let cIdx = 4;
            subjects.forEach(() => {
                sheet.mergeCells(row.number, cIdx, row.number, cIdx + 3);
                row.getCell(cIdx).font = { bold: false }; // Non-bold numbers inside matrix
                cIdx += 4;
            });

            row.getCell(3).font = { bold: true }; // Metric label bold
            row.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        sheet.addRow([]); sheet.addRow([]); // Blank lines

        // -------------------------------------------------------------
        // SECTION 4: ACADEMIC TOPPERS (HALL OF FAME)
        // -------------------------------------------------------------
        const toppersTitleRow = sheet.addRow(['2. Academic Toppers (Hall of Fame)']);
        toppersTitleRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        toppersTitleRow.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.mergeCells(toppersTitleRow.number, 1, toppersTitleRow.number, 8);
        sheet.getRow(toppersTitleRow.number).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

        const topperHeaderRow = sheet.addRow(['Rank', 'USN', 'Student Name', '', '', 'Marks Scored', 'Percentage', 'Class / Result']);
        topperHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        topperHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.mergeCells(topperHeaderRow.number, 3, topperHeaderRow.number, 5);
        topperHeaderRow.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } });

        const sortedByMarks = [...students].sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0));
        const top5 = sortedByMarks.slice(0, 5);

        top5.forEach((t, idx) => {
            let classStr = 'Pass';
            if (t.percentage >= 70) classStr = 'FCD';
            else if (t.percentage >= 60) classStr = 'FC';
            else if (t.percentage >= 50) classStr = 'SC';

            const r = sheet.addRow([`#${idx + 1}`, t.usn, t.name, '', '', `${t.totalMarks}/${maxTotalMarks}`, `${t.percentage}%`, classStr]);
            sheet.mergeCells(r.number, 3, r.number, 5);
            r.alignment = { vertical: 'middle', horizontal: 'center' };
            r.getCell(1).font = { bold: true, color: { argb: 'FF2563EB' } };
            r.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
            r.getCell(6).font = { bold: false };
            r.getCell(7).font = { bold: false };
            r.getCell(8).font = { bold: true };
        });

        sheet.addRow([]); sheet.addRow([]); // Blank lines

        // -------------------------------------------------------------
        // SECTION 5: OVERALL CLASS PERFORMANCE STATISTICS & BAR CHART
        // -------------------------------------------------------------
        const overallTitleRow = sheet.addRow(['3. Overall Class Performance Statistics Table']);
        overallTitleRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        overallTitleRow.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.mergeCells(overallTitleRow.number, 1, overallTitleRow.number, 6);
        sheet.getRow(overallTitleRow.number).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

        const p1Header = sheet.addRow(['Appeared', 'FCD', 'FC', 'SC', 'Total Fail', 'Total Pass']);
        p1Header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        p1Header.alignment = { vertical: 'middle', horizontal: 'center' };
        p1Header.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } });

        const p1Counts = sheet.addRow([
            stats.totalStudents || 0,
            stats.fcdCount || 0,
            stats.fcCount || 0,
            stats.scCount || 0,
            stats.failCount || 0,
            stats.passCount || 0
        ]);
        p1Counts.font = { bold: false };
        p1Counts.alignment = { vertical: 'middle', horizontal: 'center' };

        const tot = stats.totalStudents || 1;
        const p1Pcts = sheet.addRow([
            '',
            `${((stats.fcdCount / tot) * 100).toFixed(2)}%`,
            `${((stats.fcCount / tot) * 100).toFixed(2)}%`,
            `${((stats.scCount / tot) * 100).toFixed(2)}%`,
            `${((stats.failCount / tot) * 100).toFixed(2)}%`,
            `${(stats.passPercentage || 0).toFixed(2)}%`
        ]);
        p1Pcts.font = { bold: true, color: { argb: 'FF2563EB' } };
        p1Pcts.alignment = { vertical: 'middle', horizontal: 'center' };

        sheet.addRow([]); // Blank line

        // Section 5.1 Banner Heading for Chart 1
        const chart1HeaderRow = sheet.addRow(['4. Overall Class Performance Bar Chart']);
        chart1HeaderRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        chart1HeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.mergeCells(chart1HeaderRow.number, 1, chart1HeaderRow.number, 12);
        sheet.getRow(chart1HeaderRow.number).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

        const chart1StartRow = chart1HeaderRow.number + 1;
        for (let i = 0; i < 16; i++) {
            sheet.addRow([]);
        }

        // -------------------------------------------------------------
        // SECTION 6: SUBJECT-WISE PERFORMANCE SUMMARY TABLE & BAR CHART
        // -------------------------------------------------------------
        const subTitleRow = sheet.addRow(['5. Subject-Wise Performance Summary Table']);
        subTitleRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        subTitleRow.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.mergeCells(subTitleRow.number, 1, subTitleRow.number, 12);
        sheet.getRow(subTitleRow.number).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

        const subSumHeader = sheet.addRow([
            'Subject With Code', 'Staff Name', 'FCD', 'FC', 'SC', 'Pass', 'AB', 'With Held', 'Fail', 'Total Pass', '%', 'Appeared'
        ]);
        subSumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        subSumHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        subSumHeader.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } });

        subjects.forEach(sub => {
            const sr = sheet.addRow([
                sub.name,
                '', // Staff Name blank for manual entry
                sub.fcdCount || 0,
                sub.fcCount || 0,
                sub.scCount || 0,
                sub.passClassCount || 0,
                sub.abCount || 0,
                sub.withHeldCount || 0,
                sub.failCount || 0,
                sub.totalPassCount || 0,
                `${(sub.passPercentage || 0).toFixed(2)}%`,
                sub.appearedCount || stats.totalStudents || 0
            ]);
            sr.alignment = { vertical: 'middle', horizontal: 'center' };
            sr.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
            sr.font = { bold: false };
            sr.getCell(1).font = { bold: true };
        });

        sheet.addRow([]); // Blank line

        // Section 6.1 Banner Heading for Chart 2
        const chart2HeaderRow = sheet.addRow(['6. Subject-Wise Performance Bar Chart Breakdown']);
        chart2HeaderRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        chart2HeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };
        sheet.mergeCells(chart2HeaderRow.number, 1, chart2HeaderRow.number, 12);
        sheet.getRow(chart2HeaderRow.number).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

        const chart2StartRow = chart2HeaderRow.number + 1;
        for (let i = 0; i < 18; i++) {
            sheet.addRow([]);
        }

        // -------------------------------------------------------------
        // APPLY BORDERS & COLUMN WIDTHS
        // -------------------------------------------------------------
        sheet.eachRow(row => {
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });
        });

        sheet.getColumn(1).width = 8;
        sheet.getColumn(2).width = 25;
        sheet.getColumn(3).width = 16;

        // QuickChart image embedding into the single sheet (Pic 3 & Pic 4 Bar Charts)
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
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Overall Class Performance Bar Chart',
                            font: { size: 15, weight: 'bold' }
                        },
                        datalabels: {
                            display: true,
                            anchor: 'end',
                            align: 'top',
                            font: { weight: 'bold', size: 9 }
                        }
                    }
                }
            };

            const chart2Config = {
                type: 'bar',
                data: {
                    labels: subjects.map(s => (s.name || '').split(' ')[0]),
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
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: 'Subject-Wise Performance Bar Chart Breakdown',
                            font: { size: 15, weight: 'bold' }
                        },
                        datalabels: {
                            display: true,
                            anchor: 'end',
                            align: 'top',
                            font: { weight: 'bold', size: 8 }
                        }
                    }
                }
            };

            const [chart1Buffer, chart2Buffer] = await Promise.all([
                fetchChartImage(chart1Config, 650, 320),
                fetchChartImage(chart2Config, 800, 360)
            ]);

            if (chart1Buffer) {
                const imgId1 = workbook.addImage({ buffer: chart1Buffer, extension: 'png' });
                sheet.addImage(imgId1, `A${chart1StartRow}:K${chart1StartRow + 15}`);
            }

            if (chart2Buffer) {
                const imgId2 = workbook.addImage({ buffer: chart2Buffer, extension: 'png' });
                sheet.addImage(imgId2, `A${chart2StartRow}:L${chart2StartRow + 17}`);
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
        const students = await Student.find({ resultId: req.params.id });
        students.sort((a, b) => (a.usn || '').localeCompare(b.usn || '', undefined, { numeric: true, sensitivity: 'base' }));

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

        const io = req.app.get('io');
        if (io) {
            io.emit('result_deleted', { id });
        }

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
