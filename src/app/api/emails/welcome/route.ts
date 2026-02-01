import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { emailTemplates } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { email, businessName } = await req.json();

        if (!email || !businessName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Calculate trial end date (14 days from now)
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        const trialEndsDate = trialEnd.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });

        const template = emailTemplates.welcome(businessName, trialEndsDate);

        await resend.emails.send({
            from: 'K9Desk <support@k9desk.com>',
            to: email,
            subject: template.subject,
            html: template.html,
        });

        console.log('[Welcome Email] Sent to:', email);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Welcome Email] Error:', error);
        return NextResponse.json(
            { error: 'Failed to send welcome email' },
            { status: 500 }
        );
    }
}
