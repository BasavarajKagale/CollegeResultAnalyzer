const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Result' },
    name: String,
    usn: String,
    marks: mongoose.Schema.Types.Mixed, // { Subject: TotalMarks }
    subjectDetails: mongoose.Schema.Types.Mixed, // { Subject: { in, ex, total, result } }
    totalMarks: Number,
    percentage: Number,
    isPass: Boolean,
    failedSubjectsCount: Number,
    remark: String, // 'PASS' or 'FAIL'
    rank: Number
});

module.exports = mongoose.model('Student', studentSchema);
