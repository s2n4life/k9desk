#!/usr/bin/env ts-node
/**
 * List Database Backups
 * 
 * Usage: npx ts-node scripts/list-backups.ts
 * 
 * Lists all available backups from R2 storage with details.
 */

import * as dotenv from 'dotenv';
import { listBackups } from '../src/lib/backup-utils';

// Load environment variables
dotenv.config({ path: './.env.local' });

async function main() {
    console.log('📋 Database Backup Inventory\n');

    try {
        const backups = await listBackups();

        if (backups.length === 0) {
            console.log('❌ No backups found in R2 storage');
            console.log('\n💡 Run a manual backup: npx ts-node scripts/manual-backup.ts');
            process.exit(0);
        }

        // Group by type
        const daily = backups.filter(b => b.type === 'daily');
        const weekly = backups.filter(b => b.type === 'weekly');
        const manual = backups.filter(b => b.type === 'manual');

        console.log(`Total Backups: ${backups.length}\n`);

        if (manual.length > 0) {
            console.log('🔧 Manual Backups (' + manual.length + '):');
            manual.forEach(backup => {
                const sizeKB = (backup.size / 1024).toFixed(2);
                const date = backup.lastModified.toISOString();
                console.log(`   • ${backup.filename}`);
                console.log(`     ${sizeKB} KB | ${date}`);
            });
            console.log('');
        }

        if (weekly.length > 0) {
            console.log('📅 Weekly Backups (' + weekly.length + '):');
            weekly.forEach(backup => {
                const sizeKB = (backup.size / 1024).toFixed(2);
                const date = backup.lastModified.toISOString();
                console.log(`   • ${backup.filename}`);
                console.log(`     ${sizeKB} KB | ${date}`);
            });
            console.log('');
        }

        if (daily.length > 0) {
            console.log('📆 Daily Backups (' + daily.length + '):');
            daily.forEach(backup => {
                const sizeKB = (backup.size / 1024).toFixed(2);
                const date = backup.lastModified.toISOString();
                console.log(`   • ${backup.filename}`);
                console.log(`     ${sizeKB} KB | ${date}`);
            });
            console.log('');
        }

        // Calculate total size
        const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
        const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
        console.log(`💾 Total Storage Used: ${totalSizeMB} MB`);

        // Show most recent
        const mostRecent = backups[0];
        console.log(`\n🕐 Most Recent Backup:`);
        console.log(`   ${mostRecent.filename}`);
        console.log(`   ${mostRecent.lastModified.toISOString()}`);
        console.log(`   ${(mostRecent.size / 1024).toFixed(2)} KB`);

        console.log('\n💡 To restore a backup: npx ts-node scripts/restore-from-backup.ts [filename]');

    } catch (error) {
        console.error('\n❌ Failed to list backups:', error);
        process.exit(1);
    }
}

main();
