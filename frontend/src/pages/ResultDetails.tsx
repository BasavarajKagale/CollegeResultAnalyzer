import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { baseURL } from '../services/api';
import { FileSpreadsheet, FileText, Trophy, Users } from 'lucide-react';

const ResultDetails = () => {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div style={{ textAlign: 'center', padding: '10rem' }}>Processing Data Details...</div>;
    if (!data) return <div style={{ textAlign: 'center', padding: '10rem' }}>Analysis Session Not Found.</div>;

    const { result, students } = data;

    return (
        <div style={{ paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h2 className="title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{result.filename}</h2>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Comprehensive Performance Analysis</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <a href={`${baseURL}/results/${id}/download/excel`} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                        <FileSpreadsheet size={16} /> Export Excel
                    </a>
                    <a href={`${baseURL}/results/${id}/download/pdf`} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                        <FileText size={16} /> PDF Report
                    </a>
                </div>
            </div>

            <div className="grid" style={{ marginBottom: '3rem' }}>
                <div className="card">
                    <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Users size={24} /> Batch Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <p style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Total Candidates</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>{result.overallStats.totalStudents}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Overall Pass %</p>
                            <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)' }}>{result.overallStats.passPercentage.toFixed(2)}%</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Successful</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 600, color: '#28a745' }}>{result.overallStats.passCount}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>Unsuccessful</p>
                            <p style={{ fontSize: '1.4rem', fontWeight: 600, color: '#dc3545' }}>{result.overallStats.failCount}</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Trophy size={24} /> Academic Toppers
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {result.toppers.map((t: any, idx: number) => (
                            <div key={t._id || `${t.usn}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', width: '30px' }}>#{t.rank}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{t.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{t.usn}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{t.totalMarks}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{t.percentage}%</div>
                                    <div style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase' }}>Weighted Score</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '2rem 2rem 1rem' }}>
                    <h3 style={{ fontSize: '1.5rem' }}>Detailed Candidate Record</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ margin: '0', width: '100%', borderSpacing: '0' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ paddingLeft: '2rem' }}>Rank</th>
                                <th>USN</th>
                                <th>Name</th>
                                {result.subjects.map((s: any) => (
                                    <th key={s.name}>{s.name}</th>
                                ))}
                                <th>Total</th>
                                <th>Percentage</th>
                                <th style={{ paddingRight: '2rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s: any, idx: number) => (
                                <tr key={s._id || `${s.usn}-${idx}`}>
                                    <td style={{ paddingLeft: '2rem', background: 'transparent' }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{s.rank}</span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>{s.usn}</td>
                                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                                    {result.subjects.map((sub: any) => (
                                        <td key={sub.name} style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                color: s.marks[sub.name] < 40 ? '#ff4d4d' : '#fff',
                                                fontWeight: s.marks[sub.name] < 40 ? 700 : 400
                                            }}>
                                                {s.marks[sub.name]}
                                            </span>
                                        </td>
                                    ))}
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.totalMarks}</td>
                                    <td style={{ fontWeight: 600 }}>{s.percentage}%</td>
                                    <td style={{ paddingRight: '2rem' }}>
                                        <span style={{ 
                                            padding: '4px 12px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 700,
                                            background: s.isPass ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                                            color: s.isPass ? '#28a745' : '#dc3545'
                                        }}>
                                            {s.isPass ? 'PASS' : 'FAIL'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResultDetails;
