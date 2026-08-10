import React, { useEffect } from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
    message: string;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 1500 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div style={{
            position: 'fixed',
            top: '25px',
            right: '25px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            background: '#111827',
            borderLeft: '4px solid #10b981',
            borderRadius: '12px',
            padding: '1rem 1.5rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(16, 185, 129, 0.2)',
            color: '#f8fafc',
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.95rem',
            fontWeight: 500,
            gap: '0.8rem',
            minWidth: '280px',
            animation: 'toastSlideIn 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                flexShrink: 0
            }}>
                <Check size={16} strokeWidth={3} />
            </div>
            
            <span>{message}</span>

            {/* Bottom Progress Line */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '3px',
                background: '#10b981',
                borderRadius: '0 0 12px 12px',
                width: '100%',
                animation: `toastProgress ${duration}ms linear forwards`
            }} />
            
            <style>{`
                @keyframes toastSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes toastProgress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
};

export default Toast;
