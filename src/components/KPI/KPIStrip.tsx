import styles from './KPIStrip.module.css';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface KPIProps {
    completedJobs: number;
    revenue: number;
}

export function KPIStrip({ completedJobs, revenue }: Partial<KPIProps>) {
    const formattedRevenue = (revenue || 0).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    return (
        <div className={styles.container}>
            <h3 className={styles.headline}>In last 30 days:</h3>
            <div className={styles.grid}>
                <div className={styles.card}>
                    <span className={styles.value}>{completedJobs || 0}</span>
                    <span className={styles.label}>Jobs Completed</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.value}>${formattedRevenue}</span>
                    <span className={styles.label}>Collected</span>
                </div>
            </div>
            <Link href="/earnings" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px',
                marginTop: '12px',
                padding: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '13px', fontWeight: 600, color: 'var(--brand-primary)',
                textDecoration: 'none'
            }}>
                View Full Earnings Report <ChevronRight size={14} />
            </Link>
        </div>
    );
}
