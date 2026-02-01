import { NextResponse } from 'next/server';
import { listBackups, verifyBackup } from '@/lib/backup-utils';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('[Test Restore] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Test Restore] Starting monthly backup verification...');

        // Get most recent backup
        const backups = await listBackups();
        if (backups.length === 0) {
            console.error('[Test Restore] No backups found!');

            // Send alert email
            await resend.emails.send({
                from: 'K9Desk Alerts <support@k9desk.com>',
                to: process.env.ADMIN_EMAIL || 'support@k9desk.com',
                subject: '🚨 Database Backup Alert: No Backups Found',
                html: `
                    <h2>Database Backup Verification Failed</h2>
                    <p>The monthly backup verification check found <strong>no backups</strong> in the R2 storage.</p>
                    <p><strong>Action Required:</strong> Investigate backup system immediately.</p>
                    <p>Time: ${new Date().toISOString()}</p>
                `,
            });

            return NextResponse.json({
                success: false,
                error: 'No backups found'
            }, { status: 500 });
        }

        const latestBackup = backups[0];
        console.log(`[Test Restore] Verifying backup: ${latestBackup.filename}`);

        // Verify backup integrity
        const verification = await verifyBackup(latestBackup.filename);

        if (!verification.valid) {
            console.error(`[Test Restore] Backup verification failed: ${verification.error}`);

            // Send alert email
            await resend.emails.send({
                from: 'K9Desk Alerts <support@k9desk.com>',
                to: process.env.ADMIN_EMAIL || 'support@k9desk.com',
                subject: '🚨 Database Backup Alert: Verification Failed',
                html: `
                    <h2>Database Backup Verification Failed</h2>
                    <p>The monthly backup verification check failed for the most recent backup.</p>
                    <p><strong>Backup:</strong> ${latestBackup.filename}</p>
                    <p><strong>Error:</strong> ${verification.error}</p>
                    <p><strong>Action Required:</strong> Investigate backup integrity immediately.</p>
                    <p>Time: ${new Date().toISOString()}</p>
                `,
            });

            return NextResponse.json({
                success: false,
                backup: latestBackup,
                verification,
            }, { status: 500 });
        }

        console.log('[Test Restore] Backup verification successful');
        console.log(`[Test Restore] Total backups: ${backups.length}`);
        console.log(`[Test Restore] Latest backup: ${latestBackup.filename} (${(latestBackup.size / 1024).toFixed(2)} KB)`);

        // Send success notification (optional - only if ADMIN_EMAIL is set)
        if (process.env.ADMIN_EMAIL) {
            await resend.emails.send({
                from: 'K9Desk Alerts <support@k9desk.com>',
                to: process.env.ADMIN_EMAIL,
                subject: '✅ Database Backup Verification Successful',
                html: `
                    <h2>Monthly Backup Verification Complete</h2>
                    <p>The monthly backup verification check completed successfully.</p>
                    <p><strong>Latest Backup:</strong> ${latestBackup.filename}</p>
                    <p><strong>Size:</strong> ${(latestBackup.size / 1024).toFixed(2)} KB</p>
                    <p><strong>Total Backups:</strong> ${backups.length}</p>
                    <p><strong>Last Modified:</strong> ${latestBackup.lastModified.toISOString()}</p>
                    <p>Time: ${new Date().toISOString()}</p>
                `,
            });
        }

        return NextResponse.json({
            success: true,
            backup: latestBackup,
            verification,
            totalBackups: backups.length,
        });
    } catch (error) {
        console.error('[Test Restore] Verification failed:', error);

        // Send alert email
        try {
            await resend.emails.send({
                from: 'K9Desk Alerts <support@k9desk.com>',
                to: process.env.ADMIN_EMAIL || 'support@k9desk.com',
                subject: '🚨 Database Backup Alert: System Error',
                html: `
                    <h2>Database Backup Verification Error</h2>
                    <p>The monthly backup verification check encountered a system error.</p>
                    <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
                    <p><strong>Action Required:</strong> Investigate backup system immediately.</p>
                    <p>Time: ${new Date().toISOString()}</p>
                `,
            });
        } catch (emailError) {
            console.error('[Test Restore] Failed to send alert email:', emailError);
        }

        return NextResponse.json(
            {
                error: 'Verification failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
