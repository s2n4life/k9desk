import { useState } from 'react';
import { getDB } from '@/lib/db';
import { Save, X } from 'lucide-react';

interface ReviewLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string) => Promise<void>;
}

export function ReviewLinkModal({ isOpen, onClose, onSave }: ReviewLinkModalProps) {
    const [url, setUrl] = useState('');
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(url);
            setUrl(''); // Reset
        } catch (error) {
            console.error(error);
            alert('Failed to save link');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            paddingBottom: '20px',
            zIndex: 1000,
            animation: 'fadeIn 0.2s'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-card)',
                width: '90%',
                maxWidth: '400px',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                marginBottom: '20px', // Lift up a bit
                boxShadow: 'var(--shadow-xl)',
                animation: 'slideUp 0.3s'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h3 className="text-h3" style={{ marginBottom: 0 }}>Add Review Link</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)' }}>
                        <X size={24} />
                    </button>
                </div>

                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    You haven't set a review link yet. Enter it below to send the request and save it for future use.
                </p>

                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Review URL</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="https://g.page/r/..."
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                            disabled={saving || !url}
                        >
                            {saving ? 'Saving...' : 'Save & Send'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
