import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/admin/at-risk-users/dismiss
 * 
 * Dismisses a business from the at-risk users list.
 * 
 * Body: { businessId: string, reason?: string }
 * 
 * Note: This endpoint relies on the /admin layout for authentication.
 */
export async function POST(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await request.json();
        const { businessId, reason } = body;

        if (!businessId) {
            return NextResponse.json(
                { error: 'businessId is required' },
                { status: 400 }
            );
        }

        // Get the current admin user (from cookie/session)
        const authHeader = request.headers.get('cookie');
        let adminUserId = null;

        if (authHeader) {
            // Extract session from cookie and get user
            const { data: { user } } = await supabase.auth.getUser();
            adminUserId = user?.id;
        }

        // If we can't get the user from session, use a placeholder
        // (This shouldn't happen since admin layout protects the route)
        if (!adminUserId) {
            adminUserId = '00000000-0000-0000-0000-000000000000';
        }

        // Insert dismissal record
        const { error } = await supabase
            .from('at_risk_dismissals')
            .insert({
                business_id: businessId,
                dismissed_by: adminUserId,
                reason: reason || null
            });

        if (error) {
            // If it's a unique constraint violation, it's already dismissed
            if (error.code === '23505') {
                return NextResponse.json({ success: true, message: 'Already dismissed' });
            }
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Dismiss At-Risk User] Error:', error);
        return NextResponse.json(
            { error: 'Failed to dismiss user', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/at-risk-users/dismiss
 * 
 * Un-dismisses a business (removes from dismissals table).
 * 
 * Body: { businessId: string }
 */
export async function DELETE(request: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await request.json();
        const { businessId } = body;

        if (!businessId) {
            return NextResponse.json(
                { error: 'businessId is required' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('at_risk_dismissals')
            .delete()
            .eq('business_id', businessId);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('[Un-dismiss At-Risk User] Error:', error);
        return NextResponse.json(
            { error: 'Failed to un-dismiss user', details: error.message },
            { status: 500 }
        );
    }
}
