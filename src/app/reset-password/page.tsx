'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const establishSession = async () => {
            setVerifying(true);
            setError(null);

            try {
                // 1. READ HASH ONLY (Standard Hub-page pattern)
                const hash = window.location.hash;
                const hashParams = new URLSearchParams(hash.substring(1));

                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');

                console.log('Reset Page Loaded. Type:', type);

                // 2. ENFORCE type === "recovery"
                if (type !== 'recovery' || !accessToken) {
                    // Check if we already have a user (maybe they refreshed)
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        setError('Invalid or expired reset link. Please request a new link.');
                        setVerifying(false);
                        return;
                    }
                    // Already logged in, let them stay on the page
                    setVerifying(false);
                    return;
                }

                // 3. IMMEDIATELY call setSession
                console.log('Attempting isolated setSession...');
                const { error: setErrorResult } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || '',
                });

                if (setErrorResult) throw setErrorResult;

                console.log('Recovery session established.');

            } catch (err: any) {
                console.error('Session establishment failed:', err);
                setError('This password reset link has expired. Please request a new one.');
            } finally {
                setVerifying(false);
            }
        };

        establishSession();
    }, [supabase]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            // 4. Update Password
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setMessage('Password updated successfully! Redirecting...');

            // 5. POST-RESET: Redirect and clear hash
            setTimeout(() => {
                window.location.hash = ''; // Clear hash
                window.location.href = '/dashboard'; // Hard reload to dashboard
            }, 2500);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--bg-app)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <h2 className="text-h1" style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>
                        Set New Password
                    </h2>
                    <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                        {verifying ? 'Verifying link...' : error ? 'Link Resolution Failed' : 'Enter your new password below'}
                    </p>
                </div>

                {verifying ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            marginBottom: 'var(--space-4)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            color: '#dc2626',
                            fontSize: 'var(--font-size-sm)'
                        }}>
                            {error}
                        </div>
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Back to Login
                        </button>
                    </div>
                ) : message ? (
                    <div style={{
                        marginBottom: 'var(--space-4)',
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#059669',
                        fontSize: 'var(--font-size-sm)',
                        textAlign: 'center'
                    }}>
                        {message}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 'var(--space-1)' }}>New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="input"
                                placeholder="••••••••"
                                style={{ width: '100%' }}
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>

                        <div>
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 'var(--space-1)' }}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="input"
                                placeholder="••••••••"
                                style={{ width: '100%' }}
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--space-2)' }}
                        >
                            {loading ? 'Processing...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
