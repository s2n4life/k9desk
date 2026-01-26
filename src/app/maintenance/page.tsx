'use client';

import { Shield, Clock } from 'lucide-react';

export default function MaintenancePage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px',
            backgroundColor: 'var(--surface-sunken)',
            color: 'var(--text-primary)'
        }}>
            <div style={{
                background: 'var(--brand-primary-light)',
                padding: '24px',
                borderRadius: '50%',
                marginBottom: '24px'
            }}>
                <Shield size={48} color="var(--brand-primary)" />
            </div>

            <h1 className="text-h1" style={{ marginBottom: '16px' }}>Scheduled Maintenance</h1>

            <p className="text-body" style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6 }}>
                K9Desk is currently undergoing a quick upgrade to bring you new features.
                We'll be back online shortly!
            </p>

            <div style={{
                marginTop: '32px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--brand-primary)',
                fontSize: '0.875rem',
                fontWeight: 600
            }}>
                <Clock size={16} />
                <span>Estimated uptime: Within 30 minutes</span>
            </div>

            <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary"
                style={{ marginTop: '40px' }}
            >
                Check again
            </button>
        </div>
    );
}
