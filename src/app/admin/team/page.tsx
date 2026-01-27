'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, UserCog, Mail, Calendar, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

type AdminUser = {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
};

export default function AdminTeamPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAdminTeam();
    }, []);

    async function loadAdminTeam() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, role, created_at')
                .in('role', ['super_admin', 'support_staff', 'admin'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAdmins(data || []);
        } catch (err) {
            console.error('Error loading admin team:', err);
        } finally {
            setLoading(false);
        }
    }

    const getRoleBadge = (role: string) => {
        const badges: Record<string, { label: string; color: string; icon: any }> = {
            super_admin: { label: 'Super Admin', color: '#6c5ce7', icon: ShieldCheck },
            admin: { label: 'Admin', color: '#3b82f6', icon: Shield },
            support_staff: { label: 'Support Staff', color: '#10b981', icon: UserCog }
        };

        const badge = badges[role] || { label: role, color: '#64748b', icon: UserCog };
        const Icon = badge.icon;

        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: badge.color + '20',
                color: badge.color,
                fontSize: '0.875rem',
                fontWeight: 600
            }}>
                <Icon size={14} />
                {badge.label}
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #1e293b', borderTop: '4px solid #6c5ce7', borderRadius: '50%' }} />
            </div>
        );
    }

    return (
        <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 8px 0' }}>Admin Team</h1>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Manage internal staff with admin portal access.</p>
                </div>
                <button
                    className="btn-admin-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => alert('Add Admin feature coming soon!')}
                >
                    <Plus size={18} />
                    Add Admin
                </button>
            </header>

            {/* Admin Team List */}
            <div className="admin-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <Shield size={20} color="#6c5ce7" />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Team Members ({admins.length})</h2>
                </div>

                {admins.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                        <UserCog size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No admin team members found.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {admins.map((admin) => (
                            <div
                                key={admin.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '20px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '1.125rem'
                                    }}>
                                        {admin.email?.charAt(0).toUpperCase() || '?'}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, color: 'white', fontSize: '1rem' }}>
                                                {admin.full_name || 'No name set'}
                                            </span>
                                            {getRoleBadge(admin.role)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem', color: '#94a3b8' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Mail size={14} />
                                                {admin.email}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={14} />
                                                Joined {format(new Date(admin.created_at), 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {admin.role !== 'super_admin' && (
                                    <button
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #ef4444',
                                            backgroundColor: 'transparent',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => alert('Remove admin feature coming soon!')}
                                    >
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                color: '#94a3b8',
                fontSize: '0.875rem'
            }}>
                <strong style={{ color: '#f8fafc' }}>Role Permissions:</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li><strong style={{ color: '#6c5ce7' }}>Super Admin:</strong> Full access to all features, cannot be removed</li>
                    <li><strong style={{ color: '#3b82f6' }}>Admin:</strong> Can manage customers, tickets, and view analytics</li>
                    <li><strong style={{ color: '#10b981' }}>Support Staff:</strong> Can only manage support tickets</li>
                </ul>
            </div>
        </div>
    );
}
