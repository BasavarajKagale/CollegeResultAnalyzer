const PDFDocument = require('pdfkit');

/**
 * Utility function to extract short subject code for compact table display
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
 * Main PDF Generation Handler for College Result Analyzer
 */
function generateResultPDF(result, students, res) {
    const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        bufferPages: true,
        info: {
            Title: `Academic Performance Report - ${result.filename}`,
            Author: 'College Result Analyzer System',
            Subject: 'Official College Result Analysis Report'
        }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="result_${result._id}.pdf"`);
    doc.pipe(res);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2; // 515.28 pt
    const pageBottom = pageHeight - margin - 35; // 766.89 pt

    let currentY = margin;

    // Helper: Draw Section Header with left accent pill
    function drawSectionHeader(title, y) {
        // Accent vertical bar
        doc.rect(margin, y, 4, 16).fill('#1E40AF');
        doc.fillColor('#0F172A').fontSize(11).font('Helvetica-Bold').text(title, margin + 12, y + 2);
        return y + 24;
    }

    // ==========================================
    // PAGE 1: EXECUTIVE DASHBOARD & SUMMARY
    // ==========================================

    // 1. Top Decorative Brand Bar
    doc.rect(0, 0, pageWidth, 6).fill('#2563EB');

    // 2. Header Banner Box
    currentY = 25;
    const headerBoxHeight = 70;
    doc.roundedRect(margin, currentY, contentWidth, headerBoxHeight, 6).fill('#0F172A');

    // Subheader category
    doc.fillColor('#93C5FD').fontSize(7.5).font('Helvetica-Bold').text('INSTITUTIONAL EVALUATION & ACADEMIC DOSSIER', margin + 16, currentY + 12, { characterSpacing: 1 });
    
    // Title
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('COLLEGE RESULT ANALYSIS REPORT', margin + 16, currentY + 24);
    
    // Subtitle / File Name
    const cleanFilename = (result.filename || 'Academic_Result.pdf').substring(0, 55);
    doc.fillColor('#CBD5E1').fontSize(8.5).font('Helvetica').text(`Document: ${cleanFilename}`, margin + 16, currentY + 46);

    // Right-aligned header info
    const uploadDateStr = new Date(result.uploadDate || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica-Bold').text(`DATE: ${uploadDateStr}`, margin + contentWidth - 160, currentY + 14, { width: 144, align: 'right' });
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text(`REF: REF-${(result._id || '').toString().slice(-8).toUpperCase()}`, margin + contentWidth - 160, currentY + 28, { width: 144, align: 'right' });

    currentY += headerBoxHeight + 15;

    // 3. Executive KPI Cards (4 Side-by-Side Cards)
    currentY = drawSectionHeader('1. Executive Summary & Batch Statistics', currentY);

    const cardGap = 9;
    const cardWidth = (contentWidth - cardGap * 3) / 4; // ~122 pt
    const cardHeight = 52;

    const stats = result.overallStats || { totalStudents: 0, passCount: 0, failCount: 0, passPercentage: 0 };
    const passPct = stats.passPercentage || 0;
    const failPct = 100 - passPct;

    const kpis = [
        {
            label: 'TOTAL CANDIDATES',
            value: `${stats.totalStudents || 0}`,
            subtext: 'Evaluated Batch',
            bgColor: '#F8FAFC',
            borderColor: '#E2E8F0',
            valColor: '#0F172A'
        },
        {
            label: 'SUCCESSFUL',
            value: `${stats.passCount || 0}`,
            subtext: `${passPct.toFixed(1)}% Pass Rate`,
            bgColor: '#F0FDF4',
            borderColor: '#BBF7D0',
            valColor: '#16A34A'
        },
        {
            label: 'UNSUCCESSFUL',
            value: `${stats.failCount || 0}`,
            subtext: `${failPct.toFixed(1)}% Fail / Backlogs`,
            bgColor: '#FEF2F2',
            borderColor: '#FECACA',
            valColor: '#DC2626'
        },
        {
            label: 'OVERALL PASS %',
            value: `${passPct.toFixed(2)}%`,
            subtext: 'Batch Average',
            bgColor: '#EFF6FF',
            borderColor: '#BFDBFE',
            valColor: '#2563EB'
        }
    ];

    kpis.forEach((kpi, idx) => {
        const cx = margin + idx * (cardWidth + cardGap);
        // Card BG & Border
        doc.roundedRect(cx, currentY, cardWidth, cardHeight, 6).fillAndStroke(kpi.bgColor, kpi.borderColor);

        // Value
        doc.fillColor(kpi.valColor).fontSize(14).font('Helvetica-Bold').text(kpi.value, cx + 8, currentY + 8, { width: cardWidth - 16, align: 'left' });
        
        // Label
        doc.fillColor('#475569').fontSize(6.5).font('Helvetica-Bold').text(kpi.label, cx + 8, currentY + 27, { width: cardWidth - 16 });

        // Subtext
        doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(kpi.subtext, cx + 8, currentY + 37, { width: cardWidth - 16 });
    });

    currentY += cardHeight + 18;

    // 4. Academic Toppers (Toppers Hall of Fame)
    currentY = drawSectionHeader('2. Academic Toppers (Hall of Fame)', currentY);

    const toppers = result.toppers || [];
    const topperCols = [
        { name: 'Rank', width: 35, align: 'center' },
        { name: 'USN', width: 90, align: 'left' },
        { name: 'Student Name', width: 160, align: 'left' },
        { name: 'Marks Scored', width: 75, align: 'center' },
        { name: 'Percentage', width: 65, align: 'center' },
        { name: 'Class / Result', width: 90, align: 'left' }
    ];

    // Topper Table Header
    doc.roundedRect(margin, currentY, contentWidth, 18, 4).fill('#1E293B');
    let tx = margin;
    topperCols.forEach(col => {
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold').text(col.name, tx + 4, currentY + 5, { width: col.width - 8, align: col.align });
        tx += col.width;
    });
    currentY += 18;

    if (toppers.length === 0) {
        doc.fillColor('#64748B').fontSize(8).font('Helvetica-Oblique').text('No topper records available.', margin + 8, currentY + 6);
        currentY += 20;
    } else {
        toppers.forEach((top, idx) => {
            const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(margin, currentY, contentWidth, 20).fill(rowBg);
            doc.rect(margin, currentY, contentWidth, 20).stroke('#E2E8F0');

            let rx = margin;
            
            // Rank Badge
            const rankBadgeColor = idx === 0 ? '#FEF3C7' : idx === 1 ? '#F1F5F9' : '#FFEDD5';
            const rankTextColor = idx === 0 ? '#D97706' : idx === 1 ? '#475569' : '#C2410C';
            doc.roundedRect(rx + 6, currentY + 3, 22, 14, 3).fill(rankBadgeColor);
            doc.fillColor(rankTextColor).fontSize(8).font('Helvetica-Bold').text(`#${top.rank}`, rx + 6, currentY + 5, { width: 22, align: 'center' });
            rx += topperCols[0].width;

            // USN
            doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text(top.usn || '-', rx + 4, currentY + 5, { width: topperCols[1].width - 8, align: 'left' });
            rx += topperCols[1].width;

            // Name
            doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold').text(top.name || '-', rx + 4, currentY + 5, { width: topperCols[2].width - 8, align: 'left' });
            rx += topperCols[2].width;

            // Marks
            doc.fillColor('#1E40AF').fontSize(8.5).font('Helvetica-Bold').text(`${top.totalMarks}`, rx + 4, currentY + 5, { width: topperCols[3].width - 8, align: 'center' });
            rx += topperCols[3].width;

            // Percentage
            doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold').text(`${top.percentage}%`, rx + 4, currentY + 5, { width: topperCols[4].width - 8, align: 'center' });
            rx += topperCols[4].width;

            // Class
            const cls = getAcademicClass(top.percentage, true);
            doc.fillColor('#15803D').fontSize(7.5).font('Helvetica').text(cls, rx + 4, currentY + 5, { width: topperCols[5].width - 8, align: 'left' });

            currentY += 20;
        });
    }

    currentY += 15;

    // 5. Subject Analysis Summary Table
    currentY = drawSectionHeader('3. Subject-Wise Analytics & Performance Breakdown', currentY);

    const subjects = result.subjects || [];
    const subCols = [
        { name: 'Subject Title & Code', width: 170, align: 'left' },
        { name: 'Appeared', width: 50, align: 'center' },
        { name: 'Passed', width: 55, align: 'center' },
        { name: 'Failed', width: 55, align: 'center' },
        { name: 'Pass %', width: 55, align: 'center' },
        { name: 'Highest', width: 50, align: 'center' },
        { name: 'Performance Bar', width: 80, align: 'center' }
    ];

    // Header Row
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

        // Subject Name
        const cleanSubName = (sub.name || '').substring(0, 36);
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(cleanSubName, rx + 4, currentY + 5, { width: subCols[0].width - 8, align: 'left' });
        rx += subCols[0].width;

        // Appeared
        const appeared = (sub.passCount || 0) + (sub.failCount || 0);
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(`${appeared}`, rx + 4, currentY + 5, { width: subCols[1].width - 8, align: 'center' });
        rx += subCols[1].width;

        // Passed
        doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(`${sub.passCount || 0}`, rx + 4, currentY + 5, { width: subCols[2].width - 8, align: 'center' });
        rx += subCols[2].width;

        // Failed
        const fCount = sub.failCount || 0;
        doc.fillColor(fCount > 0 ? '#B91C1C' : '#64748B').fontSize(7.5).font(fCount > 0 ? 'Helvetica-Bold' : 'Helvetica').text(`${fCount}`, rx + 4, currentY + 5, { width: subCols[3].width - 8, align: 'center' });
        rx += subCols[3].width;

        // Pass %
        const sPassPct = sub.passPercentage || 0;
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(`${sPassPct.toFixed(1)}%`, rx + 4, currentY + 5, { width: subCols[4].width - 8, align: 'center' });
        rx += subCols[4].width;

        // Highest
        doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica-Bold').text(`${sub.highestMarks || 0}`, rx + 4, currentY + 5, { width: subCols[5].width - 8, align: 'center' });
        rx += subCols[5].width;

        // Progress Bar inside cell
        const barBoxX = rx + 6;
        const barBoxY = currentY + 6;
        const barBoxWidth = subCols[6].width - 12;
        const barBoxHeight = 8;
        
        // Background track
        doc.roundedRect(barBoxX, barBoxY, barBoxWidth, barBoxHeight, 2).fill('#F1F5F9');
        doc.roundedRect(barBoxX, barBoxY, barBoxWidth, barBoxHeight, 2).stroke('#CBD5E1');

        // Green filled portion
        const fillWidth = Math.max(0, Math.min(barBoxWidth, (barBoxWidth * sPassPct) / 100));
        if (fillWidth > 0) {
            const barColor = sPassPct >= 85 ? '#16A34A' : sPassPct >= 65 ? '#EAB308' : '#DC2626';
            doc.roundedRect(barBoxX, barBoxY, fillWidth, barBoxHeight, 2).fill(barColor);
        }

        currentY += 20;
    });

    currentY += 15;

    // 6. Remedial / Backlog Candidate Summary (Top failed students if any)
    const failedStudents = students.filter(s => !s.isPass);
    if (failedStudents.length > 0 && currentY < pageBottom - 80) {
        currentY = drawSectionHeader(`4. Remedial / Backlog Candidates Summary (${failedStudents.length} Students)`, currentY);

        const failCols = [
            { name: 'USN', width: 85, align: 'left' },
            { name: 'Candidate Name', width: 140, align: 'left' },
            { name: 'Failed Subject(s)', width: 210, align: 'left' },
            { name: 'Backlogs', width: 80, align: 'center' }
        ];

        doc.roundedRect(margin, currentY, contentWidth, 16, 3).fill('#991B1B');
        let fx = margin;
        failCols.forEach(col => {
            doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text(col.name, fx + 4, currentY + 4, { width: col.width - 8, align: col.align });
            fx += col.width;
        });
        currentY += 16;

        const showCount = Math.min(failedStudents.length, 5);
        for (let i = 0; i < showCount; i++) {
            const fs = failedStudents[i];
            doc.rect(margin, currentY, contentWidth, 18).fill(i % 2 === 0 ? '#FFFFFF' : '#FEF2F2');
            doc.rect(margin, currentY, contentWidth, 18).stroke('#FECACA');

            let rfx = margin;
            doc.fillColor('#7F1D1D').fontSize(7.5).font('Helvetica-Bold').text(fs.usn || '-', rfx + 4, currentY + 4, { width: failCols[0].width - 8 });
            rfx += failCols[0].width;

            doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(fs.name || '-', rfx + 4, currentY + 4, { width: failCols[1].width - 8 });
            rfx += failCols[1].width;

            // List failed subjects
            const failedSubs = subjects.filter(sub => (fs.marks[sub.name] || 0) < 35).map(sub => getShortCode(sub.name)).join(', ');
            doc.fillColor('#DC2626').fontSize(7).font('Helvetica').text(failedSubs || 'Multiple', rfx + 4, currentY + 4, { width: failCols[2].width - 8, ellipsis: true });
            rfx += failCols[2].width;

            const backCount = subjects.filter(sub => (fs.marks[sub.name] || 0) < 35).length;
            doc.fillColor('#991B1B').fontSize(7.5).font('Helvetica-Bold').text(`${backCount} Sub`, rfx + 4, currentY + 4, { width: failCols[3].width - 8, align: 'center' });

            currentY += 18;
        }

        if (failedStudents.length > 5) {
            doc.fillColor('#64748B').fontSize(7).font('Helvetica-Oblique').text(`* ... and ${failedStudents.length - 5} more candidates requiring re-examination (detailed in directory on next pages).`, margin + 4, currentY + 4);
        }
    }

    // ==========================================
    // PAGE 2+: MASTER CANDIDATE MARKSHEET DIRECTORY
    // ==========================================
    doc.addPage();
    currentY = margin;

    // Calculate Dynamic Column Widths for Student Marksheet Table
    const fixedWidths = {
        rank: 26,
        usn: 72,
        name: 110,
        total: 36,
        pct: 38,
        status: 44
    };
    const totalFixed = fixedWidths.rank + fixedWidths.usn + fixedWidths.name + fixedWidths.total + fixedWidths.pct + fixedWidths.status; // 326 pt
    const subAvailWidth = contentWidth - totalFixed; // 189.28 pt
    
    const numSub = Math.max(1, subjects.length);
    const subColWidth = subAvailWidth / numSub;

    // Helper: Draw Master Student Table Header
    function drawMasterTableHeader(y) {
        doc.roundedRect(margin, y, contentWidth, 20, 4).fill('#0F172A');
        
        let hx = margin;
        
        // Rank
        doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('Rank', hx + 2, y + 6, { width: fixedWidths.rank - 4, align: 'center' });
        hx += fixedWidths.rank;

        // USN
        doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('USN', hx + 4, y + 6, { width: fixedWidths.usn - 8, align: 'left' });
        hx += fixedWidths.usn;

        // Name
        doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('Candidate Name', hx + 4, y + 6, { width: fixedWidths.name - 8, align: 'left' });
        hx += fixedWidths.name;

        // Subject Headers
        subjects.forEach(sub => {
            const shortCode = getShortCode(sub.name);
            doc.fillColor('#93C5FD').fontSize(6.5).font('Helvetica-Bold').text(shortCode, hx + 1, y + 6, { width: subColWidth - 2, align: 'center', ellipsis: true });
            hx += subColWidth;
        });

        // Total
        doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('Total', hx + 2, y + 6, { width: fixedWidths.total - 4, align: 'center' });
        hx += fixedWidths.total;

        // %
        doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('%', hx + 2, y + 6, { width: fixedWidths.pct - 4, align: 'center' });
        hx += fixedWidths.pct;

        // Status
        doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold').text('Status', hx + 2, y + 6, { width: fixedWidths.status - 4, align: 'center' });

        return y + 20;
    }

    // Page 2 Section Header
    currentY = drawSectionHeader('5. Master Candidate Performance Directory & Grade Sheet', currentY);
    currentY = drawMasterTableHeader(currentY);

    const rowHeight = 18;

    students.forEach((st, idx) => {
        // Page overflow check
        if (currentY + rowHeight > pageBottom - 20) {
            doc.addPage();
            currentY = margin;
            currentY = drawSectionHeader('5. Master Candidate Directory (Continued)', currentY);
            currentY = drawMasterTableHeader(currentY);
        }

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(margin, currentY, contentWidth, rowHeight).fill(rowBg);
        doc.rect(margin, currentY, contentWidth, rowHeight).stroke('#E2E8F0');

        let rx = margin;

        // Rank
        doc.fillColor('#2563EB').fontSize(7).font('Helvetica-Bold').text(`${st.rank}`, rx + 2, currentY + 5, { width: fixedWidths.rank - 4, align: 'center' });
        rx += fixedWidths.rank;

        // USN
        doc.fillColor('#334155').fontSize(7).font('Helvetica').text(st.usn || '-', rx + 4, currentY + 5, { width: fixedWidths.usn - 8, align: 'left' });
        rx += fixedWidths.usn;

        // Name
        doc.fillColor('#0F172A').fontSize(7).font('Helvetica-Bold').text((st.name || '-').substring(0, 24), rx + 4, currentY + 5, { width: fixedWidths.name - 8, align: 'left' });
        rx += fixedWidths.name;

        // Marks per subject
        subjects.forEach(sub => {
            const markVal = st.marks[sub.name] !== undefined ? st.marks[sub.name] : 0;
            const isFailSub = markVal < 35;
            doc.fillColor(isFailSub ? '#DC2626' : '#0F172A')
               .fontSize(7)
               .font(isFailSub ? 'Helvetica-Bold' : 'Helvetica')
               .text(`${markVal}`, rx + 1, currentY + 5, { width: subColWidth - 2, align: 'center' });
            rx += subColWidth;
        });

        // Total
        doc.fillColor('#1E40AF').fontSize(7.5).font('Helvetica-Bold').text(`${st.totalMarks}`, rx + 2, currentY + 5, { width: fixedWidths.total - 4, align: 'center' });
        rx += fixedWidths.total;

        // %
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(`${st.percentage}%`, rx + 2, currentY + 5, { width: fixedWidths.pct - 4, align: 'center' });
        rx += fixedWidths.pct;

        // Status Pill Badge
        const isPass = st.isPass;
        const badgeColor = isPass ? '#DCFCE7' : '#FEE2E2';
        const badgeTextColor = isPass ? '#15803D' : '#B91C1C';
        
        doc.roundedRect(rx + 4, currentY + 3, fixedWidths.status - 8, 12, 3).fill(badgeColor);
        doc.fillColor(badgeTextColor).fontSize(6.5).font('Helvetica-Bold').text(isPass ? 'PASS' : 'FAIL', rx + 4, currentY + 5, { width: fixedWidths.status - 8, align: 'center' });

        currentY += rowHeight;
    });

    // ==========================================
    // ENDORSEMENT SIGNATURE BLOCK (Last Page)
    // ==========================================
    if (currentY + 75 > pageBottom) {
        doc.addPage();
        currentY = margin + 30;
    } else {
        currentY += 25;
    }

    doc.rect(margin, currentY, contentWidth, 1).fill('#CBD5E1');
    currentY += 15;

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text('OFFICIAL VERIFICATION & INSTITUTIONAL ENDORSEMENT', margin, currentY);
    currentY += 15;

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

        // Dotted signature line
        doc.moveTo(sx + 10, currentY + 30).lineTo(sx + sigBoxWidth - 10, currentY + 30).dash(2, { space: 2 }).stroke('#94A3B8').undash();

        doc.fillColor('#64748B').fontSize(6.5).font('Helvetica').text(sig.label, sx + 8, currentY + 6, { width: sigBoxWidth - 16, align: 'center' });
        doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(sig.title, sx + 8, currentY + 34, { width: sigBoxWidth - 16, align: 'center' });
    });

    // ==========================================
    // GLOBAL FOOTERS & PAGE NUMBERS (ALL PAGES)
    // ==========================================
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        const footerY = pageHeight - 30;

        // Top line for footer
        doc.moveTo(margin, footerY - 5).lineTo(pageWidth - margin, footerY - 5).stroke('#E2E8F0');

        // Left text
        doc.fillColor('#94A3B8').fontSize(7).font('Helvetica').text(
            'College Result Analyzer System • Official Academic Record • Confidential Document',
            margin,
            footerY,
            { width: 350, align: 'left' }
        );

        // Right page number
        doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold').text(
            `Page ${i + 1} of ${pages.count}`,
            pageWidth - margin - 100,
            footerY,
            { width: 100, align: 'right' }
        );
    }

    doc.end();
}

module.exports = {
    generateResultPDF
};
