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
 * Determine academic class based on percentage & pass status
 */
function getAcademicClass(percentage, isPass) {
    if (!isPass) return 'Fail / Backlog';
    if (percentage >= 75) return 'FCD (Distinction)';
    if (percentage >= 60) return 'First Class (FC)';
    if (percentage >= 50) return 'Second Class (SC)';
    return 'Pass Class (PC)';
}

/**
 * Fetch PNG chart image buffer from QuickChart API
 */
function fetchChartImage(chartConfig, width = 600, height = 340) {
    return new Promise((resolve) => {
        try {
            const url = `https://quickchart.io/chart?w=${width}&h=${height}&bkg=white&f=png&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
            const req = https.get(url, (res) => {
                if (res.statusCode !== 200) return resolve(null);
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            });
            req.on('error', () => resolve(null));
            req.setTimeout(4000, () => {
                req.destroy();
                resolve(null);
            });
        } catch (err) {
            resolve(null);
        }
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
            Title: `Academic Performance Report - ${result.filename}`,
            Author: 'College Result Analyzer System',
            Subject: 'Official Executive College Result Analysis Report'
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
                        parseFloat(((stats.fcdCount || 0) / totStudents * 100).toFixed(2)),
                        parseFloat(((stats.fcCount || 0) / totStudents * 100).toFixed(2)),
                        parseFloat(((stats.scCount || 0) / totStudents * 100).toFixed(2)),
                        parseFloat(((stats.failCount || 0) / totStudents * 100).toFixed(2)),
                        parseFloat((stats.passPercentage || 0).toFixed(2))
                    ]
                }
            ]
        },
        options: {
            plugins: {
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
                { label: 'FCD', backgroundColor: '#2563EB', data: subjects.map(s => s.fcdCount || 0) },
                { label: 'FC', backgroundColor: '#DC2626', data: subjects.map(s => s.fcCount || 0) },
                { label: 'SC', backgroundColor: '#16A34A', data: subjects.map(s => s.scCount || 0) },
                { label: 'Pass', backgroundColor: '#8B5CF6', data: subjects.map(s => s.passClassCount || 0) },
                { label: 'AB', backgroundColor: '#06B6D4', data: subjects.map(s => s.abCount || 0) },
                { label: 'With Held', backgroundColor: '#F97316', data: subjects.map(s => s.withHeldCount || 0) },
                { label: 'Fail', backgroundColor: '#93C5FD', data: subjects.map(s => s.failCount || 0) },
                { label: 'Total Pass', backgroundColor: '#F43F5E', data: subjects.map(s => s.totalPassCount || 0) },
                { label: '%', backgroundColor: '#84CC16', data: subjects.map(s => parseFloat((s.passPercentage || 0).toFixed(2))) }
            ]
        },
        options: {
            plugins: {
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
    // PAGE 1: HEADER & PIC 1 OVERALL CLASS PERFORMANCE CHART & TABLE
    // =========================================================

    // Top Accent Line
    doc.rect(0, 0, pageWidth, 6).fill('#2563EB');

    // Title Header Box
    currentY = 25;
    doc.roundedRect(margin, currentY, contentWidth, 65, 6).fill('#0F172A');
    doc.fillColor('#93C5FD').fontSize(7.5).font('Helvetica-Bold').text('KLE SOCIETY ACADEMIC DOSSIER', margin + 16, currentY + 12);
    doc.fillColor('#FFFFFF').fontSize(15).font('Helvetica-Bold').text('COLLEGE RESULT ANALYSIS REPORT', margin + 16, currentY + 24);
    
    const cleanFilename = (result.filename || 'Academic_Result.pdf').substring(0, 55);
    doc.fillColor('#CBD5E1').fontSize(8.5).font('Helvetica').text(`Document: ${cleanFilename}`, margin + 16, currentY + 44);

    const uploadDateStr = new Date(result.uploadDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica-Bold').text(`DATE: ${uploadDateStr}`, margin + contentWidth - 160, currentY + 14, { width: 144, align: 'right' });

    currentY += 78;

    // Pic 1: Overall Class Performance Bar Chart Section
    currentY = drawSectionHeader('1. Overall Class Performance Bar Chart & Statistics (Pic 1)', currentY);

    if (pic1ChartBuf) {
        doc.image(pic1ChartBuf, margin, currentY, { width: contentWidth, height: 190 });
        currentY += 195;
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
        ((stats.fcdCount || 0) / totStudents * 100).toFixed(2),
        ((stats.fcCount || 0) / totStudents * 100).toFixed(2),
        ((stats.scCount || 0) / totStudents * 100).toFixed(2),
        ((stats.failCount || 0) / totStudents * 100).toFixed(2),
        (stats.passPercentage || 0).toFixed(2)
    ];
    percentages.forEach((val, i) => {
        const textVal = val ? `${val}` : '';
        doc.fillColor('#2563EB').fontSize(8.5).font('Helvetica-Bold').text(textVal, p1x, currentY + 5, { width: p1Cols[i].width, align: 'center' });
        p1x += p1Cols[i].width;
    });
    currentY += 30;

    // =========================================================
    // PAGE 2: PIC 3 SUBJECT-WISE PERFORMANCE BAR CHART
    // =========================================================
    forceNewPage('2. Subject-Wise Performance Bar Chart Breakdown (Pic 3)');

    if (pic3ChartBuf) {
        doc.image(pic3ChartBuf, margin, currentY, { width: contentWidth, height: 260 });
        currentY += 270;
    }

    // =========================================================
    // SECTION 3: PIC 4 SUBJECT-WISE SUMMARY TABLE
    // =========================================================
    checkPageBreak(200, '3. Subject-Wise Performance Summary Table (Pic 4)');
    currentY = drawSectionHeader('3. Subject-Wise Performance Summary Table (Pic 4)', currentY);

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
        checkPageBreak(18, '3. Subject Summary Table (Continued)');
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 18).stroke('#E2E8F0');

        let rx = margin;
        doc.fillColor('#0F172A').fontSize(7).font('Helvetica-Bold').text(getShortCode(sub.name), rx + 2, currentY + 5, { width: p4Cols[0].width - 4 });
        rx += p4Cols[0].width;

        doc.fillColor('#64748B').fontSize(7).font('Helvetica').text('', rx + 2, currentY + 5, { width: p4Cols[1].width - 4 }); // Blank Staff Name
        rx += p4Cols[1].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sub.fcdCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[2].width - 4, align: 'center' });
        rx += p4Cols[2].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sub.fcCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[3].width - 4, align: 'center' });
        rx += p4Cols[3].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sub.scCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[4].width - 4, align: 'center' });
        rx += p4Cols[4].width;

        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(`${sub.passClassCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[5].width - 4, align: 'center' });
        rx += p4Cols[5].width;

        doc.fillColor('#06B6D4').fontSize(7).font('Helvetica-Bold').text(`${sub.abCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[6].width - 4, align: 'center' });
        rx += p4Cols[6].width;

        doc.fillColor('#F97316').fontSize(7).font('Helvetica-Bold').text(`${sub.withHeldCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[7].width - 4, align: 'center' });
        rx += p4Cols[7].width;

        doc.fillColor('#B91C1C').fontSize(7).font('Helvetica-Bold').text(`${sub.failCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[8].width - 4, align: 'center' });
        rx += p4Cols[8].width;

        doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(`${sub.totalPassCount || 0}`, rx + 2, currentY + 5, { width: p4Cols[9].width - 4, align: 'center' });
        rx += p4Cols[9].width;

        doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica-Bold').text(`${(sub.passPercentage || 0).toFixed(2)}`, rx + 2, currentY + 5, { width: p4Cols[10].width - 4, align: 'center' });
        rx += p4Cols[10].width;

        doc.fillColor('#0F172A').fontSize(7).font('Helvetica').text(`${sub.appearedCount || stats.totalStudents}`, rx + 2, currentY + 5, { width: p4Cols[11].width - 4, align: 'center' });

        currentY += 18;
    });

    currentY += 25;

    // =========================================================
    // SECTION 4: PIC 2 BOTTOM SUBJECT STATISTICS TABLE
    // =========================================================
    checkPageBreak(220, '4. Bottom Subject Statistics Table (Pic 2)');
    currentY = drawSectionHeader('4. Subject Statistics Matrix (Pic 2 Format)', currentY);

    const p2Metrics = [
        { key: 'appearedCount', label: 'Appeared' },
        { key: 'fcdCount', label: 'FCD' },
        { key: 'fcCount', label: 'FC' },
        { key: 'scCount', label: 'SC' },
        { key: 'passClassCount', label: 'pass' },
        { key: 'failCount', label: 'Fail' },
        { key: 'abCount', label: 'AB' },
        { key: 'withHeldCount', label: 'With Held' },
        { key: 'passPercentage', label: 'Percentage' },
        { key: 'staffName', label: 'Staff Name' },
        { key: 'staffSig', label: 'Staff Signature' }
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

    // Draw Pic 2 Matrix Header
    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text('Metric', margin + 4, currentY + 5, { width: metricLabelColW - 8 });
    
    let mx = margin + metricLabelColW;
    subjects.forEach(sub => {
        doc.fillColor('#FFFFFF').fontSize(6.5).font('Helvetica-Bold').text(getShortCode(sub.name), mx, currentY + 5, { width: subColW, align: 'center' });
        mx += subColW;
    });

    doc.fillColor('#93C5FD').fontSize(7.5).font('Helvetica-Bold').text('Overall Batch', mx + 4, currentY + 5, { width: rightBoxW - 8, align: 'center' });
    currentY += 18;

    p2Metrics.forEach((m, idx) => {
        checkPageBreak(18, '4. Subject Statistics Matrix (Pic 2 Continued)');

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 18).stroke('#E2E8F0');

        doc.fillColor('#0F172A').fontSize(7).font('Helvetica-Bold').text(m.label, margin + 4, currentY + 5, { width: metricLabelColW - 8 });

        let cx = margin + metricLabelColW;
        subjects.forEach(sub => {
            let displayVal = '';
            if (m.key === 'staffName' || m.key === 'staffSig') displayVal = '';
            else if (m.key === 'passPercentage') displayVal = `${(sub.passPercentage || 0).toFixed(1)}`;
            else displayVal = `${sub[m.key] || 0}`;

            doc.fillColor('#334155').fontSize(7).font('Helvetica').text(displayVal, cx, currentY + 5, { width: subColW, align: 'center' });
            cx += subColW;
        });

        // Right side overall box item
        if (overallRightBox[idx]) {
            const ob = overallRightBox[idx];
            doc.fillColor('#1E40AF').fontSize(7).font('Helvetica-Bold').text(`${ob.label}: ${ob.val}`, cx + 4, currentY + 5, { width: rightBoxW - 8, align: 'center' });
        }

        currentY += 18;
    });

    currentY += 25;

    // =========================================================
    // SECTION 5: CANDIDATE RESULT RECORDS TABLE (CLEAN PDF LIST)
    // =========================================================
    forceNewPage('5. Candidate Academic Record Directory');

    const candCols = [
        { name: 'Rank', width: 35, align: 'center' },
        { name: 'USN', width: 90, align: 'left' },
        { name: 'Student Name', width: 175, align: 'left' },
        { name: 'Total Marks', width: 70, align: 'center' },
        { name: 'Percentage', width: 65, align: 'center' },
        { name: 'Status', width: 80, align: 'center' }
    ];

    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#0F172A');
    let cx = margin;
    candCols.forEach(c => {
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text(c.name, cx + 4, currentY + 5, { width: c.width - 8, align: c.align });
        cx += c.width;
    });
    currentY += 18;

    students.forEach((st, idx) => {
        checkPageBreak(18, '5. Candidate Record Directory (Continued)');

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 18).stroke('#E2E8F0');

        let rx = margin;
        doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica-Bold').text(`#${st.rank || idx + 1}`, rx + 4, currentY + 5, { width: candCols[0].width - 8, align: 'center' });
        rx += candCols[0].width;

        doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold').text(st.usn || '-', rx + 4, currentY + 5, { width: candCols[1].width - 8 });
        rx += candCols[1].width;

        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text((st.name || '-').substring(0, 32), rx + 4, currentY + 5, { width: candCols[2].width - 8 });
        rx += candCols[2].width;

        doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text(`${st.totalMarks}`, rx + 4, currentY + 5, { width: candCols[3].width - 8, align: 'center' });
        rx += candCols[3].width;

        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(`${st.percentage}%`, rx + 4, currentY + 5, { width: candCols[4].width - 8, align: 'center' });
        rx += candCols[4].width;

        const isP = st.isPass;
        doc.fillColor(isP ? '#15803D' : '#B91C1C').fontSize(7.5).font('Helvetica-Bold').text(isP ? 'PASS' : 'FAIL', rx + 4, currentY + 5, { width: candCols[5].width - 8, align: 'center' });

        currentY += 18;
    });

    currentY += 25;

    // Signature Endorsement Box
    checkPageBreak(80, '6. Verification & Signature Endorsement');
    const sigW = (contentWidth - 20) / 3;
    const sigs = [
        { title: 'Faculty Coordinator', label: 'Prepared By' },
        { title: 'Head of Department', label: 'Verified By' },
        { title: 'Principal / Dean', label: 'Approved By' }
    ];

    sigs.forEach((sig, i) => {
        const sx = margin + i * (sigW + 10);
        doc.roundedRect(sx, currentY, sigW, 45, 4).stroke('#CBD5E1');
        doc.moveTo(sx + 10, currentY + 28).lineTo(sx + sigW - 10, currentY + 28).dash(2, { space: 2 }).stroke('#94A3B8').undash();
        doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(sig.label, sx + 6, currentY + 5, { width: sigW - 12, align: 'center' });
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(sig.title, sx + 6, currentY + 31, { width: sigW - 12, align: 'center' });
    });

    // Footers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        const footerY = pageHeight - 25;
        doc.moveTo(margin, footerY - 5).lineTo(pageWidth - margin, footerY - 5).stroke('#E2E8F0');
        doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(
            'College Result Analyzer System • Official Executive Academic Evaluation Report • Confidential',
            margin,
            footerY,
            { width: contentWidth, align: 'center', lineBreak: false }
        );
        doc.page.margins.bottom = margin;
    }

    doc.end();
}

module.exports = {
    generateResultPDF
};
