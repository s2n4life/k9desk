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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/dashboard');
            } else if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/dashboard');
            } else if (mode === 'forgot-password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback`,
                });
                if (error) throw error;
                setMessage('Password reset link sent! Please check your email.');
            }
        } catch (err: any) {
            setError(err.message);
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
