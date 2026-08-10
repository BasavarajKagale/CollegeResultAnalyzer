import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { ShieldCheck, LogOut, Trash2, Eye, BarChart3, AlertTriangle } from 'lucide-react';
import Toast from '../components/Toast';

const AdminDashboard = () => {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();

    // Check Admin Authentication
    useEffect(() => {
        const isAdmin = localStorage.getItem('adminToken') === 'true';
        if (!isAdmin) {
            navigate('/admin/login');
            return;
        }

        fetchResults();
    }, [navigate]);

    const fetchResults = async () => {
        try {
            const res = await api.get('/results');
            setResults(res.data);
        } catch (err) {
            console.error('Error fetching admin results:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setToastMsg('Admin logged out successfully.');
        setTimeout(() => {
            navigate('/');
        }, 1200);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/results/${deleteTarget._id}`);
            setResults(prev => prev.filter(r => r._id !== deleteTarget._id));
            setDeleteTarget(null);
            setToastMsg('Result file deleted successfully.');
        } catch (err) {
            console.error('Failed to delete result file:', err);
            alert('Failed to delete file from database.');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '10rem', fontSize: '1.2rem', color: 'var(--primary)' }}>Loading Admin Portal...</div>;

    const totalFiles = results.length;
    const totalStudentsEvaluated = results.reduce((acc, r) => acc + (r.overallStats?.totalStudents || 0), 0);

    return (
        <div style={{ paddingBottom: '5rem' }}>
            {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

            {/* Admin Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{ background: 'rgba(212, 175, 55, 0.15)', padding: '1rem', borderRadius: '50%', border: '1px solid var(--primary)' }}>
                        <ShieldCheck size={36} color="var(--primary)" />
                    </div>
                    <div>
                        <h2 className="title" style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Basavaraj Kagale</h2>
                        <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>System Administrator & Developer Access Portal</p>
                    </div>
                </div>

                <button 
                    onClick={handleLogout} 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.6rem 1.5rem', borderColor: '#dc3545', color: '#dc3545' }}
                >
                    <LogOut size={16} /> Logout Admin
                </button>
            </div>

            {/* Summary Metrics */}
            <div className="grid" style={{ marginBottom: '3rem' }}>
                <div className="card" style={{ background: 'rgba(212, 175, 55, 0.04)' }}>
                    <p style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Total Evaluated Files</p>
                    <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', margin: '0.3rem 0' }}>{totalFiles}</p>
                    <p style={{ fontSize: '0.8rem', color: '#aaa' }}>Live in MongoDB Database</p>
                </div>

                <div className="card" style={{ background: 'rgba(40, 167, 69, 0.04)' }}>
                    <p style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>Total Students Evaluated</p>
                    <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#28a745', margin: '0.3rem 0' }}>{totalStudentsEvaluated}</p>
                    <p style={{ fontSize: '0.8rem', color: '#aaa' }}>Across all result batches</p>
                </div>
            </div>

            {/* Admin Results Management List */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.8rem 2rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ fontSize: '1.5rem', color: '#fff' }}>Evaluated File Repositories</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Permanent Deletion Access Granted</span>
                </div>

                {results.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: '#888' }}>
                        No evaluated result files found in the database.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ margin: 0, width: '100%', borderSpacing: 0 }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ paddingLeft: '2rem' }}>Result Filename</th>
                                    <th>Upload Date</th>
                                    <th style={{ textAlign: 'center' }}>Students</th>
                                    <th style={{ textAlign: 'center' }}>Pass Rate</th>
                                    <th style={{ textAlign: 'right', paddingRight: '2rem' }}>Admin Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((res) => (
                                    <tr key={res._id}>
                                        <td style={{ paddingLeft: '2rem', fontWeight: 600 }}>
                                            <div className="nowrap" style={{ fontSize: '0.95rem', color: '#fff' }}>{res.filename}</div>
                                        </td>
                                        <td className="nowrap" style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                                            {new Date(res.uploadDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                            {res.overallStats?.totalStudents || 0}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ 
                                                padding: '4px 10px', 
                                                borderRadius: '12px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 700,
                                                background: 'rgba(40, 167, 69, 0.15)',
                                                color: '#28a745'
                                            }}>
                                                {res.overallStats?.passPercentage?.toFixed(1) || 0}%
                                            </span>
                                        </td>
                                        <td style={{ paddingRight: '2rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                                                <Link 
                                                    to={`/results/${res._id}`} 
                                                    className="btn btn-secondary" 
                                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem' }}
                                                    title="View Full Details & Candidate Records"
                                                >
                                                    <Eye size={14} /> Details
                                                </Link>
                                                
                                                <Link 
                                                    to={`/dashboard/${res._id}`} 
                                                    className="btn btn-primary" 
                                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem' }}
                                                    title="View Charts Dashboard"
                                                >
                                                    <BarChart3 size={14} /> Charts
                                                </Link>

                                                <button 
                                                    onClick={() => setDeleteTarget(res)} 
                                                    style={{
                                                        background: 'rgba(220, 53, 69, 0.15)',
                                                        color: '#dc3545',
                                                        border: '1px solid rgba(220, 53, 69, 0.4)',
                                                        borderRadius: '50px',
                                                        padding: '0.4rem 0.9rem',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.3rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Permanently delete file from DB"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Deletion Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', textAlign: 'center', padding: '2.5rem 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
                            <div style={{ background: 'rgba(220, 53, 69, 0.15)', padding: '1rem', borderRadius: '50%', color: '#dc3545' }}>
                                <AlertTriangle size={40} />
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>Confirm Permanent Deletion</h3>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Are you sure you want to delete <strong style={{ color: '#fff' }}>"{deleteTarget.filename}"</strong>? This will permanently remove all evaluated candidate records from the database and website live.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setDeleteTarget(null)} 
                                className="btn btn-secondary" 
                                style={{ flex: 1, padding: '0.7rem' }}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            
                            <button 
                                onClick={confirmDelete} 
                                style={{
                                    flex: 1,
                                    background: '#dc3545',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50px',
                                    padding: '0.7rem',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer'
                                }}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
