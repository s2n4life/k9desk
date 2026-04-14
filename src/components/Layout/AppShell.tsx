'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from "@/components/Navigation/Navigation";
import { OnboardingManager } from "@/components/Onboarding/OnboardingManager";
import { SyncManager } from "@/components/SyncManager";
import { SubscriptionManager } from "@/components/Subscription/SubscriptionManager";
import { ImpersonationBanner } from "@/components/Admin/ImpersonationBanner";
import { SyncIndicator } from "@/components/Sync/SyncIndicator";
import { PaymentFailedBanner } from "@/components/Subscription/PaymentFailedBanner";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Pages that should NOT use the mobile app shell or heavy providers
    const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/reset-password' || pathname?.startsWith('/auth/') || pathname?.startsWith('/book/') || pathname === '/payment/success' || pathname === '/terms' || pathname === '/privacy' || pathname === '/contact';

    // Admin pages should use their own layout (desktop-optimized)
    const isAdminPage = pathname?.startsWith('/admin');

    // PUBLIC PAGES: No providers, no IndexedDB, no Supabase calls
    if (isPublicPage) {
        return (
            <main className="w-full">
                {children}
            </main>
        );
    }

    // ADMIN PAGES: Providers needed but no mobile navigation
    if (isAdminPage) {
        return (
            <ImpersonationProvider>
                <NotificationProvider>
                    <main className="w-full">
                        {children}
                    </main>
                </NotificationProvider>
            </ImpersonationProvider>
        );
    }

    // AUTHENTICATED APP PAGES: Full mobile shell with all providers
    return (
        <ImpersonationProvider>
            <NotificationProvider>
                <ImpersonationBanner />
                <PaymentFailedBanner />
                <main className="main-layout container">
                    {children}
                    <OnboardingManager />
                    <SyncManager />
                    <SubscriptionManager />
                    <SyncIndicator />
                </main>
                <Navigation />
            </NotificationProvider>
        </ImpersonationProvider>
    );
}
