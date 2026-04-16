import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subscription } = body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return new NextResponse('Invalid subscription object', { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Insert or ignore if exact endpoint exists
        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth_key: subscription.keys.auth
            }, {
                onConflict: 'endpoint'
            });

        if (error) {
            console.error('[PUSH_SUBSCRIBE_DB]', error);
            return new NextResponse('Database Error', { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[PUSH_SUBSCRIBE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
