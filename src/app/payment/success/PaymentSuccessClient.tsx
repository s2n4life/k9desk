'use client';

import { useEffect, useState } from 'react';
import { hydrateLocalDB } from '@/lib/db/hydration';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export function PaymentSuccessClient() {
    const [status, setStatus] = useState<'syncing' | 'success' | 'error'>('syncing');

    useEffect(() => {
        async function sync() {
            try {
                // 1. Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setStatus('error');
                    return;
                }

                // 2. Force re-hydration
                // This will pull the updated 'subscription_status' from Supabase into IndexedDB
                await hydrateLocalDB(user.id);

                setStatus('success');

                // 3. Optional: refresh window to ensure all components see the change
                // window.location.reload(); 
            } catch (err) {
                console.error('Sync error:', err);
                setStatus('error');
            }
        }

        sync();
    }, []);

    if (status === 'syncing') {
        return (
            <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <h2 className="text-xl font-semibold mb-2">Finalizing your subscription...</h2>
                <p className="text-slate-500">Syncing your account details</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="text-center py-8">
                <h2 className="text-xl font-semibold text-red-600 mb-2">Syncing Failed</h2>
                <p className="text-slate-500 mb-4">Your payment was successful, but we had trouble updating the app. Please refresh the page.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-slate-200 px-4 py-2 rounded-lg font-medium"
                >
                    Refresh App
                </button>
            </div>
        );
    }

    return (
        <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Subscription Active!</h1>
            <p className="text-slate-600 mb-8">
                Thank you for subscribing. Your account has been successfully upgraded.
            </p>
            <button
                onClick={() => window.location.href = '/dashboard'}
                className="block w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
            >
                Continue to Dashboard
            </button>
        </div>
    );
}
