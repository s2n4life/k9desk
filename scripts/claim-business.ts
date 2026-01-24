
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function claimBusiness() {
    const slug = 'davidsgrooming';
    // The user's ID from the debug output
    const newOwnerId = '2e64c118-acfd-4f65-8255-101635869a7f';

    console.log(`Claiming business '${slug}' for Owner ${newOwnerId}...`);

    const { data, error } = await supabase
        .from('businesses')
        .update({ owner_id: newOwnerId })
        .eq('slug', slug)
        .select();

    if (error) {
        console.error('Error updating business:', error);
    } else {
        console.log('Success! Business claimed.');
        console.log(data);
    }
}

claimBusiness();
