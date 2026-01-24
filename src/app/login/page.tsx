import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--bg-app)' // Ensure background matches theme
        }}>
            <AuthForm initialMode="login" />
        </div>
    );
}
