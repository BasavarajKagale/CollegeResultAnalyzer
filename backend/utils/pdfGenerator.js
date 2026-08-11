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

    // Helper: Draw Section Header with left blue accent pill
    function drawSectionHeader(title, y) {
        doc.rect(margin, y, 4, 16).fill('#1E40AF');
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(title, margin + 12, y + 2);
        return y + 24;
    }

    // Helper: Dynamic Page Overflow Check (Strictly prevents blank pages)
    function checkPageBreak(neededHeight, titleOnNewPage = '') {
        if (currentY + neededHeight > pageBottom && currentY > margin + 15) {
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
    const passPct = stats.passPercentage || 0;
    const failPct = 100 - passPct;
    const subjects = result.subjects || [];
    const totalStudentsCount = stats.totalStudents || students.length || 1;

    // Calculate Y-axis upper limit with 25% buffer room so top legends and datalabels NEVER overlap!
    const maxSubjectAppeared = Math.max(...subjects.map(s => (s.passCount || 0) + (s.failCount || 0)), 100);
    const barYAxisMax = Math.ceil(maxSubjectAppeared * 1.25);

    // Pre-calculate Grade Distribution
    let distinction = 0, firstClass = 0, secondClass = 0, passClass = 0, failedCount = 0;
    students.forEach(s => {
        if (!s.isPass) failedCount++;
        else if (s.percentage >= 75) distinction++;
        else if (s.percentage >= 60) firstClass++;
        else if (s.percentage >= 50) secondClass++;
        else passClass++;
    });

    // Subject Averages
    const subjectAverages = subjects.map(sub => {
        let total = 0;
        students.forEach(st => {
            total += Number(st.marks[sub.name]) || 0;
        });
        return students.length > 0 ? parseFloat((total / students.length).toFixed(1)) : 0;
    });

    // Chart 4.1 Config (Overall Result Doughnut)
    const chart1Config = {
        type: 'doughnut',
        data: {
            labels: [
                `Passed: ${stats.passCount || 0} (${passPct.toFixed(1)}%)`, 
                `Failed: ${stats.failCount || 0} (${failPct.toFixed(1)}%)`
            ],
            datasets: [{ 
                data: [stats.passCount || 0, stats.failCount || 0], 
                backgroundColor: ['#16A34A', '#DC2626'],
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                title: { display: false },
                legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, color: '#334155' } },
                datalabels: {
                    display: true,
                    color: '#FFFFFF',
                    font: { weight: 'bold', size: 12 },
                    formatter: (val) => val > 50 ? val : ''
                }
            }
        }
    };

    // Chart 4.2 Config (Grade Breakdown Doughnut)
    const chart2Config = {
        type: 'doughnut',
        data: {
            labels: [
                `Distinction 75%+: ${distinction} (${((distinction/totalStudentsCount)*100).toFixed(1)}%)`,
                `First Class 60-74%: ${firstClass} (${((firstClass/totalStudentsCount)*100).toFixed(1)}%)`,
                `Second Class 50-59%: ${secondClass} (${((secondClass/totalStudentsCount)*100).toFixed(1)}%)`,
                `Pass Class 35-49%: ${passClass} (${((passClass/totalStudentsCount)*100).toFixed(1)}%)`,
                `Failed: ${failedCount} (${((failedCount/totalStudentsCount)*100).toFixed(1)}%)`
            ],
            datasets: [{ 
                data: [distinction, firstClass, secondClass, passClass, failedCount], 
                backgroundColor: ['#D97706', '#16A34A', '#2563EB', '#EAB308', '#DC2626'],
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                title: { display: false },
                legend: { position: 'bottom', labels: { font: { size: 10, weight: 'bold' }, color: '#334155' } },
                datalabels: {
                    display: true,
                    color: '#FFFFFF',
                    font: { weight: 'bold', size: 11 },
                    formatter: (val) => val > 30 ? val : ''
                }
            }
        }
    };

    // Chart 4.3 Config (Bar Chart - Legend at BOTTOM so datalabels sit in clean top buffer)
    const chart3Config = {
        type: 'bar',
        data: {
            labels: subjects.map(s => getShortCode(s.name)),
            datasets: [
                { label: 'Passed Candidates', data: subjects.map(s => s.passCount), backgroundColor: '#16A34A', borderRadius: 4 },
                { label: 'Failed Candidates', data: subjects.map(s => s.failCount), backgroundColor: '#DC2626', borderRadius: 4 }
            ]
        },
        options: {
            plugins: {
                title: { display: false },
                legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, color: '#334155' } },
                datalabels: {
                    display: true,
                    align: 'end',
                    anchor: 'end',
                    font: { weight: 'bold', size: 9.5 },
                    color: '#0F172A'
                }
            },
            scales: {
                y: { beginAtZero: true, max: barYAxisMax, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
            }
        }
    };

    // Chart 4.4 Config (Line Chart - Legend at BOTTOM so datalabels sit in clean top buffer)
    const chart4Config = {
        type: 'line',
        data: {
            labels: subjects.map(s => getShortCode(s.name)),
            datasets: [
                { label: 'Peak Score in Subject', data: subjects.map(s => s.highestMarks), borderColor: '#2563EB', backgroundColor: 'rgba(37, 99, 235, 0.08)', fill: true, tension: 0.2, pointRadius: 5 },
                { label: 'Batch Average Score', data: subjectAverages, borderColor: '#0D9488', backgroundColor: 'transparent', tension: 0.2, pointRadius: 5 }
            ]
        },
        options: {
            plugins: {
                title: { display: false },
                legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, color: '#334155' } },
                datalabels: {
                    display: true,
                    align: 'top',
                    font: { weight: 'bold', size: 9 },
                    color: '#1E40AF',
                    formatter: (val) => val
                }
            },
            scales: {
                y: { min: 0, max: 115, grid: { color: '#F1F5F9' }, ticks: { stepSize: 20, font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
            }
        }
    };

    const [chart1Buf, chart2Buf, chart3Buf, chart4Buf] = await Promise.all([
        fetchChartImage(chart1Config, 600, 340),
        fetchChartImage(chart2Config, 600, 340),
        fetchChartImage(chart3Config, 600, 340),
        fetchChartImage(chart4Config, 600, 340)
    ]);

    // ==========================================
    // PAGE 1: EXECUTIVE SUMMARY & DASHBOARD
    // ==========================================

    // Top Decorative Accent Bar
    doc.rect(0, 0, pageWidth, 6).fill('#2563EB');

    // Header Banner Box
    currentY = 25;
    const headerBoxHeight = 70;
    doc.roundedRect(margin, currentY, contentWidth, headerBoxHeight, 6).fill('#0F172A');

    doc.fillColor('#93C5FD').fontSize(7.5).font('Helvetica-Bold').text('INSTITUTIONAL EVALUATION & ACADEMIC DOSSIER', margin + 16, currentY + 12, { characterSpacing: 1 });
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('COLLEGE RESULT ANALYSIS REPORT', margin + 16, currentY + 24);
    
    const cleanFilename = (result.filename || 'Academic_Result.pdf').substring(0, 55);
    doc.fillColor('#CBD5E1').fontSize(8.5).font('Helvetica').text(`Document: ${cleanFilename}`, margin + 16, currentY + 46);

    const uploadDateStr = new Date(result.uploadDate || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica-Bold').text(`DATE: ${uploadDateStr}`, margin + contentWidth - 160, currentY + 14, { width: 144, align: 'right' });
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(`REF: REF-${(result._id || '').toString().slice(-8).toUpperCase()}`, margin + contentWidth - 160, currentY + 28, { width: 144, align: 'right' });

    currentY += headerBoxHeight + 15;

    // 1. Executive Summary KPI Cards
    currentY = drawSectionHeader('1. Executive Summary & Batch Statistics', currentY);

    const cardGap = 9;
    const cardWidth = (contentWidth - cardGap * 3) / 4;
    const cardHeight = 52;

    const kpis = [
        { label: 'TOTAL CANDIDATES', value: `${stats.totalStudents || 0}`, subtext: 'Evaluated Batch', bgColor: '#F8FAFC', borderColor: '#E2E8F0', valColor: '#0F172A' },
        { label: 'SUCCESSFUL', value: `${stats.passCount || 0}`, subtext: `${passPct.toFixed(1)}% Pass Rate`, bgColor: '#F0FDF4', borderColor: '#BBF7D0', valColor: '#16A34A' },
        { label: 'UNSUCCESSFUL', value: `${stats.failCount || 0}`, subtext: `${failPct.toFixed(1)}% Fail / Backlogs`, bgColor: '#FEF2F2', borderColor: '#FECACA', valColor: '#DC2626' },
        { label: 'OVERALL PASS %', value: `${passPct.toFixed(2)}%`, subtext: 'Batch Average', bgColor: '#EFF6FF', borderColor: '#BFDBFE', valColor: '#2563EB' }
    ];

    kpis.forEach((kpi, idx) => {
        const cx = margin + idx * (cardWidth + cardGap);
        doc.roundedRect(cx, currentY, cardWidth, cardHeight, 6).fillAndStroke(kpi.bgColor, kpi.borderColor);
        doc.fillColor(kpi.valColor).fontSize(14).font('Helvetica-Bold').text(kpi.value, cx + 8, currentY + 8, { width: cardWidth - 16, align: 'left' });
        doc.fillColor('#475569').fontSize(6.5).font('Helvetica-Bold').text(kpi.label, cx + 8, currentY + 27, { width: cardWidth - 16 });
        doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(kpi.subtext, cx + 8, currentY + 37, { width: cardWidth - 16 });
    });

    currentY += cardHeight + 16;

    // 2. Academic Toppers (Top 5 Overall Toppers)
    currentY = drawSectionHeader('2. Academic Toppers (Top 5 Overall Toppers)', currentY);

    const top5Overall = students.slice().sort((a, b) => b.totalMarks - a.totalMarks).slice(0, 5);

    const topperCols = [
        { name: 'Rank', width: 35, align: 'center' },
        { name: 'USN', width: 90, align: 'left' },
        { name: 'Student Name', width: 160, align: 'left' },
        { name: 'Total Marks', width: 75, align: 'center' },
        { name: 'Percentage', width: 65, align: 'center' },
        { name: 'Class / Result', width: 90, align: 'left' }
    ];

    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#1E293B');
    let tx = margin;
    topperCols.forEach(col => {
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text(col.name, tx + 4, currentY + 5, { width: col.width - 8, align: col.align });
        tx += col.width;
    });
    currentY += 18;

    top5Overall.forEach((top, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 20).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 20).stroke('#E2E8F0');

        let rx = margin;
        
        const rankBadgeColor = idx === 0 ? '#FEF3C7' : idx === 1 ? '#F1F5F9' : idx === 2 ? '#FFEDD5' : '#EFF6FF';
        const rankTextColor = idx === 0 ? '#D97706' : idx === 1 ? '#475569' : idx === 2 ? '#C2410C' : '#2563EB';
        doc.roundedRect(rx + 6, currentY + 3, 22, 14, 3).fill(rankBadgeColor);
        doc.fillColor(rankTextColor).fontSize(8).font('Helvetica-Bold').text(`#${idx + 1}`, rx + 6, currentY + 5, { width: 22, align: 'center' });
        rx += topperCols[0].width;

        doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text(top.usn || '-', rx + 4, currentY + 5, { width: topperCols[1].width - 8, align: 'left' });
        rx += topperCols[1].width;

        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(top.name || '-', rx + 4, currentY + 5, { width: topperCols[2].width - 8, align: 'left' });
        rx += topperCols[2].width;

        doc.fillColor('#1E40AF').fontSize(8.5).font('Helvetica-Bold').text(`${top.totalMarks}`, rx + 4, currentY + 5, { width: topperCols[3].width - 8, align: 'center' });
        rx += topperCols[3].width;

        doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(`${top.percentage}%`, rx + 4, currentY + 5, { width: topperCols[4].width - 8, align: 'center' });
        rx += topperCols[4].width;

        const cls = getAcademicClass(top.percentage, top.isPass);
        doc.fillColor('#15803D').fontSize(7.5).font('Helvetica').text(cls, rx + 4, currentY + 5, { width: topperCols[5].width - 8, align: 'left' });

        currentY += 20;
    });

    currentY += 16;

    // 3. Subject-Wise Analytics Table (Pic 2 Table)
    currentY = drawSectionHeader('3. Subject-Wise Analytics & Performance Breakdown', currentY);

    const subCols = [
        { name: 'Subject Title & Code', width: 170, align: 'left' },
        { name: 'Appeared', width: 50, align: 'center' },
        { name: 'Passed', width: 55, align: 'center' },
        { name: 'Failed', width: 55, align: 'center' },
        { name: 'Pass %', width: 55, align: 'center' },
        { name: 'Highest', width: 50, align: 'center' },
        { name: 'Performance Bar', width: 80, align: 'center' }
    ];

    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#1E293B');
    let sx = margin;
    subCols.forEach(col => {
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text(col.name, sx + 4, currentY + 5, { width: col.width - 8, align: col.align });
        sx += col.width;
    });
    currentY += 18;

    subjects.forEach((sub, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, 20).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, 20).stroke('#E2E8F0');

        let rx = margin;

        const cleanSubName = (sub.name || '').substring(0, 36);
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(cleanSubName, rx + 4, currentY + 5, { width: subCols[0].width - 8, align: 'left' });
        rx += subCols[0].width;

        const appeared = (sub.passCount || 0) + (sub.failCount || 0);
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${appeared}`, rx + 4, currentY + 5, { width: subCols[1].width - 8, align: 'center' });
        rx += subCols[1].width;

        doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(`${sub.passCount || 0}`, rx + 4, currentY + 5, { width: subCols[2].width - 8, align: 'center' });
        rx += subCols[2].width;

        const fCount = sub.failCount || 0;
        doc.fillColor(fCount > 0 ? '#B91C1C' : '#64748B').fontSize(7.5).font(fCount > 0 ? 'Helvetica-Bold' : 'Helvetica').text(`${fCount}`, rx + 4, currentY + 5, { width: subCols[3].width - 8, align: 'center' });
        rx += subCols[3].width;

        const sPassPct = sub.passPercentage || 0;
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(`${sPassPct.toFixed(1)}%`, rx + 4, currentY + 5, { width: subCols[4].width - 8, align: 'center' });
        rx += subCols[4].width;

        doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica-Bold').text(`${sub.highestMarks || 0}`, rx + 4, currentY + 5, { width: subCols[5].width - 8, align: 'center' });
        rx += subCols[5].width;

        // Progress bar inside cell
        const barBoxX = rx + 6;
        const barBoxY = currentY + 6;
        const barBoxWidth = subCols[6].width - 12;
        const barBoxHeight = 8;
        
        doc.roundedRect(barBoxX, barBoxY, barBoxWidth, barBoxHeight, 2).fill('#F1F5F9');
        doc.roundedRect(barBoxX, barBoxY, barBoxWidth, barBoxHeight, 2).stroke('#CBD5E1');

        const fillWidth = Math.max(0, Math.min(barBoxWidth, (barBoxWidth * sPassPct) / 100));
        if (fillWidth > 0) {
            const barColor = sPassPct >= 85 ? '#16A34A' : sPassPct >= 65 ? '#EAB308' : '#DC2626';
            doc.roundedRect(barBoxX, barBoxY, fillWidth, barBoxHeight, 2).fill(barColor);
        }

        currentY += 20;
    });

    currentY += 16;

    // ==========================================
    // SECTION 4: VISUAL ANALYTICS & CHARTS DOSSIER
    // ==========================================
    const chartW = (contentWidth - 15) / 2; // ~250 pt
    const chartH = 135; // Fixed compact height
    const gridNeededHeight = 24 + 14 + chartH + 28 + 14 + chartH + 20; // ~335 pt

    checkPageBreak(gridNeededHeight, '4. Visual Analytics & Graphical Benchmarks');

    // Row 1 Header Names & Images
    const row1Y = currentY;
    
    // Left Subtitle
    doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('Figure 4.1: Overall Result Distribution', margin, row1Y);
    // Right Subtitle
    doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('Figure 4.2: Performance Grade Breakdown', margin + chartW + 15, row1Y);
    
    const row1ImgY = row1Y + 14;
    if (chart1Buf) doc.image(chart1Buf, margin, row1ImgY, { width: chartW, height: chartH });
    if (chart2Buf) doc.image(chart2Buf, margin + chartW + 15, row1ImgY, { width: chartW, height: chartH });

    // Generous 28pt padding gap between Row 1 images and Row 2 titles! ZERO OVERLAP!
    currentY = row1ImgY + chartH + 28;

    // Row 2 Header Names & Images
    const row2Y = currentY;
    doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('Figure 4.3: Subject Pass vs Fail Comparison', margin, row2Y);
    doc.fillColor('#1E293B').fontSize(8.5).font('Helvetica-Bold').text('Figure 4.4: Peak Score vs Average Benchmark', margin + chartW + 15, row2Y);

    const row2ImgY = row2Y + 14;
    if (chart3Buf) doc.image(chart3Buf, margin, row2ImgY, { width: chartW, height: chartH });
    if (chart4Buf) doc.image(chart4Buf, margin + chartW + 15, row2ImgY, { width: chartW, height: chartH });

    currentY = row2ImgY + chartH + 24;

    // ==========================================
    // SECTION 5: TOP 5 PERFORMERS PER SUBJECT
    // ==========================================
    checkPageBreak(140, '5. Subject-Wise Academic Toppers (Top 5 per Subject)');

    const subTopCols = [
        { name: 'Rank', width: 35, align: 'center' },
        { name: 'USN', width: 100, align: 'left' },
        { name: 'Candidate Name', width: 220, align: 'left' },
        { name: 'Marks Scored', width: 80, align: 'center' },
        { name: 'Status', width: 80, align: 'center' }
    ];

    subjects.forEach((sub) => {
        checkPageBreak(124, '5. Subject-Wise Academic Toppers (Continued)');

        doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#0F172A');
        doc.fillColor('#93C5FD').fontSize(8.5).font('Helvetica-Bold').text(`SUBJECT: ${sub.name}`, margin + 8, currentY + 4);
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(`Peak Score: ${sub.highestMarks} / 100`, margin + contentWidth - 140, currentY + 4, { width: 130, align: 'right' });
        currentY += 18;

        doc.rect(margin, currentY, contentWidth, 16).fill('#334155');
        let stx = margin;
        subTopCols.forEach(col => {
            doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(col.name, stx + 4, currentY + 4, { width: col.width - 8, align: col.align });
            stx += col.width;
        });
        currentY += 16;

        const top5Sub = students.slice()
            .sort((a, b) => (Number(b.marks[sub.name]) || 0) - (Number(a.marks[sub.name]) || 0))
            .slice(0, 5);

        top5Sub.forEach((st, idx) => {
            const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
            doc.rect(margin, currentY, contentWidth, 18).stroke('#E2E8F0');

            let rx = margin;

            doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica-Bold').text(`#${idx + 1}`, rx + 4, currentY + 4, { width: subTopCols[0].width - 8, align: 'center' });
            rx += subTopCols[0].width;

            doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(st.usn || '-', rx + 4, currentY + 4, { width: subTopCols[1].width - 8 });
            rx += subTopCols[1].width;

            doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text((st.name || '-').substring(0, 35), rx + 4, currentY + 4, { width: subTopCols[2].width - 8 });
            rx += subTopCols[2].width;

            const markVal = Number(st.marks[sub.name]) || 0;
            doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text(`${markVal}`, rx + 4, currentY + 4, { width: subTopCols[3].width - 8, align: 'center' });
            rx += subTopCols[3].width;

            const isSubPass = markVal >= 35;
            doc.fillColor(isSubPass ? '#15803D' : '#B91C1C').fontSize(7.5).font('Helvetica-Bold').text(isSubPass ? 'PASS' : 'FAIL', rx + 4, currentY + 4, { width: subTopCols[4].width - 8, align: 'center' });

            currentY += 18;
        });

        currentY += 12;
    });

    // ==========================================
    // SECTION 6: SUBJECT-WISE FAILED CANDIDATES BREAKDOWN
    // ==========================================
    checkPageBreak(100, '6. Subject-Wise Failure Directory & Backlog Breakdown');

    const failCols = [
        { name: 'S.No', width: 35, align: 'center' },
        { name: 'USN', width: 100, align: 'left' },
        { name: 'Candidate Name', width: 220, align: 'left' },
        { name: 'Marks Scored', width: 80, align: 'center' },
        { name: 'Status', width: 80, align: 'center' }
    ];

    subjects.forEach((sub) => {
        const failedInSub = students.filter(s => (Number(s.marks[sub.name]) || 0) < 35);

        checkPageBreak(70, '6. Subject-Wise Failure Directory (Continued)');

        const hasFailures = failedInSub.length > 0;
        const subBannerBg = hasFailures ? '#7F1D1D' : '#14532D';
        doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill(subBannerBg);
        doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold').text(`SUBJECT: ${sub.name}`, margin + 8, currentY + 4);
        doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(hasFailures ? `Failed Candidates: ${failedInSub.length}` : '100% Pass Clearance', margin + contentWidth - 160, currentY + 4, { width: 150, align: 'right' });
        currentY += 18;

        if (!hasFailures) {
            doc.rect(margin, currentY, contentWidth, 20).fill('#F0FDF4');
            doc.rect(margin, currentY, contentWidth, 20).stroke('#BBF7D0');
            doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text('✔ All evaluated candidates successfully passed this subject.', margin + 12, currentY + 6);
            currentY += 28;
        } else {
            doc.rect(margin, currentY, contentWidth, 16).fill('#991B1B');
            let ftx = margin;
            failCols.forEach(col => {
                doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(col.name, ftx + 4, currentY + 4, { width: col.width - 8, align: col.align });
                ftx += col.width;
            });
            currentY += 16;

            // Show top failed candidates (up to 8 per subject for extreme compactness)
            const showFailures = failedInSub.slice(0, 8);
            showFailures.forEach((st, idx) => {
                checkPageBreak(18, '6. Subject-Wise Failure Directory (Continued)');

                const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#FEF2F2';
                doc.rect(margin, currentY, contentWidth, 18).fill(rowBg);
                doc.rect(margin, currentY, contentWidth, 18).stroke('#FECACA');

                let rx = margin;

                doc.fillColor('#991B1B').fontSize(7.5).font('Helvetica-Bold').text(`${idx + 1}`, rx + 4, currentY + 4, { width: failCols[0].width - 8, align: 'center' });
                rx += failCols[0].width;

                doc.fillColor('#7F1D1D').fontSize(7.5).font('Helvetica-Bold').text(st.usn || '-', rx + 4, currentY + 4, { width: failCols[1].width - 8 });
                rx += failCols[1].width;

                doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text((st.name || '-').substring(0, 35), rx + 4, currentY + 4, { width: failCols[2].width - 8 });
                rx += failCols[2].width;

                const markVal = Number(st.marks[sub.name]) || 0;
                doc.fillColor('#DC2626').fontSize(8).font('Helvetica-Bold').text(`${markVal} / 100`, rx + 4, currentY + 4, { width: failCols[3].width - 8, align: 'center' });
                rx += failCols[3].width;

                doc.fillColor('#991B1B').fontSize(7.5).font('Helvetica-Bold').text('FAIL', rx + 4, currentY + 4, { width: failCols[4].width - 8, align: 'center' });

                currentY += 18;
            });

            if (failedInSub.length > 8) {
                doc.fillColor('#64748B').fontSize(7).font('Helvetica-Oblique').text(`* ... and ${failedInSub.length - 8} more candidates failing in this subject.`, margin + 4, currentY + 4);
                currentY += 14;
            }

            currentY += 12;
        }
    });

    // ==========================================
    // SECTION 7: ENDORSEMENT SIGNATURE BLOCK (Last Page)
    // ==========================================
    checkPageBreak(90, '7. Official Verification & Institutional Endorsement');

    const sigBoxWidth = (contentWidth - 20) / 3;
    const sigBoxHeight = 50;

    const sigs = [
        { title: 'Faculty Coordinator', label: 'Prepared & Verified By' },
        { title: 'Head of Department (HOD)', label: 'Department Seal & Sign' },
        { title: 'Principal / Controller', label: 'Authorized Signatory' }
    ];

    sigs.forEach((sig, i) => {
        const sx = margin + i * (sigBoxWidth + 10);
        doc.roundedRect(sx, currentY, sigBoxWidth, sigBoxHeight, 4).stroke('#CBD5E1');

        doc.moveTo(sx + 10, currentY + 30).lineTo(sx + sigBoxWidth - 10, currentY + 30).dash(2, { space: 2 }).stroke('#94A3B8').undash();

        doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(sig.label, sx + 8, currentY + 6, { width: sigBoxWidth - 16, align: 'center' });
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(sig.title, sx + 8, currentY + 34, { width: sigBoxWidth - 16, align: 'center' });
    });

    // ==========================================
    // GLOBAL FOOTERS (NO PAGE NUMBERS AS REQUESTED)
    // ==========================================
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        const footerY = pageHeight - 30;

        doc.moveTo(margin, footerY - 5).lineTo(pageWidth - margin, footerY - 5).stroke('#E2E8F0');

        // Clean centered confidentiality footer without page numbers
        doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(
            'College Result Analyzer System • Official Executive Academic Evaluation Report • Confidential',
            margin,
            footerY,
            { width: contentWidth, align: 'center' }
        );
    }

    doc.end();
}

module.exports = {
    generateResultPDF
};
