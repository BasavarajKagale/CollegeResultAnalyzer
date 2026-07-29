const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    filename: String,
    uploadDate: { type: Date, default: Date.now },
    subjects: [{
        name: String,
        passCount: Number,
        failCount: Number,
        passPercentage: Number,
        highestMarks: Number
    }],
    toppers: [{
        rank: Number,
        name: String,
        usn: String,
        totalMarks: Number,
        percentage: Number
    }],
    overallStats: {
        totalStudents: Number,
        passCount: Number,
        failCount: Number,
        passPercentage: Number
    }
});

module.exports = mongoose.model('Result', resultSchema);
