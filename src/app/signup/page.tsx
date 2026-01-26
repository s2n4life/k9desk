import AuthForm from '@/components/auth/AuthForm';
import { getSystemConfig } from '@/lib/admin/config';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function SignupPage() {
    const isEnabled = await getSystemConfig('signups_enabled');

    if (!isEnabled) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: 'var(--space-8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                        <AlertCircle size={48} color="var(--brand-primary)" />
                    </div>
                    <h2 className="text-h2">Registration Paused</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                        We've temporarily paused new signups as we scale our infrastructure.
                        Please check back later!
                    </p>
                    <Link href="/" className="btn btn-primary" style={{ display: 'inline-block' }}>
                        Return to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <AuthForm initialMode="signup" />
        </div>
    );
}
