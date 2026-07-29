const Result = require('../models/Result');
const Student = require('../models/Student');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const uploadResult = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

        // Dynamic subject detection - excluding common fields
        const keys = Object.keys(data[0]);
        const subjects = keys.filter(k => 
            !['usn', 'name', 'sl no', 'sl_no', 'slno', 'total', 'percentage', 'result', 'sgpa', 'cgpa'].includes(k.toLowerCase())
        );

        let studentDocs = [];
        let totalPass = 0;
        let subjectStats = subjects.map(s => ({
            name: s,
            passCount: 0,
            failCount: 0,
            passPercentage: 0,
            highestMarks: 0
        }));

        data.forEach(row => {
            let studentMarks = {};
            let studentTotal = 0;
            let isPass = true;

            subjects.forEach(sub => {
                const mark = parseInt(row[sub]) || 0;
                studentMarks[sub] = mark;
                studentTotal += mark;
                
                const stat = subjectStats.find(st => st.name === sub);
                if (mark >= 40) {
                    stat.passCount++;
                } else {
                    stat.failCount++;
                    isPass = false;
                }
                if (mark > stat.highestMarks) stat.highestMarks = mark;
            });

            if (isPass) totalPass++;

            const percentage = (studentTotal / (subjects.length * 100)) * 100;
            
            studentDocs.push({
                name: row.Name || row.name || 'Unknown',
                usn: row.USN || row.usn || 'N/A',
                marks: studentMarks,
                totalMarks: studentTotal,
                percentage: parseFloat(percentage.toFixed(2)),
                isPass: isPass
            });
        });

        // Calculate rankings
        studentDocs.sort((a, b) => b.totalMarks - a.totalMarks);
        studentDocs.forEach((s, index) => s.rank = index + 1);

        // Subject Analysis percentages
        subjectStats.forEach(stat => {
            stat.passPercentage = (stat.passCount / data.length) * 100;
        });

        // Toppers
        const toppers = studentDocs.slice(0, 3).map(s => ({
            rank: s.rank,
            name: s.name,
            usn: s.usn,
            totalMarks: s.totalMarks,
            percentage: s.percentage
        }));

        // Overall stats
        const overallStats = {
            totalStudents: data.length,
            passCount: totalPass,
            failCount: data.length - totalPass,
            passPercentage: (totalPass / data.length) * 100
        };

        const result = new Result({
            filename: req.file.originalname,
            subjects: subjectStats,
            toppers: toppers,
            overallStats: overallStats
        });

        const savedResult = await result.save();
        
        await Student.insertMany(studentDocs.map(s => ({ ...s, resultId: savedResult._id })));

        res.status(201).json(savedResult);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
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
        const students = await Student.find({ resultId: req.params.id }).sort({ rank: 1 });

        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1: Students
        const studentSheet = workbook.addWorksheet('Students');
        const subjects = result.subjects.map(s => s.name);
        studentSheet.columns = [
            { header: 'Rank', key: 'rank', width: 10 },
            { header: 'USN', key: 'usn', width: 20 },
            { header: 'Name', key: 'name', width: 30 },
            ...subjects.map(s => ({ header: s, key: s, width: 15 })),
            { header: 'Total', key: 'total', width: 15 },
            { header: 'Percentage', key: 'percentage', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        students.forEach(s => {
            const row = {
                rank: s.rank,
                usn: s.usn,
                name: s.name,
                total: s.totalMarks,
                percentage: s.percentage + '%',
                status: s.isPass ? 'PASS' : 'FAIL'
            };
            subjects.forEach(sub => {
                row[sub] = s.marks[sub];
            });
            studentSheet.addRow(row);
        });

        // Sheet 2: Subject Analysis
        const analysisSheet = workbook.addWorksheet('Subject Analysis');
        analysisSheet.columns = [
            { header: 'Subject', key: 'name', width: 30 },
            { header: 'Pass Count', key: 'passCount', width: 15 },
            { header: 'Fail Count', key: 'failCount', width: 15 },
            { header: 'Pass %', key: 'passPercentage', width: 15 },
            { header: 'Highest Marks', key: 'highestMarks', width: 15 }
        ];
        result.subjects.forEach(s => analysisSheet.addRow({
            ...s.toObject(),
            passPercentage: s.passPercentage.toFixed(2)
        }));

        // Sheet 3: Toppers
        const topperSheet = workbook.addWorksheet('Toppers');
        topperSheet.columns = [
            { header: 'Rank', key: 'rank', width: 10 },
            { header: 'USN', key: 'usn', width: 20 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Total Marks', key: 'totalMarks', width: 15 },
            { header: 'Percentage', key: 'percentage', width: 15 }
        ];
        result.toppers.forEach(t => topperSheet.addRow({
            ...t.toObject(),
            percentage: t.percentage + '%'
        }));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=result_${req.params.id}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const exportPDF = async (req, res) => {
    try {
        const result = await Result.findById(req.params.id);
        const students = await Student.find({ resultId: req.params.id }).sort({ rank: 1 });

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=result_${req.params.id}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text('College Result Analysis Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`File: ${result.filename}`);
        doc.text(`Date: ${result.uploadDate.toDateString()}`);
        doc.moveDown();

        doc.fontSize(16).text('Overall Statistics', { underline: true });
        doc.fontSize(12).text(`Total Students: ${result.overallStats.totalStudents}`);
        doc.text(`Total Passed: ${result.overallStats.passCount}`);
        doc.text(`Total Failed: ${result.overallStats.failCount}`);
        doc.text(`Overall Pass Percentage: ${result.overallStats.passPercentage.toFixed(2)}%`);
        doc.moveDown();

        doc.fontSize(16).text('Top 3 Students', { underline: true });
        result.toppers.forEach(t => {
            doc.fontSize(12).text(`${t.rank}. ${t.name} (${t.usn}) - ${t.totalMarks} (${t.percentage}%)`);
        });
        doc.moveDown();

        doc.addPage();
        doc.fontSize(16).text('Subject Analysis', { underline: true });
        result.subjects.forEach(s => {
            doc.fontSize(12).text(`- ${s.name}: Pass %: ${s.passPercentage.toFixed(2)}%, Highest: ${s.highestMarks}`);
        });

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    uploadResult,
    getResults,
    getResultById,
    exportExcel,
    exportPDF
};
