'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useImpersonation } from '@/hooks/useImpersonation';
import {
    Users,
    LogIn,
    Clock,
    Calendar,
    ChevronRight,
    Star,
    ShieldCheck,
    CreditCard,
    Filter,
    ArrowUpDown
} from 'lucide-react';
import { format } from 'date-fns';

type BusinessAccount = {
    id: string;
    name: string;
    owner_id: string;
    subscription_status: string;
    trial_end_date: string;
    created_at: string;
    owner_email?: string;
    owner_role?: string;
    stripe_subscription_id?: string;
};

export default function AdminUsersPage() {
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('created_desc');
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<BusinessAccount | null>(null);
    const [extensionDays, setExtensionDays] = useState<number>(14);
    const [customDays, setCustomDays] = useState<string>('');
    const { startImpersonation } = useImpersonation();

    useEffect(() => {
        const loadAccounts = async () => {
            // Join businesses with profiles to get owner email
            const { data, error } = await supabase
                .from('businesses')
                .select(`
                    *,
                    profiles:owner_id (email, role)
                `)
                .order('created_at', { ascending: false });

            if (data) {
                const mapped = data.map((b: any) => ({
                    ...b,
                    owner_email: b.profiles?.email,
                    owner_role: b.profiles?.role,
                    stripe_subscription_id: b.stripe_subscription_id
                }));
                setAccounts(mapped);
            }
            setLoading(false);
        };

        loadAccounts();
    }, []);

    const extendTrial = async (id: string, days: number) => {
        // Find the account to get current trial end date
        const account = accounts.find(a => a.id === id);
        if (!account) {
            alert('Account not found');
            return;
        }

        // Calculate new date from EXISTING trial end, not from today
        const currentTrialEnd = new Date(account.trial_end_date);
        const newDate = new Date(currentTrialEnd);
        newDate.setDate(newDate.getDate() + days);

        try {
            // Update Supabase
            const { error } = await supabase
                .from('businesses')
                .update({
                    trial_end_date: newDate.toISOString(),
                    subscription_status: 'trialing'
                })
                .eq('id', id);

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            // Update local state
            setAccounts(accounts.map(a => a.id === id ? { ...a, trial_end_date: newDate.toISOString(), subscription_status: 'trialing' } : a));
            alert(`Trial extended by ${days} days! New end date: ${newDate.toLocaleDateString()}`);
        } catch (err) {
            console.error('Error extending trial:', err);
            alert('Failed to extend trial. Please try again.');
        }
    };

    const compAccount = async (id: string) => {
        if (!confirm('Are you sure you want to COMP this account? This will mark them as ACTIVE without payment.')) return;

        const { error } = await supabase
            .from('businesses')
            .update({ subscription_status: 'active' })
            .eq('id', id);

        if (!error) {
            setAccounts(accounts.map(a => a.id === id ? { ...a, subscription_status: 'active' } : a));
            alert('Account COMPed successfully!');
        }
    };

    // Filter and sort accounts
    let processedAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.owner_email?.toLowerCase().includes(search.toLowerCase())
    );

    // Apply status filter
    if (statusFilter !== 'all') {
        processedAccounts = processedAccounts.filter(a => {
            if (statusFilter === 'trialing') {
                return a.subscription_status === 'trialing' || a.subscription_status === 'trial';
            }
            return a.subscription_status === statusFilter;
        });
    }

    // Apply sorting
    processedAccounts.sort((a, b) => {
        switch (sortBy) {
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'created_asc':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'created_desc':
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'trial_end':
                return new Date(a.trial_end_date).getTime() - new Date(b.trial_end_date).getTime();
            default:
                return 0;
        }
    });

    if (loading) return <div style={{ color: '#94a3b8' }}>Loading accounts...</div>;

    return (
        <div>
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6c5ce7', marginBottom: '8px' }}>
                    <Users size={24} />
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0, color: 'white' }}>Customers</h1>
                </div>
                <p style={{ color: '#94a3b8', margin: 0, marginBottom: '24px' }}>Manage customer accounts and subscriptions.</p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            width: '300px',
                            outline: 'none'
                        }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} style={{ color: '#94a3b8' }} />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">All Status</option>
                            <option value="trialing">Trialing</option>
                            <option value="active">Active</option>
                            <option value="past_due">Past Due</option>
                            <option value="canceled">Canceled</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ArrowUpDown size={16} style={{ color: '#94a3b8' }} />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="created_desc">Newest First</option>
                            <option value="created_asc">Oldest First</option>
                            <option value="name_asc">Name (A-Z)</option>
                            <option value="name_desc">Name (Z-A)</option>
                            <option value="trial_end">Trial End Date</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className="admin-card" style={{ padding: 0 }}>
                {processedAccounts.map(account => {
                    const isTrialing = account.subscription_status === 'trialing' || account.subscription_status === 'trial';
                    const isOverdue = account.subscription_status === 'past_due' || (isTrialing && new Date(account.trial_end_date) < new Date());

                    return (
                        <div key={account.id} style={{
                            padding: '24px',
                            borderBottom: '1px solid #1e293b',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(200px, 1.5fr) 1fr 1fr 1.5fr',
                            alignItems: 'center',
                            gap: '24px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600, color: 'white' }}>{account.name}</span>
                                    {account.owner_role === 'super_admin' && (
                                        <div title="Super Admin" style={{ color: '#6c5ce7', display: 'flex', alignItems: 'center' }}>
                                            <ShieldCheck size={16} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{account.owner_email}</div>
                                <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>Joined {format(new Date(account.created_at), 'MMM d, yyyy')}</div>
                            </div>

                            <div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    backgroundColor: account.subscription_status === 'active' ? '#10b98120' : isOverdue ? '#ef444420' : '#6c5ce720',
                                    color: account.subscription_status === 'active' ? '#10b981' : isOverdue ? '#ef4444' : '#6c5ce7',
                                    textTransform: 'uppercase'
                                }}>
                                    {account.subscription_status}
                                </div>
                            </div>

                            <div style={{ fontSize: '0.875rem' }}>
                                {isTrialing ? (
                                    <div style={{ color: isOverdue ? '#ef4444' : '#94a3b8' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} /> Trial Ends:
                                        </div>
                                        <div style={{ fontWeight: 500 }}>{format(new Date(account.trial_end_date), 'MMM d')}</div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#94a3b8' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Calendar size={14} /> Active Since:
                                        </div>
                                        <div style={{ fontWeight: 500 }}>{format(new Date(account.created_at), 'MMM d')}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => {
                                        setSelectedAccount(account);
                                        setExtensionDays(14);
                                        setCustomDays('');
                                        setShowExtendModal(true);
                                    }}
                                    className="btn-admin-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#334155' }}
                                >
                                    Extend Trial
                                </button>
                                <button
                                    onClick={() => compAccount(account.id)}
                                    className="btn-admin-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#334155' }}
                                >
                                    Comp Account
                                </button>
                                <button
                                    onClick={() => startImpersonation(account.id)}
                                    className="btn-admin-primary"
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <LogIn size={14} /> Login As
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Trial Extension Modal */}
            {showExtendModal && selectedAccount && (
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
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        padding: '32px',
                        maxWidth: '500px',
                        width: '90%',
                        border: '1px solid #334155'
                    }}>
                        <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '1.5rem' }}>Extend Trial Period</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                            Extend trial for <strong style={{ color: 'white' }}>{selectedAccount.name}</strong>
                        </p>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ color: '#94a3b8', fontSize: '0.875rem', display: 'block', marginBottom: '12px' }}>
                                Select Extension Period:
                            </label>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                                {[7, 14, 30].map(days => (
                                    <button
                                        key={days}
                                        onClick={() => {
                                            setExtensionDays(days);
                                            setCustomDays('');
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: extensionDays === days && !customDays ? '2px solid #6c5ce7' : '1px solid #334155',
                                            backgroundColor: extensionDays === days && !customDays ? '#6c5ce720' : '#0f172a',
                                            color: extensionDays === days && !customDays ? '#6c5ce7' : '#94a3b8',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {days} Days
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginTop: '16px' }}>
                                <label style={{ color: '#94a3b8', fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>
                                    Or enter custom days:
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={customDays}
                                    onChange={(e) => {
                                        setCustomDays(e.target.value);
                                        if (e.target.value) {
                                            setExtensionDays(parseInt(e.target.value) || 14);
                                        }
                                    }}
                                    placeholder="Enter number of days"
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: customDays ? '2px solid #6c5ce7' : '1px solid #334155',
                                        backgroundColor: '#0f172a',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowExtendModal(false);
                                    setSelectedAccount(null);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid #334155',
                                    backgroundColor: '#0f172a',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const days = customDays ? parseInt(customDays) : extensionDays;
                                    if (days > 0 && days <= 365) {
                                        extendTrial(selectedAccount.id, days);
                                        setShowExtendModal(false);
                                        setSelectedAccount(null);
                                    } else {
                                        alert('Please enter a valid number of days (1-365)');
                                    }
                                }}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#6c5ce7',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Extend Trial
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
