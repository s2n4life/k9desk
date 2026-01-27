'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Users, DollarSign, Activity, AlertTriangle, LogIn, TrendingUp, Clock, AlertCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { captureLog } from '@/lib/admin/sentinel';

type StatCardProps = {
    label: string;
    value: string | number;
    icon: any;
    trend?: string;
    trendUp?: boolean;
    color: string;
};

function StatCard({ label, value, icon: Icon, trend, trendUp, color }: StatCardProps) {
    return (
        <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '4px' }}>{label}</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{value}</h3>
                </div>
                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: `${color}20`, color: color }}>
                    <Icon size={20} />
                </div>
            </div>
            {trend && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}>
                    <span style={{ color: trendUp ? '#10b981' : '#ef4444', fontWeight: 600 }}>{trend}</span>
                    <span style={{ color: '#64748b' }}>vs last month</span>
                </div>
            )}
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        mrr: 0,
        activeBusinesses: 0,
        trialBusinesses: 0,
        churnRate: 0,
        openTickets: 0,
        recentErrors: 0
    });
    const [recentErrorLogs, setRecentErrorLogs] = useState<any[]>([]);

    useEffect(() => {
        let channel: any;

        const loadStats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch recent error logs from system_logs
            const fetchLogs = async () => {
                const { data: errorLogs } = await supabase
                    .from('system_logs')
                    .select('*')
                    .eq('level', 'error')
                    .order('created_at', { ascending: false })
                    .limit(5);

                setRecentErrorLogs(errorLogs || []);
                setStats(prev => ({
                    ...prev,
                    recentErrors: errorLogs?.length || 0
                }));
            };

            await fetchLogs();

            // Set up real-time subscription
            channel = supabase
                .channel('admin-dashboard-logs')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'system_logs' },
                    (payload) => {
                        console.log('[Dashboard] Log change detected:', payload.eventType);
                        fetchLogs();
                    }
                )
                .subscribe();

            // Mock stats
            setStats(prev => ({
                ...prev,
                mrr: 12450,
                activeBusinesses: 142,
                trialBusinesses: 28,
                churnRate: 2.1,
                openTickets: 5
            }));

            setLoading(false);
        };

        loadStats();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const resolveLog = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Optimistic UI update
        setRecentErrorLogs(prev => prev.filter(log => log.id !== id));
        setStats(prev => ({
            ...prev,
            recentErrors: Math.max(0, prev.recentErrors - 1)
        }));

        const { error } = await supabase
            .from('system_logs')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Dashboard] Failed to resolve log:', error.message, error.details);
            // Re-fetch on error to ensure sync
            const { data: errorLogs } = await supabase
                .from('system_logs')
                .select('*')
                .eq('level', 'error')
                .order('created_at', { ascending: false })
                .limit(5);
            if (errorLogs) setRecentErrorLogs(errorLogs);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #1e293b', borderTop: '4px solid #6c5ce7', borderRadius: '50%' }} />
        </div>
    );


    return (
        <div>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 8px 0' }}>SaaS Overview</h1>
                <p style={{ color: '#94a3b8', margin: 0 }}>Operational health and growth metrics.</p>
            </header>

            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <StatCard
                    label="Monthly Revenue"
                    value={`$${stats.mrr.toLocaleString()}`}
                    icon={DollarSign}
                    trend="+12.5%"
                    trendUp={true}
                    color="#6c5ce7"
                />
                <StatCard
                    label="Active Members"
                    value={stats.activeBusinesses}
                    icon={Users}
                    trend="+4"
                    trendUp={true}
                    color="#10b981"
                />
                <StatCard
                    label="Active Trials"
                    value={stats.trialBusinesses}
                    icon={Clock}
                    trend="-2.4%"
                    trendUp={false}
                    color="#3b82f6"
                />
                <StatCard
                    label="Active Alerts"
                    value={stats.recentErrors}
                    icon={AlertTriangle}
                    trend={stats.recentErrors > 0 ? "Needs review" : "Healthy"}
                    trendUp={stats.recentErrors === 0}
                    color={stats.recentErrors > 0 ? "#ef4444" : "#10b981"}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Active Alerts List */}
                <div className="admin-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>The Sentinel: Active Alerts</h3>
                        <Link href="/admin/bugs" style={{ color: '#6c5ce7', fontSize: '0.875rem', textDecoration: 'none' }}>View All</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {recentErrorLogs.length > 0 ? (
                            recentErrorLogs.slice(0, 3).map((log) => (
                                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '12px', backgroundColor: '#ef444410', border: '1px solid #ef444420' }}>
                                    <AlertTriangle color="#ef4444" size={24} />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: '0.875rem' }}>{log.message}</p>
                                        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.75rem' }}>
                                            {new Date(log.created_at).toLocaleString()} {log.business_id ? `• Business: ${log.business_id.slice(0, 8)}` : ''}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={(e) => resolveLog(log.id, e)}
                                            title="Mark as Resolved"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#10b981',
                                                cursor: 'pointer',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#10b98110')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button onClick={() => router.push('/admin/bugs')} className="btn-admin-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Investigate</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>No active alerts. Systems healthy.</p>
                        )}
                    </div>
                </div>

                {/* Support Queue */}
                <div className="admin-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Support Queue</h3>
                        <span style={{ backgroundColor: '#6c5ce7', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>{stats.openTickets} NEW</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Cannot upload pet image</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>John's Grooming • 10m ago</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>Question about billing cycle</p>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Happy Paws • 2h ago</p>
                            </div>
                        </div>
                    </div>

                    <Link href="/admin/tickets" style={{ display: 'block', textAlign: 'center', marginTop: '24px', color: '#94a3b8', fontSize: '0.875rem', textDecoration: 'none' }}>Go to Ticket Portal</Link>
                </div>
            </div>

            <style jsx>{`
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
