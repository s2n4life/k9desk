import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSync } from '@/hooks/useSync';

export function SyncManager() {
    const { status, queueLength, lastError, isHydrating } = useSync();
    const [showSuccess, setShowSuccess] = useState(false);

    // Briefly show "All Backed Up" when queue clears
    useEffect(() => {
        if (status === 'idle' && queueLength === 0) {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [status, queueLength]);

    const [hydrationTime, setHydrationTime] = useState(0);

    // Track hydration duration for UI feedback
    useEffect(() => {
        if (!isHydrating) {
            setHydrationTime(0);
            return;
        }
        const interval = setInterval(() => setHydrationTime(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, [isHydrating]);

    if (isHydrating) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#ffffff',
                zIndex: 99999,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid var(--brand-primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }} />
                <h2 className="text-h2">Loading K9desk...</h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {hydrationTime > 8 ? 'Still syncing (slow connection)...' : 'Syncing your data'}
                </p>

                {hydrationTime > 12 && (
                    <div style={{ marginTop: '30px', animation: 'fadeIn 0.5s ease-in' }}>
                        <p style={{ fontSize: '14px', marginBottom: '15px' }}>
                            Data sync is taking longer than expected.
                        </p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => window.location.reload()}
                            style={{ width: '200px', marginBottom: '10px' }}
                        >
                            Retry Sync
                        </button>
                    </div>
                )}

                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}</style>
            </div>
        );
    }

    // Floating Sync Status Bar
    if (status === 'offline' || status === 'syncing' || showSuccess || lastError) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '100px', // Above bottom nav
                left: '20px',
                right: '20px',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    backgroundColor: 'var(--surface-overlay)',
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border-subtle)',
                    color: status === 'offline' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 500
                }}>
                    {status === 'offline' && (
                        <>
                            <CloudOff size={16} style={{ color: 'var(--text-tertiary)' }} />
                            <span>Offline Mode - Data Saved Locally</span>
                        </>
                    )}
                    {status === 'syncing' && (
                        <>
                            <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--brand-primary)' }} />
                            <span>Saving {queueLength} {queueLength === 1 ? 'item' : 'items'} to Cloud...</span>
                        </>
                    )}
                    {status === 'idle' && showSuccess && queueLength === 0 && (
                        <>
                            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                            <span>All Backed Up</span>
                        </>
                    )}
                    {lastError && (
                        <>
                            <Cloud size={16} style={{ color: 'var(--error)' }} />
                            <span style={{ color: 'var(--error)' }}>Sync Error (Retrying...)</span>
                        </>
                    )}
                </div>
                <style jsx>{`
                    @keyframes slideUp {
                        from { transform: translateY(20px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .animate-spin {
                        animation: spin 1s linear infinite;
                    }
                `}</style>
            </div>
        );
    }

    return null;
}
