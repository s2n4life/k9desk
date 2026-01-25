import { createClient } from '@/utils/supabase/server';
import { getDB } from '@/lib/db';

export interface UserContext {
    businessName: string;
    subscription: string;
    recentJobs: any[];
    leadsCount: number;
    userEmail: string;
}

/**
 * Resolves the current user's business context for the AI Bot.
 * This allows the bot to answer account-specific questions.
 */
export async function resolveUserContext(): Promise<UserContext | null> {
    try {
        const supabase = await createClient();

        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // 2. Get Business & Subscription
        const { data: business } = await supabase
            .from('businesses')
            .select('*')
            .eq('owner_id', user.id)
            .single();

        if (!business) return null;

        // 3. Get Recent Activity
        const { data: jobs } = await supabase
            .from('jobs')
            .select('*')
            .eq('business_id', business.id)
            .order('scheduled_date', { ascending: false })
            .limit(5);

        // Fetching "Active" leads: status is 'new', 'contacted', or NULL
        const { count: leadsCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .or('status.eq.new,status.eq.contacted,status.is.null');

        return {
            businessName: business.name || 'Your Business',
            subscription: business.subscription_status || 'free',
            recentJobs: jobs || [],
            leadsCount: leadsCount || 0,
            userEmail: user.email || ''
        };
    } catch (error) {
        console.error('[ContextResolver] Error:', error);
        return null;
    }
}
