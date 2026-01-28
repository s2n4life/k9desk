import { useState, useRef, useEffect } from 'react';
import { X, DollarSign, CreditCard, Check } from 'lucide-react';
import styles from './PaymentModal.module.css';
import { getDB } from '@/lib/db';
import { Settings } from '@/lib/db/schema';

export interface ServiceItem {
    id: string;
    name: string;
    price: number;
    petName?: string;
}

interface RequestPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    initialAmount?: number;
    services?: ServiceItem[];
}

export function RequestPaymentModal({ isOpen, onClose, onConfirm, initialAmount, services = [] }: RequestPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [settings, setSettings] = useState<Settings | null>(null);
    const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
    const [manualOverride, setManualOverride] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Initialize all services as selected
            setSelectedServices(new Set(services.map(s => s.id)));
            setManualOverride(false);
            setAmount(initialAmount ? initialAmount.toFixed(2) : '');

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);

            // Load settings to show preview
            getDB().then(db => db.get('settings', 'default')).then(s => {
                if (s) setSettings(s);
            });
        }
    }, [isOpen, initialAmount, services]);

    // Auto-calculate total from selected services
    useEffect(() => {
        if (!manualOverride && services.length > 0) {
            const total = services
                .filter(s => selectedServices.has(s.id))
                .reduce((sum, s) => sum + s.price, 0);
            setAmount(total.toFixed(2));
        }
    }, [selectedServices, services, manualOverride]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount greater than $0');
            return;
        }
        onConfirm(numAmount);
        onClose();
    };

    const toggleService = (serviceId: string) => {
        setSelectedServices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(serviceId)) {
                newSet.delete(serviceId);
            } else {
                newSet.add(serviceId);
            }
            return newSet;
        });
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(e.target.value);
        setManualOverride(true);
    };

    const resetToCalculated = () => {
        setManualOverride(false);
        const total = services
            .filter(s => selectedServices.has(s.id))
            .reduce((sum, s) => sum + s.price, 0);
        setAmount(total.toFixed(2));
    };

    const hasPaymentMethods = settings && (
        settings.venmo?.trim() ||
        settings.zelle?.trim() ||
        settings.paypal?.trim() ||
        settings.cashapp?.trim() ||
        settings.custom_url?.trim()
    );

    const calculatedTotal = services
        .filter(s => selectedServices.has(s.id))
        .reduce((sum, s) => sum + s.price, 0);

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <div className={styles.header}>
                    <h2>Request Payment</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Services List */}
                    {services.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label className={styles.label}>Services Performed</label>
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-3)',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {services.map((service) => (
                                    <div
                                        key={service.id}
                                        onClick={() => toggleService(service.id)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 'var(--space-3)',
                                            marginBottom: 'var(--space-2)',
                                            backgroundColor: selectedServices.has(service.id) ? 'var(--color-primary-light)' : 'var(--bg-primary)',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            border: selectedServices.has(service.id) ? '2px solid var(--color-primary)' : '2px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '2px solid var(--color-primary)',
                                                backgroundColor: selectedServices.has(service.id) ? 'var(--color-primary)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {selectedServices.has(service.id) && <Check size={14} color="white" />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{service.name}</div>
                                                {service.petName && (
                                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                        {service.petName}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                            ${service.price.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{
                                marginTop: 'var(--space-2)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)',
                                fontStyle: 'italic'
                            }}>
                                Tap services to include/exclude from payment
                            </div>
                        </div>
                    )}

                    {/* Amount Section */}
                    <div className={styles.amountSection}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className={styles.label}>Amount Due</label>
                            {manualOverride && services.length > 0 && (
                                <button
                                    type="button"
                                    onClick={resetToCalculated}
                                    style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-primary)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Reset to ${calculatedTotal.toFixed(2)}
                                </button>
                            )}
                        </div>
                        <div className={styles.amountInputWrapper}>
                            <DollarSign size={24} className={styles.currencyIcon} />
                            <input
                                ref={inputRef}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={handleAmountChange}
                                className={styles.amountInput}
                                required
                            />
                        </div>
                        {manualOverride && services.length > 0 && (
                            <div style={{
                                marginTop: 'var(--space-2)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-warning)',
                                fontStyle: 'italic'
                            }}>
                                Manual override active (calculated: ${calculatedTotal.toFixed(2)})
                            </div>
                        )}
                    </div>

                    {/* Payment Methods Preview */}
                    <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CreditCard size={14} />
                            Payment Options to Send
                        </h4>
                        {hasPaymentMethods ? (
                            <ul style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', paddingLeft: 'var(--space-4)', margin: 0 }}>
                                {settings.venmo?.trim() && <li>Venmo: {settings.venmo}</li>}
                                {settings.zelle?.trim() && <li>Zelle: {settings.zelle}</li>}
                                {settings.paypal?.trim() && <li>PayPal: {settings.paypal}</li>}
                                {settings.cashapp?.trim() && <li>CashApp: {settings.cashapp}</li>}
                                {settings.custom_url?.trim() && <li>Link: {settings.custom_url}</li>}
                            </ul>
                        ) : (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                No payment methods saved in Settings. Only the amount will be sent.
                            </p>
                        )}
                    </div>

                    <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        <p>Clicking below will open your SMS app with a pre-filled message containing payment details.</p>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            marginTop: 'var(--space-2)',
                            height: '56px',
                            fontSize: '18px',
                            opacity: (!amount || parseFloat(amount) <= 0) ? 0.5 : 1
                        }}
                        disabled={!amount || parseFloat(amount) <= 0}
                    >
                        Send Payment Request
                    </button>
                </form>
            </div>
        </>
    );
}
