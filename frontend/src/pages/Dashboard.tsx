import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    PointElement,
    LineElement,
    Title, 
    Tooltip, 
    Legend, 
    ArcElement,
    RadialLinearScale
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { TrendingUp, PieChart as PieIcon, Activity, Download, Award, AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import SubjectModal from '../components/SubjectModal';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Dashboard = () => {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [exportingPDF, setExportingPDF] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const dashboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/results/${id}`);
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', padding: '10rem', fontSize: '1.2rem', color: 'var(--primary)' }}>Generating Visual Analytics...</div>;
    if (!data || !data.result) return <div style={{ textAlign: 'center', padding: '10rem' }}>Analytics Data Unavailable.</div>;

    const { result, students = [] } = data;

    // Export Charts to PDF function (Multi-page A4 rendering without cutoff)
    const downloadChartsPDF = async () => {
        if (!dashboardRef.current) return;
        setExportingPDF(true);
        try {
            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0a0a0a'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = pdf.internal.pageSize.getWidth(); // ~210 mm
            const pageHeight = pdf.internal.pageSize.getHeight(); // ~297 mm
            
            const margin = 5; // 5mm margin
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = margin;

            // Page 1
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - margin * 2);

            // Add extra pages if canvas height exceeds 1 page
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                heightLeft -= (pageHeight - margin * 2);
            }

            pdf.save(`Charts_Analytics_${result.filename}.pdf`);
        } catch (err) {
            console.error('PDF Export Error:', err);
        } finally {
            setExportingPDF(false);
        }
    };

    // Chart styling configurations
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#e0e0e0', font: { family: 'Inter', size: 12 } }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.85)',
                titleColor: '#D4AF37',
                bodyColor: '#fff',
                borderColor: 'rgba(212,175,55,0.3)',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6
            }
        },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#aaa' } },
            x: { grid: { display: false }, ticks: { color: '#aaa' } }
        }
    };

    // Extract student counts for charts
    const passedCount = students.filter((s: any) => s.isPass && s.remark !== 'WITHHELD').length;
    const withheldCount = students.filter((s: any) => s.remark === 'WITHHELD' || (s.subjectDetails && Object.values(s.subjectDetails).some((d: any) => d?.isWithHeld || ['W', 'WH', 'WITH HELD', 'WITHHELD'].includes(String(d?.result || '').toUpperCase())))).length;
    const failedCount = students.filter((s: any) => !s.isPass && s.remark !== 'WITHHELD' && !(s.subjectDetails && Object.values(s.subjectDetails).some((d: any) => d?.isWithHeld || ['W', 'WH', 'WITH HELD', 'WITHHELD'].includes(String(d?.result || '').toUpperCase())))).length;

    // 1. Overall Pass vs Fail (+ Withheld) Doughnut Data
    const overallLabels = [`Passed (${passedCount})`];
    const overallData = [passedCount];
    const overallBg = ['#28a745'];
    const overallBorder = ['#1e7e34'];

    if (failedCount > 0) {
        overallLabels.push(`Failed (${failedCount})`);
        overallData.push(failedCount);
        overallBg.push('#dc3545');
        overallBorder.push('#bd2130');
    }
    if (withheldCount > 0) {
        overallLabels.push(`Withheld (${withheldCount})`);
        overallData.push(withheldCount);
        overallBg.push('#7CBCE8'); // #7CBCE8 Sky Blue
        overallBorder.push('#5BA0D1');
    }

    const overallDoughnutData = {
        labels: overallLabels,
        datasets: [
            {
                data: overallData,
                backgroundColor: overallBg,
                borderColor: overallBorder,
                borderWidth: 2,
                hoverOffset: 10
            },
        ],
    };

    // 2. Subject Pass vs Fail (+ Withheld) Comparison Bar Data
    const subjectPassFailData = {
        labels: result.subjects.map((s: any) => s.name),
        datasets: [
            {
                label: 'Passed Candidates',
                data: result.subjects.map((s: any) => s.totalPassCount ?? s.passCount ?? Math.max(0, (s.appearedCount || students.length || 0) - (s.failCount || 0))),
                backgroundColor: 'rgba(40, 167, 69, 0.75)',
                borderColor: '#28a745',
                borderWidth: 1.5,
                borderRadius: 6,
            },
            {
                label: 'Failed Candidates (incl. AB)',
                data: result.subjects.map((s: any) => (s.failCount || 0) + (s.abCount || 0)),
                backgroundColor: 'rgba(220, 53, 69, 0.75)',
                borderColor: '#dc3545',
                borderWidth: 1.5,
                borderRadius: 6,
            },
            {
                label: 'Withheld Candidates',
                data: result.subjects.map((s: any) => s.withHeldCount || 0),
                backgroundColor: 'rgba(124, 188, 232, 0.75)',
                borderColor: '#7CBCE8',
                borderWidth: 1.5,
                borderRadius: 6,
            }
        ],
    };

    // 3. Subject Peak Marks vs Average Marks Line Data
    const subjectAverages = result.subjects.map((sub: any) => {
        let total = 0;
        students.forEach((st: any) => {
            total += Number(st.marks[sub.name]) || 0;
        });
        return students.length > 0 ? parseFloat((total / students.length).toFixed(1)) : 0;
    });

    const peakVsAvgData = {
        labels: result.subjects.map((s: any) => s.name),
        datasets: [
            {
                label: 'Highest Score in Subject',
                data: result.subjects.map((s: any) => s.highestMarks),
                borderColor: '#D4AF37',
                backgroundColor: 'rgba(212, 175, 55, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#D4AF37',
                pointRadius: 5,
                tension: 0.35,
                fill: true
            },
            {
                label: 'Average Score in Subject',
                data: subjectAverages,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#007bff',
                pointRadius: 4,
                tension: 0.35,
            }
        ],
    };

    // 4. Grade Breakdown Data
    let distinction = 0, firstClass = 0, secondClass = 0, passClass = 0, failed = 0, withheld = 0;
    students.forEach((s: any) => {
        const isWH = s.remark === 'WITHHELD' || (s.subjectDetails && Object.values(s.subjectDetails).some((d: any) => d?.isWithHeld || ['W', 'WH', 'WITH HELD', 'WITHHELD'].includes(String(d?.result || '').toUpperCase())));
        if (isWH) withheld++;
        else if (!s.isPass) failed++;
        else if (s.percentage >= 70) distinction++;
        else if (s.percentage >= 60) firstClass++;
        else if (s.percentage >= 50) secondClass++;
        else passClass++;
    });

    const gradeLabels = [
        `FCD Distinction 70-100% (${distinction})`, 
        `First Class 60-69% (${firstClass})`, 
        `Second Class 50-59% (${secondClass})`, 
        `Pass Class 35-49% (${passClass})`, 
        `Failed (${failed})`
    ];
    const gradeData = [distinction, firstClass, secondClass, passClass, failed];
    const gradeBg = ['#D4AF37', '#28a745', '#17a2b8', '#ffc107', '#dc3545'];

    if (withheld > 0) {
        gradeLabels.push(`Withheld (${withheld})`);
        gradeData.push(withheld);
        gradeBg.push('#7CBCE8');
    }

    const gradeBreakdownData = {
        labels: gradeLabels,
        datasets: [
            {
                data: gradeData,
                backgroundColor: gradeBg,
                borderWidth: 1.5,
                hoverOffset: 8
            }
        ]
    };

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ minWidth: 0, flex: '1 1 300px' }}>
                    <h2 
                        className="title" 
                        style={{ 
                            fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)', 
                            marginBottom: '0.5rem', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            maxWidth: '100%' 
                        }} 
                        title={result.filename}
                    >
                        Academic Dashboard & Charts
                    </h2>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Visual Insights & Analytical Performance Metrics</p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                    <button 
                        onClick={downloadChartsPDF} 
                        className="btn btn-primary" 
                        disabled={exportingPDF}
                        style={{ fontSize: '0.8rem', padding: '0.6rem 1.4rem' }}
                    >
                        <Download size={16} /> {exportingPDF ? 'Generating PDF...' : 'Download Charts (PDF)'}
                    </button>
                </div>
            </div>

            {/* Printable Container */}
            <div ref={dashboardRef} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                
                {/* Top Row: Overall Distribution & Grade Breakdown */}
                <div className="grid">
                    {/* Overall Pass/Fail Doughnut */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                            <PieIcon size={20} /> Overall Result Distribution
                        </h3>
                        <div style={{ width: '100%', maxWidth: '280px', height: '260px' }}>
                            <Doughnut 
                                data={overallDoughnutData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'bottom', labels: { color: '#fff', font: { size: 11 } } }
                                    }
                                }} 
                            />
                        </div>
                        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>
                            Pass Rate: {result.overallStats.passPercentage.toFixed(2)}%
                        </div>
                    </div>

                    {/* Grade Distribution Doughnut */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                            <Award size={20} /> Performance Grade Breakdown
                        </h3>
                        <div style={{ width: '100%', maxWidth: '320px', height: '260px' }}>
                            <Doughnut 
                                data={gradeBreakdownData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'bottom', labels: { color: '#fff', font: { size: 10 } } }
                                    }
                                }} 
                            />
                        </div>
                        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#aaa' }}>
                            Total Evaluated: {result.overallStats.totalStudents} Candidates
                        </div>
                    </div>
                </div>

                {/* Middle Row: Subject Pass vs Fail Double Bar Chart */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                        <TrendingUp size={20} /> Subject-Wise Pass vs Fail Comparison
                    </h3>
                    <div style={{ height: '320px', width: '100%' }}>
                        <Bar 
                            data={subjectPassFailData} 
                            options={commonChartOptions}
                        />
                    </div>
                </div>

                {/* Bottom Row: Highest vs Average Marks Line Chart */}
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                        <Activity size={20} /> Subject Benchmark: Peak Marks vs Batch Average
                    </h3>
                    <div style={{ height: '320px', width: '100%' }}>
                        <Line 
                            data={peakVsAvgData} 
                            options={{
                                ...commonChartOptions,
                                scales: {
                                    ...commonChartOptions.scales,
                                    y: { ...commonChartOptions.scales.y, max: 100 }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Individual Per-Subject Pass & Fail Pie Charts Carousel/Grid */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                            <BookOpen size={20} /> Per-Subject Detailed Pie Charts
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>Click any chart card for full subject report</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                        {result.subjects.map((sub: any) => {
                            const subWithheldCount = sub.withHeldCount || 0;
                            const passedCount = sub.totalPassCount ?? sub.passCount ?? Math.max(0, (sub.appearedCount || students.length || 0) - (sub.failCount || 0));
                            const abCount = sub.abCount || 0;
                            const examFailCount = Math.max(0, (sub.failCount || 0) - subWithheldCount);
                            const evaluatedSubCount = Math.max(1, (sub.appearedCount || students.length || 0) - subWithheldCount);
                            const subPassPct = ((passedCount / evaluatedSubCount) * 100).toFixed(1);
                            const subFailPct = ((examFailCount / evaluatedSubCount) * 100).toFixed(1);
                            const subAbPct = ((abCount / evaluatedSubCount) * 100).toFixed(1);

                            const subLabels = [`Passed (${passedCount})`];
                            const subData = [passedCount];
                            const subBg = ['#28a745'];
                            const subBorder = ['#1e7e34'];

                            if (examFailCount > 0) {
                                subLabels.push(`Failed (${examFailCount})`);
                                subData.push(examFailCount);
                                subBg.push('#dc3545');
                                subBorder.push('#bd2130');
                            }
                            if (abCount > 0) {
                                subLabels.push(`Absent (${abCount})`);
                                subData.push(abCount);
                                subBg.push('#C58CB5');
                                subBorder.push('#9B59B6');
                            }
                            if (subWithheldCount > 0) {
                                subLabels.push(`Withheld (${subWithheldCount})`);
                                subData.push(subWithheldCount);
                                subBg.push('#7CBCE8'); // Sky Blue
                                subBorder.push('#5BA0D1');
                            }

                            const subDoughnutData = {
                                labels: subLabels,
                                datasets: [
                                    {
                                        data: subData,
                                        backgroundColor: subBg,
                                        borderColor: subBorder,
                                        borderWidth: 1
                                    }
                                ]
                            };

                            return (
                                <div 
                                    key={sub.name}
                                    onClick={() => setSelectedSubject(sub.name)}
                                    style={{ 
                                        background: 'rgba(255,255,255,0.02)', 
                                        padding: '1.2rem', 
                                        borderRadius: '16px', 
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                    className="card"
                                >
                                    <h4 style={{ color: 'var(--primary)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {sub.name}
                                    </h4>

                                    <div style={{ height: '160px', width: '100%', marginBottom: '1rem' }}>
                                        <Doughnut 
                                            data={subDoughnutData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } }
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.8rem', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                        <span style={{ color: '#28a745', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <CheckCircle size={12} /> {subPassPct}% Pass
                                        </span>
                                        {examFailCount > 0 && (
                                            <span style={{ color: '#dc3545', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <AlertTriangle size={12} /> {subFailPct}% Fail
                                            </span>
                                        )}
                                        {abCount > 0 && (
                                            <span style={{ color: '#dc3545', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <AlertTriangle size={12} /> {subAbPct}% AB ({abCount})
                                            </span>
                                        )}
                                        {examFailCount === 0 && abCount === 0 && (
                                            <span style={{ color: '#dc3545', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <AlertTriangle size={12} /> 0.0% Fail
                                            </span>
                                        )}
                                        {subWithheldCount > 0 && (
                                            <span style={{ color: '#7CBCE8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                <AlertTriangle size={12} /> {subWithheldCount} WH
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        View Subject Report &rarr;
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Subject Analytics Modal */}
            {selectedSubject && (
                <SubjectModal 
                    subjectName={selectedSubject}
                    students={students}
                    onClose={() => setSelectedSubject(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
