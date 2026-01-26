'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        let authListener: any;

        const checkSession = async () => {
            const hash = window.location.hash;

            // Check for error in hash (expired link)
            if (hash.includes('error=')) {
                if (hash.includes('expired')) {
                    setError('This reset link has expired. Please request a new one.');
                } else {
                    setError('Invalid reset link. Please try again.');
                }
                setCheckingSession(false);
                return;
            }

            // First check if we already have a user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCheckingSession(false);
                return;
            }

            // If not, listen for the session to be established (Supabase auto-logs in from hash)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (session?.user) {
                    setError(null);
                    setCheckingSession(false);
                }
            });
            authListener = subscription;

            // Wait a moment for hash parsing
            setTimeout(async () => {
                const { data: { user: finalUser } } = await supabase.auth.getUser();
                if (!finalUser) {
                    setError('Auth session missing! Please request a new reset link.');
                }
                setCheckingSession(false);
            }, 3000);
        };

        checkSession();
        return () => {
            if (authListener) authListener.unsubscribe();
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
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
            }, 2000);
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
                        Enter your new password below
                    </p>
                </div>

                {error ? (
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
                            className="btn"
                            style={{ fontSize: 'var(--font-size-sm)', textDecoration: 'underline' }}
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
                ) : !checkingSession && (
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
