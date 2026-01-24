import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const { priceId, origin: clientOrigin } = await req.json();
        const supabase = await createClient(); // Use createClient (server)

        const origin = clientOrigin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005';

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Get Business ID (Optional, but good for metadata)
        const { data: business } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', user.id)
            .single();

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/payment/cancel`,
            client_reference_id: user.id,
            metadata: {
                userId: user.id,
                ownerId: user.id,
                businessId: business?.id || 'unknown',
            },
            customer_email: user.email,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('[STRIPE_ERROR]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
