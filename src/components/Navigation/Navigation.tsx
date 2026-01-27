'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Clock, AlertCircle, Users, UserPlus } from 'lucide-react';
import styles from './Navigation.module.css';
import { clsx } from 'clsx';
import { useNotification } from '@/contexts/NotificationContext';

const NAV_ITEMS = [
    { href: '/leads', label: 'Leads', icon: UserPlus },
    { href: '/dashboard', label: 'Today', icon: Calendar },
    { href: '/upcoming', label: 'Upcoming', icon: Clock },
    { href: '/needs-action', label: 'Needs Action', icon: AlertCircle },
    { href: '/customers', label: 'Customers', icon: Users },
];

export function Navigation() {
    const pathname = usePathname();
    const { leadsCount, needsActionCount } = useNotification();

    // Hide navigation on public booking pages and admin pages
    if (pathname?.startsWith('/book/') || pathname?.startsWith('/admin')) return null;

    return (
        <nav className={styles.nav}>
            <div className={styles.container}>
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    let badgeCount = 0;
                    if (label === 'Leads') badgeCount = leadsCount;
                    if (label === 'Needs Action') badgeCount = needsActionCount;

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={clsx(styles.link, isActive && styles.active)}
                        >
                            <div className={styles.iconWrapper} style={{ position: 'relative' }}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                                {badgeCount > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: -5,
                                        right: -8,
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        minWidth: '16px',
                                        height: '16px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0 4px',
                                        border: '2px solid white'
                                    }}>
                                        {badgeCount > 99 ? '99+' : badgeCount}
                                    </div>
                                )}
                            </div>
                            <span className={styles.label}>{label}</span>
                            {isActive && <div className={styles.indicator} />}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
