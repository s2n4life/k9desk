
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkBusinessOwner() {
    const slug = 'davidsgrooming';
    console.log(`Checking owner for business: ${slug}...`);

    const { data: business, error } = await supabase
        .from('businesses')
        .select('id, name, owner_id')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('Error finding business:', error);
        return;
    }

    console.log('--- FOUND BUSINESS ---');
    console.log(`ID: ${business.id}`);
    console.log(`Name: ${business.name}`);
    console.log(`Current Owner ID: ${business.owner_id}`);

    // User's actual ID from the debug info
    const currentUserId = '2e64c118-acfd-4f65-8255-101635869a7f';

    if (business.owner_id !== currentUserId) {
        console.log(`\nMISMATCH DETECTED!`);
        console.log(`Business is owned by: ${business.owner_id}`);
        console.log(`You are logged in as: ${currentUserId}`);
        console.log(`\nTo fix this, we need to update the owner_id to ${currentUserId}`);
    } else {
        console.log(`\nOwner ID matches! This is weird.`);
    }
}

checkBusinessOwner();
