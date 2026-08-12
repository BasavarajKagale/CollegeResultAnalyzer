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
                    <a href={`${baseURL}/results/${id}/download/pdf`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.6rem 1.4rem' }}>
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
                        <Trophy size={24} /> Top 5 Academic Toppers
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {([...students].sort((a: any, b: any) => (b.totalMarks || 0) - (a.totalMarks || 0))).slice(0, 5).map((t: any, idx: number) => (
                            <div key={t._id || `${t.usn}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.8rem 1.2rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', width: '25px' }}>#{idx + 1}</span>
                                    <div>
                                        <div className="nowrap" style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.name}</div>
                                        <div className="nowrap" style={{ fontSize: '0.75rem', color: '#888' }}>{t.usn}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {t.totalMarks}/{(result.subjects?.length || 1) * 100}
                                    </div>
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
                                        <CheckCircle2 size={12} /> Pass: {sub.passPercentage.toFixed(1)}% ({sub.totalPassCount || sub.passCount || 0})
                                    </span>
                                    <span style={{ color: '#dc3545', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <AlertTriangle size={12} /> Fail: {failPct}% ({sub.failCount || 0})
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
            <div className="card" style={{ padding: '0', overflow: 'hidden', width: '100%', marginBottom: '3rem' }}>
                <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
                    <h3 style={{ fontSize: '1.4rem' }}>Candidate Results & Performance Directory</h3>
                </div>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ margin: '0', width: '100%', borderSpacing: '0', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ padding: '0.8rem 0.5rem', textAlign: 'center', width: '45px' }}>Sl No</th>
                                <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left' }}>Std Name</th>
                                <th style={{ padding: '0.8rem 0.5rem', textAlign: 'left' }}>USN</th>
                                {result.subjects.map((s: any) => (
                                    <th 
                                        key={s.name} 
                                        onClick={() => setSelectedSubject(s.name)}
                                        className="subject-badge"
                                        title={`Click for ${s.name} Subject Dashboard`}
                                        style={{ textAlign: 'center', cursor: 'pointer', padding: '0.8rem 0.4rem', fontSize: '0.75rem' }}
                                    >
                                        {s.name}
                                    </th>
                                ))}
                                <th style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>Total</th>
                                <th style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>Percentage</th>
                                <th style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>Remark</th>
                                <th style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>No of Subjects Failed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...students].sort((a: any, b: any) => (a.usn || '').localeCompare(b.usn || '', undefined, { numeric: true, sensitivity: 'base' })).map((s: any, idx: number) => {
                                const failedCount = s.failedSubjectsCount !== undefined ? s.failedSubjectsCount : (result.subjects.filter((sub: any) => (s.marks[sub.name] || 0) < 35).length);
                                const isFailedOverall = !s.isPass || s.remark === 'FAIL';
                                return (
                                    <tr key={s._id || `${s.usn}-${idx}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ textAlign: 'center', padding: '0.6rem 0.4rem', fontWeight: 600, color: 'var(--primary)' }}>
                                            {idx + 1}
                                        </td>
                                        <td className="nowrap" style={{ fontWeight: 600, padding: '0.6rem 0.5rem' }}>{s.name}</td>
                                        <td className="nowrap" style={{ fontSize: '0.8rem', opacity: 0.85, padding: '0.6rem 0.5rem' }}>{s.usn}</td>
                                        {result.subjects.map((sub: any) => {
                                            const markVal = s.marks[sub.name] !== undefined ? s.marks[sub.name] : 0;
                                            const det = s.subjectDetails?.[sub.name] || {};
                                            const resUpper = (det.result || '').toUpperCase();

                                            let isSubFail = false;
                                            let reasonTag = '';

                                            if (resUpper === 'AB' || resUpper === 'ABSENT') {
                                                isSubFail = true;
                                                reasonTag = '(AB)';
                                            } else if (det.ex !== undefined && det.ex >= 0 && det.ex < 18) {
                                                isSubFail = true;
                                                reasonTag = '(EX)';
                                            } else if (det.in !== undefined && det.in >= 0 && det.in < 18) {
                                                isSubFail = true;
                                                reasonTag = '(IN)';
                                            } else if (markVal < 35 || resUpper === 'F' || resUpper === 'FAIL') {
                                                isSubFail = true;
                                                reasonTag = (det.in !== undefined && det.in < 18) ? '(IN)' : '(EX)';
                                            }

                                            const displayText = isSubFail ? `${markVal}${reasonTag}` : `${markVal}`;

                                            return (
                                                <td 
                                                    key={sub.name} 
                                                    title={isSubFail ? `Failed due to ${reasonTag.trim().replace('(', '').replace(')', '')}` : `Passed ${sub.name}`}
                                                    style={{ 
                                                        textAlign: 'center', 
                                                        padding: '0.6rem 0.4rem',
                                                        backgroundColor: isSubFail ? 'rgba(220, 53, 69, 0.25)' : 'transparent',
                                                        color: isSubFail ? '#ff6b6b' : '#fff',
                                                        fontWeight: isSubFail ? 700 : 400
                                                    }}
                                                >
                                                    {displayText}
                                                </td>
                                            );
                                        })}
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)', padding: '0.6rem 0.5rem' }}>
                                            {s.totalMarks}/{(result.subjects?.length || 1) * 100}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, padding: '0.6rem 0.5rem' }}>{s.percentage}%</td>
                                        <td style={{ 
                                            textAlign: 'center', 
                                            padding: '0.6rem 0.5rem',
                                            backgroundColor: isFailedOverall ? 'rgba(220, 53, 69, 0.25)' : 'rgba(40, 167, 69, 0.15)',
                                            color: isFailedOverall ? '#ff6b6b' : '#28a745',
                                            fontWeight: 700
                                        }}>
                                            {s.remark || (s.isPass ? 'PASS' : 'FAIL')}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, padding: '0.6rem 0.5rem', color: failedCount > 0 ? '#ff6b6b' : '#28a745' }}>
                                            {failedCount}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pic 2 Subject-wise Statistics Table below Student List */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '3rem', width: '100%' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                    Subject Statistics Summary Matrix (Pic 2 Layout)
                </h3>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ margin: '0', width: '100%', borderSpacing: '0', fontSize: '0.8rem', textAlign: 'center', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <th style={{ padding: '0.7rem', textAlign: 'left' }}>Metric</th>
                                {result.subjects.map((sub: any) => (
                                    <th key={sub.name} style={{ padding: '0.7rem' }}>{sub.name.split(' ')[0]}</th>
                                ))}
                                <th style={{ padding: '0.7rem', color: 'var(--primary)' }}>Overall Batch</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { label: 'Appeared', key: 'appearedCount', overall: result.overallStats.totalStudents },
                                { label: 'FCD', key: 'fcdCount', overall: result.overallStats.fcdCount || 0 },
                                { label: 'FC', key: 'fcCount', overall: result.overallStats.fcCount || 0 },
                                { label: 'SC', key: 'scCount', overall: result.overallStats.scCount || 0 },
                                { label: 'pass', key: 'passClassCount', overall: result.overallStats.passClassCount || 0 },
                                { label: 'Fail', key: 'failCount', overall: result.overallStats.failCount || 0 },
                                { label: 'AB', key: 'abCount', overall: '-' },
                                { label: 'With Held', key: 'withHeldCount', overall: '-' },
                                { label: 'Percentage', key: 'passPercentage', isPct: true, overall: `${(result.overallStats.passPercentage || 0).toFixed(2)}%` },
                                { label: 'Staff Name', isBlank: true, overall: '-' },
                                { label: 'Staff Signature', isBlank: true, overall: '-' }
                            ].map((m: any, idx: number) => (
                                <tr key={m.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                    <td style={{ textAlign: 'left', padding: '0.6rem', fontWeight: 700 }}>{m.label}</td>
                                    {result.subjects.map((sub: any) => {
                                        let displayVal = '-';
                                        if (m.isBlank) displayVal = ''; // Blank for lectures to manually fill in excel later
                                        else if (m.isPct) displayVal = `${(sub.passPercentage || 0).toFixed(2)}%`;
                                        else displayVal = sub[m.key] !== undefined ? sub[m.key] : 0;
                                        return (
                                            <td key={sub.name} style={{ padding: '0.6rem' }}>{displayVal}</td>
                                        );
                                    })}
                                    <td style={{ padding: '0.6rem', fontWeight: 700, color: 'var(--primary)' }}>{m.overall}</td>
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
