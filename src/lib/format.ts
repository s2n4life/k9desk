import { format, parse } from 'date-fns';

export function formatTime12Hour(timeStr: string): string {
    if (!timeStr) return '';
    try {
        // Try parsing "HH:mm"
        const parsed = parse(timeStr, 'HH:mm', new Date());
        if (!isNaN(parsed.getTime())) {
            return format(parsed, 'h:mm a').toLowerCase();
        }
        // If already formatted or invalid, just return it
        return timeStr;
    } catch (e) {
        return timeStr;
    }
}
