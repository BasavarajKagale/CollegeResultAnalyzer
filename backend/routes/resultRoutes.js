const express = require('express');
const multer = require('multer');
const { 
    uploadResult, 
    getResults, 
    getResultById, 
    exportExcel, 
    exportPDF,
    deleteResult,
    adminLogin
} = require('../controllers/resultController');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('file'), uploadResult);
router.post('/admin/login', adminLogin);
router.get('/', getResults);
router.get('/:id', getResultById);
router.get('/:id/download/excel', exportExcel);
router.get('/:id/download/pdf', exportPDF);
router.delete('/:id', deleteResult);

module.exports = router;
