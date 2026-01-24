
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function debugLeads() {
    console.log('--- Debugging Leads Visibility ---');

    // 1. Fetch All Businesses
    const { data: businesses, error: busError } = await supabase
        .from('businesses')
        .select('id, name, owner_id, slug');

    if (busError) {
        console.error('Error fetching businesses:', busError);
        return;
    }
    console.log(`\nFound ${businesses.length} Businesses:`);
    businesses.forEach(b => console.log(` - ID: ${b.id}\n   Name: ${b.name}\n   Slug: ${b.slug}\n   Owner: ${b.owner_id}`));

    // 2. Fetch All Leads
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id, business_id, owner_name, created_at');

    if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        return;
    }

    console.log(`\nFound ${leads.length} Leads:`);
    leads.forEach(l => {
        const parentBusiness = businesses.find(b => b.id === l.business_id);
        const parentName = parentBusiness ? parentBusiness.name : 'Unknown/Orphaned';
        console.log(` - Lead: ${l.owner_name} (${l.created_at})`);
        console.log(`   Linked to Business ID: ${l.business_id} (${parentName})`);
    });

}

debugLeads();
