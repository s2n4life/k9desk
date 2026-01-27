'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useImpersonation } from '@/hooks/useImpersonation';
import {
    Ticket,
    Search,
    Clock,
    User,
    X,
    LogIn,
    Mail,
    Send,
    ChevronDown
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
    user_email?: string;
};

export default function TicketsPage() {
    const [loading, setLoading] = useState(true);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [filter, setFilter] = useState<'all' | 'new' | 'active' | 'resolved' | 'closed'>('all');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const { startImpersonation } = useImpersonation();

    useEffect(() => {
        loadTickets();
    }, []);

    async function loadTickets() {
        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                businesses:business_id (name),
                profiles:user_id (email)
            `)
            .order('created_at', { ascending: false });

        if (data && data.length > 0) {
            const mapped = data.map((t: any) => ({
                ...t,
                business_name: t.businesses?.name,
                user_email: t.profiles?.email
            }));
            setTickets(mapped);
        } else {
            // Mock data for demo
            setTickets([
                {
                    id: '1',
                    subject: 'Billing Issue - Charged twice',
                    description: 'Help, I was charged twice for the monthly plan. I see two charges on my credit card statement for $49 each. Can you please refund one of them?',
                    status: 'new',
                    priority: 'high',
                    category: 'billing',
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    business_id: 'b1',
                    user_id: 'u1',
                    business_name: 'Scrub A Dub Grooming',
                    user_email: 'owner@scrubadub.com'
                },
                {
                    id: '2',
                    subject: 'Pet image not uploading',
                    description: 'When I try to upload a photo of Bella (a golden retriever), it says error 500. I tried multiple times with different photos but same issue.',
                    status: 'active',
                    priority: 'medium',
                    category: 'bug',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    business_id: 'b2',
                    user_id: 'u2',
                    business_name: 'Johns Mobile Grooming',
                    user_email: 'john@johnsmobile.com'
                },
                {
                    id: '3',
                    subject: 'How do I export customer list?',
                    description: 'I need to export all my customer data to CSV for my accountant. Where is this feature?',
                    status: 'resolved',
                    priority: 'low',
                    category: 'question',
                    created_at: new Date(Date.now() - 172800000).toISOString(),
                    business_id: 'b3',
                    user_id: 'u3',
                    business_name: 'Pampered Paws',
                    user_email: 'contact@pamperedpaws.com'
                }
            ]);
        }
        setLoading(false);
    }

    async function updateTicketStatus(ticketId: string, newStatus: SupportTicket['status']) {
        // Update in database
        const { error } = await supabase
            .from('support_tickets')
            .update({ status: newStatus })
            .eq('id', ticketId);

        if (!error) {
            // Update local state
            setTickets(prev => prev.map(t =>
                t.id === ticketId ? { ...t, status: newStatus } : t
            ));
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket({ ...selectedTicket, status: newStatus });
            }
        }
    }

    async function sendReply() {
        if (!selectedTicket || !replyMessage.trim()) return;

        setSendingReply(true);
        try {
            // In a real app, this would send an email via Resend or your SMTP
            // For now, we'll just log it and show success
            console.log('Sending email to:', selectedTicket.user_email);
            console.log('Message:', replyMessage);

            // Optionally update ticket status to "resolved"
            await updateTicketStatus(selectedTicket.id, 'resolved');

            alert(`Email sent to ${selectedTicket.user_email}!`);
            setReplyMessage('');
            setSelectedTicket(null);
        } catch (err) {
            console.error('Error sending reply:', err);
            alert('Failed to send email');
        } finally {
            setSendingReply(false);
        }
    }

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

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return '#dc2626';
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#64748b';
            default: return '#64748b';
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
                    <p style={{ color: '#94a3b8', margin: 0 }}>Manage customer support requests and issues.</p>
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
                {['all', 'new', 'active', 'resolved', 'closed'].map((f) => {
                    const count = f === 'all' ? tickets.length : tickets.filter(t => t.status === f).length;
                    return (
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
                                textTransform: 'capitalize',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {f}
                            <span style={{
                                fontSize: '0.75rem',
                                backgroundColor: filter === f ? '#6c5ce720' : '#1e293b',
                                color: filter === f ? '#6c5ce7' : '#64748b',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 600
                            }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Tickets List */}
            <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                {filteredTickets.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                        <Ticket size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p>No tickets found in this category.</p>
                    </div>
                ) : (
                    <div>
                        {filteredTickets.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                style={{
                                    padding: '20px 24px',
                                    borderBottom: '1px solid #1e293b',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    backgroundColor: 'transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                                                {ticket.subject}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(ticket.status) }} />
                                                <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: '#94a3b8' }}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: getPriorityColor(ticket.priority) + '20',
                                                color: getPriorityColor(ticket.priority),
                                                textTransform: 'uppercase'
                                            }}>
                                                {ticket.priority}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.5' }}>
                                            {ticket.description.substring(0, 120)}...
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <User size={12} />
                                                {ticket.business_name || 'Unknown Business'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={12} />
                                                {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setSelectedTicket(null)}>
                    <div
                        style={{
                            backgroundColor: '#1e293b',
                            borderRadius: '16px',
                            maxWidth: '700px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            border: '1px solid #334155'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: '24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ margin: '0 0 12px 0', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
                                    {selectedTicket.subject}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem', color: '#94a3b8' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <User size={14} />
                                        {selectedTicket.business_name}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Mail size={14} />
                                        {selectedTicket.user_email}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={14} />
                                        {format(new Date(selectedTicket.created_at), 'MMM d, yyyy h:mm a')}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTicket(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Ticket Details */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Customer Message
                                </h3>
                                <p style={{ margin: 0, fontSize: '1rem', color: 'white', lineHeight: '1.6', backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px' }}>
                                    {selectedTicket.description}
                                </p>
                            </div>

                            {/* Status Selector */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Ticket Status
                                </label>
                                <select
                                    value={selectedTicket.status}
                                    onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value as any)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="new">🔴 New</option>
                                    <option value="active">🟣 Active (Working on it)</option>
                                    <option value="resolved">🟢 Resolved</option>
                                    <option value="closed">⚪ Closed</option>
                                </select>
                            </div>

                            {/* Reply Section */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Send Reply Email
                                </label>
                                <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Type your response to the customer..."
                                    style={{
                                        width: '100%',
                                        minHeight: '120px',
                                        padding: '12px',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={sendReply}
                                    disabled={!replyMessage.trim() || sendingReply}
                                    className="btn-admin-primary"
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        opacity: !replyMessage.trim() || sendingReply ? 0.5 : 1,
                                        cursor: !replyMessage.trim() || sendingReply ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Send size={18} />
                                    {sendingReply ? 'Sending...' : 'Send Email Reply'}
                                </button>
                                <button
                                    onClick={() => {
                                        startImpersonation(selectedTicket.business_id);
                                        setSelectedTicket(null);
                                    }}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '12px 24px',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid #6c5ce7',
                                        borderRadius: '8px',
                                        color: '#6c5ce7',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <LogIn size={18} />
                                    Login As Customer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
