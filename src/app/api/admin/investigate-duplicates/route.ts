import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    const results: any = {
        businesses: [],
        jobCounts: [],
        customerCounts: [],
        petCounts: [],
        profiles: []
    };

    // Query 1: Business Details
    const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('id, name, owner_id, subscription_status, stripe_subscription_id, created_at, trial_end_date')
        .eq('name', 'Davids Grooming')
        .order('created_at');

    if (bizError) {
        return NextResponse.json({ error: bizError.message }, { status: 500 });
    }

    results.businesses = businesses;

    // Query 2-4: Job, Customer, and Pet Counts
    for (const biz of businesses || []) {
        // Jobs
        const { data: jobs } = await supabase
            .from('jobs')
            .select('id, state, created_at')
            .eq('business_id', biz.id);

        const completedJobs = jobs?.filter(j => j.state === 'Completed').length || 0;

        // Customers
        const { data: customers } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', biz.id);

        // Pets
        let totalPets = 0;
        for (const customer of customers || []) {
            const { data: pets } = await supabase
                .from('pets')
                .select('id')
                .eq('customer_id', customer.id);
            totalPets += pets?.length || 0;
        }

        results.jobCounts.push({
            business_id: biz.id,
            owner_id: biz.owner_id,
            created_at: biz.created_at,
            total_jobs: jobs?.length || 0,
            completed_jobs: completedJobs
        });

        results.customerCounts.push({
            business_id: biz.id,
            customer_count: customers?.length || 0
        });

        results.petCounts.push({
            business_id: biz.id,
            pet_count: totalPets
        });
    }

    // Query 5: Owner Profiles
    const ownerIds = businesses?.map(b => b.owner_id).filter(Boolean) || [];
    if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, role, phone, created_at')
            .in('id', ownerIds);

        results.profiles = profiles;
    }

    return NextResponse.json(results, { status: 200 });
}
