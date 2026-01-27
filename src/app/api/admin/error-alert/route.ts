import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await req.json();

        // Check if email alerts are enabled in system_configs
        const { data: config } = await supabase
            .from('system_configs')
            .select('value')
            .eq('key', 'error_emails_enabled')
            .single();

        // If explicitly disabled, skip email
        if (config && config.value === false) {
            console.log('[Error Alert API] Email alerts are disabled via configuration');
            return NextResponse.json({ success: true, message: 'Email alerts disabled' });
        }

        await resend.emails.send({
            from: 'K9Desk Sentinel <support@k9desk.com>',
            to: ['s2n4life@gmail.com'],
            subject: `🚨 Error Detected: ${error.message}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">🚨 Sentinel Error Alert</h2>
                    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
                        <p><strong>Message:</strong> ${error.message}</p>
                        <p><strong>Level:</strong> <span style="color: #ef4444; text-transform: uppercase;">${error.level}</span></p>
                        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        ${error.business_id ? `<p><strong>Business ID:</strong> <code>${error.business_id}</code></p>` : ''}
                        ${error.user_id ? `<p><strong>User ID:</strong> <code>${error.user_id}</code></p>` : ''}
                    </div>
                    
                    ${error.stack_trace ? `
                        <div style="margin: 16px 0;">
                            <h3 style="color: #64748b;">Stack Trace</h3>
                            <pre style="background: #0f172a; color: #ef4444; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px;">${error.stack_trace}</pre>
                        </div>
                    ` : ''}
                    
                    <div style="margin: 16px 0;">
                        <h3 style="color: #64748b;">Metadata</h3>
                        <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px;">${JSON.stringify(error.metadata, null, 2)}</pre>
                    </div>
                    
                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
                        <p>View all logs in your <a href="https://www.k9desk.com/admin/bugs" style="color: #6c5ce7;">admin dashboard</a></p>
                    </div>
                </div>
            `
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[Error Alert API] Failed:', err);
        return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 });
    }
}
