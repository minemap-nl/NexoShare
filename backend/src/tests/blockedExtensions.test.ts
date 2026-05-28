import { describe, expect, test } from 'bun:test';
import {
    ARCHIVE_EXTENSIONS,
    buildDemoForceBlockedExtensions,
    isArchiveExtension,
} from '../lib/blockedExtensions';

describe('blockedExtensions', () => {
    test('demo blocklist includes archives but not Office Open XML', () => {
        const demo = buildDemoForceBlockedExtensions();
        expect(demo).toContain('.zip');
        expect(demo).toContain('.rar');
        expect(demo).not.toContain('.docx');
        expect(demo).not.toContain('.pptx');
        expect(demo).not.toContain('.xlsx');
    });

    test('isArchiveExtension matches known archive suffixes', () => {
        expect(isArchiveExtension('.zip')).toBe(true);
        expect(isArchiveExtension('.ZIP')).toBe(true);
        expect(isArchiveExtension('.docx')).toBe(false);
        expect(ARCHIVE_EXTENSIONS.length).toBeGreaterThan(5);
    });
});
