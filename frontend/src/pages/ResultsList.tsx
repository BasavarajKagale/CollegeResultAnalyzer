import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Calendar, Loader2 } from 'lucide-react';

const ResultsList = () => {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await api.get('/results');
                setResults(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10rem' }}>
                <Loader2 className="animate-spin" size={64} color="var(--primary)" />
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '5rem' }}>
            <h2 className="title" style={{ fontSize: '3rem', marginBottom: '3rem' }}>Analysis History</h2>
            <div className="grid">
                {results.map(res => (
                    <div key={res._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.8rem', color: '#fff' }}>{res.filename}</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px' }}>
                                    <Calendar size={14} /> {new Date(res.uploadDate).toLocaleDateString()}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, background: 'rgba(212,175,55,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                                    {res.overallStats.totalStudents} Students
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                            <div>
                                <p style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Pass Percentage</p>
                                <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)' }}>{res.overallStats.passPercentage.toFixed(1)}%</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                <Link to={`/results/${res._id}`} className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.8rem' }}>
                                    Details
                                </Link>
                                <Link to={`/dashboard/${res._id}`} className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '0.8rem' }}>
                                    Charts
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {results.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                    <p style={{ fontSize: '1.2rem', color: '#aaa' }}>No analysis sessions recorded yet.</p>
                    <Link to="/upload" className="btn btn-primary" style={{ marginTop: '2rem' }}>Begin First Analysis</Link>
                </div>
            )}
        </div>
    );
};

export default ResultsList;
