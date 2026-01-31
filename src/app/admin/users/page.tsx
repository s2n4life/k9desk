'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useImpersonation } from '@/contexts/ImpersonationContext';
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
import { format, formatDistanceToNow } from 'date-fns';

type BusinessAccount = {
    id: string;
    name: string;
    owner_id: string;
    subscription_status: string;
    trial_end_date: string;
    created_at: string;
    owner_email?: string;
    owner_role?: string;
    owner_phone?: string;
    stripe_subscription_id?: string;
    total_jobs?: number;
    jobs_last_30_days?: number;
    last_activity?: string;
};

export default function AdminUsersPage() {
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [activityFilter, setActivityFilter] = useState<string>('all');
    const [jobsFilter, setJobsFilter] = useState<string>('all');
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
                    profiles:owner_id (email, role, phone),
                    jobs:jobs!business_id (id, created_at, state)
                `)
                .order('created_at', { ascending: false });

            if (data) {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

                const mapped = data.map((b: any) => {
                    const allJobs = b.jobs || [];
                    // Count all completed/closed jobs (completed, payment_requested, paid, closed)
                    const completedStates = ['completed', 'payment_requested', 'paid', 'closed'];
                    const completedJobs = allJobs.filter((j: any) => completedStates.includes(j.state));
                    const jobsLast30Days = completedJobs.filter((j: any) =>
                        new Date(j.created_at) >= thirtyDaysAgo
                    );

                    // Find last activity (most recent job or business creation)
                    const lastJobDate = allJobs.length > 0
                        ? new Date(Math.max(...allJobs.map((j: any) => new Date(j.created_at).getTime())))
                        : null;
                    const lastActivity = lastJobDate || new Date(b.created_at);

                    return {
                        ...b,
                        owner_email: b.profiles?.email,
                        owner_role: b.profiles?.role,
                        owner_phone: b.profiles?.phone,
                        stripe_subscription_id: b.stripe_subscription_id,
                        total_jobs: completedJobs.length,
                        jobs_last_30_days: jobsLast30Days.length,
                        last_activity: lastActivity.toISOString()
                    };
                });
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

    const uncompAccount = async (id: string) => {
        if (!confirm('Are you sure you want to Un-comp this account? This will reset them to a trial status (14 days).')) return;

        const newTrialEnd = new Date();
        newTrialEnd.setDate(newTrialEnd.getDate() + 14);

        const { error } = await supabase
            .from('businesses')
            .update({
                subscription_status: 'trialing',
                trial_end_date: newTrialEnd.toISOString()
            })
            .eq('id', id);

        if (!error) {
            setAccounts(accounts.map(a => a.id === id ? {
                ...a,
                subscription_status: 'trialing',
                trial_end_date: newTrialEnd.toISOString()
            } : a));
            alert('Account reset to trial successfully!');
        }
    };

    const clearStripeId = async (id: string) => {
        if (!confirm('Are you sure you want to CLEAR the Stripe Subscription ID from this account? This might cause issues if they are still paying via Stripe.')) return;

        const { error } = await supabase
            .from('businesses')
            .update({ stripe_subscription_id: null })
            .eq('id', id);

        if (!error) {
            setAccounts(accounts.map(a => a.id === id ? { ...a, stripe_subscription_id: undefined } : a));
            alert('Stripe ID cleared successfully!');
        } else {
            console.error('Error clearing Stripe ID:', error);
            alert('Failed to clear Stripe ID');
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
            return a.subscription_status === statusFilter;
        });
    }

    // Apply activity filter
    if (activityFilter !== 'all') {
        processedAccounts = processedAccounts.filter(a => {
            if (!a.last_activity) return false;
            const lastActivity = new Date(a.last_activity);
            const now = new Date();
            const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

            switch (activityFilter) {
                case 'active_7d':
                    return daysSinceActivity <= 7;
                case 'recent_30d':
                    return daysSinceActivity <= 30;
                case 'inactive_90d':
                    return daysSinceActivity > 90;
                case 'never':
                    return (a.total_jobs || 0) === 0;
                default:
                    return true;
            }
        });
    }

    // Apply jobs filter
    if (jobsFilter !== 'all') {
        processedAccounts = processedAccounts.filter(a => {
            const totalJobs = a.total_jobs || 0;

            switch (jobsFilter) {
                case 'high':
                    return totalJobs >= 20;
                case 'medium':
                    return totalJobs >= 5 && totalJobs < 20;
                case 'low':
                    return totalJobs >= 1 && totalJobs < 5;
                case 'none':
                    return totalJobs === 0;
                default:
                    return true;
            }
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
            case 'activity_desc':
                return new Date(b.last_activity || 0).getTime() - new Date(a.last_activity || 0).getTime();
            case 'jobs_desc':
                return (b.total_jobs || 0) - (a.total_jobs || 0);
            default:
                return 0;
        }
    });

    if (loading) return <div style={{ color: '#94a3b8' }}>Loading accounts...</div>;

    return (
        <div>
            <header style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6c5ce7', marginBottom: '8px' }}>
                            <Users size={24} />
                            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0, color: 'white' }}>Users</h1>
                        </div>
                        <p style={{ color: '#94a3b8', margin: 0 }}>Manage user accounts and subscriptions.</p>
                    </div>

                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            width: '250px',
                            outline: 'none',
                            fontSize: '14px'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Filter size={14} style={{ color: '#94a3b8' }} />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="trialing">Trialing</option>
                        <option value="active">Active</option>
                        <option value="past_due">Past Due</option>
                        <option value="canceled">Canceled</option>
                    </select>

                    <select
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        <option value="all">All Activity</option>
                        <option value="active_7d">Active (7d)</option>
                        <option value="recent_30d">Recent (30d)</option>
                        <option value="inactive_90d">Inactive (90d+)</option>
                        <option value="never">Never Used</option>
                    </select>

                    <select
                        value={jobsFilter}
                        onChange={(e) => setJobsFilter(e.target.value)}
                        style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        <option value="all">All Jobs</option>
                        <option value="high">High (20+)</option>
                        <option value="medium">Medium (5-19)</option>
                        <option value="low">Low (1-4)</option>
                        <option value="none">None (0)</option>
                    </select>

                    <div style={{ width: '1px', height: '20px', backgroundColor: '#334155', margin: '0 4px' }}></div>

                    <ArrowUpDown size={14} style={{ color: '#94a3b8' }} />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '13px'
                        }}
                    >
                        <option value="created_desc">Newest First</option>
                        <option value="created_asc">Oldest First</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="activity_desc">Most Active</option>
                        <option value="jobs_desc">Most Jobs</option>
                        <option value="trial_end">Trial End Date</option>
                    </select>
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {processedAccounts.map(account => {
                    const isTrialing = account.subscription_status === 'trialing';
                    const isOverdue = account.subscription_status === 'past_due' || (isTrialing && new Date(account.trial_end_date) < new Date());

                    return (
                        <div key={account.id} className="admin-card" style={{
                            padding: '20px',
                            border: '1px solid #1e293b',
                            borderRadius: '12px',
                            backgroundColor: '#1e293b'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '24px', alignItems: 'start' }}>
                                {/* Left Column: Business Info & Contact */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'white' }}>{account.name}</span>
                                        {account.owner_role === 'super_admin' && (
                                            <div title="Super Admin" style={{ color: '#6c5ce7', display: 'flex', alignItems: 'center' }}>
                                                <ShieldCheck size={18} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Contact Info */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{account.owner_email}</span>
                                            {account.owner_email && (
                                                <a
                                                    href={`mailto:${account.owner_email}`}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: '#6c5ce7',
                                                        textDecoration: 'none',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #6c5ce7',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#6c5ce7'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    Email
                                                </a>
                                            )}
                                        </div>
                                        {account.owner_phone && (
                                            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{account.owner_phone}</div>
                                        )}
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                            Joined {format(new Date(account.created_at), 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                </div>

                                {/* Middle Column: Metrics */}
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Activity
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                                            Total Jobs: <span style={{ fontWeight: 700, color: 'white' }}>{account.total_jobs || 0}</span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                                            Last 30d: <span style={{ fontWeight: 700, color: '#6c5ce7' }}>{account.jobs_last_30_days || 0}</span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                                            Last Active: <span style={{ fontWeight: 700, color: '#10b981' }}>
                                                {account.last_activity ? formatDistanceToNow(new Date(account.last_activity), { addSuffix: true }) : 'Never'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Status & Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        backgroundColor: account.subscription_status === 'active' ? '#10b98120' : isOverdue ? '#ef444420' : '#6c5ce720',
                                        color: account.subscription_status === 'active' ? '#10b981' : isOverdue ? '#ef4444' : '#6c5ce7',
                                        textTransform: 'uppercase'
                                    }}>
                                        {account.subscription_status}
                                    </div>

                                    {isTrialing && (
                                        <div style={{ fontSize: '0.75rem', color: isOverdue ? '#ef4444' : '#94a3b8', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                <Clock size={12} /> Trial Ends:
                                            </div>
                                            <div style={{ fontWeight: 600, marginTop: '2px' }}>{format(new Date(account.trial_end_date), 'MMM d, yyyy')}</div>
                                        </div>
                                    )}

                                    {account.stripe_subscription_id && (
                                        <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <CreditCard size={10} />
                                            <span title={account.stripe_subscription_id}>Stripe: {account.stripe_subscription_id.substring(0, 10)}...</span>
                                            <button
                                                onClick={() => clearStripeId(account.id)}
                                                style={{ background: 'none', border: 'none', color: '#6c5ce7', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                            >
                                                (Clear)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Row */}
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #1e293b' }}>

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
                                    {account.subscription_status === 'active' ? (
                                        <button
                                            onClick={() => uncompAccount(account.id)}
                                            className="btn-admin-primary"
                                            style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#dc262620', color: '#dc2626', border: '1px solid #dc2626' }}
                                        >
                                            Un-comp
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => compAccount(account.id)}
                                            className="btn-admin-primary"
                                            style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: '#334155' }}
                                        >
                                            Comp Account
                                        </button>
                                    )}
                                    <button
                                        onClick={() => startImpersonation(account.id)}
                                        className="btn-admin-primary"
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <LogIn size={14} /> Login As
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Trial Extension Modal */}
            {
                showExtendModal && selectedAccount && (
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
                )
            }
        </div>
    );
}
