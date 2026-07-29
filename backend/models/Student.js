const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    resultId: { type: mongoose.Schema.Types.ObjectId, ref: 'Result' },
    name: String,
    usn: String,
    marks: mongoose.Schema.Types.Mixed, // { Subject: Marks }
    totalMarks: Number,
    percentage: Number,
    isPass: Boolean,
    rank: Number
});

module.exports = mongoose.model('Student', studentSchema);
