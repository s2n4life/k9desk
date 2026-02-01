import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * GDPR Data Export API
 * Allows users to download all their data in CSV format
 * Complies with GDPR Article 20 (Right to Data Portability)
 */

// Helper function to convert array of objects to CSV
function arrayToCSV(data: any[], headers: string[]): string {
    if (!data || data.length === 0) return headers.join(',') + '\n';

    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';

            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's business ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();

        if (!profile?.business_id) {
            return NextResponse.json({ error: 'No business found' }, { status: 404 });
        }

        const businessId = profile.business_id;

        // Fetch all user data
        const [
            { data: business },
            { data: customers },
            { data: pets },
            { data: jobs },
            { data: services },
            { data: leads },
            { data: recurrenceRules }
        ] = await Promise.all([
            supabase.from('businesses').select('*').eq('id', businessId).single(),
            supabase.from('customers').select('*').eq('business_id', businessId),
            supabase.from('pets').select('*').eq('business_id', businessId),
            supabase.from('jobs').select('*').eq('business_id', businessId),
            supabase.from('services').select('*').eq('business_id', businessId),
            supabase.from('leads').select('*').eq('business_id', businessId),
            supabase.from('recurrence_rules').select('*').eq('business_id', businessId)
        ]);

        // Build comprehensive CSV export with multiple sections
        let csvContent = '';

        // Header section
        csvContent += '=== K9DESK DATA EXPORT ===\n';
        csvContent += `Export Date: ${new Date().toISOString()}\n`;
        csvContent += `User Email: ${user.email}\n`;
        csvContent += `Business ID: ${businessId}\n`;
        csvContent += `GDPR Notice: This export contains all personal data stored in K9Desk as of the export date.\n`;
        csvContent += '\n\n';

        // Statistics
        csvContent += '=== SUMMARY STATISTICS ===\n';
        csvContent += `Total Customers: ${customers?.length || 0}\n`;
        csvContent += `Total Pets: ${pets?.length || 0}\n`;
        csvContent += `Total Appointments: ${jobs?.length || 0}\n`;
        csvContent += `Total Services: ${services?.length || 0}\n`;
        csvContent += `Total Leads: ${leads?.length || 0}\n`;
        csvContent += '\n\n';

        // Business Info
        if (business) {
            csvContent += '=== BUSINESS INFORMATION ===\n';
            csvContent += arrayToCSV([business], Object.keys(business));
            csvContent += '\n\n';
        }

        // Customers
        if (customers && customers.length > 0) {
            csvContent += '=== CUSTOMERS ===\n';
            csvContent += arrayToCSV(customers, Object.keys(customers[0]));
            csvContent += '\n\n';
        }

        // Pets
        if (pets && pets.length > 0) {
            csvContent += '=== PETS ===\n';
            csvContent += arrayToCSV(pets, Object.keys(pets[0]));
            csvContent += '\n\n';
        }

        // Jobs/Appointments
        if (jobs && jobs.length > 0) {
            csvContent += '=== APPOINTMENTS ===\n';
            csvContent += arrayToCSV(jobs, Object.keys(jobs[0]));
            csvContent += '\n\n';
        }

        // Services
        if (services && services.length > 0) {
            csvContent += '=== SERVICES ===\n';
            csvContent += arrayToCSV(services, Object.keys(services[0]));
            csvContent += '\n\n';
        }

        // Leads
        if (leads && leads.length > 0) {
            csvContent += '=== LEADS ===\n';
            csvContent += arrayToCSV(leads, Object.keys(leads[0]));
            csvContent += '\n\n';
        }

        // Recurrence Rules
        if (recurrenceRules && recurrenceRules.length > 0) {
            csvContent += '=== RECURRING APPOINTMENTS ===\n';
            csvContent += arrayToCSV(recurrenceRules, Object.keys(recurrenceRules[0]));
            csvContent += '\n\n';
        }

        // Return as downloadable CSV
        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="k9desk-data-export-${new Date().toISOString().split('T')[0]}.csv"`
            }
        });

    } catch (error: any) {
        console.error('Export error:', error);
        return NextResponse.json(
            { error: 'Failed to export data', details: error.message },
            { status: 500 }
        );
    }
}

// Also support GET requests
export async function GET(req: NextRequest) {
    return POST(req);
}
