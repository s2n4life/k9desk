/**
 * Utility functions for PWA installation and detection
 */

export const isIOS = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isAndroid = () => {
    if (typeof window === 'undefined') return false;
    return /Android/.test(navigator.userAgent);
};

export const isStandalone = () => {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone ||
        (document as any).referrer?.includes('android-app://')
    );
};

export const isSafari = () => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1 && ua.indexOf('crios') === -1;
};

export const isChromeOnIOS = () => {
    if (typeof window === 'undefined') return false;
    return /CriOS/.test(navigator.userAgent);
};

export const getiOSVersion = () => {
    if (!isIOS()) return null;
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
    if (match) {
        return {
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            patch: parseInt(match[3] || '0', 10)
        };
    }
    return null;
};

export const getPlatform = () => {
    if (isIOS()) return 'ios';
    if (isAndroid()) return 'android';
    return 'desktop';
};

/**
 * Logic for 3-day prompt frequency
 */
export const shouldShowPrompt = () => {
    if (typeof window === 'undefined') return false;

    // If we are currently in standalone, don't show prompt
    if (isStandalone()) {
        markAsInstalled();
        return false;
    }

    // If the user has already installed it (detected in a previous session)
    if (localStorage.getItem('pwa_installed') === 'true') return false;

    // If the user has permanently dismissed it
    if (localStorage.getItem('pwa_prompt_permanently_dismissed') === 'true') return false;

    const lastShown = localStorage.getItem('pwa_prompt_last_shown');
    if (!lastShown) return true;

    const now = Date.now();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;

    return (now - parseInt(lastShown, 10)) > threeDaysInMs;
};

export const markPromptShown = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pwa_prompt_last_shown', Date.now().toString());
};

export const markAsInstalled = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pwa_installed', 'true');
};

export const permanentlyDismissPrompt = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('pwa_prompt_permanently_dismissed', 'true');
};
