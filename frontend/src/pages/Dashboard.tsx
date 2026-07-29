import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip, 
    Legend, 
    ArcElement 
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Dashboard = () => {
    const { id } = useParams();
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const res = await api.get(`/results/${id}`);
                setResult(res.data.result);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', padding: '10rem' }}>Generating Analytics...</div>;
    if (!result) return <div style={{ textAlign: 'center', padding: '10rem' }}>Data unavailable.</div>;

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                labels: { color: '#fff', font: { family: 'Inter' } }
            }
        },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#888' } },
            x: { grid: { display: false }, ticks: { color: '#888' } }
        }
    };

    const subjectStatsData = {
        labels: result.subjects.map((s: any) => s.name),
        datasets: [
            {
                label: 'Pass Percentage',
                data: result.subjects.map((s: any) => s.passPercentage),
                backgroundColor: 'rgba(212, 175, 55, 0.5)',
                borderColor: '#D4AF37',
                borderWidth: 2,
                borderRadius: 8,
            },
        ],
    };

    const overallData = {
        labels: ['Passed', 'Failed'],
        datasets: [
            {
                data: [result.overallStats.passCount, result.overallStats.failCount],
                backgroundColor: ['rgba(40, 167, 69, 0.6)', 'rgba(220, 53, 69, 0.6)'],
                borderColor: ['#28a745', '#dc3545'],
                borderWidth: 1,
            },
        ],
    };

    return (
        <div style={{ paddingBottom: '5rem' }}>
            <div style={{ marginBottom: '3rem' }}>
                <h2 className="title" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>Academic Dashboard</h2>
                <p style={{ opacity: 0.6 }}>Visual insights for {result.filename}</p>
            </div>

            <div className="grid">
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                        <PieIcon size={20} /> Distribution
                    </h3>
                    <div style={{ maxWidth: '300px', width: '100%' }}>
                        <Pie data={overallData} options={{ 
                            plugins: { 
                                legend: { position: 'bottom', labels: { color: '#fff' } } 
                            } 
                        }} />
                    </div>
                </div>
                
                <div className="card" style={{ gridColumn: 'span 1' }}>
                    <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                        <TrendingUp size={20} /> Subject Proficiency
                    </h3>
                    <Bar 
                        data={subjectStatsData} 
                        options={{
                            ...chartOptions,
                            scales: {
                                ...chartOptions.scales,
                                y: { ...chartOptions.scales.y, max: 100 }
                            }
                        }}
                    />
                </div>
            </div>

            <div style={{ marginTop: '3rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)' }}>
                        <Activity size={20} /> Subject Highlights
                    </h3>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                        {result.subjects.map((s: any) => (
                            <div key={s.name} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                <h4 style={{ color: 'var(--primary)', marginBottom: '1rem', fontSize: '1.2rem' }}>{s.name}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Success Rate</span>
                                    <span style={{ fontWeight: 700, color: s.passPercentage > 80 ? '#28a745' : '#fff' }}>{s.passPercentage.toFixed(1)}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Peak Marks</span>
                                    <span style={{ fontWeight: 700 }}>{s.highestMarks}</span>
                                </div>
                                <div style={{ marginTop: '1rem', height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${s.passPercentage}%`, height: '100%', background: 'var(--primary)' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
