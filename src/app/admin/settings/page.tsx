'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Settings,
    Shield,
    Save,
    AlertTriangle,
    Zap,
    CreditCard,
    UserPlus,
    RotateCcw
} from 'lucide-react';

type SystemConfig = {
    key: string;
    value: boolean;
    description: string;
};

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        const loadConfigs = async () => {
            const { data } = await supabase.from('system_configs').select('*');
            if (data) setConfigs(data);
            setLoading(false);
        };

        loadConfigs();
    }, []);

    const toggleConfig = async (key: string, currentValue: boolean) => {
        setSaving(key);
        const newValue = !currentValue;

        const { error } = await supabase
            .from('system_configs')
            .update({ value: newValue })
            .eq('key', key);

        if (!error) {
            setConfigs(prev => prev.map(c => c.key === key ? { ...c, value: newValue } : c));
        } else {
            alert('Failed to update config');
        }
        setSaving(null);
    };

    const getIcon = (key: string) => {
        switch (key) {
            case 'maintenance_mode': return <Shield size={20} />;
            case 'signups_enabled': return <UserPlus size={20} />;
            case 'payments_enabled': return <CreditCard size={20} />;
            case 'ai_enabled': return <Zap size={20} />;
            default: return <Settings size={20} />;
        }
    };

    if (loading) return <div style={{ color: '#94a3b8' }}>Loading configurations...</div>;

    return (
        <div>
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6c5ce7', marginBottom: '8px' }}>
                    <Settings size={24} />
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0, color: 'white' }}>Global Config</h1>
                </div>
                <p style={{ color: '#94a3b8', margin: 0 }}>Master control levers for the K9Desk platform.</p>
            </header>

            <div style={{ maxWidth: '800px' }}>
                <div className="admin-card" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#f59e0b' }}>
                        <AlertTriangle size={20} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>Mission Critical Toggles</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {configs.map((config) => (
                            <div key={config.key} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '16px',
                                borderRadius: '12px',
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        padding: '10px',
                                        borderRadius: '10px',
                                        backgroundColor: config.key === 'maintenance_mode' && config.value ? '#ef444420' : '#6c5ce710',
                                        color: config.key === 'maintenance_mode' && config.value ? '#ef4444' : '#6c5ce7'
                                    }}>
                                        {getIcon(config.key)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'white', textTransform: 'capitalize' }}>
                                            {config.key.replace(/_/g, ' ')}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{config.description}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleConfig(config.key, config.value)}
                                    disabled={saving === config.key}
                                    style={{
                                        width: '48px',
                                        height: '24px',
                                        borderRadius: '12px',
                                        backgroundColor: config.value ? '#10b981' : '#334155',
                                        border: 'none',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        opacity: saving === config.key ? 0.5 : 1
                                    }}
                                >
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        backgroundColor: 'white',
                                        position: 'absolute',
                                        top: '3px',
                                        left: config.value ? '27px' : '3px',
                                        transition: 'left 0.2s'
                                    }} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-card">
                    <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '1.125rem' }}>Danger Zone</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '24px' }}>
                        Destructive actions that affect the entire platform. Be extremely careful.
                    </p>

                    <button style={{
                        backgroundColor: '#ef444420',
                        color: '#ef4444',
                        border: '1px solid #ef444440',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <RotateCcw size={18} /> Forced Global Session Flush
                    </button>
                </div>
            </div>
        </div>
    );
}
