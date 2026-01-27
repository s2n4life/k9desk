'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Bug,
    AlertTriangle,
    Info,
    Clock,
    Database,
    Trash2,
    Maximize2,
    ChevronDown,
    ChevronUp,
    Bell,
    BellOff,
    Mail
} from 'lucide-react';
import { format } from 'date-fns';

type SystemLog = {
    id: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    stack_trace: string | null;
    metadata: any;
    created_at: string;
    business_id: string | null;
    user_id: string | null;
};

export default function BugsPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [emailsEnabled, setEmailsEnabled] = useState(false);
    const [updatingConfig, setUpdatingConfig] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            // Load Logs
            const { data: logsData } = await supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (logsData) setLogs(logsData);

            // Load Config
            const { data: configData } = await supabase
                .from('system_configs')
                .select('value')
                .eq('key', 'error_emails_enabled')
                .single();

            if (configData) {
                setEmailsEnabled(configData.value);
            }

            setLoading(false);
        };

        loadData();
    }, []);

    const toggleEmails = async () => {
        setUpdatingConfig(true);
        const newValue = !emailsEnabled;

        const { error } = await supabase
            .from('system_configs')
            .upsert({
                key: 'error_emails_enabled',
                value: newValue,
                description: 'Enable/disable email notifications for system errors'
            });

        if (!error) {
            setEmailsEnabled(newValue);
        } else {
            console.error('Failed to update email setting:', error);
        }
        setUpdatingConfig(false);
    };

    const clearLogs = async () => {
        if (confirm('Are you sure you want to clear all system logs?')) {
            await supabase.from('system_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            setLogs([]);
        }
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <AlertTriangle color="#ef4444" size={18} />;
            case 'warning': return <AlertTriangle color="#f59e0b" size={18} />;
            case 'info': return <Info color="#3b82f6" size={18} />;
            default: return <Info color="#94a3b8" size={18} />;
        }
    };

    if (loading) return <div style={{ color: '#94a3b8' }}>Loading system logs...</div>;

    return (
        <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6c5ce7', marginBottom: '8px' }}>
                        <Bug size={24} />
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0, color: 'white' }}>The Sentinel: Logs</h1>
                    </div>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Proactive system health & bug tracking.</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={toggleEmails}
                        disabled={updatingConfig}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: emailsEnabled ? '#10b98120' : '#334155',
                            border: `1px solid ${emailsEnabled ? '#10b98150' : '#475569'}`,
                            color: emailsEnabled ? '#10b981' : '#94a3b8',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s ease',
                            opacity: updatingConfig ? 0.5 : 1
                        }}
                    >
                        {emailsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                        {emailsEnabled ? 'Email Alerts: ON' : 'Email Alerts: OFF'}
                    </button>

                    <button
                        onClick={clearLogs}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: 'transparent',
                            border: '1px solid #ef444450',
                            color: '#ef4444',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        <Trash2 size={16} /> Clear Logs
                    </button>
                </div>
            </header>

            <div className="admin-card" style={{ padding: 0 }}>
                {logs.length === 0 ? (
                    <div style={{ padding: '64px', textAlign: 'center' }}>
                        <div style={{ color: '#10b981', marginBottom: '16px' }}>
                            <CheckCircleIcon size={48} style={{ opacity: 0.2 }} />
                        </div>
                        <h3 style={{ color: 'white', margin: '0 0 8px 0' }}>All Systems Nominal</h3>
                        <p style={{ color: '#64748b', margin: 0 }}>No errors or warnings have been reported.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {logs.map(log => (
                            <div key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                <div
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    style={{
                                        padding: '16px 24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        cursor: 'pointer',
                                        backgroundColor: expandedLog === log.id ? '#1e293b50' : 'transparent'
                                    }}
                                >
                                    {getLevelIcon(log.level)}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ color: 'white', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {log.message}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                            {format(new Date(log.created_at), 'HH:mm:ss.SSS')} • {log.business_id ? `Business: ${log.business_id.slice(0, 8)}` : 'System'}
                                        </div>
                                    </div>
                                    {expandedLog === log.id ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                                </div>

                                {expandedLog === log.id && (
                                    <div style={{ padding: '0 24px 24px 58px', fontSize: '0.875rem' }}>
                                        {log.stack_trace && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <p style={{ color: '#94a3b8', fontWeight: 600, margin: '0 0 8px 0' }}>Stack Trace</p>
                                                <pre style={{
                                                    backgroundColor: '#0f172a',
                                                    padding: '16px',
                                                    borderRadius: '8px',
                                                    color: '#ef4444',
                                                    overflowX: 'auto',
                                                    fontSize: '0.75rem',
                                                    border: '1px solid #ef444420'
                                                }}>
                                                    {log.stack_trace}
                                                </pre>
                                            </div>
                                        )}

                                        <div>
                                            <p style={{ color: '#94a3b8', fontWeight: 600, margin: '0 0 8px 0' }}>Metadata</p>
                                            <pre style={{
                                                backgroundColor: '#0f172a',
                                                padding: '16px',
                                                borderRadius: '8px',
                                                color: '#3b82f6',
                                                overflowX: 'auto',
                                                fontSize: '0.75rem',
                                                border: '1px solid #3b82f620'
                                            }}>
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function CheckCircleIcon({ size, style }: any) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
