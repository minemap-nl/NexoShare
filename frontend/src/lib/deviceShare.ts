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

export async function shareOrCopy(opts: {
    text: string;
    url: string;
    title?: string;
    onCopied: () => void;
}): Promise<void> {
    const { text, url, title, onCopied } = opts;

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

    const clip = text.includes(url) ? text : `${text}\n${url}`;
    await navigator.clipboard.writeText(clip);
    onCopied();
}
