import React, { useState } from 'react';
import { Pet } from '@/lib/db/schema';

interface PetFormProps {
    initialData?: Partial<Pet>;
    onSave: (data: Partial<Pet>) => void;
    onCancel: () => void;
}

export const PetForm: React.FC<PetFormProps> = ({ initialData, onSave, onCancel }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [breed, setBreed] = useState(initialData?.breed || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, breed, notes });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input
                className="card"
                placeholder="Pet Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
            />
            <input
                className="card"
                placeholder="Breed"
                value={breed}
                onChange={e => setBreed(e.target.value)}
            />
            <label>
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Pet Notes (Permanent)</span>
                <textarea
                    className="card"
                    placeholder="Allergies, behavior..."
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
