const PDFDocument = require('pdfkit');
const https = require('https');

/**
 * Extract short subject code for compact headers
 */
function getShortCode(subjectName) {
    if (!subjectName) return 'SUB';
    const match = subjectName.match(/\(([^)]+)\)/);
    if (match) return match[1].trim();
    if (subjectName.length > 8) return subjectName.substring(0, 7) + '.';
    return subjectName;
}

/**
 * Fetch PNG chart image buffer from QuickChart API using HTTP POST with retry and 15s timeout
 */
function fetchChartImage(chartConfig, width = 600, height = 340, retries = 2) {
    return new Promise((resolve) => {
        const attempt = (remainingRetries) => {
            try {
                const data = JSON.stringify({
                    chart: chartConfig,
                    width: width,
                    height: height,
                    backgroundColor: 'white',
                    format: 'png'
                });

                const options = {
                    hostname: 'quickchart.io',
                    port: 443,
                    path: '/chart',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(data)
                    },
                    timeout: 15000 // 15s timeout for complex multi-bar charts
                };

                const req = https.request(options, (res) => {
                    if (res.statusCode !== 200) {
                        if (remainingRetries > 0) {
                            return setTimeout(() => attempt(remainingRetries - 1), 1000);
                        }
                        return resolve(null);
                    }
                    const chunks = [];
                    res.on('data', (chunk) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks)));
                });

                req.on('error', () => {
                    if (remainingRetries > 0) {
                        return setTimeout(() => attempt(remainingRetries - 1), 1000);
                    }
                    resolve(null);
                });

                req.on('timeout', () => {
                    req.destroy();
                    if (remainingRetries > 0) {
                        return setTimeout(() => attempt(remainingRetries - 1), 1000);
                    }
                    resolve(null);
                });

                req.write(data);
                req.end();
            } catch (err) {
                if (remainingRetries > 0) {
                    return setTimeout(() => attempt(remainingRetries - 1), 1000);
                }
                resolve(null);
            }
        };

        attempt(retries);
    });
}


/**
 * Main Async PDF Generator Handler for College Result Analyzer
 */
async function generateResultPDF(result, students, res) {
    const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
        info: {
            Title: `Academic Performance Report - ${result.collegeName || 'College Result Analysis'}`,
            Author: 'College Result Analyzer System',
            Subject: 'Official Executive College Result Evaluation Report'
        }
    });

    const cleanFilenameStr = (result.filename || 'Result_Analysis').replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Result_Report_${cleanFilenameStr}.pdf"`);
    doc.pipe(res);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2; // 515.28 pt
    const pageBottom = pageHeight - margin - 35; // 766.89 pt

    let currentY = margin;

    function drawSectionHeader(title, y) {
        doc.rect(margin, y, 4, 16).fill('#1E40AF');
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(title, margin + 12, y + 2);
        return y + 24;
    }

    function forceNewPage(sectionTitle = '') {
        doc.addPage();
        currentY = margin;
        if (sectionTitle) {
            currentY = drawSectionHeader(sectionTitle, currentY);
        }
    }

    function checkPageBreak(neededHeight, titleOnNewPage = '') {
        if (currentY + neededHeight > pageBottom) {
            doc.addPage();
            currentY = margin;
            if (titleOnNewPage) {
                currentY = drawSectionHeader(titleOnNewPage, currentY);
            }
            return true;
        }
        return false;
    }

    const stats = result.overallStats || { totalStudents: 0, passCount: 0, failCount: 0, passPercentage: 0 };
    const subjects = result.subjects || [];
    const totStudents = stats.totalStudents || students.length || 1;
    const withHeldStudentsCount = stats.withHeldCount || (students || []).filter(s => s.remark === 'WITHHELD').length || 0;
    const evaluatedTotalStudents = Math.max(1, totStudents - withHeldStudentsCount);

    const maxTotalMarks = subjects.reduce((acc, sub) => {
        const is200 = /BINT803|INTERNSHIP/i.test(sub.name || '') || (students || []).some(st => {
            const m = Number(st.marks?.[sub.name]) || Number(st.subjectDetails?.[sub.name]?.total) || 0;
            return m > 100;
        });
        return acc + (is200 ? 200 : 100);
    }, 0) || (subjects.length * 100 || 100);

    // Compute live accurate subject statistics (excluding absent from appeared, excluding withheld from pass percentage)
    const computedSubStatsMap = {};
    subjects.forEach(sub => {
        const is200 = /BINT803|INTERNSHIP/i.test(sub.name || '') || (students || []).some(st => {
            const m = Number(st.marks?.[sub.name]) || Number(st.subjectDetails?.[sub.name]?.total) || 0;
            return m > 100;
        });
        const passThreshold = is200 ? 70 : 35;
        const fcdThreshold = is200 ? 140 : 70;
        const fcThreshold = is200 ? 120 : 60;
        const scThreshold = is200 ? 100 : 50;

        let appeared = 0, fcd = 0, fc = 0, sc = 0, passClass = 0, fail = 0, ab = 0, withHeld = 0;
        students.forEach(st => {
            const det = st.subjectDetails?.[sub.name] || {};
            const resUpper = (det.result || '').toUpperCase();
            const inStr = String(det.in ?? '').trim().toUpperCase();
            const isAbsent = det.isAbsent || resUpper === 'AB' || resUpper === 'A' || resUpper === 'ABSENT' || inStr === 'A' || inStr === 'AB';
            const isWithHeld = resUpper === 'W' || resUpper === 'WH' || resUpper === 'WITH HELD' || resUpper === 'WITHHELD';
            const mark = isAbsent ? 0 : (st.marks && st.marks[sub.name] !== undefined ? Number(st.marks[sub.name]) : (det.total !== undefined ? Number(det.total) : 0));

            if (isAbsent) {
                ab++;
            } else if (isWithHeld) {
                withHeld++;
                appeared++;
            } else {
                appeared++;
                if (mark < passThreshold || resUpper === 'F' || resUpper === 'FAIL') {
                    fail++;
                } else if (mark >= fcdThreshold) {
                    fcd++;
                } else if (mark >= fcThreshold) {
                    fc++;
                } else if (mark >= scThreshold) {
                    sc++;
                } else {
                    passClass++;
                }
            }
        });

        const totPass = fcd + fc + sc + passClass;
        const evaluatedSubCount = Math.max(0, appeared - withHeld);
        const pct = evaluatedSubCount > 0 ? (totPass / evaluatedSubCount) * 100 : 0;

        computedSubStatsMap[sub.name] = {
            appearedCount: appeared,
            fcdCount: fcd,
            fcCount: fc,
            scCount: sc,
            passClassCount: passClass,
            failCount: fail,
            abCount: ab,
            withHeldCount: withHeld,
            totalPassCount: totPass,
            passPercentage: pct
        };
    });

    // ---------------------------------------------------------
    // CHART CONFIGURATIONS (Pic 1 and Pic 3 Bar Charts)
    // ---------------------------------------------------------

    // Pic 1 Bar Chart (Overall Performance: Count & Percentage)
    const pic1ChartConfig = {
        type: 'bar',
        data: {
            labels: ['Appeared', 'FCD', 'FC', 'SC', 'Total Fail', 'Total Pass'],
            datasets: [
                {
                    label: 'Count',
                    backgroundColor: '#3B82F6',
                    data: [stats.totalStudents || 0, stats.fcdCount || 0, stats.fcCount || 0, stats.scCount || 0, stats.failCount || 0, stats.passCount || 0]
                },
                {
                    label: 'Percentage (%)',
                    backgroundColor: '#B91C1C',
                    data: [
                        null,
                        parseFloat(((stats.fcdCount || 0) / evaluatedTotalStudents * 100).toFixed(2)),
                        parseFloat(((stats.fcCount || 0) / evaluatedTotalStudents * 100).toFixed(2)),
                        parseFloat(((stats.scCount || 0) / evaluatedTotalStudents * 100).toFixed(2)),
                        parseFloat(((stats.failCount || 0) / evaluatedTotalStudents * 100).toFixed(2)),
                        parseFloat((stats.passPercentage || 0).toFixed(2))
                    ]
                }
            ]
        },
        options: {
            plugins: {
                title: { display: true, text: 'Overall Class Performance Bar Chart', font: { size: 14, weight: 'bold' } },
                legend: { position: 'top', labels: { font: { size: 10, weight: 'bold' } } },
                datalabels: { display: true, anchor: 'end', align: 'top', font: { weight: 'bold', size: 9 } }
            }
        }
    };

    // Pic 3 Multi-Bar Chart (Subject-wise Performance Breakdown)
    const pic3ChartConfig = {
        type: 'bar',
        data: {
            labels: subjects.map(s => getShortCode(s.name)),
            datasets: [
                { label: 'FCD', backgroundColor: '#2563EB', data: subjects.map(s => (computedSubStatsMap[s.name] || s).fcdCount || 0) },
                { label: 'FC', backgroundColor: '#DC2626', data: subjects.map(s => (computedSubStatsMap[s.name] || s).fcCount || 0) },
                { label: 'SC', backgroundColor: '#16A34A', data: subjects.map(s => (computedSubStatsMap[s.name] || s).scCount || 0) },
                { label: 'Pass', backgroundColor: '#10B981', data: subjects.map(s => (computedSubStatsMap[s.name] || s).passClassCount || 0) },
                { label: 'AB', backgroundColor: '#C58CB5', data: subjects.map(s => (computedSubStatsMap[s.name] || s).abCount || 0) },
                { label: 'With Held', backgroundColor: '#7CBCE8', data: subjects.map(s => (computedSubStatsMap[s.name] || s).withHeldCount || 0) },
                { label: 'Fail', backgroundColor: '#B8860B', data: subjects.map(s => (computedSubStatsMap[s.name] || s).failCount || 0) },
                { label: 'Total Pass', backgroundColor: '#F43F5E', data: subjects.map(s => (computedSubStatsMap[s.name] || s).totalPassCount || 0) },
                { label: '%', backgroundColor: '#84CC16', data: subjects.map(s => parseFloat(((computedSubStatsMap[s.name] || s).passPercentage || 0).toFixed(2))) }
            ]
        },
        options: {
            plugins: {
                title: { display: true, text: 'Subject-Wise Performance Bar Chart Breakdown', font: { size: 14, weight: 'bold' } },
                legend: { position: 'top', labels: { font: { size: 8, weight: 'bold' }, boxWidth: 12 } },
                datalabels: { display: true, anchor: 'end', align: 'top', font: { weight: 'bold', size: 7.5 } }
            }
        }
    };

    const [pic1ChartBuf, pic3ChartBuf] = await Promise.all([
        fetchChartImage(pic1ChartConfig, 650, 320),
        fetchChartImage(pic3ChartConfig, 750, 360)
    ]);

    // =========================================================
    // PAGE 1: HEADER & PIC 2 SECTIONS (EXECUTIVE SUMMARY & TOPPERS)
    // =========================================================

    // Top Accent Line
    doc.rect(0, 0, pageWidth, 6).fill('#2563EB');

    // Title Header Box with College Name & Date
    currentY = 25;
    const collegeNameText = result.collegeName || "KLE Society's KLE College of Engineering and Technology, Chikodi";
    doc.roundedRect(margin, currentY, contentWidth, 55, 6).fill('#0F172A');
    doc.fillColor('#93C5FD').fontSize(7.5).font('Helvetica-Bold').text('KLE SOCIETY ACADEMIC DOSSIER', margin + 16, currentY + 10);
    doc.fillColor('#FFFFFF').fontSize(10.5).font('Helvetica-Bold').text(collegeNameText, margin + 16, currentY + 20, { width: contentWidth - 140 });

    const uploadDateStr = new Date(result.uploadDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.fillColor('#94A3B8').fontSize(8.5).font('Helvetica-Bold').text(`DATE: ${uploadDateStr}`, margin + contentWidth - 150, currentY + 18, { width: 135, align: 'right' });

    currentY += 68;

    // ---------------------------------------------------------
    // SECTION 1: EXECUTIVE SUMMARY & BATCH STATISTICS (PIC 2 CARDS)
    // ---------------------------------------------------------
    currentY = drawSectionHeader('1. Executive Summary & Batch Statistics', currentY);

    const cardGap = 10;
    const cardW = (contentWidth - cardGap * 3) / 4;
    const cardH = 50;

    // Card 1: Total Candidates
    doc.roundedRect(margin, currentY, cardW, cardH, 6).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#0F172A').fontSize(14).font('Helvetica-Bold').text(`${stats.totalStudents || 0}`, margin + 10, currentY + 8);
    doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text('TOTAL CANDIDATES', margin + 10, currentY + 26);
    doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica').text('Evaluated Batch', margin + 10, currentY + 36);

    // Card 2: Successful
    doc.roundedRect(margin + cardW + cardGap, currentY, cardW, cardH, 6).fillAndStroke('#F0FDF4', '#BBF7D0');
    doc.fillColor('#16A34A').fontSize(14).font('Helvetica-Bold').text(`${stats.passCount || 0}`, margin + cardW + cardGap + 10, currentY + 8);
    doc.fillColor('#16A34A').fontSize(7).font('Helvetica-Bold').text('SUCCESSFUL', margin + cardW + cardGap + 10, currentY + 26);
    doc.fillColor('#15803D').fontSize(6.5).font('Helvetica').text(`${(stats.passPercentage || 0).toFixed(1)}% Pass Rate`, margin + cardW + cardGap + 10, currentY + 36);

    // Card 3: Unsuccessful
    doc.roundedRect(margin + (cardW + cardGap) * 2, currentY, cardW, cardH, 6).fillAndStroke('#FEF2F2', '#FECACA');
    doc.fillColor('#DC2626').fontSize(14).font('Helvetica-Bold').text(`${stats.failCount || 0}`, margin + (cardW + cardGap) * 2 + 10, currentY + 8);
    doc.fillColor('#DC2626').fontSize(7).font('Helvetica-Bold').text('UNSUCCESSFUL', margin + (cardW + cardGap) * 2 + 10, currentY + 26);
    doc.fillColor('#B91C1C').fontSize(6.5).font('Helvetica').text(`${(100 - (stats.passPercentage || 0)).toFixed(1)}% Fail / Backlogs`, margin + (cardW + cardGap) * 2 + 10, currentY + 36);

    // Card 4: Overall Pass %
    doc.roundedRect(margin + (cardW + cardGap) * 3, currentY, cardW, cardH, 6).fillAndStroke('#EFF6FF', '#BFDBFE');
    doc.fillColor('#2563EB').fontSize(14).font('Helvetica-Bold').text(`${(stats.passPercentage || 0).toFixed(2)}%`, margin + (cardW + cardGap) * 3 + 10, currentY + 8);
    doc.fillColor('#2563EB').fontSize(7).font('Helvetica-Bold').text('OVERALL PASS %', margin + (cardW + cardGap) * 3 + 10, currentY + 26);
    doc.fillColor('#1D4ED8').fontSize(6.5).font('Helvetica').text('Batch Average', margin + (cardW + cardGap) * 3 + 10, currentY + 36);

    currentY += cardH + 18;

    // ---------------------------------------------------------
    // SECTION 2: ACADEMIC TOPPERS (HALL OF FAME - PIC 2 LAYOUT)
    // ---------------------------------------------------------
    currentY = drawSectionHeader('2. Academic Toppers (Hall of Fame)', currentY);

    const topperCols = [
        { name: 'Rank', width: 45, align: 'center' },
        { name: 'USN', width: 95, align: 'left' },
        { name: 'Student Name', width: 175, align: 'left' },
        { name: 'Marks Scored', width: 75, align: 'center' },
        { name: 'Percentage', width: 60, align: 'center' },
        { name: 'Class / Result', width: 65, align: 'center' }
    ];

    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#0F172A');
    let tcx = margin;
    topperCols.forEach(c => {
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text(c.name, tcx + 4, currentY + 5, { width: c.width - 8, align: c.align });
        tcx += c.width;
    });
    currentY += 18;

    const sortedByMarks = [...(students || [])].sort((a, b) => (b.totalMarks || 0) - (a.totalMarks || 0));
    const top5Students = sortedByMarks.slice(0, 5);
    top5Students.forEach((st, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 18).stroke('#E2E8F0');

        let rx = margin;
        doc.fillColor('#2563EB').fontSize(8).font('Helvetica-Bold').text(`#${idx + 1}`, rx + 4, currentY + 5, { width: topperCols[0].width - 8, align: 'center' });
        rx += topperCols[0].width;

        doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold').text(st.usn || '-', rx + 4, currentY + 5, { width: topperCols[1].width - 8 });
        rx += topperCols[1].width;

        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text((st.name || '-').substring(0, 32), rx + 4, currentY + 5, { width: topperCols[2].width - 8 });
        rx += topperCols[2].width;

        doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text(`${st.totalMarks}/${maxTotalMarks}`, rx + 4, currentY + 5, { width: topperCols[3].width - 8, align: 'center' });
        rx += topperCols[3].width;

        doc.fillColor('#15803D').fontSize(8).font('Helvetica-Bold').text(`${st.percentage}%`, rx + 4, currentY + 5, { width: topperCols[4].width - 8, align: 'center' });
        rx += topperCols[4].width;

        let classStr = 'Pass Class';
        let classColor = '#334155';
        if (st.percentage >= 70) {
            classStr = 'FCD (Distinction)';
            classColor = '#15803D';
        } else if (st.percentage >= 60) {
            classStr = 'FC (First Class)';
            classColor = '#2563EB';
        } else if (st.percentage >= 50) {
            classStr = 'SC (Second Class)';
            classColor = '#D97706';
        }

        doc.fillColor(classColor).fontSize(7).font('Helvetica-Bold').text(classStr, rx + 2, currentY + 5, { width: topperCols[5].width - 4, align: 'center' });

        currentY += 18;
    });

    currentY += 20;

    // ---------------------------------------------------------
    // SECTION 3: OVERALL CLASS PERFORMANCE CHART & TABLE
    // ---------------------------------------------------------
    checkPageBreak(250, '3. Overall Class Performance Bar Chart & Statistics');
    currentY = drawSectionHeader('3. Overall Class Performance Bar Chart & Statistics', currentY);

    if (pic1ChartBuf) {
        doc.image(pic1ChartBuf, margin, currentY, { width: contentWidth, height: 180 });
        currentY += 185;
    } else {
        // High-Quality Native Vector Overall Performance Bar Chart Fallback
        drawNativeOverallChart(doc, margin, currentY, contentWidth, 180, stats, totStudents);
        currentY += 190;
    }

    // Pic 1 Summary Table Below Chart
    const p1Cols = [
        { name: 'Appeared', width: 80, align: 'center' },
        { name: 'FCD', width: 80, align: 'center' },
        { name: 'FC', width: 80, align: 'center' },
        { name: 'SC', width: 80, align: 'center' },
        { name: 'Total Fail', width: 95, align: 'center' },
        { name: 'Total Pass', width: 95, align: 'center' }
    ];

    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#1E293B');
    let p1x = margin;
    p1Cols.forEach(c => {
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(c.name, p1x, currentY + 5, { width: c.width, align: c.align });
        p1x += c.width;
    });
    currentY += 18;

    // Counts Row
    doc.rect(margin, currentY, contentWidth, 18).fill('#FFFFFF');
    doc.rect(margin, currentY, contentWidth, 18).stroke('#CBD5E1');
    p1x = margin;
    const counts = [stats.totalStudents || 0, stats.fcdCount || 0, stats.fcCount || 0, stats.scCount || 0, stats.failCount || 0, stats.passCount || 0];
    counts.forEach((val, i) => {
        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(`${val}`, p1x, currentY + 5, { width: p1Cols[i].width, align: 'center' });
        p1x += p1Cols[i].width;
    });
    currentY += 18;

    // Percentages Row
    doc.rect(margin, currentY, contentWidth, 18).fill('#F8FAFC');
    doc.rect(margin, currentY, contentWidth, 18).stroke('#CBD5E1');
    p1x = margin;
    const percentages = [
        '',
        ((stats.fcdCount || 0) / evaluatedTotalStudents * 100).toFixed(2),
        ((stats.fcCount || 0) / evaluatedTotalStudents * 100).toFixed(2),
        ((stats.scCount || 0) / evaluatedTotalStudents * 100).toFixed(2),
        ((stats.failCount || 0) / evaluatedTotalStudents * 100).toFixed(2),
        (stats.passPercentage || 0).toFixed(2)
    ];
    percentages.forEach((val, i) => {
        const textVal = val ? `${val}` : '';
        doc.fillColor('#2563EB').fontSize(8.5).font('Helvetica-Bold').text(textVal, p1x, currentY + 5, { width: p1Cols[i].width, align: 'center' });
        p1x += p1Cols[i].width;
    });
    currentY += 30;

    // =========================================================
    // PAGE 2: SUBJECT-WISE PERFORMANCE BAR CHART
    // =========================================================
    forceNewPage('2. Subject-Wise Performance Bar Chart Breakdown');

    if (pic3ChartBuf) {
        doc.image(pic3ChartBuf, margin, currentY, { width: contentWidth, height: 260 });
        currentY += 270;
    } else {
        // High-Quality Native Vector Subject Performance Multi-Bar Chart Fallback
        drawNativeSubjectChart(doc, margin, currentY, contentWidth, 260, subjects, computedSubStatsMap);
        currentY += 270;
    }

    // =========================================================
    // SECTION 3: SUBJECT-WISE SUMMARY TABLE
    // =========================================================
    checkPageBreak(200, '3. Subject-Wise Performance Summary Table');
    currentY = drawSectionHeader('3. Subject-Wise Performance Summary Table', currentY);

    const p4Cols = [
        { name: 'Subject With Code', width: 90, align: 'left' },
        { name: 'Staff Name', width: 75, align: 'left' },
        { name: 'FCD', width: 32, align: 'center' },
        { name: 'FC', width: 32, align: 'center' },
        { name: 'SC', width: 32, align: 'center' },
        { name: 'Pass', width: 32, align: 'center' },
        { name: 'AB', width: 30, align: 'center' },
        { name: 'With Held', width: 45, align: 'center' },
        { name: 'Fail', width: 32, align: 'center' },
        { name: 'Total Pass', width: 45, align: 'center' },
        { name: '%', width: 40, align: 'center' },
        { name: 'Appeared', width: 30, align: 'center' }
    ];

    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#0F172A');
    let p4x = margin;
    p4Cols.forEach(c => {
        doc.fillColor('#FFFFFF').fontSize(6.5).font('Helvetica-Bold').text(c.name, p4x + 2, currentY + 5, { width: c.width - 4, align: c.align });
        p4x += c.width;
    });
    currentY += 18;

    subjects.forEach((sub, idx) => {
        const sStat = computedSubStatsMap[sub.name] || sub;
        checkPageBreak(18, '3. Subject Summary Table (Continued)');
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 18).stroke('#E2E8F0');

        let rx = margin;
        doc.fillColor('#0F172A').fontSize(7).font('Helvetica-Bold').text(getShortCode(sub.name), rx + 2, currentY + 5, { width: p4Cols[0].width - 4 });
        rx += p4Cols[0].width;

        doc.fillColor('#64748B').fontSize(7).font('Helvetica').text('', rx + 2, currentY + 5, { width: p4Cols[1].width - 4 }); // Blank Staff Name
        rx += p4Cols[1].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sStat.fcdCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[2].width - 4, align: 'center' });
        rx += p4Cols[2].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sStat.fcCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[3].width - 4, align: 'center' });
        rx += p4Cols[3].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sStat.scCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[4].width - 4, align: 'center' });
        rx += p4Cols[4].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sStat.passClassCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[5].width - 4, align: 'center' });
        rx += p4Cols[5].width;

        doc.fillColor('#C58CB5').fontSize(7).font('Helvetica-Bold').text(`${sStat.abCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[6].width - 4, align: 'center' });
        rx += p4Cols[6].width;

        doc.fillColor('#0284C7').fontSize(7).font('Helvetica-Bold').text(`${sStat.withHeldCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[7].width - 4, align: 'center' });
        rx += p4Cols[7].width;

        doc.fillColor('#B91C1C').fontSize(7).font('Helvetica-Bold').text(`${sStat.failCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[8].width - 4, align: 'center' });
        rx += p4Cols[8].width;

        doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(`${sStat.totalPassCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[9].width - 4, align: 'center' });
        rx += p4Cols[9].width;

        doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica-Bold').text(`${(sStat.passPercentage || 0).toFixed(2)}`, rx + 2, currentY + 5, { width: p4Cols[10].width - 4, align: 'center' });
        rx += p4Cols[10].width;

        doc.fillColor('#0F172A').fontSize(7).font('Helvetica').text(`${sStat.appearedCount !== undefined ? sStat.appearedCount : (sub.appearedCount || stats.totalStudents)}`, rx + 2, currentY + 5, { width: p4Cols[11].width - 4, align: 'center' });

        currentY += 18;
    });

    currentY += 25;

    // =========================================================
    // SECTION 4: SUBJECT STATISTICS MATRIX (PIC 2 LAYOUT - NO EXTRA HEADING STRING)
    // =========================================================
    checkPageBreak(220, 'Subject Statistics Summary Matrix');

    const p2Metrics = [
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

    const overallRightBox = [
        { label: 'FCD', val: stats.fcdCount || 0 },
        { label: 'FC', val: stats.fcCount || 0 },
        { label: 'SC', val: stats.scCount || 0 },
        { label: 'Pass', val: stats.passClassCount || 0 },
        { label: 'fail', val: stats.failCount || 0 },
        { label: 'Percentage', val: `${(stats.passPercentage || 0).toFixed(2)}%` }
    ];

    const metricLabelColW = 85;
    const rightBoxW = 90;
    const subColW = (contentWidth - metricLabelColW - rightBoxW) / Math.max(subjects.length, 1);

    // Draw Subject Statistics Matrix Header
    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text('Metric', margin + 4, currentY + 5, { width: metricLabelColW - 8 });

    let mx = margin + metricLabelColW;
    subjects.forEach(sub => {
        doc.fillColor('#FFFFFF').fontSize(6.5).font('Helvetica-Bold').text(getShortCode(sub.name), mx, currentY + 5, { width: subColW, align: 'center' });
        mx += subColW;
    });

    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text('Total Overall', mx + 4, currentY + 5, { width: rightBoxW - 8, align: 'center' });
    currentY += 18;

    p2Metrics.forEach((m, idx) => {
        checkPageBreak(18, 'Subject Statistics Summary Matrix (Continued)');
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 18).stroke('#E2E8F0');

        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(m.label, margin + 4, currentY + 5, { width: metricLabelColW - 8 });

        let cx = margin + metricLabelColW;
        subjects.forEach(sub => {
            const sStat = computedSubStatsMap[sub.name] || sub;
            let val = sStat[m.key];
            let displayVal = `${val ?? 0}`;
            if (m.key === 'passPercentage') {
                displayVal = `${(parseFloat(val) || 0).toFixed(2)}%`;
            }

            let cellColor = '#334155';
            if (m.key === 'passPercentage') cellColor = '#2563EB';
            else if (m.key === 'failCount') cellColor = '#DC2626';
            else if (m.key === 'abCount') cellColor = '#C58CB5';
            else if (m.key === 'withHeldCount') cellColor = '#0284C7';

            doc.fillColor(cellColor).fontSize(7).font(m.key === 'passPercentage' ? 'Helvetica-Bold' : 'Helvetica').text(displayVal, cx, currentY + 5, { width: subColW, align: 'center' });
            cx += subColW;
        });

        const rItem = overallRightBox[idx];
        if (rItem) {
            doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(`${rItem.label}: ${rItem.val}`, cx + 4, currentY + 5, { width: rightBoxW - 8, align: 'center' });
        }

        currentY += 18;
    });

    currentY += 25;

    // =========================================================
    // SUBJECT-WISE 10 TOPPERS & ALL FAILED STUDENTS SECTION
    // =========================================================
    forceNewPage('Subject-Wise Top 10 Toppers & Failed Candidates');

    subjects.forEach((sub) => {
        checkPageBreak(220, `Subject: ${getShortCode(sub.name)} Evaluation`);

        // Subject Header Banner
        doc.roundedRect(margin, currentY, contentWidth, 20, 4).fill('#1E293B');
        doc.fillColor('#93C5FD').fontSize(9).font('Helvetica-Bold').text(`Subject: ${sub.name}`, margin + 8, currentY + 5);
        currentY += 24;

        // Extract student marks for this subject
        const subStudents = (students || []).map(st => {
            const markVal = Number(st.marks?.[sub.name]) || 0;
            const det = st.subjectDetails?.[sub.name] || {};
            const inVal = det.in !== undefined ? det.in : '';
            const exVal = det.ex !== undefined ? det.ex : '';
            const resUpper = (det.result || '').toUpperCase();
            const inStr = String(det.in ?? '').trim().toUpperCase();
            const isWithHeld = det.isWithHeld || resUpper === 'WH' || resUpper === 'W' || resUpper === 'WITH HELD' || resUpper === 'WITHHELD';
            const isAbsent = !isWithHeld && (det.isAbsent || resUpper === 'AB' || resUpper === 'ABSENT' || resUpper === 'A' || inStr === 'A' || inStr === 'AB');

            let isSubPass = false;
            if (!isWithHeld && !isAbsent && resUpper !== 'F' && resUpper !== 'FAIL' && markVal >= 35) {
                isSubPass = true;
            }

            return {
                name: st.name,
                usn: st.usn,
                in: inVal,
                ex: exVal,
                mark: markVal,
                isPass: isSubPass,
                isWithHeld,
                isAbsent,
                result: isWithHeld ? 'WH' : (isAbsent ? 'AB' : resUpper)
            };
        });

        // Sort students descending by subject mark
        subStudents.sort((a, b) => b.mark - a.mark);

        const subToppers = subStudents.filter(s => s.isPass && !s.isWithHeld && !s.isAbsent).slice(0, 10);
        const subFailed = subStudents.filter(s => !s.isPass && !s.isWithHeld);
        const subWithHeld = subStudents.filter(s => s.isWithHeld);

        // -------------------------------------------------------------
        // Sub Table 1: Top 10 Subject Toppers
        // -------------------------------------------------------------
        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text('• Top 10 Subject Toppers', margin + 4, currentY + 2);
        currentY += 14;

        const subTopCols = [
            { name: 'Sl No', width: 35, align: 'center' },
            { name: 'USN', width: 85, align: 'left' },
            { name: 'Student Name', width: 160, align: 'left' },
            { name: 'IN', width: 45, align: 'center' },
            { name: 'EX', width: 45, align: 'center' },
            { name: 'Marks Obtained', width: 80, align: 'center' },
            { name: 'Status', width: 65, align: 'center' }
        ];

        doc.rect(margin, currentY, contentWidth, 16).fill('#0F172A');
        let stx = margin;
        subTopCols.forEach(c => {
            doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(c.name, stx + 4, currentY + 4, { width: c.width - 8, align: c.align });
            stx += c.width;
        });
        currentY += 16;

        subToppers.forEach((t, idx) => {
            checkPageBreak(16, `Subject: ${getShortCode(sub.name)} Toppers`);
            const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(margin, currentY, contentWidth, 16).fill(rowBg);
            doc.rect(margin, currentY, contentWidth, 16).stroke('#E2E8F0');

            let rx = margin;
            doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica-Bold').text(`#${idx + 1}`, rx + 4, currentY + 4, { width: subTopCols[0].width - 8, align: 'center' });
            rx += subTopCols[0].width;

            doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold').text(t.usn || '-', rx + 4, currentY + 4, { width: subTopCols[1].width - 8 });
            rx += subTopCols[1].width;

            doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text((t.name || '-').substring(0, 28), rx + 4, currentY + 4, { width: subTopCols[2].width - 8 });
            rx += subTopCols[2].width;

            doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${t.in !== undefined && t.in !== '' ? t.in : '-'}`, rx + 4, currentY + 4, { width: subTopCols[3].width - 8, align: 'center' });
            rx += subTopCols[3].width;

            doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${t.ex !== undefined && t.ex !== '' ? t.ex : '-'}`, rx + 4, currentY + 4, { width: subTopCols[4].width - 8, align: 'center' });
            rx += subTopCols[4].width;

            doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text(`${t.mark}/100`, rx + 4, currentY + 4, { width: subTopCols[5].width - 8, align: 'center' });
            rx += subTopCols[5].width;

            let topperStatus = 'PASS';
            if (t.mark >= 70) topperStatus = 'FCD';
            else if (t.mark >= 60) topperStatus = 'FC';
            else if (t.mark >= 50) topperStatus = 'SC';

            doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(topperStatus, rx + 4, currentY + 4, { width: subTopCols[6].width - 8, align: 'center' });

            currentY += 16;
        });

        currentY += 12;

        // -------------------------------------------------------------
        // Sub Table 2: Subject Failed Students List (Excluding Withheld)
        // -------------------------------------------------------------
        doc.fillColor('#B91C1C').fontSize(8.5).font('Helvetica-Bold').text(`• Failed Students List (${subFailed.length} Failed)`, margin + 4, currentY + 2);
        currentY += 14;

        if (subFailed.length === 0) {
            doc.rect(margin, currentY, contentWidth, 18).fill('#F0FDF4');
            doc.rect(margin, currentY, contentWidth, 18).stroke('#BBF7D0');
            doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text('Nil (100% Pass Rate - All appeared candidates cleared this subject)', margin + 10, currentY + 5);
            currentY += 24;
        } else {
            const subFailCols = [
                { name: 'Sl No', width: 35, align: 'center' },
                { name: 'USN', width: 85, align: 'left' },
                { name: 'Student Name', width: 160, align: 'left' },
                { name: 'IN', width: 45, align: 'center' },
                { name: 'EX', width: 45, align: 'center' },
                { name: 'Marks Obtained', width: 80, align: 'center' },
                { name: 'Status', width: 65, align: 'center' }
            ];

            doc.rect(margin, currentY, contentWidth, 16).fill('#7F1D1D');
            let sfx = margin;
            subFailCols.forEach(c => {
                doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(c.name, sfx + 4, currentY + 4, { width: c.width - 8, align: c.align });
                sfx += c.width;
            });
            currentY += 16;

            subFailed.forEach((f, idx) => {
                checkPageBreak(16, `Subject: ${getShortCode(sub.name)} Failed List`);
                const isAbsent = f.result === 'AB' || f.result === 'ABSENT' || f.result === 'A' || f.isAbsent;

                const rowBg = isAbsent ? '#FAF5F8' : (idx % 2 === 0 ? '#FEF2F2' : '#FFFFFF');
                const strokeBg = isAbsent ? '#E9D5E2' : '#FECACA';
                const statusColor = isAbsent ? '#C58CB5' : '#B91C1C';
                const statusText = isAbsent ? 'ABSENT' : 'FAIL';

                doc.rect(margin, currentY, contentWidth, 16).fill(rowBg);
                doc.rect(margin, currentY, contentWidth, 16).stroke(strokeBg);

                let rx = margin;
                doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold').text(`${idx + 1}`, rx + 4, currentY + 4, { width: subFailCols[0].width - 8, align: 'center' });
                rx += subFailCols[0].width;

                doc.fillColor(isAbsent ? '#862D6E' : '#991B1B').fontSize(7.5).font('Helvetica-Bold').text(f.usn || '-', rx + 4, currentY + 4, { width: subFailCols[1].width - 8 });
                rx += subFailCols[1].width;

                doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text((f.name || '-').substring(0, 28), rx + 4, currentY + 4, { width: subFailCols[2].width - 8 });
                rx += subFailCols[2].width;

                doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${f.in !== undefined && f.in !== '' ? f.in : '-'}`, rx + 4, currentY + 4, { width: subFailCols[3].width - 8, align: 'center' });
                rx += subFailCols[3].width;

                doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${f.ex !== undefined && f.ex !== '' ? f.ex : '-'}`, rx + 4, currentY + 4, { width: subFailCols[4].width - 8, align: 'center' });
                rx += subFailCols[4].width;

                const markDisplay = isAbsent ? 'AB' : `${f.mark}/100`;
                doc.fillColor(statusColor).fontSize(8).font('Helvetica-Bold').text(markDisplay, rx + 4, currentY + 4, { width: subFailCols[5].width - 8, align: 'center' });
                rx += subFailCols[5].width;

                doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold').text(statusText, rx + 4, currentY + 4, { width: subFailCols[6].width - 8, align: 'center' });

                currentY += 16;
            });

            currentY += 14;
        }

        // -------------------------------------------------------------
        // Sub Table 3: Subject Withheld Students List (if any)
        // -------------------------------------------------------------
        if (subWithHeld.length > 0) {
            checkPageBreak(36, `Subject: ${getShortCode(sub.name)} Withheld List`);
            doc.fillColor('#0284C7').fontSize(8.5).font('Helvetica-Bold').text(`• Withheld Students List (${subWithHeld.length} Withheld)`, margin + 4, currentY + 2);
            currentY += 14;

            const subWhCols = [
                { name: 'Sl No', width: 35, align: 'center' },
                { name: 'USN', width: 85, align: 'left' },
                { name: 'Student Name', width: 160, align: 'left' },
                { name: 'IN', width: 45, align: 'center' },
                { name: 'EX', width: 45, align: 'center' },
                { name: 'Marks Obtained', width: 80, align: 'center' },
                { name: 'Status', width: 65, align: 'center' }
            ];

            doc.rect(margin, currentY, contentWidth, 16).fill('#0369A1'); // Deep Ocean Blue header
            let swx = margin;
            subWhCols.forEach(c => {
                doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(c.name, swx + 4, currentY + 4, { width: c.width - 8, align: c.align });
                swx += c.width;
            });
            currentY += 16;

            subWithHeld.forEach((w, idx) => {
                checkPageBreak(16, `Subject: ${getShortCode(sub.name)} Withheld List`);
                const rowBg = idx % 2 === 0 ? '#F0F9FF' : '#FFFFFF';
                const strokeBg = '#BAE6FD';
                const statusColor = '#0284C7';

                doc.rect(margin, currentY, contentWidth, 16).fill(rowBg);
                doc.rect(margin, currentY, contentWidth, 16).stroke(strokeBg);

                let rx = margin;
                doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold').text(`${idx + 1}`, rx + 4, currentY + 4, { width: subWhCols[0].width - 8, align: 'center' });
                rx += subWhCols[0].width;

                doc.fillColor('#0369A1').fontSize(7.5).font('Helvetica-Bold').text(w.usn || '-', rx + 4, currentY + 4, { width: subWhCols[1].width - 8 });
                rx += subWhCols[1].width;

                doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text((w.name || '-').substring(0, 28), rx + 4, currentY + 4, { width: subWhCols[2].width - 8 });
                rx += subWhCols[2].width;

                doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${w.in !== undefined && w.in !== '' ? w.in : '-'}`, rx + 4, currentY + 4, { width: subWhCols[3].width - 8, align: 'center' });
                rx += subWhCols[3].width;

                doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${w.ex !== undefined && w.ex !== '' ? w.ex : '-'}`, rx + 4, currentY + 4, { width: subWhCols[4].width - 8, align: 'center' });
                rx += subWhCols[4].width;

                doc.fillColor(statusColor).fontSize(8).font('Helvetica-Bold').text('WH', rx + 4, currentY + 4, { width: subWhCols[5].width - 8, align: 'center' });
                rx += subWhCols[5].width;

                doc.fillColor(statusColor).fontSize(7.5).font('Helvetica-Bold').text('WITHHELD', rx + 4, currentY + 4, { width: subWhCols[6].width - 8, align: 'center' });

                currentY += 16;
            });

            currentY += 18;
        }
    });

    // Signature Endorsement Box - Positioned at bottom of page
    const sigBoxY = pageHeight - 85;
    if (currentY > sigBoxY) {
        doc.addPage();
    }
    const sigW = (contentWidth - 20) / 3;
    const sigs = [
        { title: 'Faculty Coordinator', label: 'Prepared By' },
        { title: 'Head of Department', label: 'Verified By' },
        { title: 'Principal / Dean', label: 'Approved By' }
    ];

    sigs.forEach((sig, i) => {
        const sx = margin + i * (sigW + 10);
        doc.roundedRect(sx, sigBoxY, sigW, 45, 4).stroke('#CBD5E1');
        doc.moveTo(sx + 10, sigBoxY + 28).lineTo(sx + sigW - 10, sigBoxY + 28).dash(2, { space: 2 }).stroke('#94A3B8').undash();
        doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(sig.label, sx + 6, sigBoxY + 5, { width: sigW - 12, align: 'center' });
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(sig.title, sx + 6, sigBoxY + 31, { width: sigW - 12, align: 'center' });
    });

    // Footers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        const footerY = pageHeight - 25;
        doc.moveTo(margin, footerY - 5).lineTo(pageWidth - margin, footerY - 5).stroke('#E2E8F0');
        doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(
            'College Result Analyzer System • Official Academic Evaluation Report • Confidential',
            margin,
            footerY,
            { width: contentWidth, align: 'center', lineBreak: false }
        );
        doc.page.margins.bottom = margin;
    }

    doc.end();
}

/**
 * High-quality Native Vector Overall Performance Bar Chart (Fallback)
 */
function drawNativeOverallChart(doc, x, y, width, height, stats, totStudents) {
    const chartW = width;
    const chartH = height;
    const padL = 35;
    const padR = 15;
    const padT = 25;
    const padB = 25;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    // Background & border
    doc.roundedRect(x, y, chartW, chartH, 6).fillAndStroke('#FFFFFF', '#E2E8F0');

    // Title
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('Overall Class Performance Bar Chart', x, y + 8, { width: chartW, align: 'center' });

    // Legend
    const legX = x + chartW - 160;
    doc.rect(legX, y + 8, 8, 8).fill('#3B82F6');
    doc.fillColor('#334155').fontSize(7).font('Helvetica').text('Count', legX + 12, y + 8);
    doc.rect(legX + 60, y + 8, 8, 8).fill('#B91C1C');
    doc.fillColor('#334155').fontSize(7).font('Helvetica').text('Percentage (%)', legX + 72, y + 8);

    const evaluatedTotal = Math.max(1, (stats.totalStudents || totStudents || 1) - (stats.withHeldCount || 0));

    const categories = [
        { label: 'Appeared', count: stats.totalStudents || 0, pct: 100 },
        { label: 'FCD', count: stats.fcdCount || 0, pct: parseFloat(((stats.fcdCount || 0) / evaluatedTotal * 100).toFixed(1)) },
        { label: 'FC', count: stats.fcCount || 0, pct: parseFloat(((stats.fcCount || 0) / evaluatedTotal * 100).toFixed(1)) },
        { label: 'SC', count: stats.scCount || 0, pct: parseFloat(((stats.scCount || 0) / evaluatedTotal * 100).toFixed(1)) },
        { label: 'Total Fail', count: stats.failCount || 0, pct: parseFloat(((stats.failCount || 0) / evaluatedTotal * 100).toFixed(1)) },
        { label: 'Total Pass', count: stats.passCount || 0, pct: parseFloat((stats.passPercentage || 0).toFixed(1)) }
    ];

    const maxVal = Math.max(...categories.map(c => c.count), 100);
    const numTicks = 4;

    // Y Axis Grid lines
    for (let t = 0; t <= numTicks; t++) {
        const val = Math.round((maxVal / numTicks) * t);
        const gy = y + padT + plotH - (val / maxVal) * plotH;
        doc.moveTo(x + padL, gy).lineTo(x + padL + plotW, gy).stroke('#F1F5F9');
        doc.fillColor('#94A3B8').fontSize(6).font('Helvetica').text(`${val}`, x + 5, gy - 3, { width: padL - 10, align: 'right' });
    }

    const groupW = plotW / categories.length;
    const barW = Math.min(16, (groupW - 12) / 2);

    categories.forEach((cat, idx) => {
        const gx = x + padL + idx * groupW + groupW / 2;
        const b1H = maxVal > 0 ? (cat.count / maxVal) * plotH : 0;
        const b2H = maxVal > 0 ? (cat.pct / maxVal) * plotH : 0;

        // Bar 1: Count
        const b1X = gx - barW - 2;
        const b1Y = y + padT + plotH - b1H;
        if (b1H > 0) {
            doc.rect(b1X, b1Y, barW, b1H).fill('#3B82F6');
            doc.fillColor('#1E40AF').fontSize(6).font('Helvetica-Bold').text(`${cat.count}`, b1X - 4, Math.max(y + padT, b1Y - 8), { width: barW + 8, align: 'center' });
        }

        // Bar 2: Percentage
        const b2X = gx + 2;
        const b2Y = y + padT + plotH - b2H;
        if (b2H > 0 && cat.label !== 'Appeared') {
            doc.rect(b2X, b2Y, barW, b2H).fill('#B91C1C');
            doc.fillColor('#991B1B').fontSize(5.5).font('Helvetica-Bold').text(`${cat.pct}%`, b2X - 4, Math.max(y + padT, b2Y - 8), { width: barW + 8, align: 'center' });
        }

        // X Label
        doc.fillColor('#475569').fontSize(6.5).font('Helvetica-Bold').text(cat.label, gx - groupW / 2 + 2, y + padT + plotH + 5, { width: groupW - 4, align: 'center' });
    });
}

/**
 * High-quality Native Vector Subject-Wise Multi-Bar Chart (Fallback)
 */
function drawNativeSubjectChart(doc, x, y, width, height, subjects, computedSubStatsMap) {
    const chartW = width;
    const chartH = height;
    const padL = 30;
    const padR = 10;
    const padT = 35;
    const padB = 30;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    doc.roundedRect(x, y, chartW, chartH, 6).fillAndStroke('#FFFFFF', '#E2E8F0');

    // Title
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('Subject-Wise Performance Bar Chart Breakdown', x, y + 6, { width: chartW, align: 'center' });

    // Legend
    const legends = [
        { label: 'FCD', color: '#2563EB' },
        { label: 'FC', color: '#DC2626' },
        { label: 'SC', color: '#16A34A' },
        { label: 'Pass', color: '#10B981' },
        { label: 'AB', color: '#C58CB5' },
        { label: 'WH', color: '#7CBCE8' },
        { label: 'Fail', color: '#B8860B' },
        { label: 'Tot Pass', color: '#F43F5E' },
        { label: '%', color: '#84CC16' }
    ];

    let legX = x + 15;
    legends.forEach(leg => {
        doc.rect(legX, y + 18, 6, 6).fill(leg.color);
        doc.fillColor('#334155').fontSize(5.5).font('Helvetica').text(leg.label, legX + 8, y + 18);
        legX += 50;
    });

    const subCount = subjects.length || 1;
    const maxVal = Math.max(...subjects.map(s => {
        const stat = computedSubStatsMap[s.name] || s;
        return Math.max(stat.appearedCount || 0, 100);
    }), 100);

    const numTicks = 4;
    for (let t = 0; t <= numTicks; t++) {
        const val = Math.round((maxVal / numTicks) * t);
        const gy = y + padT + plotH - (val / maxVal) * plotH;
        doc.moveTo(x + padL, gy).lineTo(x + padL + plotW, gy).stroke('#F1F5F9');
        doc.fillColor('#94A3B8').fontSize(6).font('Helvetica').text(`${val}`, x + 2, gy - 3, { width: padL - 6, align: 'right' });
    }

    const groupW = plotW / subCount;
    const numBars = 9;
    const barW = Math.max(3, (groupW - 6) / numBars);

    subjects.forEach((sub, sIdx) => {
        const stat = computedSubStatsMap[sub.name] || sub;
        const vals = [
            { val: stat.fcdCount || 0, color: '#2563EB' },
            { val: stat.fcCount || 0, color: '#DC2626' },
            { val: stat.scCount || 0, color: '#16A34A' },
            { val: stat.passClassCount || 0, color: '#10B981' },
            { val: stat.abCount || 0, color: '#C58CB5' },
            { val: stat.withHeldCount || 0, color: '#7CBCE8' },
            { val: stat.failCount || 0, color: '#B8860B' },
            { val: stat.totalPassCount || 0, color: '#F43F5E' },
            { val: parseFloat(Number(stat.passPercentage || 0).toFixed(1)), color: '#84CC16' }
        ];

        const gx = x + padL + sIdx * groupW + 3;
        vals.forEach((item, bIdx) => {
            const bH = maxVal > 0 ? (item.val / maxVal) * plotH : 0;
            const bx = gx + bIdx * barW;
            const by = y + padT + plotH - bH;
            if (bH > 0) {
                doc.rect(bx, by, barW - 0.5, bH).fill(item.color);
            }
        });

        // Subject code label
        const codeText = getShortCode(sub.name);
        doc.fillColor('#1E293B').fontSize(5.5).font('Helvetica-Bold').text(codeText, gx - 2, y + padT + plotH + 4, { width: groupW, align: 'center', lineBreak: false });
    });
}

module.exports = {
    generateResultPDF
};

