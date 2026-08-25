export async function computeChunkHash(chunk: Blob): Promise<string> {
    const buffer = await chunk.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getBackoffDelay(attempt: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.floor(exponentialDelay + jitter);
}

/** User-facing message for axios/network upload failures (incl. proxy 502/504). */
export function getUploadErrorMessage(err: any, fallback = 'Upload failed'): string {
    const status = err?.response?.status;
    if (status === 504 || status === 502) {
        return 'Upload timed out (server or proxy). Please try again.';
    }
    if (status === 503) {
        return err?.response?.data?.error || 'Service temporarily unavailable. Please try again.';
    }
    if (status === 413) {
        const bodyErr = err?.response?.data?.error;
        if (typeof bodyErr === 'string' && bodyErr.trim()) return bodyErr;
        return 'Upload rejected as too large by the server or proxy. If the file is under the app limit, check reverse-proxy body size settings.';
    }
    return err?.response?.data?.error || err?.message || fallback;
}

/** Crypto-veilige UUID generator voor browser */
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, (c) => {
            const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        })
        .replace(/-/g, '')
        .substring(0, 16);
}
