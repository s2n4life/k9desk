import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { id } = await params;
        const body = await request.json();
        const { headline, notes, priority, due_date, completed } = body;

        // Build update object
        const updates: any = {
            updated_at: new Date().toISOString(),
        };

        if (headline !== undefined) updates.headline = headline;
        if (notes !== undefined) updates.notes = notes;
        if (priority !== undefined) {
            if (!['hot', 'warm', 'cold'].includes(priority)) {
                return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
            }
            updates.priority = priority;
        }
        if (due_date !== undefined) updates.due_date = due_date;
        if (completed !== undefined) {
            updates.completed = completed;
            updates.completed_at = completed ? new Date().toISOString() : null;
        }

        const { data: task, error } = await supabase
            .from('admin_tasks')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[Admin Tasks API] Error updating task:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ task });
    } catch (error: any) {
        console.error('[Admin Tasks API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { id } = await params;
        const { error } = await supabase
            .from('admin_tasks')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('[Admin Tasks API] Error deleting task:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Admin Tasks API] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
