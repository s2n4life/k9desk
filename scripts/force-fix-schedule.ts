
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

async function fixSchedule() {
    console.log('Force-fixing schedule for David Grroming...');

    // 1. Get the business (assuming owner is the user we know, or just find by slug/name)
    const { data: businesses, error: findError } = await supabase
        .from('businesses')
        .select('*')
        .ilike('name', '%David%'); // Fuzzy match to be safe

    if (findError || !businesses || businesses.length === 0) {
        console.error('Could not find business:', findError);
        return;
    }

    const business = businesses[0];
    console.log(`Found business: ${business.name} (${business.id})`);
    console.log(`Current Work Days:`, business.schedule_work_days);

    // 2. Update to Mon(1), Wed(3), Sat(6)
    const newDays = [1, 3, 6];

    const { error: updateError } = await supabase
        .from('businesses')
        .update({ schedule_work_days: newDays })
        .eq('id', business.id);

    if (updateError) {
        console.error('Update Failed:', updateError);
    } else {
        console.log('SUCCESS: Schedule updated to Mon, Wed, Sat [1, 3, 6].');
    }
}

fixSchedule();
