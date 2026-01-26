'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from "@/components/Navigation/Navigation";
import { OnboardingManager } from "@/components/Onboarding/OnboardingManager";
import { SyncManager } from "@/components/SyncManager";
import { SubscriptionManager } from "@/components/Subscription/SubscriptionManager";

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/reset-password' || pathname?.startsWith('/auth/') || pathname?.startsWith('/book/') || pathname === '/payment/success';

    if (isPublicPage) {
        return (
            <main className="w-full">
                {children}
            </main>
        );
    }

    return (
        <>
            <main className="main-layout container">
                {children}
                <OnboardingManager />
                <SyncManager />
                <SubscriptionManager />
            </main>
            <Navigation />
        </>
    );
}
