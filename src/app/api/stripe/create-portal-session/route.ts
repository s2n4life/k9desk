import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';
import { getDB } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { origin: clientOrigin } = await req.json();
        const supabase = await createClient();

        const origin = clientOrigin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 1. Check if we have a stripe_customer_id in Supabase first
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        let customerId = profile?.stripe_customer_id;

        // 2. If not in Supabase, we could check local DB or Stripe, 
        // but for the portal we MUST have a customer ID.
        if (!customerId) {
            // Check if they already have one on Stripe by email
            const customers = await stripe.customers.list({
                email: user.email,
                limit: 1,
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
                // Update profile with existing customer ID
                await supabase
                    .from('profiles')
                    .update({ stripe_customer_id: customerId })
                    .eq('id', user.id);
            } else {
                // No customer exists yet, they probably haven't subscribed.
                // We could create one, but usually the portal is for existing customers.
                // If they don't have one, we can't open the portal.
                return NextResponse.json({
                    error: 'no_customer',
                    message: 'Please subscribe first to manage your billing.'
                }, { status: 400 });
            }
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${origin}/settings`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('[STRIPE_PORTAL_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
