'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Dog, Store, Edit2, X, Check, MessageSquare } from 'lucide-react';
import { LeadCard } from '@/components/Leads/LeadCard';
import { updateBusinessSlug } from '@/actions/update-slug';

import { Header } from '@/components/Navigation/Header';

import { useDataLoader } from '@/hooks/useDataLoader';
import { Lead } from '@/lib/db/schema';

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState({ userId: '', businessId: '', fetchError: '' });

    // Booking Link State
    const [slug, setSlug] = useState('');
    const [businessId, setBusinessId] = useState('');
    const [businessName, setBusinessName] = useState(''); // Need for slug update
    const [bookingBaseUrl, setBookingBaseUrl] = useState('');
    const [editingSlug, setEditingSlug] = useState(false);
    const [slugInput, setSlugInput] = useState('');
    const [slugError, setSlugError] = useState('');
    const [msg, setMsg] = useState('');

    const { loadLeads, isImpersonating, impersonatedBusinessId, getActiveBusinessId } = useDataLoader();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBookingBaseUrl(`${window.location.origin}/book/`);
        }

        const fetchLeadsData = async () => {
            setLoading(true);
            try {
                const supabase = createClient();

                // 1. Load Leads using impersonation-aware hook
                const leadsData = await loadLeads();
                setLeads(leadsData);

                // 2. Get User's Business (for booking link) using consolidated context logic
                const activeId = await getActiveBusinessId();

                if (activeId) {
                    const { data: business } = await supabase
                        .from('businesses')
                        .select('id, slug, name')
                        .eq('id', activeId)
                        .single();

                    if (business) {
                        setBusinessId(business.id);
                        setBusinessName(business.name);
                        setSlug(business.slug || business.id);
                    }
                }
            } catch (err: any) {
                console.error('Error fetching leads:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeadsData();

        // Listen for real-time sync events
        const handleSync = () => {
            fetchLeadsData();
        };
        window.addEventListener('leads-synced', handleSync);

        return () => {
            window.removeEventListener('leads-synced', handleSync);
        };
    }, [isImpersonating, impersonatedBusinessId]);

    const [activeTab, setActiveTab] = useState<'active' | 'booked' | 'archived'>('active');

    // -- Booking Link Handlers --
    const handleSaveSlug = async () => {
        setSlugError('');
        if (!slugInput || !businessId) return;

        const result = await updateBusinessSlug(businessId, slugInput, businessName || 'My Business');

        if (result.success && result.slug) {
            setSlug(result.slug);
            setEditingSlug(false);
            setMsg('URL updated!');
            setTimeout(() => setMsg(''), 3000);
        } else {
            setSlugError(result.error || 'Failed to update URL');
        }
    };

    const handleTextLink = () => {
        const url = `${bookingBaseUrl}${slug}`;
        const name = businessName || 'our business';
        const body = `Hi! This is ${name}. You can view our services and book your appointment online here: ${url}`;
        window.location.href = `sms:?&body=${encodeURIComponent(body)}`;
    };

    // -- Handlers --

    const handleAccept = (leadId: string) => {
        // Find lead
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        // Navigate to Job Creation
        window.location.href = `/jobs/new?leadId=${lead.id}&name=${encodeURIComponent(lead.ownerName)}&phone=${encodeURIComponent(lead.ownerPhone)}`;
    };

    const handleArchive = async (leadId: string) => {
        const supabase = createClient();

        // Optimistic Update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'dead' } : l));

        const { error } = await supabase
            .from('leads')
            .update({ status: 'dead' })
            .eq('id', leadId);

        if (error) {
            console.error('Failed to archive lead', error);
            // Revert? Or just alert.
            alert('Failed to archive lead');
        }
    };

    const handleDelete = async (leadId: string) => {
        if (!confirm('Are you sure you want to permanently delete this lead?')) return;

        const supabase = createClient();

        // Optimistic Update
        setLeads(prev => prev.filter(l => l.id !== leadId));

        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId);

        if (error) {
            alert('Failed to delete lead');
        }
    };

    // -- Filtering --
    const filteredLeads = leads.filter(l => {
        if (activeTab === 'active') return l.status === 'new' || l.status === 'contacted' || !l.status; // Default to active if undefined
        if (activeTab === 'booked') return l.status === 'scheduled';
        if (activeTab === 'archived') return l.status === 'dead';
        return false;
    });

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="container py-6 pb-24 max-w-2xl mx-auto">
            <Header title="Leads" />
            <div className="px-2 mb-6">
                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setActiveTab('booked')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'booked' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Booked
                    </button>
                    <button
                        onClick={() => setActiveTab('archived')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'archived' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Archived
                    </button>
                </div>
            </div>

            {/* Booking Link Section */}
            {slug && (
                <>
                    <section className="card mb-6 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', border: 'none' }}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-white drop-shadow-sm">
                                <Store size={22} className="stroke-[2.5px]" />
                                Your K9desk Booking Page
                            </h3>
                            <p className="text-white text-base mb-4 font-semibold drop-shadow-sm">
                                Share this link with your customers to let them book requests directly.
                            </p>

                            {editingSlug ? (
                                <div className="bg-white/10 p-4 rounded-lg border border-white/30 shadow-inner">
                                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-white">
                                        Choose your link name
                                    </label>

                                    <div className="flex items-center gap-0 mb-3 bg-white rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-white/50 p-1">
                                        <span className="text-slate-500 font-mono text-sm pl-3 pr-1 py-2 whitespace-nowrap select-none border-r border-slate-100 bg-slate-50">
                                            /book/
                                        </span>
                                        <input
                                            value={slugInput}
                                            onChange={(e) => setSlugInput(e.target.value)}
                                            className="flex-1 bg-transparent text-slate-900 px-3 py-2 font-bold text-sm outline-none placeholder:text-slate-400"
                                            placeholder="your-business-name"
                                            autoFocus
                                            autoComplete="off"
                                        />
                                    </div>

                                    {slugError && (
                                        <div className="text-red-100 text-sm mb-3 font-medium bg-red-500/20 border border-red-500/30 px-3 py-2 rounded flex items-center gap-2">
                                            <X size={14} />
                                            {slugError}
                                        </div>
                                    )}

                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => setEditingSlug(false)}
                                            className="px-4 py-2 text-sm font-bold hover:bg-white/10 rounded transition-colors text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveSlug}
                                            className="px-4 py-2 bg-white text-indigo-700 rounded text-sm font-bold shadow-sm hover:bg-indigo-50 flex items-center gap-2 transition-all"
                                        >
                                            <Check size={16} /> Save URL
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {/* URL Display */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-black/20 p-3 rounded-lg overflow-hidden whitespace-nowrap text-ellipsis font-mono text-sm border border-white/20 backdrop-blur-sm text-white font-bold tracking-wide">
                                            <span className="opacity-60">.../book/</span>
                                            <span>{slug}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSlugInput(slug === businessId ? '' : slug);
                                                setEditingSlug(true);
                                            }}
                                            className="p-3 hover:bg-white/20 rounded-lg text-white transition-colors"
                                            title="Edit URL"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                    </div>

                                    {/* Buttons Row */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleTextLink}
                                            className="flex-1 bg-white text-indigo-700 font-bold border-none px-4 py-3 rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95 duration-200"
                                        >
                                            <MessageSquare size={18} />
                                            Text Link
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(bookingBaseUrl + slug);
                                                setMsg('Link Copied!');
                                                setTimeout(() => setMsg(''), 2000);
                                            }}
                                            className="flex-1 bg-white/10 text-white font-bold border border-white/30 px-4 py-3 rounded-lg cursor-pointer hover:bg-white/20 transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-95 duration-200"
                                        >
                                            Copy Link
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                    <p className="text-slate-900 text-base font-medium mb-6 px-1">
                        Customer Appointment requests will appear below.
                    </p>
                </>
            )}

            {msg && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--surface-overlay)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    boxShadow: 'var(--shadow-lg)',
                    color: 'var(--success)',
                    zIndex: 100
                }}>
                    {msg}
                </div>
            )}

            {filteredLeads.length === 0 ? (
                <div className="text-center py-20 px-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <Dog size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No {activeTab} leads</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">
                        {activeTab === 'active' ? "When customers book online, they'll show up here." :
                            activeTab === 'booked' ? "You haven't converted any leads to jobs yet." :
                                "No archived leads found."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLeads.map(lead => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onAccept={handleAccept}
                            onArchive={handleArchive}
                            onDelete={handleDelete}
                            isArchived={activeTab === 'archived'}
                            businessName={businessName}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
