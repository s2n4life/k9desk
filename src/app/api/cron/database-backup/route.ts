import { NextResponse } from 'next/server';
import { exportDatabase, uploadToR2, cleanupOldBackups } from '@/lib/backup-utils';

export async function GET(req: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            console.error('[Database Backup] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Database Backup] Starting automated backup...');

        const startTime = Date.now();

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const dayOfWeek = new Date().getDay();
        const isWeekly = dayOfWeek === 0; // Sunday = weekly backup
        const filename = isWeekly
            ? `backup-weekly-${timestamp}.sql`
            : `backup-${timestamp}.sql`;

        // Export database
        console.log('[Database Backup] Exporting database...');
        const sqlDump = await exportDatabase();
        const exportTime = Date.now() - startTime;

        // Upload to R2
        console.log('[Database Backup] Uploading to R2...');
        const uploadResult = await uploadToR2(sqlDump, filename, {
            type: isWeekly ? 'weekly' : 'daily',
            exportTimeMs: exportTime.toString(),
        });
        const uploadTime = Date.now() - startTime - exportTime;

        // Cleanup old backups
        console.log('[Database Backup] Cleaning up old backups...');
        const cleanupResult = await cleanupOldBackups();
        const totalTime = Date.now() - startTime;

        console.log(`[Database Backup] Backup complete: ${filename}`);
        console.log(`[Database Backup] Size: ${(uploadResult.size / 1024).toFixed(2)} KB`);
        console.log(`[Database Backup] Export time: ${exportTime}ms`);
        console.log(`[Database Backup] Upload time: ${uploadTime}ms`);
        console.log(`[Database Backup] Total time: ${totalTime}ms`);
        console.log(`[Database Backup] Cleanup: deleted ${cleanupResult.deleted}, kept ${cleanupResult.kept}`);

        return NextResponse.json({
            success: true,
            backup: {
                filename,
                size: uploadResult.size,
                checksum: uploadResult.checksum,
                type: isWeekly ? 'weekly' : 'daily',
            },
            timing: {
                exportMs: exportTime,
                uploadMs: uploadTime,
                totalMs: totalTime,
            },
            cleanup: cleanupResult,
        });
    } catch (error) {
        console.error('[Database Backup] Backup failed:', error);
        return NextResponse.json(
            {
                error: 'Backup failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
