import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { emailTemplates } from '@/lib/email-templates';
import { differenceInCalendarDays, parseISO } from 'date-fns';

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
            console.error('[Payment Grace Period] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Payment Grace Period] Cron job started');

        // Find businesses with past_due status and payment_failed_at timestamp
        const { data: businesses, error } = await supabase
            .from('businesses')
            .select('id, name, payment_failed_at, grace_period_day2_notified, grace_period_final_notified')
            .eq('subscription_status', 'past_due')
            .not('payment_failed_at', 'is', null);

        if (error) {
            console.error('[Payment Grace Period] Error fetching businesses:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        let emailsSent = 0;
        const results: any[] = [];

        for (const business of businesses || []) {
            const failedAt = parseISO(business.payment_failed_at);
            const now = new Date();
            const daysSinceFailure = differenceInCalendarDays(now, failedAt);

            console.log(`[Payment Grace Period] Business ${business.name}: ${daysSinceFailure} days since failure`);

            // Get owner email
            const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('business_id', business.id)
                .eq('role', 'owner')
                .single();

            if (!profile?.email) {
                console.warn('[Payment Grace Period] No owner email for business:', business.id);
                continue;
            }

            let template = null;
            let shouldUpdateNotificationFlag = false;
            let flagToUpdate: 'grace_period_day2_notified' | 'grace_period_final_notified' | null = null;

            // Day 2: Read-only warning (if not already notified)
            if (daysSinceFailure >= 2 && daysSinceFailure < 3 && !business.grace_period_day2_notified) {
                template = emailTemplates.paymentFailedDay2(business.name || 'there');
                shouldUpdateNotificationFlag = true;
                flagToUpdate = 'grace_period_day2_notified';
            }
            // Day 3: Final warning (if not already notified)
            else if (daysSinceFailure >= 3 && daysSinceFailure < 4 && !business.grace_period_final_notified) {
                template = emailTemplates.paymentFailedFinal(business.name || 'there');
                shouldUpdateNotificationFlag = true;
                flagToUpdate = 'grace_period_final_notified';
            }
            // Day 4+: Account locked (send once if not already sent)
            else if (daysSinceFailure >= 4 && !business.grace_period_final_notified) {
                template = emailTemplates.accountLocked(business.name || 'there');
                shouldUpdateNotificationFlag = true;
                flagToUpdate = 'grace_period_final_notified';
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
                        daysSinceFailure,
                        status: 'sent',
                    });

                    console.log(
                        `[Payment Grace Period] Sent to ${profile.email} (Day ${daysSinceFailure})`
                    );

                    // Update notification flag to prevent duplicate sends
                    if (shouldUpdateNotificationFlag && flagToUpdate) {
                        await supabase
                            .from('businesses')
                            .update({ [flagToUpdate]: true } as any)
                            .eq('id', business.id);
                    }
                } catch (error) {
                    console.error(
                        `[Payment Grace Period] Failed to send to ${profile.email}:`,
                        error
                    );
                    results.push({
                        business: business.name,
                        email: profile.email,
                        daysSinceFailure,
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        }

        console.log(`[Payment Grace Period] Cron job complete. Sent ${emailsSent} emails.`);

        return NextResponse.json({
            success: true,
            emailsSent,
            results,
        });
    } catch (error) {
        console.error('[Payment Grace Period] Cron job error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
