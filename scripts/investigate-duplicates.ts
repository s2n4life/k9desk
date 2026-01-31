import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateDuplicates() {
    console.log('=== INVESTIGATION: Davids Grooming Duplicates ===\n');

    // Query 1: Business Details
    console.log('1. BUSINESS DETAILS:');
    const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, owner_id, subscription_status, stripe_subscription_id, created_at, trial_end_date')
        .eq('name', 'Davids Grooming')
        .order('created_at');

    if (bizError) {
        console.error('Error:', bizError);
    } else {
        console.table(businesses);
    }

    // Query 2: Job Counts
    console.log('\n2. JOB COUNTS PER BUSINESS:');
    for (const biz of businesses || []) {
        const { data: jobs } = await supabase
            .from('jobs')
            .select('id, state, created_at')
            .eq('business_id', biz.id);

        const completedJobs = jobs?.filter(j => j.state === 'Completed').length || 0;
        console.log(`Business ${biz.id.substring(0, 8)}... (created: ${biz.created_at})`);
        console.log(`  Total jobs: ${jobs?.length || 0}`);
        console.log(`  Completed jobs: ${completedJobs}`);
        console.log(`  Owner ID: ${biz.owner_id || 'NULL'}`);
    }

    // Query 3: Customer Counts
    console.log('\n3. CUSTOMER COUNTS PER BUSINESS:');
    for (const biz of businesses || []) {
        const { data: customers } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', biz.id);

        console.log(`Business ${biz.id.substring(0, 8)}...: ${customers?.length || 0} customers`);
    }

    // Query 4: Pet Counts
    console.log('\n4. PET COUNTS PER BUSINESS:');
    for (const biz of businesses || []) {
        const { data: customers } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', biz.id);

        let totalPets = 0;
        for (const customer of customers || []) {
            const { data: pets } = await supabase
                .from('pets')
                .select('id')
                .eq('customer_id', customer.id);
            totalPets += pets?.length || 0;
        }

        console.log(`Business ${biz.id.substring(0, 8)}...: ${totalPets} pets`);
    }

    // Query 5: Owner Profile
    console.log('\n5. OWNER PROFILE INFO:');
    const ownerIds = businesses?.map(b => b.owner_id).filter(Boolean) || [];
    if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, role, phone, created_at')
            .in('id', ownerIds);

        console.table(profiles);
    } else {
        console.log('No owner profiles found (all NULL owner_ids)');
    }

    console.log('\n=== RECOMMENDATION ===');
    console.log('Based on the data above:');
    console.log('- Keep the business with owner_id AND most data (jobs/customers/pets)');
    console.log('- Delete businesses with NULL owner_id and no data');
}

investigateDuplicates().catch(console.error);
