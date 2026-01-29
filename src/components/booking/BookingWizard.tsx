'use client';

import { useState, useEffect } from 'react';
import { submitLead } from '@/actions/submit-lead';
import { clsx } from 'clsx';
import { Loader2, CheckCircle, Dog, Calendar, XCircle, ChevronDown, ChevronRight, Clock, Scissors, Check } from 'lucide-react';

import { Settings, Service } from '@/lib/db/schema'; // Import Service

interface Props {
    businessId: string;
    businessName: string;
    settings: {
        mode?: 'radius' | 'zips';
        zips?: string[];
        startHour?: number;
        endHour?: number;
        workDays?: number[];
        services: Service[]; // Add services
    };
}

export function BookingWizard({ businessId, businessName, settings }: Props) {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [zipError, setZipError] = useState('');
    const [submitError, setSubmitError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        zip: '',
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
        ownerAddress: '', // New field
        pets: [{ name: '', breed: '', weight: '', age: '' }],
        serviceIds: [] as string[], // New
        dates: [''],
        notes: ''
    });

    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');

    // Smart Slot Availability
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState('');

    // Fetch available slots when date changes
    useEffect(() => {
        if (selectedDate) {
            fetchAvailableSlots(selectedDate);
        } else {
            setAvailableSlots([]);
            setSelectedTime('');
        }
    }, [selectedDate]);


    // Format ISO date (YYYY-MM-DD) for display as "Mon, Jan 29"
    const formatDateForDisplay = (isoDate: string): string => {
        try {
            const date = new Date(isoDate + 'T12:00:00'); // Add time to avoid timezone issues
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const dayName = days[date.getDay()];
            const monthName = months[date.getMonth()];
            const dayNum = date.getDate();

            return `${dayName}, ${monthName} ${dayNum}`;
        } catch (error) {
            console.error('[BookingWizard] Error formatting date:', error);
            return isoDate;
        }
    };

    const fetchAvailableSlots = async (dateLabel: string) => {
        setLoadingSlots(true);
        setSlotsError('');
        setSelectedTime(''); // Clear selected time when date changes

        try {
            // dateLabel is now already an ISO date (YYYY-MM-DD) from getAvailableDates
            const isoDate = dateLabel.trim(); // Remove any whitespace

            if (!isoDate) {
                throw new Error('Invalid date. Please try selecting a different date.');
            }

            // Validate format before sending
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(isoDate)) {
                console.error('[BookingWizard] Invalid date format:', isoDate);
                throw new Error(`Invalid date format: ${isoDate}. Expected YYYY-MM-DD.`);
            }

            // URL encode the date to handle any special characters
            const encodedDate = encodeURIComponent(isoDate);
            const apiUrl = `/api/availability/${businessId}?date=${encodedDate}`;
            console.log('[BookingWizard] Fetching slots for:', isoDate);

            const response = await fetch(apiUrl);
            console.log('[BookingWizard] Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[BookingWizard] API Error Response:', errorText);
                throw new Error(`API returned ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('[BookingWizard] Received slots:', data.slots?.length || 0);
            setAvailableSlots(data.slots || []);
        } catch (error) {
            console.error('[BookingWizard] Full error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unable to load available times. Please try again.';
            setSlotsError(errorMessage);
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    // Helper to convert "Tue, Oct 24" to "2024-10-24"
    const convertDateLabelToISO = (label: string): string => {
        try {
            console.log('[BookingWizard] Converting date label:', label);

            // Remove "Tomorrow (" prefix if present
            let cleanLabel = label;
            if (cleanLabel.startsWith('Tomorrow (')) {
                cleanLabel = cleanLabel.replace('Tomorrow (', '').replace(')', '');
            }

            console.log('[BookingWizard] Clean label:', cleanLabel);

            // Parse "Tue, Oct 24" format
            const months: { [key: string]: string } = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };

            // Split by comma first
            const commaSplit = cleanLabel.split(', ');
            if (commaSplit.length < 2) {
                console.error('[BookingWizard] Invalid format - no comma found:', cleanLabel);
                return '';
            }

            // Get the date part (after comma)
            const datePart = commaSplit[1];
            const parts = datePart.split(' ');

            if (!parts || parts.length !== 2) {
                console.error('[BookingWizard] Invalid date part format:', datePart);
                return '';
            }

            const monthStr = parts[0];
            const dayStr = parts[1];

            console.log('[BookingWizard] Month:', monthStr, 'Day:', dayStr);

            const month = months[monthStr];
            if (!month) {
                console.error('[BookingWizard] Invalid month:', monthStr);
                return '';
            }

            const day = dayStr.padStart(2, '0');

            // Use current year, but handle year boundary (Dec → Jan)
            const now = new Date();
            const currentMonth = now.getMonth() + 1; // 1-12
            const selectedMonth = parseInt(month, 10);

            // If we're in December and selecting January, use next year
            let year = now.getFullYear();
            if (currentMonth === 12 && selectedMonth === 1) {
                year += 1;
            }

            const isoDate = `${year}-${month}-${day}`;
            console.log('[BookingWizard] Converted date:', label, '→', isoDate);
            return isoDate;
        } catch (error) {
            console.error('[BookingWizard] Error converting date:', error);
            return '';
        }
    };

    // --- Helpers for Smart Scheduling ---
    const getAvailableDates = () => {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day

        // Generate next 14 days
        for (let i = 1; i <= 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayIndex = date.getDay();

            // Filter by workDays from settings (default to all if not specified)
            if (!settings.workDays || settings.workDays.length === 0 || settings.workDays.includes(dayIndex)) {
                // Store as ISO date (YYYY-MM-DD)
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const isoDate = `${year}-${month}-${day}`;

                // Format for display
                const displayDate = formatDateForDisplay(isoDate);
                const label = i === 1 ? `Tomorrow (${displayDate})` : displayDate;

                dates.push({ value: isoDate, label });
            }
        }
        return dates;
    };

    // Memoize the lists so they don't regenerate constantly
    const availableDates = getAvailableDates();

    const updateSchedule = (date: string, time: string) => {
        setSelectedDate(date);
        setSelectedTime(time);
        if (date && time) {
            updateForm('dates', [`${date} at ${time}`]);
        } else {
            updateForm('dates', []); // Clear if incomplete
        }
    };

    const checkZip = () => {
        setZipError('');
        if (settings.mode === 'zips' && settings.zips && settings.zips.length > 0) {
            if (!settings.zips.includes(formData.zip)) {
                setZipError(`Sorry, we currently do not service the ${formData.zip} area.`);
                return;
            }
        }
        setStep(2);
    };

    const updateForm = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updatePet = (index: number, field: string, value: string) => {
        const newPets = [...formData.pets];
        newPets[index] = { ...newPets[index], [field]: value };
        updateForm('pets', newPets);
    };

    const addPet = () => {
        updateForm('pets', [...formData.pets, { name: '', breed: '', weight: '', age: '' }]);
    };

    const removePet = (index: number) => {
        if (formData.pets.length === 1) return;
        updateForm('pets', formData.pets.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setSubmitError('');
        setSubmitting(true);
        try {
            const result = await submitLead({
                businessId,
                ownerName: formData.ownerName,
                ownerPhone: formData.ownerPhone,
                ownerEmail: formData.ownerEmail,
                ownerAddress: formData.ownerAddress, // Pass address
                serviceAreaZip: formData.zip,
                petDetails: formData.pets,
                serviceIds: formData.serviceIds, // Pass services
                preferredDates: formData.dates.filter(d => !!d),
                notes: formData.notes
            });

            if (result && result.success) {
                setSuccess(true);
            } else {
                setSubmitError(result?.error || 'Unknown error occurred.');
            }
        } catch (e) {
            setSubmitError(e instanceof Error ? e.message : 'An unexpected error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    // --- Step Render Functions ---

    const renderStep1Zip = () => (
        <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 pt-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">First, your zip code.</h2>
                <p className="text-lg text-slate-500 font-medium">Let's make sure we're in your neighborhood.</p>
            </div>

            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold">#</span>
                </div>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    className="w-full text-5xl p-6 pl-12 text-center font-black tracking-[0.2em] border-2 border-slate-100 rounded-3xl bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono placeholder:text-slate-100 shadow-sm group-hover:border-slate-300"
                    placeholder="00000"
                    value={formData.zip}
                    onChange={e => updateForm('zip', e.target.value)}
                />
            </div>

            {zipError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border border-red-100 shadow-sm">
                    <div className="bg-red-100 p-2 rounded-full">
                        <XCircle className="shrink-0 text-red-600" size={20} />
                    </div>
                    <span className="font-semibold">{zipError}</span>
                </div>
            )}

            <button
                onClick={checkZip}
                disabled={formData.zip.length < 5}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-5 rounded-2xl text-xl font-bold shadow-xl shadow-blue-500/20 disabled:shadow-none disabled:opacity-50 transition-all active:scale-[0.98] mt-4"
            >
                Check Availability
            </button>
        </div>
    );

    const renderStep2Owner = () => (
        <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 pt-4">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Nice! We're local.</h2>
                <p className="text-lg text-slate-500 font-medium">How can we reach you?</p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 uppercase tracking-wide ml-1">Full Name</label>
                    <input
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg shadow-sm"
                        placeholder="e.g. Jane Doe"
                        value={formData.ownerName}
                        onChange={e => updateForm('ownerName', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 uppercase tracking-wide ml-1">Mobile Phone</label>
                    <input
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg shadow-sm"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.ownerPhone}
                        onChange={e => {
                            // Phone Formatting Logic
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 10) val = val.slice(0, 10);

                            let formatted = val;
                            if (val.length > 6) {
                                formatted = `(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6)}`;
                            } else if (val.length > 3) {
                                formatted = `(${val.slice(0, 3)}) ${val.slice(3)}`;
                            } else if (val.length > 0) {
                                formatted = `(${val}`; // Start with paren
                            }

                            updateForm('ownerPhone', formatted);
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 uppercase tracking-wide ml-1">Home Address</label>
                    <input
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg text-slate-900 shadow-sm"
                        placeholder="123 Dogwood Lane"
                        value={formData.ownerAddress}
                        onChange={e => updateForm('ownerAddress', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 uppercase tracking-wide ml-1">Email <span className="font-normal text-slate-400 normal-case">(Optional)</span></label>
                    <input
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg text-slate-900 shadow-sm"
                        type="email"
                        placeholder="jane@example.com"
                        value={formData.ownerEmail}
                        onChange={e => updateForm('ownerEmail', e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={() => setStep(1)}
                    className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={() => setStep(3)}
                    disabled={!formData.ownerName || !formData.ownerPhone}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/20 disabled:shadow-none disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                    Next Step
                </button>
            </div>
        </div>
    );

    const renderStep3Pets = () => (
        <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 pt-4">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Who's the VIP?</h2>
                <p className="text-lg text-slate-500 font-medium">Tell us about your furry friend.</p>
            </div>

            <div className="space-y-6">
                {formData.pets.map((pet, idx) => (
                    <div key={idx} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 relative group space-y-5 transition-all hover:border-blue-200 hover:shadow-blue-500/5">
                        {formData.pets.length > 1 && (
                            <button
                                onClick={() => removePet(idx)}
                                className="absolute -top-3 -right-3 bg-white text-slate-400 hover:text-red-500 border border-slate-200 rounded-full p-2 shadow-sm transition-colors z-10"
                            >
                                <XCircle size={20} />
                            </button>
                        )}

                        <div className="flex items-center gap-3 pb-2 border-b border-slate-50">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                                <Dog size={24} />
                            </div>
                            <h3 className="font-bold text-slate-700">Pet #{idx + 1}</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Name</label>
                                <input
                                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                                    placeholder="Buddy"
                                    value={pet.name}
                                    onChange={e => updatePet(idx, 'name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Breed</label>
                                <input
                                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                                    placeholder="Poodle"
                                    value={pet.breed}
                                    onChange={e => updatePet(idx, 'breed', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Age</label>
                                <input
                                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                                    placeholder="2 yrs"
                                    value={pet.age}
                                    onChange={e => updatePet(idx, 'age', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Weight</label>
                                <input
                                    className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                                    placeholder="20 lbs"
                                    value={pet.weight}
                                    onChange={e => updatePet(idx, 'weight', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addPet}
                    className="w-full py-5 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl text-slate-500 font-bold transition-all flex items-center justify-center gap-3 group"
                >
                    <div className="p-1.5 bg-slate-100 group-hover:bg-blue-100 rounded-full transition-colors">
                        <Dog size={20} className="text-slate-400 group-hover:text-blue-600" />
                    </div>
                    Add Another Pet
                </button>
            </div>

            <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(2)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors">Back</button>
                <button
                    onClick={() => setStep(4)}
                    disabled={!formData.pets[0].name}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/20 disabled:shadow-none disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                    Next Step
                </button>
            </div>
        </div>
    );

    const renderStep4Final = () => (
        <div className="max-w-lg mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 pt-4">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Finishing Touches.</h2>
                <p className="text-lg text-slate-500 font-medium">Customize your request.</p>
            </div>

            {/* SERVICES SECTION (Moved from Step 4) */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Select Services (Optional)</h3>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {settings.services.map(s => {
                        const isSelected = formData.serviceIds.includes(s.id);
                        return (
                            <div
                                key={s.id}
                                onClick={() => {
                                    const exists = formData.serviceIds.includes(s.id);
                                    if (exists) updateForm('serviceIds', formData.serviceIds.filter(id => id !== s.id));
                                    else updateForm('serviceIds', [...formData.serviceIds, s.id]);
                                }}
                                className={clsx(
                                    "p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between",
                                    isSelected ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white hover:border-blue-200"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={clsx("p-2 rounded-xl transition-colors", isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400")}>
                                        <Scissors size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900">{s.name}</div>
                                        <div className="text-sm text-slate-500">${s.price}</div>
                                    </div>
                                </div>
                                <div className={clsx("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", isSelected ? "border-blue-500 bg-blue-500 text-white" : "border-slate-200")}>
                                    {isSelected && <Check size={14} strokeWidth={4} />}
                                </div>
                            </div>
                        );
                    })}
                    {settings.services.length === 0 && (
                        <div className="text-center text-slate-400 py-4 italic border-2 border-dashed border-slate-100 rounded-2xl text-sm">
                            No specific services listed. You can add notes below!
                        </div>
                    )}
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* SCHEDULING SECTION */}
            <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Calendar size={120} />
                </div>
                <div className="relative z-10 flex gap-4 items-start">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                        <Calendar className="text-white" size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-1">Scheduling Note</h4>
                        <p className="text-blue-100 leading-relaxed font-medium">We'll text you to confirm the exact appointment time after reviewing your request.</p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 uppercase tracking-wide ml-1">Preferred Timing</label>

                    {/* Date Picker */}
                    <div className="relative">
                        <select
                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg text-slate-900 font-medium shadow-sm appearance-none cursor-pointer hover:border-blue-300"
                            value={selectedDate}
                            onChange={e => {
                                setSelectedDate(e.target.value);
                                // updateSchedule will be called after slots are fetched
                            }}
                        >
                            <option value="">Select Date</option>
                            {availableDates.map(d => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={20} />
                        </div>
                    </div>

                    {/* Time Slot Picker */}
                    {selectedDate && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-bold text-slate-900 uppercase tracking-wide">Available Times</label>
                                {loadingSlots && (
                                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className="font-medium">Loading...</span>
                                    </div>
                                )}
                            </div>

                            {slotsError && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-2">
                                    <XCircle size={16} />
                                    {slotsError}
                                </div>
                            )}

                            {!loadingSlots && !slotsError && availableSlots.length === 0 && (
                                <div className="bg-amber-50 text-amber-700 p-6 rounded-2xl text-center border border-amber-100">
                                    <Clock size={32} className="mx-auto mb-2 text-amber-600" />
                                    <p className="font-bold mb-1">No times available</p>
                                    <p className="text-sm">Please try a different date</p>
                                </div>
                            )}

                            {!loadingSlots && availableSlots.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {availableSlots.map(slot => {
                                        // Convert 24h format to 12h for display
                                        const [h, m] = slot.split(':').map(Number);
                                        const isAm = h < 12;
                                        const displayHour = h > 12 ? h - 12 : (h === 0 || h === 12 ? 12 : h);
                                        const displayTime = `${displayHour}:${m.toString().padStart(2, '0')} ${isAm ? 'AM' : 'PM'}`;
                                        const isSelected = selectedTime === displayTime;

                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => updateSchedule(selectedDate, displayTime)}
                                                className={clsx(
                                                    "p-4 rounded-xl font-bold transition-all border-2",
                                                    isSelected
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30"
                                                        : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                                                )}
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    {isSelected && <Check size={16} strokeWidth={3} />}
                                                    <span>{displayTime}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 uppercase tracking-wide ml-1">Notes <span className="font-normal text-slate-400 normal-case">(Access Instructions, Behavior, etc.)</span></label>
                    <textarea
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium min-h-[100px] resize-none shadow-sm"
                        placeholder="e.g. Behaves well, gate code is 1234..."
                        value={formData.notes}
                        onChange={e => updateForm('notes', e.target.value)}
                    />
                </div>
            </div>

            {
                submitError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-in shake flex items-center gap-3">
                        <div className="bg-red-100 p-1 rounded-full">
                            <XCircle size={16} />
                        </div>
                        {submitError}
                    </div>
                )
            }

            <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(3)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-colors">Back</button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl text-lg font-bold shadow-xl shadow-blue-500/20 disabled:shadow-none disabled:opacity-50 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                >
                    {submitting ? <Loader2 className="animate-spin" /> : <>Request Appointment</>}
                </button>
            </div>
        </div >
    );

    const renderSuccessView = () => (
        <div className="text-center py-20 animate-in zoom-in duration-500 px-6 max-w-lg mx-auto">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-10 shadow-lg shadow-green-500/20">
                <CheckCircle className="text-green-600 w-16 h-16" strokeWidth={3} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">You're All Set!</h2>
            <p className="text-slate-600 text-xl mb-12 leading-relaxed">
                Thanks, <span className="font-bold text-slate-900">{formData.ownerName.split(' ')[0]}</span>! We've received your request and will text <span className="font-bold text-slate-900 whitespace-nowrap">{formData.ownerPhone}</span> shortly to confirm.
            </p>
            <button
                onClick={() => window.location.reload()}
                className="bg-slate-100 hover:bg-slate-200 text-slate-900 py-4 px-10 rounded-full font-bold text-lg transition-colors border border-slate-200"
            >
                Back to Home
            </button>
        </div>
    );

    return (
        <div className="min-h-[500px]">
            {/* Progress Bar - Hidden on Success */}
            {!success && (
                <div className="flex gap-2 mb-10 max-w-sm mx-auto">
                    {[1, 2, 3, 4].map(s => (
                        <div
                            key={s}
                            className={clsx(
                                "h-1.5 rounded-full flex-1 transition-all duration-500",
                                s <= step ? "bg-blue-600 scale-x-100" : "bg-slate-100 scale-x-90"
                            )}
                        />
                    ))}
                </div>
            )}

            {success ? renderSuccessView() : (
                <>
                    {step === 1 && renderStep1Zip()}
                    {step === 2 && renderStep2Owner()}
                    {step === 3 && renderStep3Pets()}
                    {step === 4 && renderStep4Final()}
                </>
            )}
        </div>
    );
}
