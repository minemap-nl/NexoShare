import { isAllowedBrandingUrl } from './security';

const MANAGED_ATTR = 'data-nexoshare-favicon';

const DEFAULT_FAVICON_LINKS: Array<{ rel: string; href: string; type?: string; sizes?: string }> = [
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', href: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    { rel: 'shortcut icon', href: '/favicon.ico', type: 'image/x-icon' },
];

function faviconMime(href: string): string {
    const path = href.split('?')[0].toLowerCase();
    if (path.endsWith('.svg')) return 'image/svg+xml';
    if (path.endsWith('.ico')) return 'image/x-icon';
    if (path.endsWith('.gif')) return 'image/gif';
    return 'image/png';
}

function removeManagedFaviconLinks(): void {
    document.querySelectorAll(`link[${MANAGED_ATTR}]`).forEach((el) => el.remove());
}

function removeBuiltInFaviconLinks(): void {
    document
        .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
        .forEach((el) => {
            if (!el.hasAttribute(MANAGED_ATTR)) el.remove();
        });
}

function restoreDefaultFaviconLinks(): void {
    for (const spec of DEFAULT_FAVICON_LINKS) {
        const exists = document.querySelector(`link[rel="${spec.rel}"][href="${spec.href}"]`);
        if (exists) continue;
        const link = document.createElement('link');
        link.rel = spec.rel;
        link.href = spec.href;
        if (spec.type) link.type = spec.type;
        if (spec.sizes) link.sizes = spec.sizes;
        document.head.appendChild(link);
    }
}

function appendManagedIcon(rel: string, href: string): void {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    link.type = faviconMime(href);
    link.setAttribute(MANAGED_ATTR, '1');
    document.head.appendChild(link);
}

/**
 * Apply branding favicon from config. Replaces all built-in index.html icon links when custom URL is set.
 */
export function applyDocumentFavicon(url?: string | null): void {
    if (typeof document === 'undefined') return;

    removeManagedFaviconLinks();

    if (!url || !isAllowedBrandingUrl(url)) {
        restoreDefaultFaviconLinks();
        return;
    }

    removeBuiltInFaviconLinks();

    const href = url.includes('?') ? url : `${url}?v=${encodeURIComponent(url)}`;
    appendManagedIcon('icon', href);
    appendManagedIcon('shortcut icon', href);
}
