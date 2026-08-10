const xlsx = require('xlsx');
const { PDFParse } = require('pdf-parse');

// Regular Expressions for USN matching
const VTU_USN_REGEX = /\b([0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3})\b/i;
const GENERIC_USN_REGEX = /\b([0-9][A-Z0-9]{7,11}|[A-Z]{2,4}[0-9]{4,8})\b/i;

// Excluded header keywords (summary / metadata columns)
const EXCLUDED_HEADERS = [
    'sl no', 'sl.no', 'sl_no', 's.no', 'sno', 'serial no', 'sr no', 'sr.no',
    'total', 'total marks', 'grand total', 'tot', 'percentage', 'percent', '%',
    'result', 'status', 'rank', 'sgpa', 'cgpa', 'grade', 'class', 'remarks', 'pass/fail'
];

/**
 * Universal Entry Point to parse PDF, Excel, and CSV files
 */
async function parseResultFile(buffer, originalname = '', mimetype = '') {
    const ext = (originalname || '').split('.').pop().toLowerCase();
    
    if (ext === 'pdf' || mimetype === 'application/pdf') {
        return await parsePDFBuffer(buffer);
    } else {
        return parseSpreadsheetBuffer(buffer);
    }
}

/**
 * Parse Excel (.xlsx, .xls) and CSV (.csv) files
 */
function parseSpreadsheetBuffer(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('File contains no sheets');
    }
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Get 2D matrix of raw values
    const rawMatrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawMatrix || rawMatrix.length === 0) {
        throw new Error('Spreadsheet file is empty');
    }

    return parseMatrix(rawMatrix);
}

/**
 * Core Matrix Parsing Engine
 */
function parseMatrix(matrix) {
    // 1. Clean matrix values
    const cleanMatrix = matrix.map(row => 
        (Array.isArray(row) ? row : []).map(cell => 
            cell === null || cell === undefined ? '' : String(cell).trim()
        )
    );

    // 2. Find Header Row(s)
    let headerRowIdx = -1;
    let maxScore = -1;

    for (let r = 0; r < Math.min(cleanMatrix.length, 25); r++) {
        const row = cleanMatrix[r];
        let score = 0;
        
        row.forEach(cell => {
            const lower = cell.toLowerCase();
            if (/usn|roll|reg|register|seat|id|enrollment/i.test(lower)) score += 10;
            if (/name|student|candidate/i.test(lower)) score += 10;
            if (/^\d{2}[A-Za-z]{2,3}\d{2,3}/.test(cell) || EXCLUDED_HEADERS.includes(lower)) score += 5;
            if (cell.length > 0) score += 1;
        });

        if (score > maxScore) {
            maxScore = score;
            headerRowIdx = r;
        }
    }

    if (headerRowIdx === -1) {
        headerRowIdx = 0;
    }

    // Combine current header row with next row if row+1 has subject titles / multiline subheaders
    let combinedHeaders = [...cleanMatrix[headerRowIdx]];
    let nextRowIsSubheader = false;
    
    if (headerRowIdx + 1 < cleanMatrix.length) {
        const nextRow = cleanMatrix[headerRowIdx + 1];
        // Check if next row looks like subheaders (e.g. Mathematics under 21CS31)
        const hasTextInNext = nextRow.some(cell => cell.length > 0 && isNaN(cell));
        const firstCellIsData = VTU_USN_REGEX.test(nextRow[0] || '') || VTU_USN_REGEX.test(nextRow[1] || '');
        
        if (hasTextInNext && !firstCellIsData) {
            nextRowIsSubheader = true;
            for (let c = 0; c < Math.max(combinedHeaders.length, nextRow.length); c++) {
                const top = (combinedHeaders[c] || '').replace(/\s+/g, ' ').trim();
                const bot = (nextRow[c] || '').replace(/\s+/g, ' ').trim();
                if (top && bot && top.toLowerCase() !== bot.toLowerCase()) {
                    combinedHeaders[c] = `${top} ${bot}`;
                } else if (bot) {
                    combinedHeaders[c] = bot;
                } else {
                    combinedHeaders[c] = top;
                }
            }
        }
    }

    const dataStartIdx = headerRowIdx + (nextRowIsSubheader ? 2 : 1);

    // 3. Map Columns
    let usnCol = -1;
    let nameCol = -1;

    combinedHeaders.forEach((header, colIdx) => {
        const cleanedHeader = header.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const lower = cleanedHeader.toLowerCase();

        if (usnCol === -1 && /usn|roll|reg|register|seat|id|enrollment/i.test(lower)) {
            usnCol = colIdx;
        } else if (nameCol === -1 && /name|student|candidate/i.test(lower)) {
            nameCol = colIdx;
        }
    });

    // Fallback: Check data rows to auto-detect USN & Name columns if headers didn't match
    if (usnCol === -1 || nameCol === -1) {
        for (let c = 0; c < combinedHeaders.length; c++) {
            let usnMatchCount = 0;
            let nameMatchCount = 0;
            let sampleCount = 0;

            for (let r = dataStartIdx; r < Math.min(cleanMatrix.length, dataStartIdx + 10); r++) {
                const val = cleanMatrix[r][c] || '';
                if (!val) continue;
                sampleCount++;
                if (VTU_USN_REGEX.test(val) || GENERIC_USN_REGEX.test(val)) usnMatchCount++;
                else if (/[A-Za-z]{3,}\s+[A-Za-z]{2,}/.test(val) && isNaN(val)) nameMatchCount++;
            }

            if (sampleCount > 0) {
                if (usnCol === -1 && usnMatchCount / sampleCount >= 0.4) usnCol = c;
                if (nameCol === -1 && nameMatchCount / sampleCount >= 0.4) nameCol = c;
            }
        }
    }

    // Default column fallbacks if still not found
    if (usnCol === -1 && nameCol !== 0) usnCol = 1;
    if (nameCol === -1) nameCol = 0;

    // Map subject columns
    const subjectCols = [];
    combinedHeaders.forEach((header, colIdx) => {
        if (colIdx === usnCol || colIdx === nameCol) return;

        const cleanedHeader = header.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const lower = cleanedHeader.toLowerCase();

        if (EXCLUDED_HEADERS.some(ex => lower === ex || lower.startsWith(ex))) return;

        if (cleanedHeader.length > 0) {
            subjectCols.push({
                index: colIdx,
                name: cleanedHeader
            });
        }
    });

    // 4. Parse Student Data Rows
    const rawStudents = [];

    for (let r = dataStartIdx; r < cleanMatrix.length; r++) {
        const row = cleanMatrix[r];
        if (!row || row.every(cell => !cell)) continue;

        let usnVal = (row[usnCol] || '').trim();
        let nameVal = (row[nameCol] || '').trim();

        // Scan row if USN not found in mapped column
        if (!VTU_USN_REGEX.test(usnVal) && !GENERIC_USN_REGEX.test(usnVal)) {
            for (let c = 0; c < row.length; c++) {
                if (VTU_USN_REGEX.test(row[c]) || GENERIC_USN_REGEX.test(row[c])) {
                    usnVal = row[c].trim();
                    break;
                }
            }
        }

        // Skip rows that look like summary, header repeats, or non-student rows
        if (/total|average|pass|fail|signature|page|students/i.test(nameVal) || 
            /total|average|pass|fail|signature|page|students/i.test(usnVal)) {
            continue;
        }

        if (!usnVal && !nameVal) continue;

        const marks = {};
        subjectCols.forEach(sub => {
            const rawVal = row[sub.index];
            let num = parseInt(rawVal, 10);
            if (isNaN(num)) num = 0;
            marks[sub.name] = num;
        });

        rawStudents.push({
            name: nameVal || 'Unknown',
            usn: usnVal || `TEMP_${r}`,
            marks
        });
    }

    return buildResultDocument(rawStudents, subjectCols.map(s => s.name));
}

/**
 * PDF Parsing Engine using pdf-parse text extraction
 */
async function parsePDFBuffer(buffer) {
    const instance = new PDFParse({ data: buffer });
    const parsedData = await instance.getText();
    const fullText = parsedData.text || '';

    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // 1. Detect Subject Headers from PDF lines
    const headerLines = [];
    lines.forEach(line => {
        if (/21CS\d+|18CS\d+|Mathematics|Data Structures|Digital Design|Operating Systems|Computer Networks|Database/i.test(line) &&
            !VTU_USN_REGEX.test(line)) {
            headerLines.push(line);
        }
    });

    // 2. Parse Student Lines with USNs
    const rawStudents = [];
    let detectedSubjectCount = 0;

    lines.forEach((line) => {
        const usnMatch = line.match(VTU_USN_REGEX) || line.match(GENERIC_USN_REGEX);
        if (usnMatch) {
            const usn = usnMatch[1].toUpperCase();
            const idx = line.indexOf(usnMatch[0]);

            let before = line.slice(0, idx).trim().replace(/^[0-9]+[\.\s\-]+/, '');
            let after = line.slice(idx + usnMatch[0].length).trim();

            const markNumbers = (after.match(/\b\d{1,3}\b/g) || []).map(n => parseInt(n, 10));
            
            if (markNumbers.length > detectedSubjectCount) {
                detectedSubjectCount = markNumbers.length;
            }

            rawStudents.push({
                name: before || 'Unknown',
                usn: usn,
                rawMarks: markNumbers
            });
        }
    });

    // Generate subject names if not extracted
    let subjectNames = [];
    if (headerLines.length > 0) {
        const combined = headerLines.join(' ');
        const codeMatches = combined.match(/\b\d{2}[A-Za-z]{2,3}\d{2,3}[^\d]*/g) || [];
        if (codeMatches.length >= detectedSubjectCount) {
            subjectNames = codeMatches.slice(0, detectedSubjectCount).map(s => s.trim());
        }
    }

    if (subjectNames.length < detectedSubjectCount) {
        for (let i = subjectNames.length; i < detectedSubjectCount; i++) {
            subjectNames.push(`Subject ${i + 1}`);
        }
    }

    // Format student docs with marks map
    const finalStudents = rawStudents.map(s => {
        const marksMap = {};
        subjectNames.forEach((subName, i) => {
            marksMap[subName] = s.rawMarks[i] !== undefined ? s.rawMarks[i] : 0;
        });
        return {
            name: s.name,
            usn: s.usn,
            marks: marksMap
        };
    });

    return buildResultDocument(finalStudents, subjectNames);
}

/**
 * Standardize metrics, topper ranks, subject pass rates, overall pass percentage
 */
function buildResultDocument(rawStudents, subjectNames) {
    if (rawStudents.length === 0) {
        throw new Error('No valid student records detected in the uploaded file.');
    }

    let totalPassCount = 0;
    const subjectStatsMap = {};

    subjectNames.forEach(sub => {
        subjectStatsMap[sub] = {
            name: sub,
            passCount: 0,
            failCount: 0,
            passPercentage: 0,
            highestMarks: 0
        };
    });

    const studentDocs = rawStudents.map(student => {
        let studentTotal = 0;
        let isPass = true;

        subjectNames.forEach(sub => {
            const mark = Number(student.marks[sub]) || 0;
            studentTotal += mark;

            const stat = subjectStatsMap[sub];
            if (mark >= 40) {
                stat.passCount++;
            } else {
                stat.failCount++;
                isPass = false;
            }
            if (mark > stat.highestMarks) stat.highestMarks = mark;
        });

        if (isPass) totalPassCount++;

        const percentage = (studentTotal / (subjectNames.length * 100)) * 100;

        return {
            name: student.name,
            usn: student.usn,
            marks: student.marks,
            totalMarks: studentTotal,
            percentage: parseFloat(percentage.toFixed(2)),
            isPass: isPass
        };
    });

    // Calculate Ranks (Sorted descending by totalMarks)
    studentDocs.sort((a, b) => b.totalMarks - a.totalMarks);
    studentDocs.forEach((s, idx) => {
        s.rank = idx + 1;
    });

    // Subject pass percentages
    const subjectStats = subjectNames.map(sub => {
        const stat = subjectStatsMap[sub];
        stat.passPercentage = rawStudents.length > 0 ? (stat.passCount / rawStudents.length) * 100 : 0;
        return stat;
    });

    // Toppers
    const toppers = studentDocs.slice(0, 3).map(s => ({
        rank: s.rank,
        name: s.name,
        usn: s.usn,
        totalMarks: s.totalMarks,
        percentage: s.percentage
    }));

    // Overall Batch Statistics
    const overallStats = {
        totalStudents: rawStudents.length,
        passCount: totalPassCount,
        failCount: rawStudents.length - totalPassCount,
        passPercentage: rawStudents.length > 0 ? (totalPassCount / rawStudents.length) * 100 : 0
    };

    return {
        subjects: subjectStats,
        toppers: toppers,
        overallStats: overallStats,
        studentDocs: studentDocs
    };
}

module.exports = {
    parseResultFile
};
