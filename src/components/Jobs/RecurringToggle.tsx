'use client';

import { useState } from 'react';
import { RecurrenceFrequency } from '@/lib/db/schema';
import { getFrequencyLabel } from '@/lib/jobs/recurrence';
import { Repeat } from 'lucide-react';

interface RecurringToggleProps {
    enabled: boolean;
    frequency: RecurrenceFrequency;
    onToggle: (enabled: boolean) => void;
    onFrequencyChange: (frequency: RecurrenceFrequency) => void;
}

const FREQUENCY_OPTIONS: RecurrenceFrequency[] = [
    RecurrenceFrequency.Weekly,
    RecurrenceFrequency.Biweekly,
    RecurrenceFrequency.Monthly,
    RecurrenceFrequency.Every6Weeks,
    RecurrenceFrequency.Every2Months,
];

export function RecurringToggle({
    enabled,
    frequency,
    onToggle,
    onFrequencyChange,
}: RecurringToggleProps) {
    return (
        <div
            className="card"
            style={{
                padding: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                border: enabled ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                background: enabled ? 'var(--brand-primary-light)' : 'var(--bg-card)',
            }}
        >
            {/* Toggle Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: enabled ? 'var(--space-3)' : 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Repeat size={20} color={enabled ? 'var(--brand-primary)' : 'var(--text-secondary)'} />
                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>
                        Make this recurring
                    </span>
                </div>
                <button
                    onClick={() => onToggle(!enabled)}
                    style={{
                        width: 48,
                        height: 28,
                        borderRadius: 14,
                        background: enabled ? 'var(--brand-primary)' : 'var(--surface-background)',
                        border: `2px solid ${enabled ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    <div
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'white',
                            position: 'absolute',
                            top: 2,
                            left: enabled ? 24 : 2,
                            transition: 'left 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                    />
                </button>
            </div>

            {/* Frequency Selector */}
            {enabled && (
                <>
                    <div
                        style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--space-2)',
                        }}
                    >
                        How often should this repeat?
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {FREQUENCY_OPTIONS.map((freq) => (
                            <button
                                key={freq}
                                onClick={() => onFrequencyChange(freq)}
                                style={{
                                    padding: 'var(--space-2)',
                                    borderRadius: 'var(--radius-md)',
                                    border: frequency === freq ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                    background: frequency === freq ? 'var(--brand-primary-light)' : 'var(--bg-card)',
                                    color: frequency === freq ? 'var(--brand-primary)' : 'var(--text-primary)',
                                    fontWeight: frequency === freq ? 700 : 400,
                                    fontSize: 'var(--font-size-base)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {getFrequencyLabel(freq)}
                            </button>
                        ))}
                    </div>
                    <div
                        style={{
                            marginTop: 'var(--space-3)',
                            padding: 'var(--space-2)',
                            background: 'var(--surface-background)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                        }}
                    >
                        💡 The next appointment will be automatically created when you mark this job as completed.
                    </div>
                </>
            )}
        </div>
    );
}
