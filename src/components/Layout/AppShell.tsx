'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from "@/components/Navigation/Navigation";
import { OnboardingManager } from "@/components/Onboarding/OnboardingManager";
import { SyncManager } from "@/components/SyncManager";
import { SubscriptionManager } from "@/components/Subscription/SubscriptionManager";
import { ImpersonationBanner } from "@/components/Admin/ImpersonationBanner";

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Pages that should NOT use the mobile app shell
    const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/reset-password' || pathname?.startsWith('/auth/') || pathname?.startsWith('/book/') || pathname === '/payment/success';

    // Admin pages should use their own layout (desktop-optimized)
    const isAdminPage = pathname?.startsWith('/admin');

    if (isPublicPage || isAdminPage) {
        return (
            <main className="w-full">
                {children}
            </main>
        );
    }

    return (
        <>
            <ImpersonationBanner />
            <main className="main-layout container" style={{ marginTop: pathname.startsWith('/admin') ? 0 : 'auto' }}>
                {children}
                <OnboardingManager />
                <SyncManager />
                <SubscriptionManager />
            </main>
            <Navigation />
        </>
    );
}
