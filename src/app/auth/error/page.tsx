'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const message = searchParams.get('message');

    const errorMessages: Record<string, { title: string; description: string }> = {
        verification_failed: {
            title: 'Email Verification Failed',
            description: 'The verification link may have expired or is invalid. Please try signing up again or contact support.',
        },
        invalid_token: {
            title: 'Invalid Verification Link',
            description: 'The verification link is missing required information. Please use the link from your email.',
        },
        default: {
            title: 'Authentication Error',
            description: 'An unexpected error occurred during authentication. Please try again.',
        },
    };

    const error = message ? errorMessages[message] || errorMessages.default : errorMessages.default;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--bg-primary)',
        }}>
            <div className="card" style={{
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center',
                padding: 'var(--space-8)',
            }}>
                <div style={{
                    fontSize: '48px',
                    marginBottom: 'var(--space-4)',
                }}>
                    ⚠️
                </div>

                <h1 style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 700,
                    color: 'var(--danger)',
                    marginBottom: 'var(--space-3)',
                }}>
                    {error.title}
                </h1>

                <p style={{
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-6)',
                    lineHeight: 1.6,
                }}>
                    {error.description}
                </p>

                <div style={{
                    display: 'flex',
                    gap: 'var(--space-3)',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                }}>
                    <Link href="/login" className="btn btn-primary">
                        Back to Login
                    </Link>
                    <Link href="/signup" className="btn btn-secondary">
                        Try Signing Up Again
                    </Link>
                </div>

                <p style={{
                    marginTop: 'var(--space-6)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-tertiary)',
                }}>
                    Need help? <a href="mailto:support@k9desk.com" style={{ color: 'var(--brand-primary)' }}>Contact Support</a>
                </p>
            </div>
        </div>
    );
}
