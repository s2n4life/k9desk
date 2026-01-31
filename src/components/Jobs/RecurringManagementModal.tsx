'use client';

import { useState } from 'react';
import { Modal } from '../UI/Modal';
import { RecurrenceRule, RecurrenceFrequency, RecurrenceStatus } from '@/lib/db/schema';
import { getFrequencyLabel } from '@/lib/jobs/recurrence';
import { Pause, Play, Edit2, XCircle, AlertTriangle } from 'lucide-react';

interface RecurringManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    rule: RecurrenceRule;
    onPause: () => Promise<void>;
    onResume: () => Promise<void>;
    onChangeFrequency: (newFrequency: RecurrenceFrequency) => Promise<void>;
    onCancel: () => Promise<void>;
}

const FREQUENCY_OPTIONS: RecurrenceFrequency[] = [
    RecurrenceFrequency.Weekly,
    RecurrenceFrequency.Biweekly,
    RecurrenceFrequency.Monthly,
    RecurrenceFrequency.Every6Weeks,
    RecurrenceFrequency.Every2Months,
];

export function RecurringManagementModal({
    isOpen,
    onClose,
    rule,
    onPause,
    onResume,
    onChangeFrequency,
    onCancel,
}: RecurringManagementModalProps) {
    const [mode, setMode] = useState<'view' | 'change-frequency' | 'confirm-cancel'>('view');
    const [selectedFrequency, setSelectedFrequency] = useState(rule.frequency);
    const [loading, setLoading] = useState(false);

    const isActive = rule.status === RecurrenceStatus.Active;
    const isPaused = rule.status === RecurrenceStatus.Paused;
    const isCanceled = rule.status === RecurrenceStatus.Canceled;

    const handlePauseResume = async () => {
        setLoading(true);
        try {
            if (isActive) {
                await onPause();
            } else if (isPaused) {
                await onResume();
            }
            onClose();
        } catch (error) {
            alert('Failed to update recurrence');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeFrequency = async () => {
        if (selectedFrequency === rule.frequency) {
            setMode('view');
            return;
        }

        setLoading(true);
        try {
            await onChangeFrequency(selectedFrequency);
            setMode('view');
            onClose();
        } catch (error) {
            alert('Failed to change frequency');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        setLoading(true);
        try {
            await onCancel();
            onClose();
        } catch (error) {
            alert('Failed to cancel recurrence');
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'change-frequency') {
        return (
            <Modal
                isOpen={isOpen}
                onClose={() => setMode('view')}
                title="Change Frequency"
                footer={
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                            onClick={() => setMode('view')}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleChangeFrequency}
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                        This will affect the NEXT job to be created, not existing jobs.
                    </div>
                    {FREQUENCY_OPTIONS.map((freq) => (
                        <button
                            key={freq}
                            onClick={() => setSelectedFrequency(freq)}
                            style={{
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                border: selectedFrequency === freq ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                                background: selectedFrequency === freq ? 'var(--brand-primary-light)' : 'var(--bg-card)',
                                color: selectedFrequency === freq ? 'var(--brand-primary)' : 'var(--text-primary)',
                                fontWeight: selectedFrequency === freq ? 700 : 400,
                                fontSize: 'var(--font-size-base)',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            {getFrequencyLabel(freq)}
                        </button>
                    ))}
                </div>
            </Modal>
        );
    }

    if (mode === 'confirm-cancel') {
        return (
            <Modal
                isOpen={isOpen}
                onClose={() => setMode('view')}
                title="Cancel Recurring Appointments"
                footer={
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                            onClick={() => setMode('view')}
                            className="btn btn-secondary"
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            Go Back
                        </button>
                        <button
                            onClick={handleCancel}
                            className="btn"
                            style={{ flex: 1, background: 'var(--color-danger)', color: 'white' }}
                            disabled={loading}
                        >
                            {loading ? 'Canceling...' : 'Yes, Cancel'}
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div
                        style={{
                            padding: 'var(--space-3)',
                            background: 'var(--color-danger-light)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-danger)',
                            display: 'flex',
                            gap: 'var(--space-2)',
                            alignItems: 'flex-start',
                        }}
                    >
                        <AlertTriangle size={20} color="var(--color-danger)" style={{ marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--color-danger)' }}>
                                This action cannot be undone
                            </div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                No future appointments will be automatically created. Existing scheduled jobs will not be affected.
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Manage Recurring Appointments"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Current Status */}
                <div
                    style={{
                        padding: 'var(--space-3)',
                        background: 'var(--surface-background)',
                        borderRadius: 'var(--radius-md)',
                    }}
                >
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        Current Frequency
                    </div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                        {getFrequencyLabel(rule.frequency)}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                        Status: <span style={{ fontWeight: 600, color: isActive ? 'var(--brand-primary)' : isPaused ? 'var(--color-warning)' : 'var(--text-tertiary)' }}>
                            {isActive ? 'Active' : isPaused ? 'Paused' : 'Canceled'}
                        </span>
                    </div>
                    {rule.nextRunDate && isActive && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                            Next job will be created on: <span style={{ fontWeight: 600 }}>{rule.nextRunDate}</span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isCanceled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <button
                            onClick={handlePauseResume}
                            className="btn btn-secondary"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                            }}
                            disabled={loading}
                        >
                            {isActive ? (
                                <>
                                    <Pause size={18} />
                                    Pause Recurring
                                </>
                            ) : (
                                <>
                                    <Play size={18} />
                                    Resume Recurring
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => {
                                setSelectedFrequency(rule.frequency);
                                setMode('change-frequency');
                            }}
                            className="btn btn-secondary"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                            }}
                        >
                            <Edit2 size={18} />
                            Change Frequency
                        </button>

                        <button
                            onClick={() => setMode('confirm-cancel')}
                            className="btn"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-2)',
                                background: 'var(--color-danger-light)',
                                color: 'var(--color-danger)',
                                border: '1px solid var(--color-danger)',
                            }}
                        >
                            <XCircle size={18} />
                            Cancel Recurring
                        </button>
                    </div>
                )}

                {isCanceled && (
                    <div
                        style={{
                            padding: 'var(--space-3)',
                            background: 'var(--surface-background)',
                            borderRadius: 'var(--radius-md)',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        This recurring appointment has been canceled. No future jobs will be created.
                    </div>
                )}
            </div>
        </Modal>
    );
}
