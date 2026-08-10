import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { baseURL } from '../services/api';
import { FileSpreadsheet, FileText, Trophy, Users, BookOpen, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import SubjectModal from '../components/SubjectModal';

const ResultDetails = () => {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

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

    if (loading) return <div style={{ textAlign: 'center', padding: '10rem', fontSize: '1.2rem', color: 'var(--primary)' }}>Processing Data Details...</div>;
    if (!data) return <div style={{ textAlign: 'center', padding: '10rem' }}>Analysis Session Not Found.</div>;

    const { result, students } = data;

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* Header section with responsive title & truncation */}
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
                        {result.filename}
                    </h2>
                    <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Comprehensive Performance & Batch Analysis</p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                    <a href={`${baseURL}/results/${id}/download/excel`} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.6rem 1.4rem' }}>
                        <FileSpreadsheet size={16} /> Export Excel
                    </a>
                    <a href={`${baseURL}/results/${id}/download/pdf`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.6rem 1.4rem' }}>
                        <FileText size={16} /> PDF Report
                    </a>
                </div>
            </div>

            {/* Batch Summary & Toppers Grid */}
            <div className="grid" style={{ marginBottom: '3rem' }}>
                <div className="card">
                    <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <Users size={24} /> Batch Summary
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {result.toppers.map((t: any, idx: number) => (
                            <div key={t._id || `${t.usn}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.2rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', width: '25px' }}>#{t.rank}</span>
                                    <div>
                                        <div className="nowrap" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.name}</div>
                                        <div className="nowrap" style={{ fontSize: '0.75rem', color: '#888' }}>{t.usn}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{t.totalMarks}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{t.percentage}%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Subject Overview Quick Cards */}
            <div className="card" style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <BookOpen size={20} color="var(--primary)" /> Subject-Wise Analytics & Failed Students
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>Click any subject card for full report</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
                    {result.subjects.map((sub: any) => {
                        const failPct = (100 - sub.passPercentage).toFixed(1);
                        return (
                            <div 
                                key={sub.name}
                                onClick={() => setSelectedSubject(sub.name)}
                                className="card"
                                style={{ 
                                    padding: '1.2rem', 
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                    <h4 style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 700, paddingRight: '1rem' }}>{sub.name}</h4>
                                    <ExternalLink size={16} style={{ color: '#888', flexShrink: 0 }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#28a745', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <CheckCircle2 size={12} /> Pass: {sub.passPercentage.toFixed(1)}% ({sub.passCount})
                                    </span>
                                    <span style={{ color: '#dc3545', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <AlertTriangle size={12} /> Fail: {failPct}% ({sub.failCount})
                                    </span>
                                </div>

                                {/* Dual Progress Bar */}
                                <div style={{ height: '6px', background: 'rgba(220, 53, 69, 0.3)', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: `${sub.passPercentage}%`, height: '100%', background: '#28a745' }} />
                                    <div style={{ width: `${100 - sub.passPercentage}%`, height: '100%', background: '#dc3545' }} />
                                </div>

                                <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#aaa' }}>
                                    <span>Highest: <strong style={{ color: '#fff' }}>{sub.highestMarks}</strong></span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>View Rankings & Failures &rarr;</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Detailed Candidate Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.8rem 2rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.5rem' }}>Detailed Candidate Record</h3>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>Click subject column headers for subject report</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ margin: '0', width: '100%', borderSpacing: '0' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ paddingLeft: '2rem', textAlign: 'center', width: '60px' }}>Rank</th>
                                <th>USN</th>
                                <th>Name</th>
                                {result.subjects.map((s: any) => (
                                    <th 
                                        key={s.name} 
                                        onClick={() => setSelectedSubject(s.name)}
                                        className="subject-badge"
                                        title={`Click for ${s.name} Subject Dashboard`}
                                        style={{ textAlign: 'center', cursor: 'pointer' }}
                                    >
                                        {s.name}
                                    </th>
                                ))}
                                <th style={{ textAlign: 'center' }}>Total</th>
                                <th style={{ textAlign: 'center' }}>Percentage</th>
                                <th style={{ paddingRight: '2rem', textAlign: 'center' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s: any, idx: number) => (
                                <tr key={s._id || `${s.usn}-${idx}`}>
                                    <td style={{ paddingLeft: '2rem', textAlign: 'center', background: 'transparent' }}>
                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{s.rank}</span>
                                    </td>
                                    <td className="nowrap" style={{ fontSize: '0.85rem', opacity: 0.85 }}>{s.usn}</td>
                                    <td className="nowrap" style={{ fontWeight: 600 }}>{s.name}</td>
                                    {result.subjects.map((sub: any) => (
                                        <td key={sub.name} style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                color: s.marks[sub.name] < 35 ? '#ff4d4d' : '#fff',
                                                fontWeight: s.marks[sub.name] < 35 ? 700 : 400
                                            }}>
                                                {s.marks[sub.name]}
                                            </span>
                                        </td>
                                    ))}
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{s.totalMarks}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.percentage}%</td>
                                    <td style={{ paddingRight: '2rem', textAlign: 'center' }}>
                                        <span style={{ 
                                            padding: '4px 12px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.7rem', 
                                            fontWeight: 700,
                                            background: s.isPass ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
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

export default ResultDetails;
