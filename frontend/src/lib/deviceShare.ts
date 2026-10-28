export function isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const narrowTouch =
        typeof window !== 'undefined' &&
        window.matchMedia('(max-width: 768px)').matches &&
        'ontouchstart' in window;
    return mobileUa || narrowTouch;
}

/** iPhone / iPod / iPad, including iPadOS that reports as MacIntel. */
export function isIOSDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    if (/iP(hone|ad|od)/.test(ua)) return true;
    return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** Only allow http(s) share links into clipboard / Web Share (blocks javascript: etc.). */
export function isSafeShareUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}

export async function shareOrCopy(opts: {
    text: string;
    url: string;
    title?: string;
    onCopied: () => void;
}): Promise<void> {
    const { text, url, title, onCopied } = opts;
    const safeUrl = isSafeShareUrl(url) ? url : '';

    if (isMobileDevice() && typeof navigator.share === 'function') {
        try {
            await navigator.share({
                title: title || 'Nexo Share',
                text,
            });
            return;
        } catch (e: unknown) {
            const err = e as { name?: string };
            if (err?.name === 'AbortError') return;
        }
    }

    const clip = safeUrl && text.includes(safeUrl) ? text : safeUrl ? `${text}\n${safeUrl}` : text;
    await navigator.clipboard.writeText(clip);
    onCopied();
}
