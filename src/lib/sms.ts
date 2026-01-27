import { Job, Customer, Settings } from './db/schema';
import { JobAction } from './jobs/stateMachine';

function formatTimeTo12Hour(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time;

    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${period}`;
}

export function triggerSMSAction(job: Job, customer: Customer | null, action: JobAction, extraData?: any): boolean {
    if (!customer?.phone) return false;

    const phone = customer.phone;
    let body = '';

    const businessName = extraData?.settings?.businessName || 'Us';
    const settings = extraData?.settings as Settings | undefined;

    if (action === 'SEND_REMINDER') {
        const time = formatTimeTo12Hour(job.scheduledTime);
        const petNames = extraData?.petNames || [];

        let petString = 'your pet\'s'; // Fallback

        if (petNames.length === 1) {
            petString = `${petNames[0]}'s`;
        } else if (petNames.length === 2) {
            petString = `${petNames[0]} & ${petNames[1]}'s`;
        } else if (petNames.length >= 3) {
            petString = 'your pets';
        }

        body = `Hi ${customer.name.split(' ')[0]}, this is ${businessName} reminding you about ${petString} grooming appointment today at ${time}.\nSee you soon!`;

    } else if (action === 'REQUEST_PAYMENT') {
        const amount = extraData?.amount || 0;

        body = `Hi ${customer.name.split(' ')[0]}, thanks for choosing ${businessName}.\nYour total today is $${amount.toFixed(2)}.\n\nYou can send payment here:`;

        if (settings) {
            if (settings.venmo) body += `\nVenmo: ${settings.venmo}`;
            if (settings.zelle) body += `\nZelle: ${settings.zelle}`;
            if (settings.paypal) body += `\nPayPal: ${settings.paypal}`;
            if (settings.cashapp) body += `\nCashApp: ${settings.cashapp}`;
            if (settings.custom_url) body += `\nLink: ${settings.custom_url}`;

            if (!settings.venmo && !settings.zelle && !settings.paypal && !settings.cashapp && !settings.custom_url) {
                body += `\nPlease pay at pickup.`;
            }
        } else {
            body += `\nPlease pay at pickup.`;
        }

        body += `\n\nThank you!`;

    } else if (action === 'SEND_REVIEW_REQUEST') {
        const reviewUrl = settings?.review_url || '';
        body = `Hi ${customer.name.split(' ')[0]}, thanks again for choosing ${businessName}!\nIf you have a moment, we’d really appreciate a quick review:\n${reviewUrl}\n\nThanks so much!`;
    }

    if (body) {
        window.location.href = `sms:${phone}&body=${encodeURIComponent(body)}`; // iOS often needs &body for body prefill if ? is used for phone. Try ?& or just ?
        // Standard sms: scheme is sms:phone?body=... but some devices vary. 
        // Safer to stick to standard but maybe check user agent if needed? No, standard first.
        // Actually, previous code used ?body. Let's stick to ?body but ensure phone doesn't have separators?
        // Reuse previous implementation style but careful with separators.
        // Reverting to ?body as it was in original file.
        window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`;
        return true;
    }

    return false;
}
