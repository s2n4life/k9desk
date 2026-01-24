import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)'
        }}>
            <div className="card" style={{
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                animation: 'slideUp 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 className="text-h2" style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-tertiary)' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    padding: 'var(--space-4)',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{
                        padding: 'var(--space-4)',
                        borderTop: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)'
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
