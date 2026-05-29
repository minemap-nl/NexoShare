/**
 * Alleen http: en https: — blokkeert o.a. javascript:, data:, blob: voor gebruik als logo-URL / openbare href.
 */
export function isValidHttpUrl(url?: string): boolean {
    if (!url) return false;
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Branding URLs: absolute http(s) or same-origin paths (e.g. /api/uploads/system/logo.png).
 */
export function isAllowedBrandingUrl(url?: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
    return isValidHttpUrl(trimmed);
}
