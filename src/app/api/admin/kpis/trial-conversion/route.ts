import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/kpis/trial-conversion
 * 
 * Returns trial to paid conversion rate:
 * (trials converted to paid in last 30 days) / (trials started in last 30 days)
 * 
 * Note: This endpoint relies on the /admin layout for authentication.
 */
export async function GET() {
    try {
        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

        // Get all subscriptions created in last 30 days
        const recentSubscriptions = await stripe.subscriptions.list({
            created: { gte: thirtyDaysAgo },
            limit: 100,
        });

        // Count trials started (subscriptions that started with trial)
        let trialsStarted = 0;
        let trialsConverted = 0;

        for (const sub of recentSubscriptions.data) {
            // If subscription had a trial
            if (sub.trial_start && sub.trial_end) {
                trialsStarted++;

                // If trial ended and subscription is now active (converted)
                const now = Math.floor(Date.now() / 1000);
                if (sub.trial_end < now && sub.status === 'active') {
                    trialsConverted++;
                }
            }
        }

        const conversionRate = trialsStarted > 0
            ? (trialsConverted / trialsStarted) * 100
            : 0;

        return NextResponse.json({
            conversionRate: Math.round(conversionRate * 10) / 10,
            change: 0, // TODO: Implement historical comparison
            breakdown: {
                trialsStarted,
                trialsConverted,
            }
        });

    } catch (error: any) {
        console.error('[Trial Conversion KPI] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch trial conversion rate', details: error.message },
            { status: 500 }
        );
    }
}
