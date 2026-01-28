import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, DollarSign, Check } from 'lucide-react';
import styles from './PaymentModal.module.css';

export interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, method: string) => void;
}

const PAYMENT_METHODS = [
    { id: 'cash', label: 'Cash' },
    { id: 'check', label: 'Check' },
    { id: 'venmo', label: 'Venmo' },
    { id: 'zelle', label: 'Zelle' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'other', label: 'Other' }
];

export function PaymentModal({ isOpen, onClose, onConfirm }: PaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setMethod('cash');
            // Slight delay to allow animation/rendering
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount greater than $0');
            return;
        }
        onConfirm(numAmount, method);
    };

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Log Payment</h2>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.amountSection}>
                        <label className={styles.label}>Amount Collected</label>
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

                    <div className={styles.methodSection}>
                        <label className={styles.label}>Payment Method</label>
                        <div className={styles.methodGrid}>
                            {PAYMENT_METHODS.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    className={clsx(styles.methodBtn, method === m.id && styles.active)}
                                    onClick={() => setMethod(m.id)}
                                >
                                    {method === m.id && <Check size={16} className={styles.checkIcon} />}
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            marginTop: 'var(--space-6)',
                            height: '56px',
                            fontSize: '18px',
                            opacity: (!amount || parseFloat(amount) <= 0) ? 0.5 : 1
                        }}
                        disabled={!amount || parseFloat(amount) <= 0}
                    >
                        Confirm Payment
                    </button>
                </form>
            </div>
        </>
    );
}
