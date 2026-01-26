'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Users, LayoutDashboard, Bug, Ticket, Settings, LogOut, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabaseClient';

const ADMIN_NAV_ITEMS = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/tickets', label: 'Support Tickets', icon: Ticket },
    { href: '/admin/bugs', label: 'System Logs', icon: Bug },
    { href: '/admin/users', label: 'Businesses', icon: Users },
    { href: '/admin/settings', label: 'Global Config', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

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
                maxWidth: '1200px'
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
