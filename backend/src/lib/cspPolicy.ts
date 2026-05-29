/**
 * Builds Content-Security-Policy for HTML/API responses.
 * connect-src includes branding/config origins so service workers can fetch() cached assets.
 */

const CLOUDFLARE_INSIGHTS = [
    'https://cloudflareinsights.com',
    'https://static.cloudflareinsights.com',
] as const;

const GOOGLE_FONTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'] as const;

const BLOCKED_URL_SCHEMES = /^(javascript|data|vbscript|file):/i;

export type CspPolicyOptions = {
    brandingUrls?: (string | undefined | null)[];
    oidcIssuer?: string | null;
    ssoEnabled?: boolean;
    extraConnectOrigins?: string[];
};

/** Parse absolute http(s) URL and return origin, or null for relative/invalid/blocked schemes. */
export function originFromBrandingUrl(url: unknown): string | null {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith('/')) return null;
    if (BLOCKED_URL_SCHEMES.test(trimmed)) return null;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
    } catch {
        return null;
    }
}

/** Collect unique http(s) origins from config URLs and optional OIDC issuer. */
export function extractHttpOrigins(urls: (string | undefined | null)[], oidcIssuer?: string | null): string[] {
    const origins = new Set<string>();
    for (const url of urls) {
        const origin = originFromBrandingUrl(url);
        if (origin) origins.add(origin);
    }
    const issuerOrigin = originFromBrandingUrl(oidcIssuer);
    if (issuerOrigin) origins.add(issuerOrigin);
    return [...origins];
}

/**
 * Comma-separated CSP connect-src entries from env.
 * Accepts full origins (https://host) or wildcard host sources (https://*.example.com).
 */
export function parseExtraConnectOriginsFromEnv(raw: string | undefined): string[] {
    if (!raw || typeof raw !== 'string') return [];
    const out: string[] = [];
    for (const part of raw.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const asOrigin = originFromBrandingUrl(trimmed);
        if (asOrigin) {
            out.push(asOrigin);
            continue;
        }
        if (/^https?:\/\/(\*\.)?[^/\s*][^/\s]*$/.test(trimmed)) {
            out.push(trimmed);
        }
    }
    return out;
}

function uniqueSources(sources: string[]): string[] {
    return [...new Set(sources.filter(Boolean))];
}

export function buildContentSecurityPolicy(options: CspPolicyOptions = {}): string {
    const brandingOrigins = extractHttpOrigins(options.brandingUrls ?? [], options.oidcIssuer);
    const envExtras = options.extraConnectOrigins ?? [];

    const connectSrc = uniqueSources([
        "'self'",
        ...CLOUDFLARE_INSIGHTS,
        ...GOOGLE_FONTS,
        ...brandingOrigins,
        ...envExtras,
    ]);

    // Favicon via <link rel="icon"> is governed by default-src (not img-src).
    const defaultSrc = uniqueSources(["'self'", ...brandingOrigins, ...envExtras]);

    const styleSrc = uniqueSources(["'self'", "'unsafe-inline'", ...GOOGLE_FONTS]);
    const fontSrc = uniqueSources(["'self'", 'data:', ...GOOGLE_FONTS]);

    const directives = [
        `default-src ${defaultSrc.join(' ')}`,
        `script-src 'self' 'unsafe-inline' ${CLOUDFLARE_INSIGHTS.join(' ')}`,
        `style-src ${styleSrc.join(' ')}`,
        "img-src 'self' data: blob: https:",
        `connect-src ${connectSrc.join(' ')}`,
        `font-src ${fontSrc.join(' ')}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' https:",
    ];

    return directives.join('; ');
}
