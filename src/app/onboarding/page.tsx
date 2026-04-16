'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDB } from '@/lib/db';
import { addToSyncQueue } from '@/lib/db/sync';

export default function OnboardingPage() {
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkExisting = async () => {
            const db = await getDB();
            const settings = await db.get('settings', 'default');
            if (settings && settings.businessName && settings.onboardingCompleted) {
                // Already onboarded, go to dashboard
                router.replace('/dashboard');
            }
        };
        checkExisting();
    }, []);

    const handleComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessName.trim()) return;

        setLoading(true);
        try {
            const db = await getDB();
            const now = Date.now();

            // 1. Update Local Settings
            const settings = {
                id: 'default',
                businessName: businessName.trim(),
                onboardingCompleted: true, // Local flag
                updatedAt: now
            };

            await db.put('settings', settings);

            // 2. Queue for Sync (This triggers the Supabase sync)
            await addToSyncQueue('UPDATE', 'SETTINGS', 'default', settings);

            // 3. Redirect to Dashboard
            router.push('/dashboard');

        } catch (error) {
            console.error('Onboarding failed:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome! 👋</h1>
                    <p className="text-gray-600">
                        Let's get your business set up. What is the name of your grooming business?
                    </p>
                </div>

                <form onSubmit={handleComplete} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Name
                        </label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="e.g. John's Mobile Grooming"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                            autoFocus
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !businessName.trim()}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        ) : null}
                        {loading ? 'Setting up...' : 'Get Started →'}
                    </button>
                </form>
            </div>
        </div>
    );
}
