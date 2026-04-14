/**
 * Disable signups and purge spam auth users who have no profiles.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const YOUR_USER_ID = ''; // Will be auto-detected

async function lockdown() {
    console.log('=== K9DESK LOCKDOWN ===\n');

    // 1. Disable signups
    const { error: configError } = await supabase
        .from('system_configs')
        .upsert({ key: 'signups_enabled', value: false }, { onConflict: 'key' });

    if (configError) {
        console.error('Failed to disable signups:', configError);
    } else {
        console.log('✅ Signups DISABLED');
    }

    // 2. Get all auth users
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const allUsers = authData?.users || [];

    // 3. Get all profiles (users who actually have app access)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id');
    const profileIds = new Set(profiles?.map(p => p.id) || []);

    // 4. Identify users to delete (no profile = no real access = spam)
    const spamUsers = allUsers.filter(u => !profileIds.has(u.id));
    const realUsers = allUsers.filter(u => profileIds.has(u.id));

    console.log(`\nReal users (have profiles, KEEPING): ${realUsers.length}`);
    for (const u of realUsers) {
        console.log(`  ✅ ${u.email} (${u.id.substring(0, 8)}...)`);
    }

    console.log(`\nSpam users (no profiles, DELETING): ${spamUsers.length}`);
    
    let deleted = 0;
    let failed = 0;
    for (const user of spamUsers) {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
            console.error(`  ❌ Failed to delete ${user.email}: ${error.message}`);
            failed++;
        } else {
            deleted++;
        }
    }

    console.log(`\n=== RESULTS ===`);
    console.log(`Deleted: ${deleted} spam auth users`);
    console.log(`Failed: ${failed}`);
    console.log(`Remaining: ${realUsers.length} real users`);
    console.log(`Signups: DISABLED`);
    console.log('\n✅ Lockdown complete.');
}

lockdown().catch(console.error);
