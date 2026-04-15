import React, { useState } from 'react';
import { Customer } from '@/lib/db/schema';

interface CustomerFormProps {
    initialData?: Partial<Customer>;
    onSave: (data: Partial<Customer>) => void;
    onCancel: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, onSave, onCancel }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [phone, setPhone] = useState(initialData?.phone || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [address, setAddress] = useState(initialData?.address || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, phone, email, address, notes });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input
                className="card"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
            />
            <input
                className="card"
                placeholder="Phone Number"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
            />
            <input
                className="card"
                placeholder="Email (optional)"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
            />
            <input
                className="card"
                placeholder="Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
            />
            <label>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Customer Notes (Permanent)</span>
                <textarea
                    className="card"
                    placeholder="Gate codes, parking info..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', minHeight: 80, marginTop: 4 }}
                />
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save</button>
            </div>
        </form>
    );
};
