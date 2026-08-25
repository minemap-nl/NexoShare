import { describe, expect, test } from 'bun:test';
import {
    buildContentSecurityPolicy,
    extractHttpOrigins,
    originFromBrandingUrl,
    parseExtraConnectOriginsFromEnv,
} from '../lib/cspPolicy';

describe('cspPolicy', () => {
    test('originFromBrandingUrl accepts https and rejects relative paths', () => {
        expect(originFromBrandingUrl('https://audio.famretera.nl/web_images/logo.png')).toBe(
            'https://audio.famretera.nl'
        );
        expect(originFromBrandingUrl('/api/uploads/system/logo.png')).toBeNull();
        expect(originFromBrandingUrl('javascript:alert(1)')).toBeNull();
        expect(originFromBrandingUrl('')).toBeNull();
    });

    test('extractHttpOrigins deduplicates and includes OIDC issuer', () => {
        const origins = extractHttpOrigins(
            [
                'https://audio.famretera.nl/a.png',
                'https://audio.famretera.nl/b.png',
                '/api/uploads/system/x.png',
            ],
            'https://auth.example.com/realms/nexo'
        );
        expect(origins).toEqual(['https://audio.famretera.nl', 'https://auth.example.com']);
    });

    test('buildContentSecurityPolicy includes branding origin in connect-src and default-src', () => {
        const csp = buildContentSecurityPolicy({
            brandingUrls: ['https://audio.famretera.nl/web_images/login-logo-klein.png'],
        });
        expect(csp).toContain('connect-src');
        expect(csp).toContain('default-src');
        expect(csp).toContain('https://audio.famretera.nl');
        expect(csp).toContain('https://fonts.googleapis.com');
        expect(csp).toContain('https://fonts.gstatic.com');
        expect(csp).toContain("img-src 'self' data: blob: https:");
    });

    test('buildContentSecurityPolicy without branding still allows Google Fonts', () => {
        const csp = buildContentSecurityPolicy({ brandingUrls: [] });
        expect(csp).toContain('https://fonts.googleapis.com');
        expect(csp).not.toContain('https://audio.famretera.nl');
    });

    test('parseExtraConnectOriginsFromEnv parses comma-separated origins', () => {
        const extras = parseExtraConnectOriginsFromEnv(
            'https://audio.famretera.nl, https://cdn.example.com'
        );
        expect(extras).toContain('https://audio.famretera.nl');
        expect(extras).toContain('https://cdn.example.com');
    });
});
