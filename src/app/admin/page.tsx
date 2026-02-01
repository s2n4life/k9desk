'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Users, DollarSign, Activity, AlertTriangle, LogIn, TrendingUp, Clock, AlertCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { captureLog } from '@/lib/admin/sentinel';
import { formatDistanceToNow } from 'date-fns';
import AtRiskUsersModal from '@/components/Admin/AtRiskUsersModal';
import AdminToDoWidget from '@/components/Admin/AdminToDoWidget';
import AdminToDoModal from '@/components/Admin/AdminToDoModal';

type StatCardProps = {
    label: string;
    value: string | number;
    icon: any;
    trend?: string;
    trendUp?: boolean;
    color: string;
    onClick?: () => void;
};

function StatCard({ label, value, icon: Icon, trend, trendUp, color, onClick }: StatCardProps) {
    return (
        <div
            className="admin-card"
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
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
                    <span style={{ color: '#64748b' }}>vs last 30 days</span>
                </div>
            )}
        </div>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [showAtRiskModal, setShowAtRiskModal] = useState(false);
    const [showToDoModal, setShowToDoModal] = useState(false);
    const [kpis, setKpis] = useState({
        mrr: { value: 0, change: 0, changePercent: 0 },
        netNewMrr: { value: 0, isPositive: true },
        activeMembers: { value: 0, change: 0 },
        activeTrials: { value: 0, change: 0 },
        trialConversion: { value: 0, change: 0 },
        atRisk: { value: 0 }
    });
    const [recentErrorLogs, setRecentErrorLogs] = useState<any[]>([]);
    const [recentTickets, setRecentTickets] = useState<any[]>([]);

    useEffect(() => {
        let channel: any;

        const loadDashboard = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch all KPIs in parallel
            const [mrrRes, netMrrRes, membersRes, trialsRes, conversionRes, atRiskRes] = await Promise.all([
                fetch('/api/admin/kpis/mrr').then(r => r.json()),
                fetch('/api/admin/kpis/net-new-mrr').then(r => r.json()),
                fetch('/api/admin/kpis/active-members').then(r => r.json()),
                fetch('/api/admin/kpis/active-trials').then(r => r.json()),
                fetch('/api/admin/kpis/trial-conversion').then(r => r.json()),
                fetch('/api/admin/kpis/at-risk-users').then(r => r.json()),
            ]);

            setKpis({
                mrr: {
                    value: mrrRes.mrr || 0,
                    change: mrrRes.change || 0,
                    changePercent: mrrRes.changePercent || 0
                },
                netNewMrr: {
                    value: netMrrRes.netNewMrr || 0,
                    isPositive: netMrrRes.isPositive !== false
                },
                activeMembers: {
                    value: membersRes.activeMembers || 0,
                    change: membersRes.change || 0
                },
                activeTrials: {
                    value: trialsRes.activeTrials || 0,
                    change: trialsRes.change || 0
                },
                trialConversion: {
                    value: conversionRes.conversionRate || 0,
                    change: conversionRes.change || 0
                },
                atRisk: {
                    value: atRiskRes.atRiskCount || 0
                }
            });

            // Fetch recent error logs from system_logs
            const fetchLogs = async () => {
                const { data: errorLogs } = await supabase
                    .from('system_logs')
                    .select('*')
                    .eq('level', 'error')
                    .order('created_at', { ascending: false })
                    .limit(5);

                setRecentErrorLogs(errorLogs || []);
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

            // Fetch actual tickets for display and count
            const { data: tickets } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    businesses:business_id (name),
                    profiles:user_id (email)
                `)
                .order('created_at', { ascending: false })
                .limit(5);

            // Filter for new tickets and prepare display data
            let displayTickets: Array<{ subject: string; business_name: string; created_at: string; priority: string }> = [];

            if (tickets && tickets.length > 0) {
                const newTickets = tickets.filter((t: any) => t.status === 'new');
                displayTickets = newTickets.slice(0, 2).map((t: any) => ({
                    subject: t.subject,
                    business_name: t.businesses?.name || 'Unknown Business',
                    created_at: t.created_at,
                    priority: t.priority
                }));
            }

            setRecentTickets(displayTickets);
            setLoading(false);
        };

        loadDashboard();

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

            {/* KPI Grid - 3x2 Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '24px',
                marginBottom: '40px'
            }}>
                {/* Top Row */}
                <StatCard
                    label="Monthly Recurring Revenue"
                    value={`$${kpis.mrr.value.toLocaleString()}`}
                    icon={DollarSign}
                    trend={kpis.mrr.changePercent !== 0 ? `${kpis.mrr.changePercent > 0 ? '+' : ''}${kpis.mrr.changePercent}%` : undefined}
                    trendUp={kpis.mrr.changePercent >= 0}
                    color="#6c5ce7"
                />
                <StatCard
                    label="Net New MRR"
                    value={`${kpis.netNewMrr.value >= 0 ? '+' : ''}$${kpis.netNewMrr.value.toLocaleString()}`}
                    icon={TrendingUp}
                    trend={kpis.netNewMrr.isPositive ? "Growing" : "Declining"}
                    trendUp={kpis.netNewMrr.isPositive}
                    color={kpis.netNewMrr.isPositive ? "#10b981" : "#ef4444"}
                />
                <StatCard
                    label="Users At Risk"
                    value={kpis.atRisk.value}
                    icon={AlertCircle}
                    trend={kpis.atRisk.value > 0 ? "Needs attention" : "All clear"}
                    trendUp={kpis.atRisk.value === 0}
                    color="#f59e0b"
                    onClick={() => setShowAtRiskModal(true)}
                />

                {/* Bottom Row */}
                <StatCard
                    label="Active Members"
                    value={kpis.activeMembers.value}
                    icon={Users}
                    trend={kpis.activeMembers.change !== 0 ? `${kpis.activeMembers.change > 0 ? '+' : ''}${kpis.activeMembers.change}` : undefined}
                    trendUp={kpis.activeMembers.change >= 0}
                    color="#10b981"
                />
                <StatCard
                    label="Active Trials"
                    value={kpis.activeTrials.value}
                    icon={Clock}
                    trend={kpis.activeTrials.change !== 0 ? `${kpis.activeTrials.change > 0 ? '+' : ''}${kpis.activeTrials.change}` : undefined}
                    trendUp={kpis.activeTrials.change >= 0}
                    color="#3b82f6"
                />
                <StatCard
                    label="Trial → Paid Conversion"
                    value={`${kpis.trialConversion.value}%`}
                    icon={Activity}
                    trend={kpis.trialConversion.change !== 0 ? `${kpis.trialConversion.change > 0 ? '+' : ''}${kpis.trialConversion.change}%` : undefined}
                    trendUp={kpis.trialConversion.change >= 0}
                    color="#8b5cf6"
                />
            </div>

            {/* ToDo List - Full Width */}
            <div style={{ marginBottom: '24px' }}>
                <AdminToDoWidget onOpenModal={() => setShowToDoModal(true)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
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
                        <span style={{ backgroundColor: '#6c5ce7', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>{recentTickets.length} NEW</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {recentTickets.length > 0 ? (
                            recentTickets.map((ticket, idx) => {
                                const timeAgo = formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true });
                                const priorityColor = ticket.priority === 'high' || ticket.priority === 'urgent' ? '#ef4444' : '#f59e0b';

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            paddingBottom: idx < recentTickets.length - 1 ? '12px' : '0',
                                            borderBottom: idx < recentTickets.length - 1 ? '1px solid #334155' : 'none'
                                        }}
                                    >
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: priorityColor }} />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{ticket.subject}</p>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{ticket.business_name} • {timeAgo}</p>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>No new tickets</p>
                        )}
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

            {/* At-Risk Users Modal */}
            <AtRiskUsersModal
                isOpen={showAtRiskModal}
                onClose={() => setShowAtRiskModal(false)}
                onDismiss={() => {
                    // Refresh at-risk count after dismissal
                    fetch('/api/admin/kpis/at-risk-users')
                        .then(r => r.json())
                        .then(data => {
                            setKpis(prev => ({
                                ...prev,
                                atRisk: { value: data.atRiskCount || 0 }
                            }));
                        });
                }}
            />

            {/* ToDo Modal */}
            <AdminToDoModal
                isOpen={showToDoModal}
                onClose={() => setShowToDoModal(false)}
                onTaskUpdate={() => {
                    // Refresh widget when tasks are updated
                    // The widget will auto-refresh via its own useEffect
                }}
            />
        </div>
    );
}
