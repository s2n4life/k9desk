
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkUserBusiness() {
    const ownerId = '2e64c118-acfd-4f65-8255-101635869a7f'; // User's ID from debug info
    console.log(`Checking businesses for Owner: ${ownerId}...`);

    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', ownerId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} businesses.`);
    data.forEach(b => console.log(` - [${b.id}] ${b.name} (Slug: ${b.slug})`));
}

checkUserBusiness();
