'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    useEffect(() => {
        const verifyFlow = async () => {
            setCheckingSession(true);
            setError(null);

            try {
                // 1. Check for errors in the URL (like expired links)
                // Both query params and hash might contain errors
                const hash = window.location.hash;
                const errorParam = searchParams.get('error_description') ||
                    new URLSearchParams(hash.substring(1)).get('error_description');

                if (errorParam) {
                    setError(errorParam.replace(/\+/g, ' '));
                    setCheckingSession(false);
                    return;
                }

                // 2. Handle PKCE Flow (code in query params)
                const code = searchParams.get('code');
                if (code) {
                    console.log('Detected PKCE code, exchanging for session...');
                    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeError) {
                        setError('Could not establish session from link. It may have expired.');
                        setCheckingSession(false);
                        return;
                    }
                    console.log('Session established via code');
                }

                // 3. Verify session (handles both Implicit flow hash and PKCE session)
                // We wait a tiny bit for the Supabase client to finish parsing cookies/hash
                let sessionVerified = false;
                for (let i = 0; i < 5; i++) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        sessionVerified = true;
                        break;
                    }
                    await new Promise(r => setTimeout(r, 500));
                }

                if (!sessionVerified) {
                    setError('Auth session missing! Please request a new reset link.');
                }
            } catch (err: any) {
                setError('An unexpected error occurred. Please try again.');
            } finally {
                setCheckingSession(false);
            }
        };

        verifyFlow();
    }, [searchParams, supabase]);

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
            const { error } = await supabase.auth.updateUser({
                password: password,
            });
            if (error) throw error;

            setMessage('Password updated successfully! Redirecting to login...');
            setTimeout(() => {
                router.push('/login');
            }, 2500);
        } catch (err: any) {
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
                        {checkingSession ? 'Verifying your identity...' : 'Enter your new password below'}
                    </p>
                </div>

                {checkingSession ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                        <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-muted)', fontSize: '14px' }}>
                            Securing your account...
                        </p>
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
                            style={{ width: '100%', marginBottom: 'var(--space-2)' }}
                        >
                            Back to Login
                        </button>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Check if you are using the most recent email.
                        </p>
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
                            <label style={{ fontWeight: 600 }}>New Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="input"
                                placeholder="••••••••"
                                style={{ width: '100%' }}
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label style={{ fontWeight: 600 }}>Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="input"
                                placeholder="••••••••"
                                style={{ width: '100%' }}
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ marginTop: 'var(--space-2)' }}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
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
