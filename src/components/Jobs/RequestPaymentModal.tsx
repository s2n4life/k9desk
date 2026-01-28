import { useState, useRef, useEffect } from 'react';
import { X, DollarSign, Check } from 'lucide-react';
import styles from './PaymentModal.module.css';
import { getDB } from '@/lib/db';
import { Settings, Service, Pet } from '@/lib/db/schema';

interface RequestPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number, selectedPaymentMethods: string[]) => void;
    initialAmount?: number;
    pets: Pet[];
    allServices: Service[];
    jobServices: (Service & { petId?: string })[]; // Services currently on the job with pet mapping
}

export function RequestPaymentModal({
    isOpen,
    onClose,
    onConfirm,
    initialAmount,
    pets,
    allServices,
    jobServices
}: RequestPaymentModalProps) {
    const [amount, setAmount] = useState('');
    const [settings, setSettings] = useState<Settings | null>(null);
    const [selectedServices, setSelectedServices] = useState<Map<string, Set<string>>>(new Map()); // petId -> Set of serviceIds
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<Set<string>>(new Set());
    const [manualOverride, setManualOverride] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Initialize selected services from job
            const serviceMap = new Map<string, Set<string>>();

            // Initialize empty sets for all pets
            pets.forEach(pet => {
                serviceMap.set(pet.id, new Set());
            });

            // Map job services to their respective pets
            jobServices.forEach(jobService => {
                if (jobService.petId && serviceMap.has(jobService.petId)) {
                    serviceMap.get(jobService.petId)!.add(jobService.id);
                }
            });

            setSelectedServices(serviceMap);
            setManualOverride(false);
            setAmount(initialAmount ? initialAmount.toFixed(2) : '');

            // Initialize all payment methods as selected
            setSelectedPaymentMethods(new Set(['venmo', 'zelle', 'paypal', 'cashapp', 'custom_url']));

            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);

            // Load settings
            getDB().then(db => db.get('settings', 'default')).then(s => {
                if (s) setSettings(s);
            });
        }
    }, [isOpen, initialAmount, pets, jobServices]);

    // Auto-calculate total from selected services
    useEffect(() => {
        if (!manualOverride && selectedServices.size > 0) {
            let total = 0;
            selectedServices.forEach((serviceIds, petId) => {
                serviceIds.forEach(serviceId => {
                    const service = allServices.find(s => s.id === serviceId);
                    if (service) {
                        total += service.price;
                    }
                });
            });
            setAmount(total.toFixed(2));
        }
    }, [selectedServices, allServices, manualOverride]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount greater than $0');
            return;
        }
        onConfirm(numAmount, Array.from(selectedPaymentMethods));
        onClose();
    };

    const toggleService = (petId: string, serviceId: string) => {
        setSelectedServices(prev => {
            const newMap = new Map(prev);
            if (!newMap.has(petId)) {
                newMap.set(petId, new Set());
            }
            const petServices = newMap.get(petId)!;
            if (petServices.has(serviceId)) {
                petServices.delete(serviceId);
            } else {
                petServices.add(serviceId);
            }
            return newMap;
        });
    };

    const togglePaymentMethod = (method: string) => {
        setSelectedPaymentMethods(prev => {
            const newSet = new Set(prev);
            if (newSet.has(method)) {
                newSet.delete(method);
            } else {
                newSet.add(method);
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
        let total = 0;
        selectedServices.forEach((serviceIds, petId) => {
            serviceIds.forEach(serviceId => {
                const service = allServices.find(s => s.id === serviceId);
                if (service) {
                    total += service.price;
                }
            });
        });
        setAmount(total.toFixed(2));
    };

    const calculatedTotal = (() => {
        let total = 0;
        selectedServices.forEach((serviceIds, petId) => {
            serviceIds.forEach(serviceId => {
                const service = allServices.find(s => s.id === serviceId);
                if (service) {
                    total += service.price;
                }
            });
        });
        return total;
    })();

    const paymentMethodConfig = [
        { id: 'venmo', label: 'Venmo', value: settings?.venmo },
        { id: 'zelle', label: 'Zelle', value: settings?.zelle },
        { id: 'paypal', label: 'PayPal', value: settings?.paypal },
        { id: 'cashapp', label: 'CashApp', value: settings?.cashapp },
        { id: 'custom_url', label: 'Payment Link', value: settings?.custom_url },
    ].filter(pm => pm.value?.trim());

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
                    {/* Services by Pet */}
                    {pets.length > 0 && allServices.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label className={styles.label}>Services by Dog</label>
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-3)',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {pets.map((pet) => (
                                    <div key={pet.id} style={{ marginBottom: 'var(--space-4)' }}>
                                        <div style={{
                                            fontWeight: 700,
                                            marginBottom: 'var(--space-2)',
                                            color: 'var(--color-primary)',
                                            fontSize: 'var(--font-size-base)'
                                        }}>
                                            {pet.name}
                                        </div>
                                        {allServices.map((service) => {
                                            const isSelected = selectedServices.get(pet.id)?.has(service.id) || false;
                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => toggleService(pet.id, service.id)}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: 'var(--space-2)',
                                                        marginBottom: 'var(--space-2)',
                                                        backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--bg-primary)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer',
                                                        border: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                        <div style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            border: '2px solid var(--color-primary)',
                                                            backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0
                                                        }}>
                                                            {isSelected && <Check size={12} color="white" />}
                                                        </div>
                                                        <div style={{ fontSize: 'var(--font-size-sm)' }}>{service.name}</div>
                                                    </div>
                                                    <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)' }}>
                                                        ${service.price.toFixed(2)}
                                                    </div>
                                                </div>
                                            );
                                        })}
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
                            {manualOverride && (
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
                        {manualOverride && (
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

                    {/* Payment Methods to Include */}
                    {paymentMethodConfig.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label className={styles.label}>Payment Methods to Send</label>
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-3)'
                            }}>
                                {paymentMethodConfig.map((pm) => {
                                    const isSelected = selectedPaymentMethods.has(pm.id);
                                    return (
                                        <div
                                            key={pm.id}
                                            onClick={() => togglePaymentMethod(pm.id)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: 'var(--space-2)',
                                                marginBottom: 'var(--space-2)',
                                                backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--bg-primary)',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                border: isSelected ? '2px solid var(--color-primary)' : '2px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '2px solid var(--color-primary)',
                                                    backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {isSelected && <Check size={12} color="white" />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{pm.label}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        {pm.value}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{
                                marginTop: 'var(--space-2)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)',
                                fontStyle: 'italic'
                            }}>
                                Tap to include/exclude payment methods in SMS
                            </div>
                        </div>
                    )}

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
