/**
 * Audit script: Check how many of the 134 auth users actually have
 * profiles, businesses, or any real data access.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function audit() {
    console.log('=== K9DESK USER AUDIT ===\n');

    // 1. Count auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
    }
    console.log(`Total Auth Users: ${authUsers.users.length}`);

    // 2. How many confirmed email?
    const confirmedUsers = authUsers.users.filter(u => u.email_confirmed_at);
    const unconfirmedUsers = authUsers.users.filter(u => !u.email_confirmed_at);
    console.log(`  ✅ Email Confirmed: ${confirmedUsers.length}`);
    console.log(`  ❌ Email NOT Confirmed: ${unconfirmedUsers.length}`);

    // 3. Check profiles table
    const { count: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    console.log(`\nProfiles in DB: ${profileCount}`);

    // 4. Check businesses table
    const { count: businessCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });
    console.log(`Businesses in DB: ${businessCount}`);

    // 5. Check businesses with onboarding completed
    const { count: onboardedCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('onboarding_completed', true);
    console.log(`Businesses with onboarding completed: ${onboardedCount}`);

    // 6. Check for any actual data (customers, jobs, etc.)
    const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });
    const { count: jobCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
    const { count: leadCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });
    console.log(`\nActual Data:`);
    console.log(`  Customers: ${customerCount}`);
    console.log(`  Jobs: ${jobCount}`);
    console.log(`  Leads: ${leadCount}`);

    // 7. Check signups_enabled config
    const { data: signupConfig } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'signups_enabled')
        .single();
    console.log(`\nSignups Enabled Config: ${signupConfig ? JSON.stringify(signupConfig.value) : 'NOT SET (defaults to true!)'}`);

    // 8. Show the confirmed users with their creation dates
    console.log(`\n--- CONFIRMED USERS (${confirmedUsers.length}) ---`);
    for (const u of confirmedUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())) {
        // Check if they have a profile/business
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id, role')
            .eq('id', u.id)
            .single();

        const hasProfile = !!profile;
        const hasBusiness = !!profile?.business_id;

        console.log(`  ${u.email} | Created: ${u.created_at?.split('T')[0]} | Profile: ${hasProfile ? '✅' : '❌'} | Business: ${hasBusiness ? profile.business_id?.substring(0, 8) + '...' : '❌'} | Role: ${profile?.role || 'none'}`);
    }

    // 9. Summary
    console.log('\n=== THREAT ASSESSMENT ===');
    console.log(`Unconfirmed (no email verify = NO access to dashboard): ${unconfirmedUsers.length}`);
    console.log(`Confirmed (could potentially access dashboard): ${confirmedUsers.length}`);
    console.log(`With profiles (have DB records): ${profileCount}`);
    console.log(`With completed onboarding (could use app): ${onboardedCount}`);
}

audit().catch(console.error);
