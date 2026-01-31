'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Shield, UserCog, Mail, Calendar, Plus, Trash2, ShieldCheck, Edit2, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Modal } from '@/components/UI/Modal';

type AdminUser = {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
};

export default function AdminTeamPage() {
    const router = useRouter();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
    const [editForm, setEditForm] = useState({ full_name: '', email: '', role: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [adminToRemove, setAdminToRemove] = useState<AdminUser | null>(null);

    useEffect(() => {
        loadAdminTeam();
        loadCurrentUser();
    }, []);

    async function loadCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!error && data) {
                    setCurrentUserRole(data.role);

                    // Only super_admin can access team management
                    if (data.role !== 'super_admin') {
                        router.replace('/admin');
                        return;
                    }
                }
            }
        } catch (err) {
            console.error('Error loading current user:', err);
        }
    }

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

    function handleEdit(admin: AdminUser) {
        setSelectedAdmin(admin);
        setEditForm({
            full_name: admin.full_name || '',
            email: admin.email || '',
            role: admin.role || ''
        });
        setError(null);
        setEditModalOpen(true);
    }

    async function handleSave() {
        if (!selectedAdmin) return;

        // Validation
        if (!editForm.full_name.trim()) {
            setError('Name is required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Prepare update object
            const updateData: any = { full_name: editForm.full_name.trim() };

            // Only super admins can update roles
            if (currentUserRole === 'super_admin' && editForm.role) {
                updateData.role = editForm.role;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', selectedAdmin.id);

            if (error) throw error;

            // Update local state
            setAdmins(admins.map(a =>
                a.id === selectedAdmin.id
                    ? { ...a, full_name: editForm.full_name.trim(), role: editForm.role || a.role }
                    : a
            ));

            setEditModalOpen(false);
            setSelectedAdmin(null);
        } catch (err) {
            console.error('Error updating admin:', err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    function handleCloseModal() {
        setEditModalOpen(false);
        setSelectedAdmin(null);
        setError(null);
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
                    onClick={() => setShowAddAdminModal(true)}
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
                                            <button
                                                onClick={() => handleEdit(admin)}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #475569',
                                                    backgroundColor: 'transparent',
                                                    color: '#94a3b8',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#1e293b';
                                                    e.currentTarget.style.color = '#f8fafc';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = '#94a3b8';
                                                }}
                                                title="Edit profile"
                                            >
                                                <Edit2 size={14} />
                                            </button>
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
                                        onClick={() => {
                                            setAdminToRemove(admin);
                                            setShowRemoveConfirm(true);
                                        }}
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

            {/* Edit Modal */}
            {editModalOpen && (
                <div
                    style={{
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
                        padding: '20px'
                    }}
                    onClick={handleCloseModal}
                >
                    <div
                        style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '500px',
                            width: '100%',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'white' }}>
                                Edit Team Member
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                style={{
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#1e293b';
                                    e.currentTarget.style.color = '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Full Name */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#f8fafc', fontSize: '0.875rem' }}>
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    placeholder="Enter full name"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid #334155',
                                        backgroundColor: '#1e293b',
                                        color: 'white',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'border-color 0.2s ease'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#6c5ce7'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#334155'}
                                />
                            </div>

                            {/* Role (only for super admin) */}
                            {currentUserRole === 'super_admin' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#f8fafc', fontSize: '0.875rem' }}>
                                        Role *
                                    </label>
                                    <select
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            borderRadius: '8px',
                                            border: '1px solid #334155',
                                            backgroundColor: '#1e293b',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            transition: 'border-color 0.2s ease'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.borderColor = '#6c5ce7'}
                                        onBlur={(e) => e.currentTarget.style.borderColor = '#334155'}
                                    >
                                        <option value="super_admin" style={{ backgroundColor: '#1e293b' }}>Super Admin</option>
                                        <option value="admin" style={{ backgroundColor: '#1e293b' }}>Admin</option>
                                        <option value="support_staff" style={{ backgroundColor: '#1e293b' }}>Support Staff</option>
                                    </select>
                                    <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                        Only super admins can change roles
                                    </p>
                                </div>
                            )}

                            {/* Email (read-only) */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#f8fafc', fontSize: '0.875rem' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    readOnly
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid #334155',
                                        backgroundColor: '#0f172a',
                                        color: '#64748b',
                                        fontSize: '1rem',
                                        cursor: 'not-allowed'
                                    }}
                                />
                                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                    Email cannot be changed as it's linked to authentication
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: '#7f1d1d',
                                    border: '1px solid #991b1b',
                                    color: '#fca5a5',
                                    fontSize: '0.875rem'
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={handleCloseModal}
                                    disabled={saving}
                                    style={{
                                        flex: 1,
                                        padding: '12px 24px',
                                        borderRadius: '8px',
                                        border: '1px solid #475569',
                                        backgroundColor: 'transparent',
                                        color: '#94a3b8',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        opacity: saving ? 0.5 : 1,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!saving) {
                                            e.currentTarget.style.backgroundColor = '#1e293b';
                                            e.currentTarget.style.color = '#f8fafc';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#94a3b8';
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn-admin-primary"
                                    style={{
                                        flex: 1,
                                        padding: '12px 24px',
                                        fontSize: '1rem',
                                        opacity: saving ? 0.7 : 1,
                                        cursor: saving ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Admin Modal */}
            <Modal
                isOpen={showAddAdminModal}
                onClose={() => setShowAddAdminModal(false)}
                title="Add Admin"
                footer={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setShowAddAdminModal(false)}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Close
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                    <div style={{ color: '#6c5ce7', backgroundColor: '#6c5ce720', padding: '12px', borderRadius: '50%' }}>
                        <Plus size={32} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '8px', color: 'white' }}>Feature Coming Soon</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            The ability to add new admin users will be available in a future update.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Remove Admin Confirmation Modal */}
            <Modal
                isOpen={showRemoveConfirm}
                onClose={() => {
                    setShowRemoveConfirm(false);
                    setAdminToRemove(null);
                }}
                title="Remove Admin"
                footer={
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => {
                                setShowRemoveConfirm(false);
                                setAdminToRemove(null);
                            }}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                // TODO: Implement remove admin logic
                                setShowRemoveConfirm(false);
                                setAdminToRemove(null);
                            }}
                            className="btn btn-primary"
                            style={{
                                flex: 1,
                                backgroundColor: '#ef4444',
                                borderColor: '#ef4444',
                                color: 'white',
                                backgroundImage: 'none'
                            }}
                        >
                            Remove Admin
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                    <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '12px', borderRadius: '50%' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <p style={{ fontWeight: 600, fontSize: '1.125rem', marginBottom: '8px', color: 'white' }}>Feature Coming Soon</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            The ability to remove admin users will be available in a future update.
                        </p>
                        {adminToRemove && (
                            <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '8px' }}>
                                Selected: {adminToRemove.full_name || adminToRemove.email}
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
