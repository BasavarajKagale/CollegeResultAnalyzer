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

    // Export Charts to PDF function
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
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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

    // 1. Overall Pass vs Fail Doughnut Data
    const overallDoughnutData = {
        labels: [`Passed (${result.overallStats.passCount})`, `Failed (${result.overallStats.failCount})`],
        datasets: [
            {
                data: [result.overallStats.passCount, result.overallStats.failCount],
                backgroundColor: ['#28a745', '#dc3545'],
                borderColor: ['#1e7e34', '#bd2130'],
                borderWidth: 2,
                hoverOffset: 10
            },
        ],
    };

    // 2. Subject Pass vs Fail Dual Bar Data
    const subjectPassFailData = {
        labels: result.subjects.map((s: any) => s.name),
        datasets: [
            {
                label: 'Passed Candidates',
                data: result.subjects.map((s: any) => s.passCount),
                backgroundColor: 'rgba(40, 167, 69, 0.75)',
                borderColor: '#28a745',
                borderWidth: 1.5,
                borderRadius: 6,
            },
            {
                label: 'Failed Candidates',
                data: result.subjects.map((s: any) => s.failCount),
                backgroundColor: 'rgba(220, 53, 69, 0.75)',
                borderColor: '#dc3545',
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
    let distinction = 0, firstClass = 0, secondClass = 0, passClass = 0, failed = 0;
    students.forEach((s: any) => {
        if (!s.isPass) failed++;
        else if (s.percentage >= 75) distinction++;
        else if (s.percentage >= 60) firstClass++;
        else if (s.percentage >= 50) secondClass++;
        else passClass++;
    });

    const gradeBreakdownData = {
        labels: [
            `Distinction 75%+ (${distinction})`, 
            `First Class 60-74% (${firstClass})`, 
            `Second Class 50-59% (${secondClass})`, 
            `Pass Class 35-49% (${passClass})`, 
            `Failed (${failed})`
        ],
        datasets: [
            {
                data: [distinction, firstClass, secondClass, passClass, failed],
                backgroundColor: ['#D4AF37', '#28a745', '#17a2b8', '#ffc107', '#dc3545'],
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
                            const subDoughnutData = {
                                labels: [`Passed (${sub.passCount})`, `Failed (${sub.failCount})`],
                                datasets: [
                                    {
                                        data: [sub.passCount, sub.failCount],
                                        backgroundColor: ['#28a745', '#dc3545'],
                                        borderColor: ['#1e7e34', '#bd2130'],
                                        borderWidth: 1
                                    }
                                ]
                            };

                            const failPct = (100 - sub.passPercentage).toFixed(1);

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

                                    <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                        <span style={{ color: '#28a745', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <CheckCircle size={12} /> {sub.passPercentage.toFixed(1)}% Pass
                                        </span>
                                        <span style={{ color: '#dc3545', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                            <AlertTriangle size={12} /> {failPct}% Fail
                                        </span>
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
