// Rebuild trigger
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { BookingWizard } from '@/components/booking/BookingWizard';

// We need a simple way to fetch business info server-side
// Since we don't have the fully configured server client in this context yet,
// we will use the standard createClient for this public fetch.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function BookingPage({ params }: { params: Promise<{ businessId: string }> }) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { businessId } = await params;

    // Verify business exists and get name + settings
    // Determine if input is a UUID (approximate check)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId);

    let query = supabase
        .from('businesses')
        .select(`
            id, 
            name, 
            service_area_mode, 
            service_area_zips, 
            schedule_start_hour, 
            schedule_end_hour, 
            schedule_work_days,
            business_hours,
            services (
                id,
                name,
                price,
                created_at
            )
        `);

    if (isUuid) {
        query = query.eq('id', businessId);
    } else {
        query = query.eq('slug', businessId);
    }

    const { data: business, error } = await query.single();

    if (error || !business) {
        return notFound();
    }

    return (
        <div className="min-h-screen bg-slate-50" style={{ colorScheme: 'light' }}>
            <header className="bg-white border-b py-4 px-6 md:px-8 mb-6">
                <div className="max-w-xl mx-auto">
                    <h1 className="text-xl font-bold text-slate-800">
                        Book with {business.name}
                    </h1>
                </div>
            </header>

            <main className="px-4 pb-12">
                <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <BookingWizard
                        businessId={business.id}
                        businessName={business.name}
                        settings={{
                            mode: business.service_area_mode,
                            zips: business.service_area_zips,
                            startHour: business.schedule_start_hour,
                            endHour: business.schedule_end_hour,
                            workDays: (() => {
                                // Extract work days from business_hours
                                const dayMap: Record<string, number> = {
                                    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
                                    thursday: 4, friday: 5, saturday: 6
                                };
                                const workDays: number[] = [];
                                if (business.business_hours) {
                                    Object.entries(business.business_hours).forEach(([day, config]: [string, any]) => {
                                        if (config?.isOpen && dayMap[day.toLowerCase()] !== undefined) {
                                            workDays.push(dayMap[day.toLowerCase()]);
                                        }
                                    });
                                }
                                return workDays.sort((a, b) => a - b);
                            })(),
                            services: (business.services || []).map((s: any) => ({
                                id: s.id,
                                name: s.name,
                                price: s.price,
                                createdAt: new Date(s.created_at || Date.now()).getTime()
                            }))
                        }}
                    />
                </div>
            </main>
        </div>
    );
}

