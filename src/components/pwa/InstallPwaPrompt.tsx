'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../UI/Modal';
import { Share, MoreVertical, PlusSquare, ArrowUp, Monitor, Download, Smartphone, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { isIOS, isSafari, isChromeOnIOS, isAndroid, permanentlyDismissPrompt } from '@/lib/pwa-utils';

interface InstallPwaPromptProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InstallPwaPrompt: React.FC<InstallPwaPromptProps> = ({ isOpen, onClose }) => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
        onClose();
    };

    const renderInstructions = () => {
        if (isIOS()) {
            // Updated instructions based on user feedback for latest iOS (e.g., 17.4+) 
            // where the 3 dots menu is often the entry point even in Safari or Chrome.
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <p className="text-p" style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Save K9desk to your home screen for full access and the best experience.
                    </p>
                    <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--bg-secondary)' }}>
                        <ol style={{ paddingLeft: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            <li className="text-p">
                                Tap the <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>3 dots <MoreHorizontal size={18} style={{ color: 'var(--primary-color)' }} /></span> at the bottom right.
                            </li>
                            <li className="text-p">
                                Click the <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Share button <Share size={18} style={{ color: 'var(--primary-color)' }} /></span> (rectangle with arrow up).
                            </li>
                            <li className="text-p">
                                Scroll down to find and select <span style={{ fontWeight: 600 }}>"Add to Home Screen"</span>.
                            </li>
                            <li className="text-p">
                                Tap <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>"Add"</span> in the top right.
                            </li>
                        </ol>
                    </div>
                </div>
            );
        }

        if (deferredPrompt) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', textAlign: 'center' }}>
                    <p className="text-p" style={{ color: 'var(--text-secondary)' }}>
                        Install K9desk on your device for quick access and a better experience.
                    </p>
                    <button
                        onClick={handleInstallClick}
                        className="button-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
                    >
                        <Download size={20} />
                        Install App
                    </button>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', textAlign: 'center' }}>
                <p className="text-p" style={{ color: 'var(--text-secondary)' }}>
                    To install K9desk, open your browser's menu and select <span style={{ fontWeight: 600 }}>"Add to Home Screen"</span> or <span style={{ fontWeight: 600 }}>"Install App"</span>.
                </p>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Add to Home Screen"
            footer={
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <button
                        onClick={onClose}
                        className="button-secondary"
                        style={{ width: '100%' }}
                    >
                        Maybe Later
                    </button>
                    <button
                        onClick={() => {
                            permanentlyDismissPrompt();
                            onClose();
                        }}
                        style={{
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}
                    >
                        <CheckCircle2 size={14} /> I've already added it (Don't show again)
                    </button>
                </div>
            }
        >
            <div style={{ padding: 'var(--space-2) 0' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                    color: 'var(--primary-color)'
                }}>
                    <Smartphone size={48} />
                </div>
                {renderInstructions()}
            </div>
        </Modal>
    );
};
