import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover'
});

export async function POST(request: NextRequest) {
    try {
        const { subscriptionId, trialEndTimestamp } = await request.json();

        if (!subscriptionId || !trialEndTimestamp) {
            return NextResponse.json(
                { error: 'Missing subscriptionId or trialEndTimestamp' },
                { status: 400 }
            );
        }

        // Update the Stripe subscription's trial_end
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            trial_end: trialEndTimestamp
        });

        return NextResponse.json({
            success: true,
            subscription: {
                id: subscription.id,
                trial_end: subscription.trial_end
            }
        });
    } catch (error: any) {
        console.error('Error extending trial in Stripe:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update Stripe subscription' },
            { status: 500 }
        );
    }
}
