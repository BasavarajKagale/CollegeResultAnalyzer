import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import Toast from '../components/Toast';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate admin credentials via backend API
            const res = await api.post('/results/admin/login', { email, password });
            
            if (res.data.success) {
                localStorage.setItem('adminToken', 'true');
                localStorage.setItem('adminUser', JSON.stringify(res.data.admin));
                
                setToastMsg('Admin logged in successfully.');

                setTimeout(() => {
                    navigate('/admin');
                }, 1200);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid admin email or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '450px', margin: '5rem auto', textAlign: 'center', position: 'relative' }}>
            {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '1rem', borderRadius: '50%', border: '1px solid var(--primary)' }}>
                    <ShieldCheck size={40} color="var(--primary)" />
                </div>
            </div>

            <h2 className="title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Admin Developer Portal</h2>
            <p style={{ marginBottom: '2rem', color: '#aaa', fontSize: '0.9rem' }}>
                Secure access for system admin & developer management.
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ position: 'relative', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>
                        Admin Email
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                        <input 
                            type="email" 
                            required
                            placeholder="basavaraj@kle.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem 0.8rem 2.8rem',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                color: '#fff',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div style={{ position: 'relative', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.75rem', color: '#aaa', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>
                        Password
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
                        <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem 0.8rem 2.8rem',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--glass-border)',
                                color: '#fff',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {error && (
                    <p style={{ color: '#ff4d4d', fontSize: '0.85rem', background: 'rgba(255,77,77,0.1)', padding: '0.6rem', borderRadius: '8px' }}>
                        {error}
                    </p>
                )}

                <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                >
                    {loading ? <><Loader2 className="animate-spin" size={18} /> Authenticating...</> : <>Login to Portal <ArrowRight size={18} /></>}
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;
