'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    Ticket,
    MessageSquare,
    Search,
    Filter,
    Clock,
    User,
    AlertCircle,
    CheckCircle2,
    MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';

type SupportTicket = {
    id: string;
    subject: string;
    description: string;
    status: 'new' | 'active' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    created_at: string;
    business_id: string;
    user_id: string;
    business_name?: string;
};

export default function TicketsPage() {
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [filter, setFilter] = useState<'all' | 'new' | 'active' | 'resolved' | 'closed'>('all');

    useEffect(() => {
        const loadTickets = async () => {
            // In a real app, we'd join with businesses table
            // For Phase 2, let's fetch real data if it exists, otherwise mock
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .order('created_at', { ascending: false });

            if (data && data.length > 0) {
                setTickets(data);
            } else {
                // Mocking data for the PR/Demo
                setTickets([
                    {
                        id: '1',
                        subject: 'Billing Issue - Charged twice',
                        description: 'Help, I was charged twice for the monthly plan.',
                        status: 'new',
                        priority: 'high',
                        category: 'billing',
                        created_at: new Date(Date.now() - 3600000).toISOString(),
                        business_id: 'b1',
                        user_id: 'u1',
                        business_name: "Scrub A Dub"
                    },
                    {
                        id: '2',
                        subject: 'Pet image not uploading',
                        description: 'When I try to upload a photo of Bella, it says error 500.',
                        status: 'active',
                        priority: 'medium',
                        category: 'bug',
                        created_at: new Date(Date.now() - 86400000).toISOString(),
                        business_id: 'b2',
                        user_id: 'u2',
                        business_name: "John's Grooming"
                    }
                ]);
            }
            setLoading(false);
        };

        loadTickets();
    }, []);

    const filteredTickets = filter === 'all'
        ? tickets
        : tickets.filter(t => t.status === filter);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return '#ef4444';
            case 'active': return '#6c5ce7';
            case 'resolved': return '#10b981';
            case 'closed': return '#94a3b8';
            default: return '#94a3b8';
        }
    };

    if (loading) return <div style={{ color: '#94a3b8' }}>Loading tickets...</div>;

    return (
        <div>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6c5ce7', marginBottom: '8px' }}>
                        <Ticket size={24} />
                        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0, color: 'white' }}>Support Portal</h1>
                    </div>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Manage user inquiries and issues.</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            style={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                color: 'white',
                                padding: '8px 12px 8px 36px',
                                borderRadius: '8px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>
            </header>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid #1e293b' }}>
                {['all', 'new', 'active', 'resolved', 'closed'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        style={{
                            padding: '12px 8px',
                            color: filter === f ? '#6c5ce7' : '#94a3b8',
                            background: 'none',
                            border: 'none',
                            borderBottom: filter === f ? '2px solid #6c5ce7' : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: filter === f ? 600 : 400,
                            textTransform: 'capitalize'
                        }}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '16px 24px' }}>Ticket / User</th>
                            <th style={{ padding: '16px' }}>Status</th>
                            <th style={{ padding: '16px' }}>Priority</th>
                            <th style={{ padding: '16px' }}>Created</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTickets.map(ticket => (
                            <tr key={ticket.id} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }}>
                                <td style={{ padding: '16px 24px' }}>
                                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{ticket.subject}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{ticket.business_name || 'Anonymous User'}</div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(ticket.status) }} />
                                        <span style={{ fontSize: '0.875rem', textTransform: 'capitalize', color: 'white' }}>{ticket.status}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: ticket.priority === 'urgent' || ticket.priority === 'high' ? '#ef444420' : '#334155',
                                        color: ticket.priority === 'urgent' || ticket.priority === 'high' ? '#ef4444' : '#94a3b8',
                                        textTransform: 'uppercase'
                                    }}>
                                        {ticket.priority}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', fontSize: '0.875rem', color: '#94a3b8' }}>
                                    {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                                </td>
                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                        <MoreVertical size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTickets.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                        No tickets found in this category.
                    </div>
                )}
            </div>
        </div>
    );
}
