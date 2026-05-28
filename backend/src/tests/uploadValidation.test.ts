import { describe, expect, test } from 'bun:test';
import { buildDemoForceBlockedExtensions } from '../lib/blockedExtensions';
import {
    assertUploadFileNamesAllowed,
    checkExtension,
    getBlockedFilenameReason,
    getUploadBlocklist,
} from '../lib/uploadValidation';

describe('uploadValidation', () => {
    test('checkExtension blocks listed ext and double extensions', () => {
        expect(checkExtension('malware.zip', ['.zip'])).toBe(false);
        expect(checkExtension('photo.jpg', ['.zip'])).toBe(true);
        expect(checkExtension('x.php.jpg', ['.php'])).toBe(false);
    });

    test('getUploadBlocklist for guest never empty', () => {
        const list = getUploadBlocklist({ blockedExtensionsGuest: [] }, 'guest');
        expect(list.length).toBeGreaterThan(0);
        expect(list).toContain('.exe');
    });

    test('demo config blocks zip for user uploads', () => {
        const demoConfig = {
            blockedExtensionsUser: buildDemoForceBlockedExtensions(),
            blockedExtensionsGuest: buildDemoForceBlockedExtensions(),
        };
        expect(getBlockedFilenameReason('archive.zip', getUploadBlocklist(demoConfig, 'user'))).not.toBeNull();
        expect(getBlockedFilenameReason('report.docx', getUploadBlocklist(demoConfig, 'user'))).toBeNull();
    });

    test('assertUploadFileNamesAllowed throws on blocked file in list', () => {
        const demoConfig = {
            blockedExtensionsUser: buildDemoForceBlockedExtensions(),
        };
        expect(() =>
            assertUploadFileNamesAllowed(['ok.pdf', 'bad.zip'], demoConfig, 'user')
        ).toThrow(/not allowed/i);
        expect(() =>
            assertUploadFileNamesAllowed(['a.docx', 'b.png'], demoConfig, 'user')
        ).not.toThrow();
    });

    test('empty user blocklist allows archives in production config', () => {
        const prodConfig = { blockedExtensionsUser: [], blockedExtensionsGuest: [] };
        expect(getUploadBlocklist(prodConfig, 'user').length).toBe(0);
        expect(() =>
            assertUploadFileNamesAllowed(['big.zip'], prodConfig, 'user')
        ).not.toThrow();
    });
});
