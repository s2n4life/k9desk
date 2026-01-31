'use client';

import { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, MessageCircle, Send, Cloud, RefreshCw, AlertCircle, CloudOff } from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import styles from './HelpDrawer.module.css';

interface FAQ {
    q: string;
    a: string;
    category: string;
}

const FAQS: FAQ[] = [
    // Getting Started
    {
        category: 'Getting Started',
        q: 'How do I add my first customer?',
        a: 'Go to the Today tab and tap "+ Add Job" at the top right. You can create a new customer and pet while creating your first job.'
    },
    {
        category: 'Getting Started',
        q: 'How do I set up my business information?',
        a: 'Go to Settings (gear icon) → Business Info section. Enter your business name and phone number, then tap "Save Business Info".'
    },
    {
        category: 'Getting Started',
        q: 'What is the 14-day free trial?',
        a: 'You get 14 days of full access to K9desk with no credit card required. You will NOT be auto-charged. After the trial, you can choose to upgrade or cancel.'
    },

    // Scheduling
    {
        category: 'Scheduling',
        q: 'How do I create a new appointment?',
        a: 'Tap "+ Add Job" on the Today tab. Select or create a customer, choose their pet(s), select services, set the date/time, and tap "Create Job".'
    },
    {
        category: 'Scheduling',
        q: 'How can I reschedule an appointment?',
        a: 'Open the job card and tap "Reschedule" in the secondary actions menu. Select a new date and time, then save.'
    },
    {
        category: 'Scheduling',
        q: 'How do I set my working hours?',
        a: 'Go to Settings → Service Area & Schedule. Toggle each day on/off and set your start and end times for open days.'
    },
    {
        category: 'Scheduling',
        q: 'Can I book multiple pets in one appointment?',
        a: 'Yes! When creating a job, you can select multiple pets for the same customer. Each pet can have different services.'
    },
    {
        category: 'Scheduling',
        q: 'What is "Time per Appointment" and "Average Drive Time"?',
        a: 'These are in Settings → Scheduling Defaults. Time per Appointment is how long each job takes (default 60 min). Average Drive Time is the buffer between jobs for travel (default 30 min).'
    },

    // Job Workflow
    {
        category: 'Job Workflow',
        q: 'How do I send a reminder to a customer?',
        a: 'On a Scheduled job card, tap "Send Reminder". This opens your SMS app with a pre-written reminder message.'
    },
    {
        category: 'Job Workflow',
        q: 'How do I start a job when I arrive?',
        a: 'On a job card in "Reminder Sent" state, tap "Start Job". This changes the state to "In Progress" (purple).'
    },
    {
        category: 'Job Workflow',
        q: 'How do I mark a job as complete?',
        a: 'When grooming is done, tap "Finish Job" on the job card. This changes the state to "Completed" (green).'
    },
    {
        category: 'Job Workflow',
        q: 'What if a customer doesn\'t show up?',
        a: 'Open the job card and tap "Mark No-Show" in the secondary actions menu. The job will be marked as a no-show and archived.'
    },
    {
        category: 'Job Workflow',
        q: 'Can I cancel a job after it\'s scheduled?',
        a: 'Yes, open the job card and tap "Cancel" in the secondary actions menu. The job will be marked as Cancelled and archived.'
    },

    // Payments
    {
        category: 'Payments',
        q: 'How do I record a payment?',
        a: 'When a job is Completed or Payment Requested, tap "Log Payment". Select the payment method (Cash, Venmo, etc.), confirm the amount, and save.'
    },
    {
        category: 'Payments',
        q: 'How do I request payment from a customer?',
        a: 'On a Completed job, tap "Ask for Pay". This opens your SMS app with a message containing your payment links. The job moves to "Payment Requested" state.'
    },
    {
        category: 'Payments',
        q: 'How do I set up my payment links?',
        a: 'Go to Settings → Payment Settings. Enter your Venmo handle, Zelle info, PayPal.me link, Cash App tag, and any custom payment URL.'
    },
    {
        category: 'Payments',
        q: 'What payment methods can I accept?',
        a: 'You can log payments as Cash, Check, Venmo, Zelle, Stripe (credit card), or Other.'
    },

    // Leads & Booking
    {
        category: 'Leads & Booking',
        q: 'Where do new booking requests go?',
        a: 'All requests from your public booking page appear in the "Leads" tab with a red notification badge.'
    },
    {
        category: 'Leads & Booking',
        q: 'How do I convert a lead to a job?',
        a: 'In the Leads tab, tap "Book" (green button) on the lead card. This opens the job creation form with customer, pet, and service details pre-filled.'
    },
    {
        category: 'Leads & Booking',
        q: 'How do I share my booking page?',
        a: 'Go to the Leads tab. You\'ll see a purple/blue banner with your booking page URL. Tap "Text Link" to send it via SMS, or "Copy Link" to copy the URL.'
    },
    {
        category: 'Leads & Booking',
        q: 'Can I archive leads I don\'t want to book?',
        a: 'Yes, tap "Archive" (gray button) on the lead card. It moves to the "Archived" tab.'
    },

    // Customers & Pets
    {
        category: 'Customers & Pets',
        q: 'How do I edit customer or pet information?',
        a: 'Go to Customers tab → Tap customer name → Tap "Edit" → Modify details → Tap "Save".'
    },
    {
        category: 'Customers & Pets',
        q: 'Can I add multiple pets for one customer?',
        a: 'Yes, when viewing a customer profile, you can add multiple pets. Each pet has its own details (name, breed, size, age, notes).'
    },
    {
        category: 'Customers & Pets',
        q: 'How do I see a customer\'s job history?',
        a: 'Go to Customers tab → Tap customer name. You\'ll see all past and upcoming jobs for that customer.'
    },
    {
        category: 'Customers & Pets',
        q: 'How do I view all past jobs?',
        a: 'Go to Customers tab → Tap "Past Jobs" toggle at the top. This shows all completed, paid, and closed jobs.'
    },

    // Services
    {
        category: 'Services',
        q: 'How do I add a new service?',
        a: 'Go to Settings → Services section → Tap "+ Add" → Enter service name and price → Tap "Save Service".'
    },
    {
        category: 'Services',
        q: 'How do I edit or delete a service?',
        a: 'Go to Settings → Services. Tap the pencil icon to edit, or the trash icon to delete.'
    },

    // Reviews
    {
        category: 'Reviews',
        q: 'How do I request a review from a customer?',
        a: 'On a Paid job card, tap "Ask Review". This opens your SMS app with a message containing your review link (Google, Yelp, etc.).'
    },
    {
        category: 'Reviews',
        q: 'How do I set my review link?',
        a: 'Go to Settings → Review Settings. Enter your Google or Yelp review URL, then tap "Save Review Settings".'
    },

    // Navigation & GPS
    {
        category: 'Navigation',
        q: 'How do I navigate to a customer\'s address?',
        a: 'On any job card, tap the "Navigate" link with the arrow icon. This opens Apple Maps or Google Maps with the customer\'s address.'
    },

    // Communication
    {
        category: 'Communication',
        q: 'How do I text a customer?',
        a: 'Option 1: Go to Customers → Tap customer name → Tap their phone number. Option 2: Use automated buttons like "Send Reminder", "Ask for Pay", or "Ask Review".'
    },

    // Subscription & Billing
    {
        category: 'Subscription',
        q: 'How do I manage my subscription?',
        a: 'Go to Settings → Subscription Status section → Tap "Manage Billing". This opens the Stripe portal where you can update payment methods and view invoices.'
    },
    {
        category: 'Subscription',
        q: 'How do I upgrade from trial to paid?',
        a: 'Go to Settings → Tap "Upgrade to Pro". This takes you to the pricing page where you can subscribe.'
    },
    {
        category: 'Subscription',
        q: 'Will I be auto-charged after my trial?',
        a: 'No! Your trial does NOT require a credit card, and you will NOT be auto-charged. You must manually upgrade to continue after the trial.'
    },
    {
        category: 'Subscription',
        q: 'How do I cancel my account?',
        a: 'During your trial, go to Settings → Tap "Cancel My Account" (red button). Follow the confirmation steps.'
    },

    // Help & Support
    {
        category: 'Help & Support',
        q: 'How do I get help if I\'m stuck?',
        a: 'Tap the "?" icon (top right) to open the Help Drawer. You can search FAQs, chat with the K9 Assistant AI, or email support.'
    },
    {
        category: 'Help & Support',
        q: 'How do I contact support?',
        a: 'Tap "?" → "Email Support". Enter your subject and message, and the team will respond within 24 hours.'
    },

    // Sync & Data
    {
        category: 'Sync & Data',
        q: 'What if my data isn\'t syncing?',
        a: 'Open the Help Drawer (?) and scroll to the bottom. Check the sync status. If it says "Sync Error", tap "Refresh Data" to retry.'
    },
    {
        category: 'Sync & Data',
        q: 'Can I work offline?',
        a: 'Yes! K9desk uses local-first architecture. All changes are saved locally and sync to the cloud when you\'re back online.'
    },
    {
        category: 'Sync & Data',
        q: 'How do I force a sync?',
        a: 'Open the Help Drawer (?) → Scroll to bottom → Tap "Refresh Data".'
    }
];

export function HelpDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [view, setView] = useState<'faq' | 'ticket' | 'bot'>('faq');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [ticketData, setTicketData] = useState({ subject: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { status, queueLength, lastError, forceSync } = useSync();

    // Chat Bot State
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);

    // Deflection Logic State
    const [hasInteracted, setHasInteracted] = useState(false);
    const [searchPerformed, setSearchPerformed] = useState(false);

    if (!isOpen) return null;

    const filteredFaqs = FAQS.filter(f =>
        f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.a.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (e.target.value.length > 2) setSearchPerformed(true);
    };

    const handleFaqClick = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
        setHasInteracted(true);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsBotTyping(true);
        setHasInteracted(true); // Chatting counts as interaction for deflection

        try {
            console.log('[HelpDrawer] Sending message to API...', userMsg);
            const res = await fetch('/api/help/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, chatHistory: messages })
            });

            if (!res.ok) {
                throw new Error(`API error: ${res.status}`);
            }

            const data = await res.json();
            console.log('[HelpDrawer] API Response received:', data);

            const botContent = data.response || "I'm sorry, I received an empty response. Let me try that again.";
            setMessages(prev => [...prev, { role: 'assistant', content: botContent }]);
        } catch (error) {
            console.error('[HelpDrawer] Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again or use the support ticket below." }]);
        } finally {
            setIsBotTyping(false);
        }
    };

    const handleTicketSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/help/ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData)
            });

            if (!res.ok) throw new Error('Failed to send ticket');

            alert('Support ticket sent successfully! We will get back to you soon. In the meantime, feel free to try talking to our K9 Assistant bot below for immediate answers!');
            setTicketData({ subject: '', message: '' });
            setView('faq');
        } catch (error) {
            console.error('[HelpDrawer] Ticket error:', error);
            alert('I had trouble sending your message. Please try again or check your internet connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Should we show the "Email Support" button?
    // Deflection rule: User must have searched OR clicked at least one FAQ
    const showSupportOption = searchPerformed || hasInteracted || filteredFaqs.length === 0;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {view !== 'faq' && (
                            <button
                                className={styles.closeBtn}
                                onClick={() => setView('faq')}
                                style={{ transform: 'rotate(90deg)', padding: '4px' }}
                            >
                                <ChevronDown size={20} />
                            </button>
                        )}
                        <h2 className="text-h2" style={{ marginBottom: 0 }}>
                            {view === 'faq' ? 'Help & Support' : view === 'ticket' ? 'Email Support' : 'K9 Assistant'}
                        </h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.content}>
                    {view === 'faq' && (
                        <>
                            <div className={styles.searchBar}>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search for help..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                />
                                <Search className={styles.searchIcon} size={20} />
                            </div>

                            <div className={styles.sectionTitle}>Frequently Asked Questions</div>

                            {filteredFaqs.length > 0 ? (
                                filteredFaqs.map((faq, index) => (
                                    <div key={index} className={styles.faqItem}>
                                        <button
                                            className={styles.faqQuestion}
                                            onClick={() => handleFaqClick(index)}
                                        >
                                            <span>{faq.q}</span>
                                            {expandedIndex === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                        {expandedIndex === index && (
                                            <div className={styles.faqAnswer}>
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                    <p style={{ color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                                        No results found for "{searchQuery}"
                                    </p>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ fontSize: '14px', height: '44px' }}
                                        onClick={() => setView('ticket')}
                                    >
                                        I need personalized help
                                    </button>
                                </div>
                            )}

                            <div className={styles.botCard}>
                                <MessageCircle size={32} />
                                <h3 style={{ margin: 0, color: 'white' }}>Ask K9 Assistant</h3>
                                <p style={{ fontSize: '14px', opacity: 0.9 }}>
                                    Get instant answers about your CRM, scheduling, and billing.
                                </p>
                                <button className={styles.botBtn} onClick={() => setView('bot')}>
                                    Start Chat
                                </button>
                            </div>
                        </>
                    )}

                    {view === 'ticket' && (
                        <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div style={{
                                background: 'var(--brand-primary-light)',
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-2)',
                                border: '1px solid var(--brand-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <MessageCircle size={20} color="var(--brand-primary)" />
                                <p style={{ fontSize: '13px', color: 'var(--brand-primary)', margin: 0, fontWeight: 500 }}>
                                    For faster answers, try chatting with our <button type="button" onClick={() => setView('bot')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand-primary)', textDecoration: 'underline', fontWeight: 700, cursor: 'pointer' }}>K9 Assistant</button> first!
                                </p>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: 'var(--space-2)' }}>
                                Facing a specific issue? Send us a message and our team will get back to you within 24 hours.
                            </p>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Subject</label>
                                <input
                                    required
                                    className={styles.searchInput}
                                    placeholder="e.g. Question about Billing"
                                    value={ticketData.subject}
                                    onChange={e => setTicketData({ ...ticketData, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Message</label>
                                <textarea
                                    required
                                    className={styles.searchInput}
                                    style={{ height: '150px', resize: 'none' }}
                                    placeholder="Describe your issue in detail..."
                                    value={ticketData.message}
                                    onChange={e => setTicketData({ ...ticketData, message: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}

                    {view === 'bot' && (
                        <>
                            <div className={styles.chatContainer}>
                                {messages.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                                        <div style={{
                                            width: '48px', height: '48px', background: 'var(--brand-gradient)',
                                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', margin: '0 auto 1rem', color: 'white'
                                        }}>
                                            <MessageCircle size={24} />
                                        </div>
                                        <h3 className="text-h2" style={{ fontSize: '18px' }}>How can I help you?</h3>
                                        <p style={{ fontSize: '14px' }}>
                                            I'm specialized in K9desk. Ask me about your schedule, leads, or how to log payments!
                                        </p>
                                    </div>
                                )}
                                {messages.map((msg, i) => (
                                    <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.botMessage}`}>
                                        {msg.content}
                                    </div>
                                ))}
                                {isBotTyping && <div className={styles.typingIndicator}>K9 Assistant is thinking...</div>}
                            </div>

                            <form onSubmit={handleSendMessage} className={styles.chatInputArea}>
                                <input
                                    type="text"
                                    className={`${styles.searchInput} ${styles.chatInput}`}
                                    placeholder="Type your question..."
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    disabled={isBotTyping}
                                />
                                <button type="submit" className={styles.sendBtn} disabled={!chatInput.trim() || isBotTyping}>
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {view === 'faq' && showSupportOption && (
                    <div className={styles.footer}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '14px' }}>Still need help?</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>We'll get back to you within 24h</div>
                            </div>
                            <button className="btn btn-secondary" style={{ fontSize: '13px' }} onClick={() => setView('ticket')}>
                                Email Support
                            </button>
                        </div>
                    </div>
                )}

                {/* System Status Section */}
                <div style={{
                    padding: 'var(--space-4) var(--space-6)',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--surface-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
                            {status === 'syncing' ? (
                                <RefreshCw size={14} className={styles.spin} />
                            ) : status === 'offline' ? (
                                <CloudOff size={14} color="var(--text-tertiary)" />
                            ) : status === 'error' ? (
                                <AlertCircle size={14} color="var(--color-danger)" />
                            ) : (
                                <Cloud size={14} color="var(--brand-primary)" />
                            )}
                            <span style={{ color: status === 'error' ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                                {status === 'syncing' ? 'Syncing changes...' :
                                    status === 'offline' ? 'Offline - changes saved locally' :
                                        status === 'error' ? 'Sync Error' :
                                            queueLength > 0 ? `Pending (${queueLength} items)` : 'Everything is synced'}
                            </span>
                        </div>
                        <button
                            onClick={() => forceSync()}
                            disabled={status === 'syncing' || !navigator.onLine}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--brand-primary)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: (status === 'syncing' || !navigator.onLine) ? 'not-allowed' : 'pointer',
                                opacity: (status === 'syncing' || !navigator.onLine) ? 0.5 : 1,
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}
                        >
                            Refresh Data
                        </button>
                    </div>
                    {lastError && (
                        <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '2px', opacity: 0.8 }}>
                            Last error: {lastError}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
