'use client';

import { useImpersonation } from '@/contexts/ImpersonationContext';
import { AlertTriangle, LogOut } from 'lucide-react';

export function ImpersonationBanner() {
    const { impersonatedBusinessId, stopImpersonation } = useImpersonation();

    if (!impersonatedBusinessId) return null;

    return (
        <div style={{
            backgroundColor: '#ea580c', // Bright orange
            color: 'white',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
            <AlertTriangle size={18} />
            <span>ADMIN MODE: Impersonating Business ID: {impersonatedBusinessId.slice(0, 8)}...</span>
            <button
                onClick={stopImpersonation}
                style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.4)',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}
            >
                <LogOut size={14} /> Exit
            </button>
        </div>
    );
}
