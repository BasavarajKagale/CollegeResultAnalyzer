const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    filename: String,
    uploadDate: { type: Date, default: Date.now },
    subjects: [{
        name: String,
        appearedCount: { type: Number, default: 0 },
        fcdCount: { type: Number, default: 0 },
        fcCount: { type: Number, default: 0 },
        scCount: { type: Number, default: 0 },
        passClassCount: { type: Number, default: 0 },
        failCount: { type: Number, default: 0 },
        abCount: { type: Number, default: 0 },
        withHeldCount: { type: Number, default: 0 },
        totalPassCount: { type: Number, default: 0 },
        passPercentage: { type: Number, default: 0 },
        highestMarks: { type: Number, default: 0 }
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
        appearedCount: Number,
        fcdCount: Number,
        fcCount: Number,
        scCount: Number,
        passClassCount: Number,
        failCount: Number,
        passCount: Number,
        passPercentage: Number
    }
});

module.exports = mongoose.model('Result', resultSchema);
