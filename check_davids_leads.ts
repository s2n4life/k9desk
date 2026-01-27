import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDavidsLeads() {
    console.log('=== Checking David\'s Grooming Leads ===\n');

    // 1. Find David's business ID
    const { data: businesses, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .ilike('name', '%david%');

    if (bizError) {
        console.error('Error fetching businesses:', bizError);
        return;
    }

    console.log('Businesses matching "david":', businesses);

    if (!businesses || businesses.length === 0) {
        console.log('No businesses found matching "david"');
        return;
    }

    const davidsBusiness = businesses[0];
    console.log('\nDavid\'s Business:', davidsBusiness);

    // 2. Check all leads for this business
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('business_id', davidsBusiness.id);

    if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        return;
    }

    console.log(`\nLeads for ${davidsBusiness.name} (${davidsBusiness.id}):`);
    console.log(`Total count: ${leads?.length || 0}`);

    if (leads && leads.length > 0) {
        leads.forEach((lead, idx) => {
            console.log(`\n--- Lead ${idx + 1} ---`);
            console.log('ID:', lead.id);
            console.log('Owner:', lead.owner_name);
            console.log('Phone:', lead.owner_phone);
            console.log('Status:', lead.status);
            console.log('Created:', lead.created_at);
        });
    } else {
        console.log('No leads found!');

        // Check if there are ANY leads in the table
        const { data: allLeads, error: allError } = await supabase
            .from('leads')
            .select('id, business_id, owner_name, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        console.log('\n=== All Recent Leads (any business) ===');
        console.log('Total recent leads:', allLeads?.length || 0);
        if (allLeads) {
            allLeads.forEach(l => {
                console.log(`- ${l.owner_name} (business: ${l.business_id.slice(0, 8)}...) at ${l.created_at}`);
            });
        }
    }

    // 3. Check David's profile
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('business_id', davidsBusiness.id);

    console.log('\n=== Profiles for this business ===');
    if (profiles) {
        profiles.forEach(p => {
            console.log(`- User ID: ${p.id}`);
            console.log(`  Email: ${p.email || 'N/A'}`);
            console.log(`  Role: ${p.role || 'N/A'}`);
        });
    }
}

checkDavidsLeads().then(() => {
    console.log('\n=== Check Complete ===');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
