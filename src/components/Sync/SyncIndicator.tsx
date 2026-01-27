'use client';

import { useSync } from '@/hooks/useSync';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SyncIndicator() {
    const { status, queueLength, lastError } = useSync();
    const [show, setShow] = useState(false);

    // Only show if something is happening or wrong
    useEffect(() => {
        if (status === 'syncing' || status === 'offline' || queueLength > 0 || lastError) {
            setShow(true);
        } else {
            const timer = setTimeout(() => setShow(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [status, queueLength, lastError]);

    if (!show) return null;

    let icon = <Cloud size={16} />;
    let text = 'Synced';
    let color = 'var(--text-tertiary)';
    let bg = 'transparent';

    if (status === 'offline') {
        icon = <CloudOff size={16} />;
        text = 'Offline';
        color = 'var(--text-tertiary)';
    } else if (status === 'syncing') {
        icon = <RefreshCw size={16} className="spin" />;
        text = queueLength > 0 ? `Syncing (${queueLength})...` : 'Syncing...';
        color = 'var(--brand-primary)';
        bg = 'var(--brand-primary-light)';
    } else if (status === 'error' || lastError) {
        icon = <AlertCircle size={16} />;
        text = 'Sync Error';
        color = 'var(--color-danger)';
        bg = '#FEE2E2';
    } else if (queueLength > 0) {
        icon = <Cloud size={16} />;
        text = `Pending (${queueLength})`;
        color = 'var(--brand-secondary)';
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 'var(--space-4)',
            right: 'var(--space-4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: '20px',
            background: bg === 'transparent' ? 'rgba(255,255,255,0.9)' : bg,
            border: `1px solid ${status === 'error' ? 'var(--color-danger)' : 'var(--border-color)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            color: color,
            transition: 'all 0.3s ease'
        }}>
            <style jsx>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
            {icon}
            <span>{text}</span>
        </div>
    );
}
