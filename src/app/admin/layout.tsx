'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Users, LayoutDashboard, Bug, Ticket, Settings, LogOut, ChevronRight, UserCog } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';

const ADMIN_NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/tickets', label: 'Support Tickets', icon: Ticket },
    { href: '/admin/bugs', label: 'The Sentinel: Logs', icon: Bug },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/team', label: 'Admin Team', icon: UserCog },
    { href: '/admin/settings', label: 'Global Config', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkAdminAccess() {
            try {
                // 1. Check if user is logged in
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    console.warn('No user found, redirecting to dashboard');
                    router.replace('/dashboard');
                    return;
                }

                // 2. Check if user has admin access (super_admin, admin, or support_staff)
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error || !profile) {
                    console.error('Error fetching profile:', error);
                    router.replace('/dashboard');
                    return;
                }

                // Allow super_admin, admin, and support_staff
                const allowedRoles = ['super_admin', 'admin', 'support_staff'];
                if (!allowedRoles.includes(profile.role)) {
                    console.warn('User does not have admin access, access denied');
                    router.replace('/dashboard');
                    return;
                }

                // User is authorized!
                setIsAuthorized(true);
            } catch (err) {
                console.error('Admin access check failed:', err);
                router.replace('/dashboard');
            } finally {
                setIsLoading(false);
            }
        }

        checkAdminAccess();
    }, [router]);

    // Show loading state while checking authorization
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#0f172a',
                color: '#94a3b8'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Shield size={48} style={{ marginBottom: '16px', color: '#6c5ce7' }} />
                    <div>Verifying admin access...</div>
                </div>
            </div>
        );
    }

    // Don't render admin content if not authorized
    if (!isAuthorized) {
        return null;
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: '#0f172a', // Dark slate background
            color: '#f8fafc'
        }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                borderRight: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 16px',
                position: 'fixed',
                height: '100vh',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                        padding: '8px',
                        borderRadius: '10px'
                    }}>
                        <Shield size={24} color="white" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.025em' }}>K9Desk Admin</span>
                </div>

                <nav style={{ flex: 1 }}>
                    {ADMIN_NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    color: isActive ? '#fff' : '#94a3b8',
                                    background: isActive ? '#1e293b' : 'transparent',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s ease',
                                    fontWeight: isActive ? 600 : 400
                                }}
                            >
                                <item.icon size={20} />
                                {item.label}
                                {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        color: '#fca5a5',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        marginTop: 'auto',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        textAlign: 'left'
                    }}
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </aside>

            {/* Main Content */}
            <main style={{
                marginLeft: '260px',
                flex: 1,
                padding: '40px',
                width: 'calc(100% - 260px)',
                minHeight: '100vh'
            }}>
                {children}
            </main>

            <style jsx global>{`
                body {
                    background-color: #0f172a !important;
                }
                .admin-card {
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    padding: 24px;
                }
                .text-muted {
                    color: #94a3b8;
                }
                .btn-admin-primary {
                    background: #6c5ce7;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                }
                .btn-admin-primary:hover {
                    background: #5b4bc4;
                }
            `}</style>
        </div>
    );
}
