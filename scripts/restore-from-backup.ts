#!/usr/bin/env ts-node
/**
 * Restore Database from Backup
 * 
 * Usage: npx ts-node scripts/restore-from-backup.ts [backup-filename]
 * 
 * Downloads a backup from R2 and provides restore instructions.
 * Does NOT automatically restore to prevent accidental data loss.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { downloadFromR2, listBackups, verifyBackup } from '../src/lib/backup-utils';

// Load environment variables
dotenv.config({ path: './.env.local' });

async function main() {
    const args = process.argv.slice(2);

    console.log('🔍 Database Restore Utility\n');

    try {
        // List available backups
        console.log('📋 Fetching available backups...\n');
        const backups = await listBackups();

        if (backups.length === 0) {
            console.log('❌ No backups found in R2 storage');
            process.exit(1);
        }

        console.log(`Found ${backups.length} backup(s):\n`);
        backups.forEach((backup, index) => {
            const sizeKB = (backup.size / 1024).toFixed(2);
            const date = backup.lastModified.toISOString().split('T')[0];
            const time = backup.lastModified.toISOString().split('T')[1].slice(0, 8);
            const typeIcon = backup.type === 'manual' ? '🔧' : backup.type === 'weekly' ? '📅' : '📆';
            console.log(`  ${index + 1}. ${typeIcon} ${backup.filename}`);
            console.log(`     Size: ${sizeKB} KB | Date: ${date} ${time} | Type: ${backup.type}`);
        });

        // Determine which backup to restore
        let selectedBackup;
        if (args.length > 0) {
            // User specified a filename
            const filename = args[0];
            selectedBackup = backups.find(b => b.filename === filename);
            if (!selectedBackup) {
                console.log(`\n❌ Backup not found: ${filename}`);
                process.exit(1);
            }
        } else {
            // Use most recent backup
            selectedBackup = backups[0];
            console.log(`\n💡 No filename specified, using most recent backup`);
        }

        console.log(`\n📥 Downloading: ${selectedBackup.filename}`);

        // Verify backup integrity
        console.log('🔐 Verifying backup integrity...');
        const verification = await verifyBackup(selectedBackup.filename);
        if (!verification.valid) {
            console.log(`❌ Backup verification failed: ${verification.error}`);
            console.log('⚠️  This backup may be corrupted. Restore at your own risk.');
            process.exit(1);
        }
        console.log('✅ Backup integrity verified\n');

        // Download backup
        const { content, metadata } = await downloadFromR2(selectedBackup.filename);

        // Save to local file
        const backupsDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        const localPath = path.join(backupsDir, selectedBackup.filename);
        fs.writeFileSync(localPath, content, 'utf-8');

        console.log('✅ Backup downloaded successfully\n');
        console.log('📋 Backup Information:');
        console.log(`   Filename: ${selectedBackup.filename}`);
        console.log(`   Local Path: ${localPath}`);
        console.log(`   Size: ${(selectedBackup.size / 1024).toFixed(2)} KB`);
        console.log(`   Type: ${selectedBackup.type}`);
        console.log(`   Created: ${selectedBackup.lastModified.toISOString()}`);
        if (metadata.checksum) {
            console.log(`   Checksum: ${metadata.checksum}`);
        }

        console.log('\n⚠️  RESTORE INSTRUCTIONS:');
        console.log('   This script does NOT automatically restore the database to prevent');
        console.log('   accidental data loss. To restore, follow these steps:\n');
        console.log('   1. Log into your Supabase dashboard');
        console.log('   2. Navigate to: SQL Editor');
        console.log('   3. Open the downloaded file: ' + localPath);
        console.log('   4. Copy the SQL content');
        console.log('   5. Paste into the SQL Editor');
        console.log('   6. Review carefully before executing');
        console.log('   7. Run the SQL to restore\n');
        console.log('   ⚠️  WARNING: This will overwrite existing data!');
        console.log('   💡 TIP: Test restore on a staging database first\n');

    } catch (error) {
        console.error('\n❌ Restore failed:', error);
        process.exit(1);
    }
}

main();
