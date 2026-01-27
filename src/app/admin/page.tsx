'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Users, DollarSign, Activity, AlertTriangle, LogIn, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        const loadStats = async () => {
            // In Phase 1, we still mock some stats, but we prepare the role check
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch metrics from our new daily_metrics table (In Phase 2 we will aggregate these)
            // For now, let's pretend we have data
            setTimeout(() => {
                setStats({
                    mrr: 12450,
                    activeBusinesses: 142,
                    trialBusinesses: 28,
                    churnRate: 2.1,
                    openTickets: 5,
                    recentErrors: 12
                });
                setLoading(false);
            }, 8000); // 800ms mock delay
        };

        loadStats();
    }, []);

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
                    color="#f59e0b"
                />
                <StatCard
                    label="Churn Rate"
                    value={`${stats.churnRate}%`}
                    icon={Activity}
                    trend="-0.4%"
                    trendUp={true}
                    color="#6366f1"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Sentinel Alerts */}
                <div className="admin-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>The Sentinel: Active Alerts</h3>
                        <Link href="/admin/bugs" style={{ color: '#6c5ce7', fontSize: '0.875rem', textDecoration: 'none' }}>View All</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {stats.recentErrors > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '12px', backgroundColor: '#ef444410', border: '1px solid #ef444420' }}>
                                <AlertTriangle color="#ef4444" size={24} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 600, margin: '0 0 4px 0', fontSize: '0.875rem' }}>Failed Stripe Webhook</p>
                                    <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.75rem' }}>Occured 4 times in the last hour</p>
                                </div>
                                <button onClick={() => router.push('/admin/bugs')} className="btn-admin-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Investigate</button>
                            </div>
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
