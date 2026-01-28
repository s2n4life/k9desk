import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSync() {
    console.log('--- Inspecting Conversion Result ---');

    // 1. Check for Liz Schardt customer
    const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', '%Liz%')
        .single();

    if (customer) {
        console.log('✅ Customer Found:', JSON.stringify(customer, null, 2));

        // 2. Check for Pets
        const { data: pets } = await supabase
            .from('pets')
            .select('*')
            .eq('customer_id', customer.id);
        console.log(`✅ Pets Found (${pets?.length || 0}):`, JSON.stringify(pets, null, 2));

        // 3. Check for Jobs
        const { data: jobs } = await supabase
            .from('jobs')
            .select('*')
            .eq('customer_id', customer.id);
        console.log(`✅ Jobs Found (${jobs?.length || 0}):`, JSON.stringify(jobs, null, 2));
    } else {
        console.log('❌ Customer "Liz" not found in Supabase');
    }

    // 4. Check for Leads
    const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .ilike('owner_name', '%Liz%')
        .single();
    if (leads) {
        console.log('✅ Lead State:', leads.status);
    }

    // 5. Check System Logs for Errors
    console.log('\n--- Recent System Logs (Errors) ---');
    const { data: logs } = await supabase
        .from('system_logs')
        .select('*')
        .eq('level', 'error')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log(JSON.stringify(logs, null, 2));
}

inspectSync();
