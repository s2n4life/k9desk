'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Users, DollarSign, Activity, AlertTriangle, Search, LogIn } from 'lucide-react';
import Link from 'next/link';

// Mock Types until we get real DB connection
type Business = {
    id: string;
    name: string;
    owner_email: string;
    subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled';
    job_count: number;
    created_at: string;
};

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false); // We will lock this down later
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeSubs: 0,
        churnRate: 0,
    });

    useEffect(() => {
        // 1. Check if user is Super Admin
        // For now, we'll pretend everyone is admin while building UI
        // In production, we check `profiles.role === 'super_admin'`

        // 2. Load Data
        // Mocking data because we don't have keys yet
        const timer = setTimeout(() => {
            setBusinesses([
                { id: '1', name: "John's Grooming", owner_email: 'john@example.com', subscription_status: 'active', job_count: 142, created_at: '2025-01-01' },
                { id: '2', name: "Happy Paws Mobile", owner_email: 'sue@example.com', subscription_status: 'trialing', job_count: 12, created_at: '2026-01-10' },
                { id: '3', name: "Dog Gone Clean", owner_email: 'bob@example.com', subscription_status: 'past_due', job_count: 89, created_at: '2024-11-15' },
                { id: '4', name: "Scrub A Dub", owner_email: 'alice@example.com', subscription_status: 'canceled', job_count: 450, created_at: '2023-05-20' },
            ]);
            setStats({
                totalRevenue: 12500,
                activeSubs: 142,
                churnRate: 2.4
            });
            setLoading(false);
            setIsAdmin(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    if (loading) return <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>Loading Admin Panel...</div>;

    if (!isAdmin) return (
        <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
            <Shield size={64} style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }} />
            <h1>Access Denied</h1>
            <p>You do not have permission to view this page.</p>
            <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Go Home</Link>
        </div>
    );

    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: 'var(--space-6)' }}>
            <header style={{ marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Shield size={32} color="var(--brand-primary)" />
                    <h1 className="text-h1" style={{ margin: 0 }}>Super Admin</h1>
                </div>
                <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                    Manage your SaaS Empire.
                </p>
            </header>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        <DollarSign size={16} /> Revenue (MRR)
                    </div>
                    <div className="text-h2">${stats.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        <Users size={16} /> Active Users
                    </div>
                    <div className="text-h2">{stats.activeSubs}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', marginBottom: 8 }}>
                        <Activity size={16} /> Churn Rate
                    </div>
                    <div className="text-h2" style={{ color: stats.churnRate < 5 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {stats.churnRate}%
                    </div>
                </div>
            </div>

            {/* Business List */}
            <h3 className="text-h2" style={{ marginBottom: 'var(--space-4)' }}>Businesses</h3>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Simple Table Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                    padding: 'var(--space-3)',
                    background: 'var(--surface-sunken)',
                    fontWeight: 600,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)'
                }}>
                    <div>Business / Owner</div>
                    <div>Status</div>
                    <div>Jobs Created</div>
                    <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {businesses.map(b => (
                    <div key={b.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.5fr 1fr 1fr',
                        padding: 'var(--space-4)',
                        borderTop: '1px solid var(--border-color)',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>{b.name}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{b.owner_email}</div>
                        </div>
                        <div>
                            <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background:
                                    b.subscription_status === 'active' ? 'var(--color-success)' :
                                        b.subscription_status === 'past_due' ? 'var(--color-warning)' :
                                            b.subscription_status === 'trialing' ? 'var(--brand-primary)' :
                                                'var(--text-tertiary)', // canceled
                                color: 'white'
                            }}>
                                {b.subscription_status.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>
                            {b.job_count}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <LogIn size={12} /> Login As
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
