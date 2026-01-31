'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Clock, Activity, AlertCircle, Zap } from 'lucide-react';

type Timeframe = 'this_month' | 'last_month' | 'rolling_30' | 'rolling_60' | 'rolling_90' | 'custom';

interface KPIData {
    value: number;
    previousValue?: number;
    delta?: number;
    deltaPercent?: number;
}

interface AnalyticsKPICardProps {
    label: string;
    value: string | number;
    delta?: number;
    deltaPercent?: number;
    format?: 'currency' | 'number' | 'percent';
    icon?: any;
    loading?: boolean;
}

function AnalyticsKPICard({ label, value, delta, deltaPercent, format = 'number', icon: Icon, loading }: AnalyticsKPICardProps) {
    const formatValue = (val: string | number) => {
        if (loading) return '...';
        if (typeof val === 'string') return val;

        switch (format) {
            case 'currency':
                return `$${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            case 'percent':
                return `${val.toFixed(1)}%`;
            default:
                return val.toLocaleString('en-US');
        }
    };

    const showDelta = delta !== undefined && deltaPercent !== undefined;
    const isPositive = deltaPercent && deltaPercent > 0;
    const isNegative = deltaPercent && deltaPercent < 0;

    return (
        <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #334155',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{label}</p>
                {Icon && (
                    <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#334155' }}>
                        <Icon size={16} color="#94a3b8" />
                    </div>
                )}
            </div>

            <h3 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px 0' }}>
                {formatValue(value)}
            </h3>

            {showDelta && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                    {isPositive && <TrendingUp size={16} color="#10b981" />}
                    {isNegative && <TrendingDown size={16} color="#ef4444" />}
                    <span style={{
                        color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#64748b',
                        fontWeight: 600
                    }}>
                        {deltaPercent > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%
                    </span>
                    <span style={{ color: '#64748b' }}>vs previous period</span>
                </div>
            )}
        </div>
    );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
    return (
        <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 4px 0' }}>{title}</h2>
            {description && (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>{description}</p>
            )}
        </div>
    );
}

export default function AnalyticsPage() {
    const [timeframe, setTimeframe] = useState<Timeframe>('rolling_30');
    const [compare, setCompare] = useState(true);
    const [loading, setLoading] = useState(true);
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [kpis, setKpis] = useState({
        mrr: { value: 0 } as KPIData,
        netNewMrr: { value: 0 } as KPIData,
        arpu: { value: 0 } as KPIData,
        revenueChurn: { value: 0 } as KPIData,
        activeCustomers: { value: 0 } as KPIData,
        newCustomers: { value: 0 } as KPIData,
        customerChurn: { value: 0 } as KPIData,
        trialConversion: { value: 0 } as KPIData,
        activeTrials: { value: 0 } as KPIData,
        trialsStarted: { value: 0 } as KPIData,
        trialsExpired: { value: 0 } as KPIData,
        weeklyActiveAccounts: { value: 0 } as KPIData,
        avgJobsPerAccount: { value: 0 } as KPIData,
        paymentsCollected: { value: 0 } as KPIData,
        openTickets: { value: 0 } as KPIData,
        avgResponseTime: { value: 0 } as KPIData,
    });

    useEffect(() => {
        fetchAnalytics();
    }, [timeframe, compare, customStart, customEnd]);

    const fetchAnalytics = async () => {
        // Don't fetch if custom timeframe is selected but dates aren't entered yet
        if (timeframe === 'custom' && (!customStart || !customEnd)) {
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({
                timeframe,
                compare: compare.toString(),
            });

            if (timeframe === 'custom' && customStart && customEnd) {
                params.append('customStart', customStart);
                params.append('customEnd', customEnd);
            }

            // Fetch all analytics endpoints
            const [
                mrrRes, netNewMrrRes, arpuRes, revenueChurnRes,
                activeCustomersRes, newCustomersRes, customerChurnRes, trialConversionRes,
                activeTrialsRes, trialsStartedRes, trialsExpiredRes,
                weeklyActiveAccountsRes, avgJobsPerAccountRes, paymentsCollectedRes,
                openTicketsRes
            ] = await Promise.all([
                fetch(`/api/admin/analytics/mrr?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/net-new-mrr?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/arpu?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/revenue-churn?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/active-customers?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/new-customers?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/customer-churn?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/trial-conversion?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/active-trials?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/trials-started?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/trials-expired?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/weekly-active-accounts?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/avg-jobs-per-account?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/payments-collected?${params}`).then(r => r.json()),
                fetch(`/api/admin/analytics/open-tickets?${params}`).then(r => r.json()),
            ]);

            setKpis(prev => ({
                ...prev,
                mrr: mrrRes,
                netNewMrr: netNewMrrRes,
                arpu: arpuRes,
                revenueChurn: revenueChurnRes,
                activeCustomers: activeCustomersRes,
                newCustomers: newCustomersRes,
                customerChurn: customerChurnRes,
                trialConversion: trialConversionRes,
                activeTrials: activeTrialsRes,
                trialsStarted: trialsStartedRes,
                trialsExpired: trialsExpiredRes,
                weeklyActiveAccounts: weeklyActiveAccountsRes,
                avgJobsPerAccount: avgJobsPerAccountRes,
                paymentsCollected: paymentsCollectedRes,
                openTickets: openTicketsRes,
            }));
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 8px 0' }}>KPI & Analytics</h1>
                <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
                    Strategic business insights and investor-grade metrics
                </p>
            </div>

            {/* Global Controls */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '48px',
                padding: '20px',
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                border: '1px solid #334155',
            }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>
                        Timeframe
                    </label>
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="rolling_30">Rolling 30 Days</option>
                        <option value="rolling_60">Rolling 60 Days</option>
                        <option value="rolling_90">Rolling 90 Days</option>
                        <option value="custom">Custom Date Range</option>
                    </select>
                </div>

                {timeframe === 'custom' && (
                    <>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: '#f1f5f9',
                                    fontSize: '0.875rem',
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.875rem', marginBottom: '8px' }}>
                                End Date
                            </label>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: '#0f172a',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    color: '#f1f5f9',
                                    fontSize: '0.875rem',
                                }}
                            />
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={compare}
                            onChange={(e) => setCompare(e.target.checked)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#f1f5f9', fontSize: '0.875rem' }}>Compare to Previous Period</span>
                    </label>
                </div>
            </div>

            {/* Section 1: Revenue Health */}
            <div style={{ marginBottom: '48px' }}>
                <SectionHeader
                    title="Revenue Health"
                    description="Core revenue metrics and growth indicators"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                    <AnalyticsKPICard
                        label="MRR"
                        value={kpis.mrr.value}
                        delta={kpis.mrr.delta}
                        deltaPercent={kpis.mrr.deltaPercent}
                        format="currency"
                        icon={DollarSign}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Net New MRR"
                        value={kpis.netNewMrr.value}
                        delta={kpis.netNewMrr.delta}
                        deltaPercent={kpis.netNewMrr.deltaPercent}
                        format="currency"
                        icon={TrendingUp}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="ARPU"
                        value={kpis.arpu.value}
                        delta={kpis.arpu.delta}
                        deltaPercent={kpis.arpu.deltaPercent}
                        format="currency"
                        icon={Users}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Revenue Churn %"
                        value={kpis.revenueChurn.value}
                        delta={kpis.revenueChurn.delta}
                        deltaPercent={kpis.revenueChurn.deltaPercent}
                        format="percent"
                        icon={TrendingDown}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Section 2: Customer Growth & Retention */}
            <div style={{ marginBottom: '48px' }}>
                <SectionHeader
                    title="Customer Growth & Retention"
                    description="Customer acquisition and churn metrics"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                    <AnalyticsKPICard
                        label="Active Paying Customers"
                        value={kpis.activeCustomers.value}
                        delta={kpis.activeCustomers.delta}
                        deltaPercent={kpis.activeCustomers.deltaPercent}
                        icon={Users}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="New Customers"
                        value={kpis.newCustomers.value}
                        delta={kpis.newCustomers.delta}
                        deltaPercent={kpis.newCustomers.deltaPercent}
                        icon={TrendingUp}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Customer Churn %"
                        value={kpis.customerChurn.value}
                        delta={kpis.customerChurn.delta}
                        deltaPercent={kpis.customerChurn.deltaPercent}
                        format="percent"
                        icon={TrendingDown}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Trial → Paid Conversion %"
                        value={kpis.trialConversion.value}
                        delta={kpis.trialConversion.delta}
                        deltaPercent={kpis.trialConversion.deltaPercent}
                        format="percent"
                        icon={Activity}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Section 3: Trial & Funnel Performance */}
            <div style={{ marginBottom: '48px' }}>
                <SectionHeader
                    title="Trial & Funnel Performance"
                    description="Trial activity and conversion funnel"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    <AnalyticsKPICard
                        label="Active Trials"
                        value={kpis.activeTrials.value}
                        delta={kpis.activeTrials.delta}
                        deltaPercent={kpis.activeTrials.deltaPercent}
                        icon={Clock}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Trials Started"
                        value={kpis.trialsStarted.value}
                        delta={kpis.trialsStarted.delta}
                        deltaPercent={kpis.trialsStarted.deltaPercent}
                        icon={TrendingUp}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Trials Expired Without Conversion"
                        value={kpis.trialsExpired.value}
                        delta={kpis.trialsExpired.delta}
                        deltaPercent={kpis.trialsExpired.deltaPercent}
                        icon={TrendingDown}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Section 4: Product Usage & Engagement */}
            <div style={{ marginBottom: '48px' }}>
                <SectionHeader
                    title="Product Usage & Engagement"
                    description="Platform activity and operational dependency"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    <AnalyticsKPICard
                        label="Weekly Active Accounts"
                        value={kpis.weeklyActiveAccounts.value}
                        delta={kpis.weeklyActiveAccounts.delta}
                        deltaPercent={kpis.weeklyActiveAccounts.deltaPercent}
                        icon={Activity}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Avg Jobs per Account"
                        value={kpis.avgJobsPerAccount.value}
                        delta={kpis.avgJobsPerAccount.delta}
                        deltaPercent={kpis.avgJobsPerAccount.deltaPercent}
                        icon={Zap}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Payments Collected"
                        value={kpis.paymentsCollected.value}
                        delta={kpis.paymentsCollected.delta}
                        deltaPercent={kpis.paymentsCollected.deltaPercent}
                        format="currency"
                        icon={DollarSign}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Section 5: Support & Risk Signals */}
            <div style={{ marginBottom: '48px' }}>
                <SectionHeader
                    title="Support & Risk Signals"
                    description="Customer support metrics and operational health"
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
                    <AnalyticsKPICard
                        label="Open Support Tickets"
                        value={kpis.openTickets.value}
                        delta={kpis.openTickets.delta}
                        deltaPercent={kpis.openTickets.deltaPercent}
                        icon={AlertCircle}
                        loading={loading}
                    />
                    <AnalyticsKPICard
                        label="Avg First Response Time (hours)"
                        value="N/A"
                        icon={Clock}
                        loading={false}
                    />
                </div>

                {/* Top Support Reasons Table */}
                <div style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #334155',
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 16px 0' }}>
                        Top Support Reasons (Last 30 Days)
                    </h3>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '20px' }}>
                        No support data available
                    </div>
                </div>
            </div>
        </div>
    );
}
