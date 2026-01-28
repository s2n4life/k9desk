import { useState, useRef, useEffect } from 'react';
import { X, DollarSign, CreditCard } from 'lucide-react';
import styles from './PaymentModal.module.css';
import { getDB } from '@/lib/db';
import { Settings } from '@/lib/db/schema';

interface RequestPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => void;
    initialAmount?: number;
}

export function RequestPaymentModal({ isOpen, onClose, onConfirm, initialAmount }: RequestPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [settings, setSettings] = useState<Settings | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount(initialAmount ? initialAmount.toFixed(2) : '');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);

            // Load settings to show preview
            getDB().then(db => db.get('settings', 'default')).then(s => {
                if (s) setSettings(s);
            });
        }
    }, [isOpen, initialAmount]);

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

    const hasPaymentMethods = settings && (
        settings.venmo?.trim() ||
        settings.zelle?.trim() ||
        settings.paypal?.trim() ||
        settings.cashapp?.trim() ||
        settings.custom_url?.trim()
    );

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Request Payment</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.amountSection}>
                        <label className={styles.label}>Amount Due</label>
                        <div className={styles.amountInputWrapper}>
                            <DollarSign size={24} className={styles.currencyIcon} />
                            <input
                                ref={inputRef}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={styles.amountInput}
                                required
                            />
                        </div>
                    </div>

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
