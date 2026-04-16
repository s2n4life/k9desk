import React, { useState } from 'react';
import { Pet } from '@/lib/db/schema';

interface PetFormProps {
    initialData?: Partial<Pet>;
    onSave: (data: Partial<Pet>) => void;
    onCancel: () => void;
    onDelete?: () => void;
}

export const PetForm: React.FC<PetFormProps> = ({ initialData, onSave, onCancel, onDelete }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [breed, setBreed] = useState(initialData?.breed || '');
    const [size, setSize] = useState(initialData?.size || '');
    const [age, setAge] = useState(initialData?.age || '');
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [vaccinations, setVaccinations] = useState<{name: string, date: string, expirationDate?: string}[]>(initialData?.vaccinations || []);

    const handleAddVax = () => {
        setVaccinations([...vaccinations, { name: '', date: '' }]);
    };

    const handleUpdateVax = (index: number, field: 'name' | 'date' | 'expirationDate', value: string) => {
        const newVax = [...vaccinations];
        newVax[index] = { ...newVax[index], [field]: value };
        setVaccinations(newVax);
    };

    const handleRemoveVax = (index: number) => {
        setVaccinations(vaccinations.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, breed, size, age, notes, vaccinations: vaccinations.filter(v => v.name.trim() !== '') });
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
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <select className="card" value={size} onChange={e => setSize(e.target.value)} style={{ flex: 1 }}>
                    <option value="">Unknown Size</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="X-Large">X-Large</option>
                </select>
                <input
                    className="card"
                    placeholder="Age"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    style={{ flex: 1 }}
                />
            </div>
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
            
            {/* Vaccinations Section */}
            <div style={{ marginTop: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Vaccinations & Health</span>
                    <button type="button" onClick={handleAddVax} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', height: 'auto' }}>
                        + Add Record
                    </button>
                </div>
                {vaccinations.length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: 8, background: 'var(--surface-sunken)', borderRadius: 8 }}>
                        No records added.
                    </div>
                )}
                {vaccinations.map((vax, i) => (
                    <div key={i} style={{ background: 'var(--surface-sunken)', padding: 12, borderRadius: 8, marginBottom: 8, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <input
                                className="input"
                                placeholder="Vaccine Name (e.g. Rabies)"
                                value={vax.name}
                                onChange={e => handleUpdateVax(i, 'name', e.target.value)}
                                style={{ flex: 1, padding: '6px 12px', fontSize: '14px' }}
                            />
                            <button type="button" onClick={() => handleRemoveVax(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', marginLeft: 8, cursor: 'pointer', fontWeight: 600 }}>
                                X
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <label style={{ flex: 1 }}>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>Administered</span>
                                <input
                                    type="date"
                                    className="input"
                                    value={vax.date}
                                    onChange={e => handleUpdateVax(i, 'date', e.target.value)}
                                    style={{ width: '100%', padding: '6px', fontSize: '14px' }}
                                />
                            </label>
                            <label style={{ flex: 1 }}>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>Expires</span>
                                <input
                                    type="date"
                                    className="input"
                                    value={vax.expirationDate || ''}
                                    onChange={e => handleUpdateVax(i, 'expirationDate', e.target.value)}
                                    style={{ width: '100%', padding: '6px', fontSize: '14px' }}
                                />
                            </label>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {onDelete && (
                    <button type="button" onClick={onDelete} className="btn btn-secondary" style={{ padding: '0 16px', background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
                        Delete
                    </button>
                )}
                <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save</button>
            </div>
        </form>
    );
};
