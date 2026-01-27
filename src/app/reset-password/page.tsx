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
                // 1. Immediately read URL parameters (both hash and query)
                const hash = window.location.hash;
                const searchParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(hash.substring(1));

                // Get tokens from either hash (Implicit) or search (PKCE)
                const accessToken = hashParams.get('access_token');
                const refreshToken = hashParams.get('refresh_token');
                const type = hashParams.get('type');
                const pkceCode = searchParams.get('code');

                console.log('Recovery Page Loaded. Hash type:', type, 'PKCE code detected:', !!pkceCode);

                // 2. Handle Implicit Flow (Hash)
                if (type === 'recovery' && accessToken) {
                    console.log('Attempting manual setSession for recovery (Implicit)...');
                    const { error: setError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || '',
                    });
                    if (setError) throw setError;
                    console.log('Recovery session established via hash.');
                }
                // 3. Handle PKCE Flow (Query Code)
                else if (pkceCode) {
                    console.log('Attempting exchangeCodeForSession for recovery (PKCE)...');
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(pkceCode);
                    if (exchangeError) {
                        // If it fails, maybe it's already exchanged? Check for user.
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) throw exchangeError;
                    }
                    console.log('Recovery session established via code exchange.');
                }
                // 4. Verification Check
                else {
                    // 3. If no access_token or type !== recovery, check if we already have a user
                    // (maybe they refreshed after a successful setSession)
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        console.log('No recovery session and no user found.');
                        setError('This reset link is invalid or expired. Please request a new reset link.');
                    } else {
                        console.log('User already verified:', user.email);
                    }
                }
            } catch (err: any) {
                console.error('Recovery Flow Error:', err);
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
            console.log('Updating user password...');
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setMessage('Password updated successfully! Redirecting to dashboard...');
            console.log('Password update success.');

            // Success: Wait and redirect to dashboard
            setTimeout(() => {
                router.push('/dashboard');
            }, 2500);
        } catch (err: any) {
            console.error('Update password error:', err);
            setError(err.message);
        } finally {
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
                        {verifying ? 'Verifying search tokens...' : error ? 'Link Resolution Failed' : 'Enter your new password below'}
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
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>New Password</label>
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
                            <label style={{ fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Confirm New Password</label>
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
