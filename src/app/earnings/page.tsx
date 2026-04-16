'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Navigation/Header';
import { useDataLoader } from '@/hooks/useDataLoader';
import { JobState, Job, Customer } from '@/lib/db/schema';
import { format, subDays, startOfMonth, startOfYear, parseISO, isAfter } from 'date-fns';
import Link from 'next/link';

export default function EarningsPage() {
    const { loadJobs, loadCustomers } = useDataLoader();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [loading, setLoading] = useState(true);

    const [metrics, setMetrics] = useState({
        totalRevenue30d: 0,
        totalRevenueMTD: 0,
        totalRevenueYTD: 0,
        paidJobs30d: 0,
    });

    useEffect(() => {
        async function fetch() {
            const allJobs = await loadJobs();
            const allCustomers = await loadCustomers();
            
            // Only count Paid/Closed jobs that generated revenue
            const paidJobs = allJobs.filter(j => j.state === JobState.Paid || j.state === JobState.Closed);
            setJobs(paidJobs);
            
            const customerRecord = allCustomers.reduce((acc, c) => {
                acc[c.id] = c;
                return acc;
            }, {} as Record<string, Customer>);
            
            setCustomers(customerRecord);

            const now = new Date();
            const thirtyDaysAgo = subDays(now, 30);
            const thisMonth = startOfMonth(now);
            const thisYear = startOfYear(now);

            let t30 = 0;
            let mtd = 0;
            let ytd = 0;
            let p30 = 0;

            for (const j of paidJobs) {
                const amount = j.payment_amount && j.payment_amount > 0 
                  ? j.payment_amount 
                  : (j.services?.reduce((s, svc) => s + (svc.price || 0), 0) || 0) * (j.petIds.length || 1);
                
                const jobDate = parseISO(j.scheduledDate);
                if (isAfter(jobDate, thirtyDaysAgo) || j.scheduledDate === format(thirtyDaysAgo, 'yyyy-MM-dd')) {
                    t30 += amount;
                    p30++;
                }
                if (isAfter(jobDate, thisMonth) || j.scheduledDate === format(thisMonth, 'yyyy-MM-dd')) mtd += amount;
                if (isAfter(jobDate, thisYear) || j.scheduledDate === format(thisYear, 'yyyy-MM-dd')) ytd += amount;
            }

            setMetrics({ totalRevenue30d: t30, totalRevenueMTD: mtd, totalRevenueYTD: ytd, paidJobs30d: p30 });
            setLoading(false);
        }
        fetch();
    }, []);

    // Helper to generate bars for last 30 days
    const generateChartBars = () => {
        const days = [];
        const now = new Date();
        let maxVal = 1;

        for (let i = 29; i >= 0; i--) {
            const date = subDays(now, i);
            const dateStr = format(date, 'yyyy-MM-dd');
            
            const dayJobs = jobs.filter(j => j.scheduledDate === dateStr);
            const daySum = dayJobs.reduce((sum, j) => {
                const amount = j.payment_amount && j.payment_amount > 0 
                  ? j.payment_amount 
                  : (j.services?.reduce((s, svc) => s + (svc.price || 0), 0) || 0) * (j.petIds.length || 1);
                return sum + amount;
            }, 0);

            if (daySum > maxVal) maxVal = daySum;
            days.push({ ds: dateStr, sum: daySum, label: format(date, 'MMM d') });
        }

        return days.map((d, i) => {
            const heightPerc = (d.sum / maxVal) * 100;
            return (
                <div key={i} style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'flex-end', 
                    alignItems: 'center', 
                    gap: 4,
                    height: '100%' 
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '24px',
                        minWidth: '4px',
                        height: `${heightPerc}%`,
                        minHeight: d.sum > 0 ? '4px' : '0px',
                        backgroundColor: 'var(--brand-primary)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease'
                    }} title={`${d.label}: $${d.sum}`} />
                </div>
            );
        });
    };

    if (loading) return <div className="container" style={{paddingTop: '2rem'}}>Loading Earnings...</div>;

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <Link href="/dashboard" style={{ display: 'inline-block', marginBottom: '8px', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}>&larr; Back to Dashboard</Link>
            <Header title="Earnings Report" />
            
            <div className="card" style={{ background: 'var(--brand-primary)', color: 'white', border: 'none', marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Last 30 Days</div>
                <div style={{ fontSize: '36px', fontWeight: 800, marginTop: 'var(--space-1)' }}>
                    ${metrics.totalRevenue30d.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9, marginTop: 'var(--space-1)' }}>
                    From {metrics.paidJobs30d} completed jobs
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>This Month</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>${metrics.totalRevenueMTD.toLocaleString()}</div>
                </div>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>This Year</div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>${metrics.totalRevenueYTD.toLocaleString()}</div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: 'var(--space-4)' }}>30-Day Trend</h3>
                <div style={{ 
                    height: '200px', 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    gap: '2px', 
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '8px'
                }}>
                    {generateChartBars()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                    <span>{format(subDays(new Date(), 30), 'MMM d')}</span>
                    <span>Today</span>
                </div>
            </div>
            
            <div style={{ marginTop: 'var(--space-6)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Recent Payments</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {jobs.sort((a,b) => b.scheduledDate.localeCompare(a.scheduledDate)).slice(0, 10).map(j => {
                        const amount = j.payment_amount && j.payment_amount > 0 
                            ? j.payment_amount 
                            : (j.services?.reduce((s, svc) => s + (svc.price || 0), 0) || 0) * (j.petIds.length || 1);
                        return (
                            <Link href={`/jobs/${j.id}`} key={j.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customers[j.customerId]?.name || 'Unknown'}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{format(parseISO(j.scheduledDate), 'MMM d, yyyy')}</div>
                                </div>
                                <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: '16px' }}>
                                    +${amount.toLocaleString()}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
