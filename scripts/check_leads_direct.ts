
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLeads() {
    console.log('Checking leads table...');
    const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        return;
    }

    console.log(`Found ${leads?.length || 0} recent leads.`);
    leads?.forEach(l => {
        console.log(`- Lead: ${l.owner_name}, BusinessID: ${l.business_id}, Status: ${l.status}, CreatedAt: ${l.created_at}`);
    });

    console.log('\nChecking Freds Grooming...');
    const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', 'fredsgrooming')
        .single();

    if (bizError) {
        console.error('Error fetching business:', bizError);
    } else {
        console.log(`Freds Grooming ID: ${business.id}, Name: ${business.name}, OwnerID: ${business.owner_id}`);
    }
}

checkLeads();
