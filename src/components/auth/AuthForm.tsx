'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export default function AuthForm({ initialMode = 'login' }: { initialMode?: AuthMode }) {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    const validatePassword = (pwd: string): string | null => {
        if (pwd.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/[a-z]/.test(pwd)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password must contain at least one number';
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
            return 'Password must contain at least one special character';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        // Validate password strength for signup
        if (mode === 'signup') {
            const passwordError = validatePassword(password);
            if (passwordError) {
                setError(passwordError);
                setLoading(false);
                return;
            }
        }

        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Login request timed out. Please check your internet connection.')), 15000)
            );

            let authPromise;
            if (mode === 'signup') {
                // For signup, include email redirect URL for confirmation
                authPromise = supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/confirm`,
                    }
                });
            } else if (mode === 'login') {
                authPromise = supabase.auth.signInWithPassword({ email, password });
            } else if (mode === 'forgot-password') {
                authPromise = supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: 'https://k9desk.com/reset-password',
                });
            }

            if (authPromise) {
                const { error, data } = (await Promise.race([authPromise, timeoutPromise])) as any;
                if (error) throw error;

                if (mode === 'forgot-password') {
                    setMessage('Password reset link sent! Please check your email.');
                } else if (mode === 'signup') {
                    // For signup, show "check your email" message instead of redirecting
                    setMessage('Account created! Please check your email to verify your account. You must confirm your email before you can log in.');
                } else {
                    // For login, redirect to dashboard
                    router.push('/dashboard');
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);

            // Handle specific error cases
            if (err.message?.includes('Email not confirmed')) {
                setError('Please verify your email address first. Check your inbox for the confirmation link we sent you.');
            } else if (err.message?.includes('Invalid login credentials')) {
                setError('Invalid email or password. Please try again.');
            } else if (err.message === 'Load failed') {
                setError('Network error: Failed to connect to server.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                <h2 className="text-h1" style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>
                    {mode === 'login' && 'Welcome Back'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'forgot-password' && 'Reset Password'}
                </h2>
                <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                    {mode === 'login' && 'Sign in to access your dashboard'}
                    {mode === 'signup' && 'Start your 14-day free trial'}
                    {mode === 'forgot-password' && 'Enter your email to receive a reset link'}
                </p>
                {mode === 'signup' && (
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--success)',
                        fontWeight: 600,
                        marginTop: 'var(--space-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                    }}>
                        ✓ No credit card required. You will NOT be auto-charged.
                    </p>
                )}
            </div>

            {error && (
                <div style={{
                    marginBottom: 'var(--space-4)',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    color: '#dc2626',
                    fontSize: 'var(--font-size-sm)',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}

            {message && (
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
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                    <label style={{ fontWeight: 600 }}>Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="input"
                        placeholder="you@company.com"
                        style={{ width: '100%' }}
                    />
                </div>

                {mode !== 'forgot-password' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontWeight: 600 }}>Password</label>
                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot-password')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--brand-primary)',
                                        fontSize: 'var(--font-size-sm)',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="input"
                            placeholder="••••••••"
                            style={{ width: '100%' }}
                        />
                        {mode === 'signup' && (
                            <p style={{
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)',
                                marginTop: 'var(--space-2)'
                            }}>
                                Must be 8+ characters with uppercase, lowercase, number, and special char (@, #, !, etc)
                            </p>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ marginTop: 'var(--space-2)' }}
                >
                    {loading ? 'Processing...' : (
                        mode === 'login' ? 'Sign In' : (mode === 'signup' ? 'Create Account' : 'Send Reset Link')
                    )}
                </button>

                {mode === 'forgot-password' && (
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="btn btn-secondary"
                        style={{ background: 'transparent', border: 'none' }}
                    >
                        Back to Login
                    </button>
                )}
            </form>

            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                <p className="text-sm" style={{ marginBottom: 'var(--space-2)' }}>
                    {mode === 'login' ? "Don't have an account?" : (mode === 'signup' ? "Already have an account?" : "")}
                </p>
                {mode !== 'forgot-password' && (
                    <button
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        className="btn btn-secondary"
                        style={{ height: '44px', background: 'transparent', border: '1px solid var(--border-subtle, #e5e7eb)' }}
                    >
                        {mode === 'login' ? 'Create free account' : 'Sign in to existing account'}
                    </button>
                )}
            </div>
        </div>
    );
}
