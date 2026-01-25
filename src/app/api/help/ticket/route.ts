import { NextResponse } from 'next/server';
import { resolveUserContext } from '@/lib/help/context-resolver';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const transporter = nodemailer.createTransport({
            host: 'mail.privateemail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const { subject, message } = await req.json();

        // 1. Resolve Account Context
        const context = await resolveUserContext();
        const SUPPORT_EMAIL = 'tickets@k9desk.com';
        const userEmail = context?.userEmail || 'unknown@example.com';
        const businessName = context?.businessName || 'Unknown Business';

        const metadataString = `
--- BUSINESS METADATA ---
Business: ${businessName}
User Email: ${userEmail}
Status: ${context?.subscription || 'N/A'}
Leads: ${context?.leadsCount}
Recent Jobs: ${context?.recentJobs.length}
-------------------------
        `;

        // 2. Send Internal Ticket via Nodemailer (Namecheap SMTP)
        // This bypasses the Resend/DNS subdomain issues entirely for internal mail.
        if (process.env.SMTP_PASSWORD && process.env.SMTP_PASSWORD !== 'your_namecheap_password_here') {
            try {
                await transporter.sendMail({
                    from: `"K9Desk System" <${process.env.SMTP_USER}>`,
                    to: SUPPORT_EMAIL,
                    replyTo: userEmail,
                    subject: `[SUPPORT TICKET] ${subject} - ${businessName}`,
                    text: `${message}\n\n${metadataString}`,
                });
                console.log('[Ticket API] Internal Ticket sent via SMTP');
            } catch (smtpError) {
                console.error('[Ticket API] SMTP Error:', smtpError);
                // Fallback to Resend for internal ticket if SMTP fails
                await resend.emails.send({
                    from: 'K9Desk Support <support@k9desk.com>',
                    to: SUPPORT_EMAIL,
                    replyTo: userEmail,
                    subject: `[SUPPORT TICKET] (FALLBACK) ${subject}`,
                    text: `${message}\n\n${metadataString}`,
                });
            }
        } else {
            console.warn('[Ticket API] SMTP_PASSWORD missing. Falling back to Resend for internal ticket.');
            await resend.emails.send({
                from: 'K9Desk Support <support@k9desk.com>',
                to: SUPPORT_EMAIL,
                replyTo: userEmail,
                subject: `[SUPPORT TICKET] (MOCK) ${subject}`,
                text: `${message}\n\n${metadataString}`,
            });
        }

        // 3. Send Auto-responder to User via Resend
        // This is already working for customers!
        try {
            await resend.emails.send({
                from: 'K9Desk Support <support@k9desk.com>',
                to: [userEmail],
                replyTo: 'support@k9desk.com',
                subject: 'Ticket Received: We are on it!',
                text: `Hi ${businessName},\n\nWe received your support ticket regarding "${subject}". Our team typically responds within 24 to 48 hours.\n\nThanks for being part of K9desk!`,
            });
            console.log('[Ticket API] Auto-responder sent via Resend');
        } catch (resendError) {
            console.error('[Ticket API] Resend Auto-responder failed:', resendError);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Ticket API] Global Error:', error);
        return NextResponse.json({ error: 'Failed to process ticket' }, { status: 500 });
    }
}
