import { redirect } from 'next/navigation';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { PaymentSuccessClient } from './PaymentSuccessClient';

export default async function PaymentSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id: string }>;
}) {
    const { session_id } = await searchParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!session_id) {
        // If no session_id, check if user is ALREADY active (maybe they refreshed or returned)
        if (user) {
            const { data: businesses } = await supabase
                .from('businesses')
                .select('subscription_status, onboarding_completed')
                .or(`id.eq.${user.id},owner_id.eq.${user.id}`)
                .order('updated_at', { ascending: false });

            const business = businesses?.[0];

            if (business?.subscription_status === 'active') {
                return (
                    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                            <PaymentSuccessClient />
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
                    <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                        <h1 className="text-xl font-bold mb-4 text-red-500">Subscription Not Found</h1>
                        <p className="mb-6 text-slate-600">
                            We couldn't find an active subscription for your account.
                        </p>
                        <div className="text-left bg-slate-50 p-4 rounded-lg text-xs font-mono mb-6 overflow-auto">
                            Debug Info:<br />
                            User ID: {user.id.substring(0, 8)}...<br />
                            Businesses Found: {businesses?.length || 0}<br />
                            Latest Status: {business?.subscription_status || 'none'}<br />
                            Onboarding: {business?.onboarding_completed ? 'Yes' : 'No'}
                        </div>
                        <Link href="/dashboard" className="block w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition">
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-8 text-center text-red-500">
                <h1 className="text-xl font-bold mb-4">Error: Missing Session ID</h1>
                <p className="mb-4">We couldn't verify your payment session. Please log in again.</p>
                <Link href="/login" className="px-4 py-2 bg-slate-200 rounded-lg">Log In</Link>
            </div>
        );
    }

    try {
        // 1. Verify with Stripe
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status !== 'paid') {
            return (
                <div className="p-8 text-center">
                    <h1>Payment not completed. Status: {session.payment_status}</h1>
                    <Link href="/dashboard">Back to Dashboard</Link>
                </div>
            );
        }

        // 2. Update Database (if not already handled by webhook or previous visit)
        if (user) {
            console.log('[PaymentSuccess] Updating database for user:', user.id);
            // Update subscription status in Businesses table
            const { data, error, count } = await supabase
                .from('businesses')
                .update({
                    subscription_status: 'active',
                    onboarding_completed: true, // Ensure they aren't stuck in onboarding
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: session.subscription as string,
                    updated_at: new Date().toISOString()
                })
                .or(`id.eq.${user.id},owner_id.eq.${user.id}`)
                .select();

            if (error) {
                console.error('[PaymentSuccess] Database update error:', error);
            } else {
                console.log('[PaymentSuccess] Database updated successfully. Records affected:', data?.length || 0);
            }
        } else {
            console.warn('[PaymentSuccess] No user found for database update');
        }

        // 3. Success UI
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                    <PaymentSuccessClient />
                </div>
            </div>
        );

    } catch (error) {
        console.error('Payment Error:', error);
        return (
            <div className="p-8 text-center text-red-500">
                <h1>Error Verifying Payment</h1>
                <p>Please contact support if you have been charged.</p>
                <Link href="/dashboard" className="underline mt-4 block">Back to Dashboard</Link>
            </div>
        );
    }
}
