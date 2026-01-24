'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateBusinessSlug(businessId: string, slug: string, businessName: string) {
    // 1. Validate format
    const cleanSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
        return { success: false, error: 'Slug must contain only letters, numbers, and dashes.' };
    }

    if (cleanSlug.length < 3) {
        return { success: false, error: 'Slug must be at least 3 characters long.' };
    }

    const supabase = await createClient();

    // 2. Check availability
    const { data: existing } = await supabase
        .from('businesses')
        .select('id')
        .eq('slug', cleanSlug)
        .neq('id', businessId) // exclude self
        .single();

    if (existing) {
        return { success: false, error: 'This URL is already taken.' };
    }

    // 3. Upsert (Create if missing, Update if exists)
    // We only update slug/name here to avoid overwriting other fields if they exist
    // But since we are claiming the slug, it's safe to ensure the record exists.
    const { error } = await supabase
        .from('businesses')
        .upsert({
            id: businessId,
            slug: cleanSlug,
            name: businessName,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select();

    if (error) {
        console.error(error);
        return { success: false, error: 'Failed to save URL: ' + error.message };
    }

    revalidatePath('/settings');
    return { success: true, slug: cleanSlug };
}
