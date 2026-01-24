'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

type AuthMode = 'login' | 'signup';

export default function AuthForm({ initialMode = 'login' }: { initialMode?: AuthMode }) {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // Success: In a real app with email confirmation, we'd show a "Check email" message.
                // If "Auto Confirm" is on in Supabase (dev), they are logged in.
                // For this SaaS flow, we assume they might need to be redirected to Onboarding/Payment.
                router.push('/dashboard');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push('/dashboard');
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
                {/* Optional: Add Logo Here if available */}
                <h2 className="text-h1" style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
                    {mode === 'login'
                        ? 'Sign in to access your dashboard'
                        : 'Start your 14-day free trial'}
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

                <div>
                    <label style={{ fontWeight: 600 }}>Password</label>
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

                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ marginTop: 'var(--space-2)' }}
                >
                    {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </button>
            </form>

            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                <p className="text-sm" style={{ marginBottom: 'var(--space-2)' }}>
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                </p>
                <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="btn btn-secondary"
                    style={{ height: '44px', background: 'transparent', border: '1px solid var(--border-subtle, #e5e7eb)' }}
                >
                    {mode === 'login' ? 'Create free account' : 'Sign in to existing account'}
                </button>
            </div>
        </div>
    );
}
