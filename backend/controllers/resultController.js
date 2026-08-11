const Result = require('../models/Result');
const Student = require('../models/Student');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { parseResultFile } = require('../utils/parser');
const { generateResultPDF } = require('../utils/pdfGenerator');

const uploadResult = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const parsed = await parseResultFile(req.file.buffer, req.file.originalname, req.file.mimetype);

        const result = new Result({
            filename: req.file.originalname,
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
