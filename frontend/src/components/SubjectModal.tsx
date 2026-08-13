import React, { useState } from 'react';
import { X, Trophy, AlertTriangle, Users, BookOpen, CheckCircle } from 'lucide-react';

interface SubjectModalProps {
    subjectName: string;
    students: any[];
    onClose: () => void;
}

const SubjectModal: React.FC<SubjectModalProps> = ({ subjectName, students, onClose }) => {
    const [activeTab, setActiveTab] = useState<'ranking' | 'failed' | 'toppers'>('ranking');

    // Extract scores for this subject
    const subjectStudents = students.map(s => {
        const det = s.subjectDetails?.[subjectName] || {};
        const resUpper = (det.result || '').toUpperCase();
        const mark = s.marks[subjectName] !== undefined ? Number(s.marks[subjectName]) : (det.total !== undefined ? Number(det.total) : 0);

        let isPass = true;
        if (resUpper === 'AB' || resUpper === 'ABSENT' || resUpper === 'A' || resUpper === 'F' || resUpper === 'FAIL' || mark < 35) {
            isPass = false;
        } else if ((det.in !== undefined && det.in > 0 && det.in < 18 && (mark < 35 || resUpper === 'F')) || (det.ex !== undefined && det.ex > 0 && det.ex < 18 && (mark < 35 || resUpper === 'F'))) {
            isPass = false;
        }

        return {
            name: s.name,
            usn: s.usn,
            mark: mark,
            isPass: isPass,
            overallRank: s.rank,
            subjectRank: 0
        };
    });

    // Sort by subject mark descending
    const sortedStudents = [...subjectStudents].sort((a, b) => b.mark - a.mark);
    sortedStudents.forEach((s, idx) => s.subjectRank = idx + 1);

    const passedStudents = sortedStudents.filter(s => s.isPass);
    const failedStudents = sortedStudents.filter(s => !s.isPass);

    const passCount = passedStudents.length;
    const failCount = failedStudents.length;
    const totalCount = students.length || 1;

    const passPercentage = ((passCount / totalCount) * 100).toFixed(1);
    const failPercentage = ((failCount / totalCount) * 100).toFixed(1);

    const highestMark = sortedStudents[0]?.mark || 0;
    const lowestMark = sortedStudents[sortedStudents.length - 1]?.mark || 0;
    const avgMark = (subjectStudents.reduce((acc, s) => acc + s.mark, 0) / totalCount).toFixed(1);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', marginBottom: '0.3rem' }}>
                            <BookOpen size={20} />
                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600 }}>Subject Analytics</span>
                        </div>
                        <h2 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 700 }}>{subjectName}</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Subject Metrics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ background: 'rgba(40, 167, 69, 0.08)', border: '1px solid rgba(40, 167, 69, 0.3)', padding: '1rem', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#28a745', textTransform: 'uppercase', fontWeight: 700 }}>Pass Rate</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#28a745', margin: '0.2rem 0' }}>{passPercentage}%</div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{passCount} / {totalCount} Passed</div>
                    </div>

                    <div style={{ background: 'rgba(220, 53, 69, 0.08)', border: '1px solid rgba(220, 53, 69, 0.3)', padding: '1rem', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#dc3545', textTransform: 'uppercase', fontWeight: 700 }}>Fail Rate</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc3545', margin: '0.2rem 0' }}>{failPercentage}%</div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{failCount} / {totalCount} Failed</div>
                    </div>

                    <div style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '1rem', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700 }}>Top Score</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', margin: '0.2rem 0' }}>{highestMark}</div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {sortedStudents[0]?.name || 'N/A'}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', fontWeight: 700 }}>Average</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>{avgMark}</div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Subject Mean</div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase', fontWeight: 700 }}>Lowest Score</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ff4d4d', margin: '0.2rem 0' }}>{lowestMark}</div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa' }}>Min Marks</div>
                    </div>
                </div>

                {/* Modal Navigation Tabs */}
                <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                    <button 
                        onClick={() => setActiveTab('ranking')}
                        className="btn"
                        style={{ 
                            padding: '0.5rem 1.2rem', 
                            fontSize: '0.8rem',
                            background: activeTab === 'ranking' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'ranking' ? '#000' : '#fff',
                            border: 'none'
                        }}
                    >
                        <Users size={14} /> Subject Rankings ({sortedStudents.length})
                    </button>

                    <button 
                        onClick={() => setActiveTab('failed')}
                        className="btn"
                        style={{ 
                            padding: '0.5rem 1.2rem', 
                            fontSize: '0.8rem',
                            background: activeTab === 'failed' ? 'rgba(220, 53, 69, 0.8)' : 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            border: 'none'
                        }}
                    >
                        <AlertTriangle size={14} /> Failed Candidates ({failCount})
                    </button>

                    <button 
                        onClick={() => setActiveTab('toppers')}
                        className="btn"
                        style={{ 
                            padding: '0.5rem 1.2rem', 
                            fontSize: '0.8rem',
                            background: activeTab === 'toppers' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'toppers' ? 'var(--primary)' : '#fff',
                            border: activeTab === 'toppers' ? '1px solid var(--primary)' : 'none'
                        }}
                    >
                        <Trophy size={14} /> Subject Toppers
                    </button>
                </div>

                {/* Tab Content */}
                <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                    {activeTab === 'ranking' && (
                        <table style={{ margin: 0, width: '100%', borderSpacing: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center', width: '60px' }}>Rank</th>
                                    <th>USN</th>
                                    <th>Student Name</th>
                                    <th style={{ textAlign: 'center' }}>Score</th>
                                    <th style={{ textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStudents.map((s) => (
                                    <tr key={s.usn}>
                                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>#{s.subjectRank}</td>
                                        <td className="nowrap" style={{ fontSize: '0.85rem', opacity: 0.85 }}>{s.usn}</td>
                                        <td className="nowrap" style={{ fontWeight: 600 }}>{s.name}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: s.isPass ? '#fff' : '#ff4d4d' }}>{s.mark}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '3px 10px', 
                                                borderRadius: '12px', 
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
                    )}

                    {activeTab === 'failed' && (
                        failedStudents.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#28a745' }}>
                                <CheckCircle size={48} style={{ marginBottom: '1rem' }} />
                                <h3>100% Success Rate!</h3>
                                <p style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '0.5rem' }}>No candidate failed in this subject.</p>
                            </div>
                        ) : (
                            <table style={{ margin: 0, width: '100%', borderSpacing: 0 }}>
                                <thead>
                                    <tr>
                                        <th>USN</th>
                                        <th>Student Name</th>
                                        <th style={{ textAlign: 'center' }}>Marks Obtained</th>
                                        <th style={{ textAlign: 'center' }}>Shortfall</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {failedStudents.map((s) => (
                                        <tr key={s.usn}>
                                            <td className="nowrap" style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: 600 }}>{s.usn}</td>
                                            <td className="nowrap" style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#ff4d4d', fontSize: '1.1rem' }}>{s.mark} / 100</td>
                                            <td style={{ textAlign: 'center', color: '#ff9999', fontSize: '0.85rem' }}>
                                                {35 - s.mark > 0 ? `${35 - s.mark} mark(s) short` : 'Subject Failed'}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ 
                                                    padding: '4px 10px', 
                                                    borderRadius: '12px', 
                                                    fontSize: '0.7rem', 
                                                    fontWeight: 700,
                                                    background: 'rgba(220, 53, 69, 0.2)',
                                                    color: '#dc3545'
                                                }}>
                                                    FAILED
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                    )}

                    {activeTab === 'toppers' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                            {sortedStudents.slice(0, 5).map((t) => (
                                <div key={t.usn} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                                        <div style={{ 
                                            width: '36px', 
                                            height: '36px', 
                                            borderRadius: '50%', 
                                            background: t.subjectRank === 1 ? 'linear-gradient(135deg, #FFD700, #B8860B)' : t.subjectRank === 2 ? 'linear-gradient(135deg, #C0C0C0, #808080)' : 'linear-gradient(135deg, #CD7F32, #8B4513)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#000',
                                            fontWeight: 800,
                                            fontSize: '1rem'
                                        }}>
                                            #{t.subjectRank}
                                        </div>
                                        <div>
                                            <div className="nowrap" style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>{t.name}</div>
                                            <div className="nowrap" style={{ fontSize: '0.8rem', color: '#888' }}>{t.usn}</div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{t.mark} / 100</div>
                                        <div style={{ fontSize: '0.7rem', color: '#28a745', fontWeight: 700, textTransform: 'uppercase' }}>Subject Leader</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubjectModal;
