import { describe, expect, it } from 'vitest';
import { isAllowedBrandingUrl, isValidHttpUrl } from './security';

describe('security', () => {
    it('isValidHttpUrl accepts https only as absolute URL', () => {
        expect(isValidHttpUrl('https://audio.famretera.nl/logo.png')).toBe(true);
        expect(isValidHttpUrl('/api/uploads/system/logo.png')).toBe(false);
    });

    it('isAllowedBrandingUrl accepts https and system upload paths', () => {
        expect(isAllowedBrandingUrl('https://audio.famretera.nl/logo.png')).toBe(true);
        expect(isAllowedBrandingUrl('/api/uploads/system/logo-123.png')).toBe(true);
        expect(isAllowedBrandingUrl('//evil.com/x')).toBe(false);
        expect(isAllowedBrandingUrl('javascript:alert(1)')).toBe(false);
        expect(isAllowedBrandingUrl('/logo.svg')).toBe(true);
    });
});
