import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Upload as UploadIcon, FileUp, Loader2 } from 'lucide-react';

const UploadPage = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        try {
            const res = await api.post('/results/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate(`/results/${res.data._id}`);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Upload failed. Please check the file format.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
            <h2 className="title">Upload Results</h2>
            <p style={{ marginBottom: '2rem', color: '#aaa' }}>
                Analyze batch performance seamlessly from PDF, Excel, or CSV formats.
            </p>
            
            <form onSubmit={handleUpload}>
                <div style={{ 
                    border: '2px dashed var(--primary)', 
                    padding: '3rem', 
                    borderRadius: '16px', 
                    marginBottom: '1.5rem',
                    background: 'rgba(212, 175, 55, 0.05)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'var(--transition)'
                }}>
                    <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv, .pdf" 
                        onChange={handleFileChange}
                        style={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '100%', 
                            opacity: 0, 
                            cursor: 'pointer' 
                        }}
                    />
                    <div style={{ color: '#fff' }}>
                        {file ? (
                            <><FileUp size={48} style={{ color: 'var(--primary)' }} /><p style={{ marginTop: '1rem', fontWeight: 600 }}>{file.name}</p></>
                        ) : (
                            <><UploadIcon size={48} style={{ color: '#888' }} />
                            <p style={{ marginTop: '1rem', fontWeight: 600 }}>Click or drag file here</p>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>Supports PDF (.pdf), Excel (.xlsx, .xls), or CSV (.csv)</p></>
                        )}
                    </div>
                </div>

                {error && <p style={{ color: '#ff4d4d', marginBottom: '1rem' }}>{error}</p>}

                <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={loading || !file}
                    style={{ width: '100%', justifyContent: 'center' }}
                >
                    {loading ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : 'Process & Analyze'}
                </button>
            </form>
        </div>
    );
};

export default UploadPage;
