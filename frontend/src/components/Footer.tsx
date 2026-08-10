import React from 'react';
import { useNavigate } from 'react-router-dom';

const LinkedinIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z"/>
    </svg>
);

const GithubIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/>
    </svg>
);

const InstagramIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
);

const Footer: React.FC = () => {
    const navigate = useNavigate();

    const socialLinks = [
        {
            name: 'LinkedIn',
            icon: <LinkedinIcon />,
            url: 'https://www.linkedin.com/in/basavaraj-kagale-5b91b3278/'
        },
        {
            name: 'GitHub',
            icon: <GithubIcon />,
            url: 'https://github.com/BasavarajKagale'
        },
        {
            name: 'Instagram',
            icon: <InstagramIcon />,
            url: 'https://www.instagram.com/mr_basavaraj__kagale?igsh=a3k2eGJncmdzeXU1'
        }
    ];

    return (
        <footer style={{ padding: '3rem 2rem 1.5rem', textAlign: 'center', background: 'transparent', width: '100%' }}>
            <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>KLECET</div>
            <div style={{ opacity: 0.4, fontSize: '0.7rem', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                ESTABLISHED 2008 • CHIKODI, KARNATAKA
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', color: '#aaa' }}>
                        Designed & Developed by{' '}
                        <button 
                            onClick={() => navigate('/admin/login')} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }} 
                            className="designer-link"
                            title="Click to open Admin Portal"
                        >
                            Basavaraj Kagale
                        </button>
                    </span>

                    {/* Circular Animated Social Icons */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginLeft: '0.3rem' }}>
                        {socialLinks.map((social) => (
                            <a
                                key={social.name}
                                href={social.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Visit ${social.name} Profile`}
                                className="social-icon-btn"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: '#ccc',
                                    textDecoration: 'none',
                                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                }}
                            >
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>

                <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>
                    © 2026 KLECET Chikodi. All Rights Reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
