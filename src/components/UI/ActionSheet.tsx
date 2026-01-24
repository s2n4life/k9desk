'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface ActionOption {
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive' | 'primary';
}

interface ActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    options: ActionOption[];
}

export function ActionSheet({ isOpen, onClose, title, options }: ActionSheetProps) {
    const [mounted, setMounted] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setIsClosing(false);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
            setIsClosing(false);
        }, 300); // Match animation duration
    };

    if (!mounted) return null;

    if (!isOpen && !isClosing) return null;

    const content = (
        <div
            className="action-sheet-backdrop"
            onClick={handleClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                opacity: isClosing ? 0 : 1,
                transition: 'opacity 0.3s ease-out'
            }}
        >
            <div
                className="action-sheet-panel"
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: 'transparent',
                    padding: '16px',
                    paddingBottom: '32px', // Safe area
                    transform: isClosing ? 'translateY(100%)' : 'translateY(0)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                {/* Options Group */}
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '14px',
                    overflow: 'hidden'
                }}>
                    {title && (
                        <div style={{
                            padding: '12px 16px',
                            textAlign: 'center',
                            fontSize: '13px',
                            color: '#8e8e93',
                            borderBottom: '1px solid rgba(0,0,0,0.1)'
                        }}>
                            {title}
                        </div>
                    )}
                    {options.map((option, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                option.action();
                                handleClose();
                            }}
                            style={{
                                width: '100%',
                                padding: '16px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: index < options.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                                fontSize: '20px',
                                color: option.variant === 'destructive' ? '#ff3b30' : '#007aff',
                                cursor: 'pointer',
                                fontWeight: 400
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Cancel Button */}
                <button
                    onClick={handleClose}
                    style={{
                        width: '100%',
                        padding: '16px',
                        backgroundColor: 'white',
                        borderRadius: '14px',
                        border: 'none',
                        fontSize: '20px',
                        color: '#007aff',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
