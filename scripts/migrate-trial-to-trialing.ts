#!/usr/bin/env tsx

/**
 * Migration Script: Update 'trial' to 'trialing'
 * 
 * This script updates all businesses with subscription_status = 'trial'
 * to subscription_status = 'trialing' to standardize on Stripe's convention.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateTrialToTrialing() {
    console.log('🔍 Searching for businesses with subscription_status = "trial"...\n');

    // Find all businesses with 'trial' status
    const { data: trialBusinesses, error: fetchError } = await supabase
        .from('businesses')
        .select('id, name, subscription_status, trial_end_date')
        .eq('subscription_status', 'trial');

    if (fetchError) {
        console.error('❌ Error fetching businesses:', fetchError);
        process.exit(1);
    }

    if (!trialBusinesses || trialBusinesses.length === 0) {
        console.log('✅ No businesses found with subscription_status = "trial"');
        console.log('   Migration not needed - all records are already using "trialing"');
        return;
    }

    console.log(`📊 Found ${trialBusinesses.length} business(es) with "trial" status:\n`);
    trialBusinesses.forEach((business, index) => {
        console.log(`   ${index + 1}. ${business.name} (ID: ${business.id})`);
        console.log(`      Trial End: ${business.trial_end_date || 'Not set'}\n`);
    });

    // Update all 'trial' to 'trialing'
    console.log('🔄 Updating subscription_status from "trial" to "trialing"...\n');

    const { data: updatedBusinesses, error: updateError } = await supabase
        .from('businesses')
        .update({ subscription_status: 'trialing' })
        .eq('subscription_status', 'trial')
        .select('id, name');

    if (updateError) {
        console.error('❌ Error updating businesses:', updateError);
        process.exit(1);
    }

    console.log(`✅ Successfully updated ${updatedBusinesses?.length || 0} business(es):\n`);
    updatedBusinesses?.forEach((business, index) => {
        console.log(`   ${index + 1}. ${business.name} (ID: ${business.id})`);
    });

    console.log('\n✨ Migration completed successfully!');
    console.log('   All businesses now use "trialing" instead of "trial"');
}

// Run the migration
migrateTrialToTrialing()
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
