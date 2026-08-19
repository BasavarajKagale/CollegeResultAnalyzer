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
 * Format raw subject headers to "Subject Title (Subject Code)" format
 */
function formatSubjectHeader(rawHeader) {
    if (!rawHeader) return rawHeader;
    let clean = String(rawHeader).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Already in Title (Code) format
    if (/^.+\s+\([A-Z0-9]{3,8}\)$/i.test(clean)) {
        return clean;
    }

    // Matches "BCS701 Internet of Things" or "21CS31 Mathematics" or "BCS714A Deep Learning"
    const codeFirstMatch = clean.match(/^([A-Z]{2,4}\d{3,4}[A-Z]?|\d{2}[A-Z]{2,4}\d{2,4}[A-Z]?)\s+(.+)$/i);
    if (codeFirstMatch) {
        const code = codeFirstMatch[1].toUpperCase();
        const title = codeFirstMatch[2].trim();
        return `${title} (${code})`;
    }

    // Matches "Internet of Things BCS701"
    const codeLastMatch = clean.match(/^(.+)\s+([A-Z]{2,4}\d{3,4}[A-Z]?|\d{2}[A-Z]{2,4}\d{2,4}[A-Z]?)$/i);
    if (codeLastMatch) {
        const title = codeLastMatch[1].trim();
        const code = codeLastMatch[2].toUpperCase();
        return `${title} (${code})`;
    }

    return clean;
}

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
 * Core Matrix Parsing Engine for Excel & CSV (Handles arbitrary title banner rows & formats)
 */
function parseMatrix(matrix) {
    // 1. Clean matrix values
    const cleanMatrix = matrix.map(row => 
        (Array.isArray(row) ? row : []).map(cell => 
            cell === null || cell === undefined ? '' : String(cell).replace(/\s+/g, ' ').trim()
        )
    );

    // 2. Locate Header Row dynamically (scans across all initial rows to bypass college banners)
    let headerRowIdx = -1;
    let maxScore = -500;

    for (let r = 0; r < Math.min(cleanMatrix.length, 50); r++) {
        const row = cleanMatrix[r];
        let score = 0;
        
        row.forEach(cell => {
            const lower = cell.toLowerCase();
            if (/^usn$|^roll\s*no$|^reg\s*no$|^register\s*no$|^seat\s*no$/i.test(lower)) score += 100;
            else if (/usn|roll|reg/i.test(lower)) score += 30;

            if (/^std\.?\s*name$|^student\s*name$|^candidate\s*name$|^name$/i.test(lower)) score += 100;
            else if (/name|student|candidate/i.test(lower)) score += 30;

            if (/^sl\.?\s*no$|^s\.?\s*no$|^serial\s*no$/i.test(lower)) score += 50;

            // Subject code header matches (e.g. BCS401, 21CS31)
            if (/^[A-Z]{2,4}\d{3,4}[A-Z]?$/i.test(cell)) score += 20;

            if (VTU_USN_REGEX.test(cell) || GENERIC_USN_REGEX.test(cell)) {
                score -= 100; // Heavy penalty for data rows containing student USN numbers
            }
        });

        if (score > maxScore) {
            maxScore = score;
            headerRowIdx = r;
        }
    }

    if (headerRowIdx === -1 || maxScore < 20) {
        // Fallback search: find first row with text "USN" or "Std. Name"
        for (let r = 0; r < Math.min(cleanMatrix.length, 50); r++) {
            const row = cleanMatrix[r];
            if (row.some(cell => /usn|std\.?\s*name|student\s*name/i.test(cell))) {
                headerRowIdx = r;
                break;
            }
        }
    }

    if (headerRowIdx === -1) {
        headerRowIdx = 0;
    }

    let extractedCollegeName = '';
    if (headerRowIdx > 0) {
        for (let r = 0; r < headerRowIdx; r++) {
            cleanMatrix[r].forEach(c => {
                if (c && c.length > 3 && /college|institute|university|technology|engineering|vidyapeeth/i.test(c)) {
                    if (!extractedCollegeName) {
                        extractedCollegeName = c;
                    }
                }
            });
        }
    }
    if (!extractedCollegeName || extractedCollegeName.length < 5) {
        extractedCollegeName = "KLE College of Engineering and Technology, Chikodi";
    }

    // 3. Check for Sub-header Row (e.g., IN, EX, T, R under subject codes in Pic 5 format)
    let subheaderRowIdx = -1;
    let isPic5SubheaderFormat = false;

    for (let offset = 1; offset <= 2; offset++) {
        const testIdx = headerRowIdx + offset;
        if (testIdx < cleanMatrix.length) {
            const testRow = cleanMatrix[testIdx];
            let subCount = 0;
            testRow.forEach(cell => {
                const lower = cell.toLowerCase();
                if (lower === 'in' || lower === 'ex' || lower === 'em' || lower === 't' || lower === 'r' || lower === 'tot') {
                    subCount++;
                }
            });
            if (subCount >= 3) {
                subheaderRowIdx = testIdx;
                isPic5SubheaderFormat = true;
                break;
            }
        }
    }

    const row1 = cleanMatrix[headerRowIdx] || [];
    const row2 = isPic5SubheaderFormat ? cleanMatrix[subheaderRowIdx] : [];
    const dataStartIdx = isPic5SubheaderFormat ? subheaderRowIdx + 1 : headerRowIdx + 1;

    // 4. Map USN and Name Column Indices
    let usnCol = -1;
    let nameCol = -1;
    let slNoCol = -1;

    row1.forEach((header, colIdx) => {
        const lower = (header || '').toLowerCase();
        if (usnCol === -1 && /usn|roll|reg|register|seat|id|enrollment/i.test(lower)) {
            usnCol = colIdx;
        } else if (nameCol === -1 && /name|student|candidate|std\.?\s*name/i.test(lower)) {
            nameCol = colIdx;
        } else if (slNoCol === -1 && /sl\.?\s*no|s\.?\s*no|serial/i.test(lower)) {
            slNoCol = colIdx;
        }
    });

    // Fallback: Scan data rows to locate USN & Name columns if headers were ambiguous
    if (usnCol === -1 || nameCol === -1) {
        for (let c = 0; c < Math.max(row1.length, 10); c++) {
            let usnMatches = 0;
            let nameMatches = 0;
            let count = 0;
            for (let r = dataStartIdx; r < Math.min(cleanMatrix.length, dataStartIdx + 15); r++) {
                const val = cleanMatrix[r][c] || '';
                if (!val) continue;
                count++;
                if (VTU_USN_REGEX.test(val) || GENERIC_USN_REGEX.test(val)) usnMatches++;
                else if (/[A-Za-z]{3,}\s+[A-Za-z]{2,}/.test(val) && isNaN(val)) nameMatches++;
            }
            if (count > 0) {
                if (usnCol === -1 && usnMatches / count >= 0.3) usnCol = c;
                if (nameCol === -1 && nameMatches / count >= 0.3) nameCol = c;
            }
        }
    }

    if (usnCol === -1) usnCol = (nameCol === 1 ? 2 : 1);
    if (nameCol === -1) nameCol = (usnCol === 1 ? 2 : 1);

    // 5. Build Subject Column Blocks
    const subjectBlocks = [];

    if (isPic5SubheaderFormat) {
        let currentSubjectCode = '';
        let currentBlock = null;

        for (let c = 0; c < Math.max(row1.length, row2.length); c++) {
            if (c === usnCol || c === nameCol || c === slNoCol) continue;
            const topVal = (row1[c] || '').trim();
            const botVal = (row2[c] || '').trim().toLowerCase();

            if (/sl\.?\s*no|std\.?\s*name|usn|total|percentage|remark/i.test(topVal)) continue;

            if (topVal && topVal.length >= 2 && !EXCLUDED_HEADERS.some(ex => topVal.toLowerCase().startsWith(ex))) {
                if (!currentBlock || currentBlock.code !== topVal) {
                    currentSubjectCode = formatSubjectHeader(topVal);
                    currentBlock = {
                        code: currentSubjectCode,
                        inCol: -1,
                        exCol: -1,
                        totalCol: -1,
                        resultCol: -1
                    };
                    subjectBlocks.push(currentBlock);
                }
            }

            if (currentBlock) {
                if (botVal === 'in') currentBlock.inCol = c;
                else if (botVal === 'ex' || botVal === 'em') currentBlock.exCol = c;
                else if (botVal === 't' || botVal === 'tot' || botVal === 'total') currentBlock.totalCol = c;
                else if (botVal === 'r' || botVal === 'res' || botVal === 'result') currentBlock.resultCol = c;
            }
        }
    } else {
        row1.forEach((header, colIdx) => {
            if (colIdx === usnCol || colIdx === nameCol || colIdx === slNoCol) return;
            const cleanCode = (header || '').trim();
            const lower = cleanCode.toLowerCase();

            if (cleanCode && !EXCLUDED_HEADERS.some(ex => lower.startsWith(ex))) {
                const formattedCode = formatSubjectHeader(cleanCode);
                subjectBlocks.push({
                    code: formattedCode,
                    inCol: -1,
                    exCol: -1,
                    totalCol: colIdx,
                    resultCol: -1
                });
            }
        });
    }

    if (subjectBlocks.length === 0) {
        throw new Error('No valid subject columns found in the uploaded file.');
    }

    // 6. Extract Candidate Records (Scans row dynamically for USN & Name)
    const rawStudents = [];

    for (let r = dataStartIdx; r < cleanMatrix.length; r++) {
        const row = cleanMatrix[r];
        if (!row || row.every(cell => !cell)) continue;

        let usnVal = (row[usnCol] || '').trim();
        let nameVal = (row[nameCol] || '').trim();

        // Scan row cells 0-5 to find actual USN if mapped column is shifted
        let foundUsnColInRow = -1;
        for (let c = 0; c < Math.min(row.length, 6); c++) {
            const cellVal = (row[c] || '').trim();
            if (VTU_USN_REGEX.test(cellVal) || GENERIC_USN_REGEX.test(cellVal)) {
                usnVal = cellVal;
                foundUsnColInRow = c;
                break;
            }
        }

        // Skip non-student rows (banners, headers, bottom statistics rows)
        if (!usnVal) continue; // Must have a valid student USN

        if (/total|average|appeared|fcd|fc|sc|pass|fail|signature|staff|percentage|result\s*sheet|annouced/i.test(nameVal) ||
            /total|average|appeared|fcd|fc|sc|pass|fail|signature|staff|percentage|result\s*sheet|annouced/i.test(usnVal)) {
            continue;
        }

        // Extract student name if missing from mapped column
        if (!nameVal || nameVal === usnVal || /^\d+$/.test(nameVal)) {
            for (let c = 0; c < Math.min(row.length, 6); c++) {
                if (c === foundUsnColInRow) continue;
                const cellVal = (row[c] || '').trim();
                if (cellVal && isNaN(cellVal) && cellVal.length >= 3 && !VTU_USN_REGEX.test(cellVal) && !GENERIC_USN_REGEX.test(cellVal)) {
                    if (!/sl\.?\s*no|usn|total/i.test(cellVal)) {
                        nameVal = cellVal;
                        break;
                    }
                }
            }
        }

        const marks = {};
        const subjectDetails = {};

        subjectBlocks.forEach(sub => {
            const rawIn = sub.inCol !== -1 ? String(row[sub.inCol] ?? '').trim() : '';
            const rawEx = sub.exCol !== -1 ? String(row[sub.exCol] ?? '').trim() : '';
            const rawTotal = sub.totalCol !== -1 ? String(row[sub.totalCol] ?? '').trim() : '';
            let rawRes = sub.resultCol !== -1 ? String(row[sub.resultCol] ?? '').trim().toUpperCase() : '';

            const isAbsent = rawIn.toUpperCase() === 'A' || rawIn.toUpperCase() === 'AB' || 
                             rawEx.toUpperCase() === 'A' || rawEx.toUpperCase() === 'AB' || 
                             rawTotal.toUpperCase() === 'A' || rawTotal.toUpperCase() === 'AB' ||
                             rawRes === 'A' || rawRes === 'AB' || rawRes === 'ABSENT' || rawRes === 'ABS';

            const isWithHeld = rawRes === 'W' || rawRes === 'WH' || rawRes === 'WITH HELD' || rawRes === 'WITHHELD' ||
                               rawTotal === 'W' || rawTotal === 'WH' || rawTotal === 'WITH HELD' || rawTotal === 'WITHHELD' ||
                               rawEx === 'W' || rawEx === 'WH' || rawEx === 'WITH HELD' || rawEx === 'WITHHELD';

            let inVal = parseInt(rawIn, 10);
            if (isNaN(inVal)) inVal = isAbsent ? 'A' : (isWithHeld ? '' : 0);

            let exVal = parseInt(rawEx, 10);
            if (isNaN(exVal)) exVal = isAbsent || isWithHeld ? '' : 0;

            let totalVal = parseInt(rawTotal, 10);
            if (isNaN(totalVal)) {
                if (isAbsent || isWithHeld) totalVal = '';
                else totalVal = (typeof inVal === 'number' && typeof exVal === 'number' ? inVal + exVal : 0);
            } else if (isWithHeld) {
                totalVal = '';
            }

            let resultVal = rawRes;
            if (isAbsent) {
                resultVal = 'A';
            } else if (isWithHeld) {
                resultVal = 'WH';
            } else if (!resultVal) {
                resultVal = typeof totalVal === 'number' && totalVal >= 35 ? 'P' : 'F';
            } else if (resultVal === 'PASS') {
                resultVal = 'P';
            } else if (resultVal === 'FAIL') {
                resultVal = 'F';
            }

            marks[sub.code] = isAbsent || isWithHeld ? 0 : (typeof totalVal === 'number' ? totalVal : 0);
            subjectDetails[sub.code] = {
                in: isAbsent ? 'A' : (typeof inVal === 'number' ? inVal : (isWithHeld ? '' : 0)),
                ex: isAbsent || isWithHeld ? '' : exVal,
                total: isAbsent || isWithHeld ? '' : totalVal,
                result: isAbsent ? 'A' : (isWithHeld ? 'WH' : resultVal),
                isAbsent: isAbsent,
                isWithHeld: isWithHeld
            };
        });

        rawStudents.push({
            name: nameVal || 'Unknown',
            usn: usnVal,
            marks,
            subjectDetails
        });
    }

    return buildResultDocument(rawStudents, subjectBlocks.map(s => s.code), extractedCollegeName);
}

/**
 * Standardize metrics, topper ranks, subject pass rates, overall pass percentage
 */
function buildResultDocument(rawStudents, subjectNames, collegeName = '') {
    if (rawStudents.length === 0) {
        throw new Error('No valid student records detected in the uploaded file.');
    }

    const subjectStatsMap = {};
    subjectNames.forEach(sub => {
        subjectStatsMap[sub] = {
            name: sub,
            appearedCount: 0,
            fcdCount: 0,
            fcCount: 0,
            scCount: 0,
            passClassCount: 0,
            abCount: 0,
            withHeldCount: 0,
            failCount: 0,
            totalPassCount: 0,
            passPercentage: 0,
            highestMarks: 0
        };
    });

    let overallFCD = 0;
    let overallFC = 0;
    let overallSC = 0;
    let overallPassClass = 0;
    let overallTotalPass = 0;

    const studentDocs = rawStudents.map(student => {
        let studentTotal = 0;
        let failedSubjectsCount = 0;
        let hasWithHeld = false;
        const detailsMap = student.subjectDetails || {};

        subjectNames.forEach(sub => {
            const stat = subjectStatsMap[sub];
            const detail = detailsMap[sub] || {
                in: 0,
                ex: 0,
                total: Number(student.marks[sub]) || 0,
                result: (Number(student.marks[sub]) || 0) >= 35 ? 'P' : 'F'
            };

            const mark = Number(detail.total) || 0;
            const res = (detail.result || '').toUpperCase();
            const inStr = String(detail.in ?? '').trim().toUpperCase();
            const isAbsent = detail.isAbsent || res === 'AB' || res === 'A' || res === 'ABSENT' || inStr === 'A' || inStr === 'AB';
            const isWithHeld = detail.isWithHeld || res === 'W' || res === 'WH' || res === 'WITH HELD' || res === 'WITHHELD';

            studentTotal += mark;

            if (isAbsent) {
                stat.abCount++;
                failedSubjectsCount++;
            } else if (isWithHeld) {
                stat.withHeldCount++;
                stat.appearedCount++;
                stat.failCount++;
                failedSubjectsCount++;
                hasWithHeld = true;
            } else {
                stat.appearedCount++;
                if (mark > stat.highestMarks) stat.highestMarks = mark;

                if (res === 'F' || res === 'FAIL' || mark < 35) {
                    stat.failCount++;
                    failedSubjectsCount++;
                } else {
                    // Pass category breakdown per subject
                    if (mark >= 70) stat.fcdCount++;
                    else if (mark >= 60) stat.fcCount++;
                    else if (mark > 35) stat.scCount++;
                    else if (mark === 35) stat.passClassCount++; // Strictly 35
                }
            }
        });

        const maxTotal = subjectNames.length * 100;
        const percentage = maxTotal > 0 ? parseFloat(((studentTotal / maxTotal) * 100).toFixed(2)) : 0;

        // Overall passing criteria: 0 failed subjects AND percentage >= 35% (Fail is >= 1 failed subject or < 35%)
        const isPass = failedSubjectsCount === 0 && percentage >= 35.0;
        let remark = 'FAIL';
        if (hasWithHeld) {
            remark = 'WITHHELD';
        } else if (isPass) {
            if (percentage >= 70.0) remark = 'FCD';
            else if (percentage >= 60.0) remark = 'FC';
            else if (percentage >= 50.0) remark = 'SC';
            else remark = 'PASS';
        }

        if (isPass) {
            overallTotalPass++;
            if (percentage >= 70.0) overallFCD++;
            else if (percentage >= 60.0) overallFC++;
            else if (percentage >= 50.0) overallSC++;
            else overallPassClass++;
        }

        return {
            name: student.name,
            usn: student.usn,
            marks: student.marks,
            subjectDetails: detailsMap,
            totalMarks: studentTotal,
            percentage: percentage,
            failedSubjectsCount: failedSubjectsCount,
            isPass: isPass,
            remark: remark
        };
    });

    // Subject total pass count per subject = FCD + FC + SC + PassClass (calculated once after all students processed)
    subjectNames.forEach(sub => {
        const stat = subjectStatsMap[sub];
        stat.totalPassCount = stat.fcdCount + stat.fcCount + stat.scCount + stat.passClassCount;
        stat.passPercentage = stat.appearedCount > 0 ? (stat.totalPassCount / stat.appearedCount) * 100 : 0;
    });

    // Calculate Ranks (Sorted descending by totalMarks)
    studentDocs.sort((a, b) => b.totalMarks - a.totalMarks);
    studentDocs.forEach((s, idx) => {
        s.rank = idx + 1;
    });

    // Subject stats array
    const subjectStats = subjectNames.map(sub => subjectStatsMap[sub]);

    // Toppers (5 Academic Toppers)
    const toppers = studentDocs.slice(0, 5).map(s => ({
        rank: s.rank,
        name: s.name,
        usn: s.usn,
        totalMarks: s.totalMarks,
        percentage: s.percentage
    }));

    // Overall Batch Statistics (matching Pic 1 & Pic 2)
    const totalStudents = rawStudents.length;
    const overallFail = totalStudents - overallTotalPass;

    const overallStats = {
        totalStudents: totalStudents,
        appearedCount: totalStudents,
        fcdCount: overallFCD,
        fcCount: overallFC,
        scCount: overallSC,
        passClassCount: overallPassClass,
        failCount: overallFail,
        passCount: overallTotalPass,
        passPercentage: totalStudents > 0 ? parseFloat(((overallTotalPass / totalStudents) * 100).toFixed(2)) : 0
    };

    return {
        collegeName: collegeName || "KLE Society's KLE College of Engineering and Technology, Chikodi",
        subjects: subjectStats,
        toppers: toppers,
        overallStats: overallStats,
        studentDocs: studentDocs
    };
}

/**
 * Extract Subject Codes and Names from PDF Header Text
 */
function extractSubjectsFromPDFHeader(headerText, expectedCount) {
    const codeRegex = /\b([A-Z]{2,4}\d{3,4}[A-Z]?|\d{2}[A-Z]{2,4}\d{2,4}[A-Z]?)\b/gi;
    const matches = [];
    let match;

    while ((match = codeRegex.exec(headerText)) !== null) {
        const code = match[1].toUpperCase();
        // Skip if code looks like a USN pattern (e.g., 2KD23CS018 or 1AB23CS0001)
        if (!/\b[0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3}\b/i.test(code) && !GENERIC_USN_REGEX.test(code)) {
            matches.push({
                code: code,
                index: match.index,
                length: match[0].length
            });
        }
    }

    if (matches.length === 0) return [];

    const subjects = [];
    for (let i = 0; i < matches.length; i++) {
        const curr = matches[i];
        const nextIndex = (i + 1 < matches.length) ? matches[i + 1].index : headerText.length;
        
        let titleChunk = headerText.slice(curr.index + curr.length, nextIndex).trim();
        titleChunk = titleChunk.replace(/\b(Name|USN|Sl\.?\s*No|Total|Percentage|Status|Result|Rank)\b/gi, '').trim();
        titleChunk = titleChunk.replace(/\s+/g, ' ');

        if (titleChunk && titleChunk.length > 1) {
            subjects.push(`${titleChunk} (${curr.code})`);
        } else {
            subjects.push(curr.code);
        }
    }

    return subjects.slice(0, expectedCount > 0 ? expectedCount : subjects.length);
}

/**
 * Extract marks array and candidate name from a PDF student line, regardless of column order
 * (Handles: Name USN Marks, USN Name Marks, Marks USN Name, USN Marks Name, Marks Name USN, etc.)
 */
function extractMarksAndNameFromLine(line, usnMatch, expectedSubjectCount) {
    const usn = usnMatch[1].toUpperCase();
    
    // Remove USN token from line to avoid USN numbers interfering with marks/name
    const usnStart = line.indexOf(usnMatch[0]);
    const usnEnd = usnStart + usnMatch[0].length;
    let remaining = line.slice(0, usnStart) + ' ' + line.slice(usnEnd);

    // Find all integer number tokens in remaining text
    const numberMatches = [];
    const numRegex = /\b\d{1,3}\b/g;
    let match;
    while ((match = numRegex.exec(remaining)) !== null) {
        const numVal = parseInt(match[0], 10);
        numberMatches.push({
            value: numVal,
            str: match[0],
            index: match.index,
            length: match[0].length
        });
    }

    let markNumbers = [];
    let markMatchRanges = [];

    if (expectedSubjectCount > 0 && numberMatches.length >= expectedSubjectCount) {
        let bestStartIndex = 0;
        
        if (numberMatches.length > expectedSubjectCount) {
            const firstVal = numberMatches[0].value;
            const isFirstSerial = (numberMatches[0].index < 10) && (firstVal <= 500);
            const lastVal = numberMatches[numberMatches.length - 1].value;
            const isLastTotal = lastVal > 100 || (numberMatches.length - expectedSubjectCount === 1 && !isFirstSerial);

            if (isFirstSerial && (numberMatches.length - 1 === expectedSubjectCount)) {
                bestStartIndex = 1;
            } else if (isLastTotal && (numberMatches.length - 1 === expectedSubjectCount)) {
                bestStartIndex = 0;
            } else {
                let bestScore = -1;
                for (let i = 0; i <= numberMatches.length - expectedSubjectCount; i++) {
                    let score = 0;
                    for (let j = i; j < i + expectedSubjectCount; j++) {
                        if (numberMatches[j].value <= 100) score += 10;
                        if (j > i) {
                            const dist = numberMatches[j].index - (numberMatches[j-1].index + numberMatches[j-1].length);
                            if (dist <= 5) score += 5;
                        }
                    }
                    if (score > bestScore) {
                        bestScore = score;
                        bestStartIndex = i;
                    }
                }
            }
        }

        const selectedMatches = numberMatches.slice(bestStartIndex, bestStartIndex + expectedSubjectCount);
        markNumbers = selectedMatches.map(m => m.value);
        markMatchRanges = selectedMatches;
    } else {
        markNumbers = numberMatches.map(m => m.value);
        markMatchRanges = numberMatches;
    }

    // Mask selected mark number ranges in remaining string with spaces
    let nameChars = remaining.split('');
    markMatchRanges.forEach(m => {
        for (let i = m.index; i < m.index + m.length; i++) {
            nameChars[i] = ' ';
        }
    });

    let rawName = nameChars.join('');

    // Clean up rawName to isolate student name
    rawName = rawName.replace(/^[0-9]+[\.\s\-\)]+/, '').replace(/^\#?[0-9]+\s+/, '');
    rawName = rawName.replace(/\b(Name|USN|Sl\.?\s*No|S\.?\s*No|Marks|Total|Result|Status|Pass|Fail|Rank|Percentage)\b/gi, '');
    rawName = rawName.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    let cleanName = rawName.replace(/\s+/g, ' ').trim();

    if (!cleanName || cleanName.length < 2 || /^\d+$/.test(cleanName)) {
        cleanName = 'Unknown';
    }

    return {
        name: cleanName,
        usn: usn,
        rawMarks: markNumbers
    };
}

/**
 * PDF Parsing Engine using pdf-parse text extraction (Format Agnostic)
 */
async function parsePDFBuffer(buffer) {
    const instance = new PDFParse({ data: buffer });
    const parsedData = await instance.getText();
    const fullText = parsedData.text || '';

    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Pass 1: Identify student lines and determine expected subject count
    let firstStudentLineIdx = -1;
    const studentLineMatches = [];
    const markCountFrequency = {};

    lines.forEach((line, lineIdx) => {
        const usnMatch = line.match(VTU_USN_REGEX) || line.match(GENERIC_USN_REGEX);
        if (usnMatch) {
            if (firstStudentLineIdx === -1) {
                firstStudentLineIdx = lineIdx;
            }

            const usnStart = line.indexOf(usnMatch[0]);
            const usnEnd = usnStart + usnMatch[0].length;
            const remaining = line.slice(0, usnStart) + ' ' + line.slice(usnEnd);

            const numMatches = (remaining.match(/\b\d{1,3}\b/g) || []);
            const numCount = numMatches.length;

            if (numCount > 0) {
                markCountFrequency[numCount] = (markCountFrequency[numCount] || 0) + 1;
            }

            studentLineMatches.push({
                line,
                usnMatch,
                numCount
            });
        }
    });

    if (studentLineMatches.length === 0) {
        throw new Error('No valid student records detected in the PDF.');
    }

    // Most frequent number count per line represents expected subject count
    let expectedSubjectCount = 0;
    let maxFreq = 0;

    Object.keys(markCountFrequency).forEach(countStr => {
        const count = parseInt(countStr, 10);
        const freq = markCountFrequency[countStr];
        if (freq > maxFreq) {
            maxFreq = freq;
            expectedSubjectCount = count;
        }
    });

    const headerText = lines.slice(0, firstStudentLineIdx !== -1 ? firstStudentLineIdx : 10).join(' ');
    let subjectNames = extractSubjectsFromPDFHeader(headerText, expectedSubjectCount);

    if (subjectNames.length > 0 && subjectNames.length < expectedSubjectCount) {
        expectedSubjectCount = subjectNames.length;
    } else if (subjectNames.length === 0) {
        for (let i = 0; i < expectedSubjectCount; i++) {
            subjectNames.push(`Subject ${i + 1}`);
        }
    }

    // Pass 2: Extract student records using extractMarksAndNameFromLine
    const rawStudents = studentLineMatches.map(item => {
        return extractMarksAndNameFromLine(item.line, item.usnMatch, expectedSubjectCount);
    });

    subjectNames = subjectNames.map(formatSubjectHeader);

    if (subjectNames.length < expectedSubjectCount) {
        for (let i = subjectNames.length; i < expectedSubjectCount; i++) {
            subjectNames.push(`Subject ${i + 1}`);
        }
    }

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

module.exports = {
    parseResultFile
};
