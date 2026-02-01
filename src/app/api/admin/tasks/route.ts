import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch all tasks
        const { data: tasks, error } = await supabase
            .from('admin_tasks')
            .select('*')
            .eq('completed', false);

        if (error) {
            console.error('[Admin Tasks API] Error fetching tasks:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Sort by due date first (soonest first, no date last), then by priority
        const priorityOrder = { hot: 0, warm: 1, cold: 2 };
        const sortedTasks = (tasks || []).sort((a: any, b: any) => {
            // Tasks with dates come before tasks without dates
            if (!a.due_date && !b.due_date) {
                // Both have no date, sort by priority
                return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
            }
            if (!a.due_date) return 1; // a goes to bottom
            if (!b.due_date) return -1; // b goes to bottom

            // Both have dates, sort by date (soonest first)
            const dateDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            if (dateDiff !== 0) return dateDiff;

            // Same date, sort by priority
            return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        });

        return NextResponse.json({ tasks: sortedTasks });
    } catch (error: any) {
        console.error('[Admin Tasks API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const body = await request.json();
        const { headline, notes, priority, due_date } = body;

        // Validation
        if (!headline || !priority) {
            return NextResponse.json({ error: 'Headline and priority are required' }, { status: 400 });
        }

        if (!['hot', 'warm', 'cold'].includes(priority)) {
            return NextResponse.json({ error: 'Invalid priority. Must be hot, warm, or cold' }, { status: 400 });
        }

        // Get first admin user for created_by
        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['super_admin', 'support_admin'])
            .limit(1)
            .single();

        const { data: task, error } = await supabase
            .from('admin_tasks')
            .insert({
                headline,
                notes: notes || null,
                priority,
                due_date: due_date || null,
                created_by: adminProfile?.id,
            })
            .select()
            .single();

        if (error) {
            console.error('[Admin Tasks API] Error creating task:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ task }, { status: 201 });
    } catch (error: any) {
        console.error('[Admin Tasks API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
