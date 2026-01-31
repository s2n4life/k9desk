'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface AtRiskUser {
    businessId: string;
    businessName: string;
    ownerEmail: string;
    reasons: Array<{
        type: 'trial_ending' | 'payment_failed' | 'scheduled_cancel';
        details: string;
    }>;
}

interface AtRiskUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDismiss: () => void;
}

export default function AtRiskUsersModal({ isOpen, onClose, onDismiss }: AtRiskUsersModalProps) {
    const [users, setUsers] = useState<AtRiskUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [dismissing, setDismissing] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchAtRiskUsers();
        }
    }, [isOpen]);

    const fetchAtRiskUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/at-risk-users');
            const data = await response.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Failed to fetch at-risk users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = async (businessId: string) => {
        setDismissing(businessId);
        try {
            const response = await fetch('/api/admin/at-risk-users/dismiss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ businessId }),
            });

            if (response.ok) {
                // Remove from local list
                setUsers(users.filter(u => u.businessId !== businessId));
                // Notify parent to refresh KPI count
                onDismiss();
            }
        } catch (error) {
            console.error('Failed to dismiss user:', error);
        } finally {
            setDismissing(null);
        }
    };

    const getRiskIcon = (type: string) => {
        switch (type) {
            case 'trial_ending':
                return '⏰';
            case 'payment_failed':
                return '💳';
            case 'scheduled_cancel':
                return '🚫';
            default:
                return '⚠️';
        }
    };

    const getRiskColor = (type: string) => {
        switch (type) {
            case 'trial_ending':
                return '#f59e0b';
            case 'payment_failed':
                return '#ef4444';
            case 'scheduled_cancel':
                return '#8b5cf6';
            default:
                return '#64748b';
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '800px',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertCircle size={24} color="#f59e0b" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Users At Risk</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    flex: 1,
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            Loading...
                        </div>
                    ) : users.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <CheckCircle size={48} color="#10b981" style={{ marginBottom: '16px' }} />
                            <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>No users at risk!</p>
                            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>All customers are in good standing.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {users.map((user) => (
                                <div
                                    key={user.businessId}
                                    style={{
                                        backgroundColor: '#0f172a',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        border: '1px solid #334155',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                                                {user.businessName}
                                            </h3>
                                            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0 0 12px 0' }}>
                                                {user.ownerEmail}
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {user.reasons.map((reason, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            fontSize: '0.875rem',
                                                        }}
                                                    >
                                                        <span style={{ fontSize: '1.25rem' }}>{getRiskIcon(reason.type)}</span>
                                                        <span style={{ color: getRiskColor(reason.type), fontWeight: 500 }}>
                                                            {reason.details}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDismiss(user.businessId)}
                                            disabled={dismissing === user.businessId}
                                            style={{
                                                backgroundColor: dismissing === user.businessId ? '#334155' : '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '8px 16px',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                cursor: dismissing === user.businessId ? 'not-allowed' : 'pointer',
                                                opacity: dismissing === user.businessId ? 0.5 : 1,
                                            }}
                                        >
                                            {dismissing === user.businessId ? 'Dismissing...' : 'Dismiss'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
