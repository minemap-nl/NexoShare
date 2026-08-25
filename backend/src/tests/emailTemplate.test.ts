import { describe, expect, test } from 'bun:test';
import {
    buildEmailHtml,
    resolveEmailLogoSrc,
    DEFAULT_EMAIL_LOGO_PATH,
    EMAIL_MESSAGE_BOX_STYLE,
} from '../lib/emailTemplate';

describe('resolveEmailLogoSrc', () => {
    test('falls back to default logo on base URL', () => {
        expect(resolveEmailLogoSrc(null, 'https://share.example.com')).toBe(
            `https://share.example.com${DEFAULT_EMAIL_LOGO_PATH}`
        );
        expect(resolveEmailLogoSrc('', 'https://share.example.com/')).toBe(
            `https://share.example.com${DEFAULT_EMAIL_LOGO_PATH}`
        );
    });

    test('keeps absolute http(s) custom logos', () => {
        expect(resolveEmailLogoSrc('https://cdn.example.com/logo.png', 'https://share.example.com')).toBe(
            'https://cdn.example.com/logo.png'
        );
    });

    test('absolutizes relative custom logos', () => {
        expect(
            resolveEmailLogoSrc('/api/uploads/system/logo.png', 'https://share.example.com')
        ).toBe('https://share.example.com/api/uploads/system/logo.png');
        expect(resolveEmailLogoSrc('api/uploads/system/logo.png', 'https://share.example.com')).toBe(
            'https://share.example.com/api/uploads/system/logo.png'
        );
    });
});

describe('buildEmailHtml', () => {
    test('is light-only and uses teal brand accents', () => {
        const html = buildEmailHtml({
            appName: 'Nexo Share',
            subject: 'Files received',
            bodyHtml: '<p>Hello</p>',
            ctaLink: 'https://example.com/s/1',
            ctaText: 'Download Files',
            logoSrc: 'https://example.com/logo-email.png',
        });
        expect(html).toContain('color-scheme" content="light only"');
        expect(html).toContain('supported-color-schemes" content="light"');
        expect(html).not.toContain('prefers-color-scheme');
        expect(html).toContain('#0d9488');
        expect(html).toContain('#f0fdfa');
        expect(html).toContain('https://example.com/logo-email.png');
        expect(html).toContain('Download Files');
        expect(html).toContain('Sent via Nexo Share');
        expect(html).toContain('max-height: 48px');
        expect(html).toContain('max-width: 220px');
    });

    test('exports message box style with teal accent', () => {
        expect(EMAIL_MESSAGE_BOX_STYLE).toContain('#14b8a6');
        expect(EMAIL_MESSAGE_BOX_STYLE).toContain('#f8fafc');
    });
});
