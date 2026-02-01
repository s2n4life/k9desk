'use client';

import { Phone, MessageSquare, X } from 'lucide-react';
import styles from './ConfirmAppointmentModal.module.css';

interface ConfirmAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerName: string;
    customerPhone: string;
    petName: string;
    appointmentDate: string; // ISO date
    appointmentTime: string; // e.g., "Morning (8am - 12pm)"
    businessName: string;
}

export function ConfirmAppointmentModal({
    isOpen,
    onClose,
    customerName,
    customerPhone,
    petName,
    appointmentDate,
    appointmentTime,
    businessName,
}: ConfirmAppointmentModalProps) {
    if (!isOpen) return null;

    // Format date for display
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    // Pre-filled SMS message
    const smsMessage = `Hi ${customerName}! Great news - your appointment for ${petName} is confirmed for ${formattedDate} at ${appointmentTime}. See you then! - ${businessName}`;

    const handleCall = () => {
        window.location.href = `tel:${customerPhone}`;
        onClose();
    };

    const handleSMS = () => {
        const encodedMessage = encodeURIComponent(smsMessage);
        window.location.href = `sms:${customerPhone}?body=${encodedMessage}`;
        onClose();
    };

    const handleSkip = () => {
        onClose();
    };

    // Check if customer has phone number
    const hasPhone = customerPhone && customerPhone.trim().length > 0;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button onClick={handleSkip} className={styles.closeButton} aria-label="Close">
                    <X size={24} />
                </button>

                <div className={styles.header}>
                    <div className={styles.icon}>⚠️</div>
                    <h2 className={styles.title}>Confirm Appointment with Customer</h2>
                    <p className={styles.subtitle}>
                        Make sure <strong>{customerName}</strong> knows their appointment is scheduled!
                    </p>
                </div>

                <div className={styles.details}>
                    <div className={styles.detailRow}>
                        <span className={styles.label}>Pet:</span>
                        <span className={styles.value}>{petName}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <span className={styles.label}>Date:</span>
                        <span className={styles.value}>{formattedDate}</span>
                    </div>
                    <div className={styles.detailRow}>
                        <span className={styles.label}>Time:</span>
                        <span className={styles.value}>{appointmentTime}</span>
                    </div>
                </div>

                {hasPhone ? (
                    <>
                        <div className={styles.actions}>
                            <button onClick={handleCall} className={styles.callButton}>
                                <Phone size={20} />
                                Call {customerName}
                            </button>

                            <button onClick={handleSMS} className={styles.smsButton}>
                                <MessageSquare size={20} />
                                Send SMS Confirmation
                            </button>
                        </div>

                        <button onClick={handleSkip} className={styles.skipButton}>
                            Skip (Already Confirmed)
                        </button>
                    </>
                ) : (
                    <div className={styles.noPhone}>
                        <p>No phone number on file for this customer.</p>
                        <button onClick={handleSkip} className={styles.skipButton}>
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
