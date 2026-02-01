#!/usr/bin/env ts-node
/**
 * Manual Database Backup Script
 * 
 * Usage: npx ts-node scripts/manual-backup.ts
 * 
 * Creates a manual backup before deployments or major changes.
 * Stores backup both locally (in backups/ directory) and in R2 storage.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { exportDatabase, uploadToR2 } from '../src/lib/backup-utils';

// Load environment variables
dotenv.config({ path: './.env.local' });

async function main() {
    console.log('🔄 Starting manual database backup...\n');

    try {
        // Create local backups directory if it doesn't exist
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
            console.log('📁 Created backups directory\n');
        }

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `manual-${timestamp}.sql`;
        const localPath = path.join(backupsDir, filename);

        // Export database
        console.log('📤 Exporting database...');
        const startTime = Date.now();
        const sqlDump = await exportDatabase();
        const exportTime = Date.now() - startTime;
        console.log(`✅ Database exported in ${exportTime}ms\n`);

        // Save locally
        console.log('💾 Saving backup locally...');
        fs.writeFileSync(localPath, sqlDump, 'utf-8');
        const fileSize = fs.statSync(localPath).size;
        console.log(`✅ Saved to: ${localPath}`);
        console.log(`📊 Size: ${(fileSize / 1024).toFixed(2)} KB\n`);

        // Upload to R2
        console.log('☁️  Uploading to R2...');
        const uploadStart = Date.now();
        const uploadResult = await uploadToR2(sqlDump, filename, {
            type: 'manual',
            exportTimeMs: exportTime.toString(),
        });
        const uploadTime = Date.now() - uploadStart;
        console.log(`✅ Uploaded to R2 in ${uploadTime}ms`);
        console.log(`🔗 URL: ${uploadResult.url}`);
        console.log(`🔐 Checksum: ${uploadResult.checksum}\n`);

        const totalTime = Date.now() - startTime;
        console.log('✨ Backup complete!');
        console.log(`⏱️  Total time: ${totalTime}ms`);
        console.log(`\n📋 Backup Details:`);
        console.log(`   Filename: ${filename}`);
        console.log(`   Local: ${localPath}`);
        console.log(`   Remote: ${uploadResult.url}`);
        console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB`);
        console.log(`   Checksum: ${uploadResult.checksum}`);

    } catch (error) {
        console.error('\n❌ Backup failed:', error);
        process.exit(1);
    }
}

main();
