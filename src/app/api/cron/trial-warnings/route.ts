import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { emailTemplates } from '@/lib/email-templates';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('[Trial Warnings] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Trial Warnings] Cron job started');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find businesses with trialing status
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('id, name, created_at, subscription_status')
            .eq('subscription_status', 'trialing');

        if (error) {
            console.error('[Trial Warnings] Error fetching businesses:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        let emailsSent = 0;
        const results: any[] = [];

        for (const business of businesses || []) {
            const createdAt = new Date(business.created_at);
            const trialEnd = new Date(createdAt);
            trialEnd.setDate(createdAt.getDate() + 14);

            // Calculate days until expiry
            const daysUntilExpiry = Math.ceil(
                (trialEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Get owner email
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('business_id', business.id)
                .eq('role', 'owner')
                .single();

            if (!profile?.email) {
                console.warn('[Trial Warnings] No owner email for business:', business.id);
                continue;
            }

            let template = null;

            // Send emails at 7 days, 3 days, and 0 days (expiration day)
            if (daysUntilExpiry === 7) {
                template = emailTemplates.trialExpiring(business.name, 7);
            } else if (daysUntilExpiry === 3) {
                template = emailTemplates.trialExpiring(business.name, 3);
            } else if (daysUntilExpiry === 0) {
                template = emailTemplates.trialExpired(business.name);
            }

            if (template) {
                try {
                    await resend.emails.send({
                        from: 'K9Desk <support@k9desk.com>',
                        to: profile.email,
                        subject: template.subject,
                        html: template.html,
                    });

                    emailsSent++;
                    results.push({
                        business: business.name,
                        email: profile.email,
                        daysLeft: daysUntilExpiry,
                        status: 'sent',
                    });

                    console.log(
                        `[Trial Warnings] Sent to ${profile.email} (${daysUntilExpiry} days left)`
                    );
                } catch (error) {
                    console.error(
                        `[Trial Warnings] Failed to send to ${profile.email}:`,
                        error
                    );
                    results.push({
                        business: business.name,
                        email: profile.email,
                        daysLeft: daysUntilExpiry,
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        }

        console.log(`[Trial Warnings] Cron job complete. Sent ${emailsSent} emails.`);

        return NextResponse.json({
            success: true,
            emailsSent,
            results,
        });
    } catch (error) {
        console.error('[Trial Warnings] Cron job error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
