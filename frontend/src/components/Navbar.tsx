import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Upload, List, ArrowLeft, Home } from 'lucide-react';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <h1 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '1.8rem' }}>KLECET</span>
                    <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>| Result Analyzer</span>
                </h1>
            </div>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Home size={18} /> Home
                </Link>
                <Link to="/upload" className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Upload size={18} /> Upload
                </Link>
                <Link to="/results" className={`nav-link ${location.pathname === '/results' ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <List size={18} /> Results
                </Link>
                {location.pathname !== '/' && (
                    <button 
                        onClick={() => navigate(-1)} 
                        className="btn btn-secondary"
                        style={{ padding: '6px 15px', fontSize: '0.8rem' }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
