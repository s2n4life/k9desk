
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
            if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseKey = value;
        }
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Inspecting Lead and Business Data ---');

    const leadId = 'b8b30a99-73a1-49aa-bddc-7b67cd229df0';
    const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

    if (leadError) {
        console.error('❌ Lead lookup failed:', leadError.message);
    } else {
        console.log('✅ Lead Found:');
        console.log(JSON.stringify(lead, null, 2));

        const businessId = lead.business_id;
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();

        if (businessError) {
            console.error('❌ Business lookup failed:', businessError.message);
        } else {
            console.log('\n✅ Business Found for this Lead:');
            console.log(JSON.stringify(business, null, 2));
        }
    }

    // List all businesses to help identify the user's business
    console.log('\n--- All Businesses ---');
    const { data: businesses } = await supabase.from('businesses').select('id, name, slug');
    console.log(JSON.stringify(businesses, null, 2));
}

main();
