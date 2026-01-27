import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrphanedProfiles() {
    console.log('=== Checking for profiles without a business_id ===');
    
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, business_id, role')
        .is('business_id', null);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${profiles?.length || 0} profiles with null business_id.`);
    
    if (profiles && profiles.length > 0) {
        for (const p of profiles) {
            // Check if they own any business
            const { data: biz } = await supabase
                .from('businesses')
                .select('id, name')
                .eq('owner_id', p.id);
            
            if (biz && biz.length > 0) {
                console.log(`- ALERT: Profile ${p.email || p.id} is an owner but has null business_id!`);
                console.log(`  Owns: ${biz.map(b => b.name).join(', ')}`);
            } else {
                console.log(`- Profile ${p.email || p.id} (${p.role}) has no business link.`);
            }
        }
    }
}

checkOrphanedProfiles();
