import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { applyDocumentFavicon } from './brandingDocument';

describe('applyDocumentFavicon', () => {
    beforeEach(() => {
        document.head.innerHTML = `
            <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
            <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        `;
    });

    afterEach(() => {
        document.head.innerHTML = '';
    });

    it('replaces built-in icons with custom same-origin favicon', () => {
        applyDocumentFavicon('/api/uploads/system/favicon-123.png');

        expect(document.querySelector('link[href="/favicon.svg"]')).toBeNull();
        const custom = document.querySelectorAll('link[data-nexoshare-favicon]');
        expect(custom.length).toBe(2);
        expect(custom[0]?.getAttribute('href')).toContain('/api/uploads/system/favicon-123.png');
        expect(custom[0]?.getAttribute('type')).toBe('image/png');
    });

    it('restores defaults when url is cleared', () => {
        applyDocumentFavicon('/api/uploads/system/favicon-123.png');
        applyDocumentFavicon('');

        expect(document.querySelector('link[href="/favicon.svg"]')).not.toBeNull();
        expect(document.querySelectorAll('link[data-nexoshare-favicon]').length).toBe(0);
    });
});
