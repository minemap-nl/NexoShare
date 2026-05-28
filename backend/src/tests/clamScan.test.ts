import { describe, expect, test } from 'bun:test';
import {
    getMaxScanBytes,
    getThreatSignatures,
    isClamavScanEnforced,
    isClamavThreatSignature,
    scanPathWithClamav,
} from '../lib/clamScan';

describe('clamScan helpers', () => {
    test('getMaxScanBytes uses unit multipliers', () => {
        expect(getMaxScanBytes({ maxScanSizeVal: 25, maxScanSizeUnit: 'MB' })).toBe(25 * 1024 * 1024);
        expect(getMaxScanBytes({ maxScanSizeVal: 1, maxScanSizeUnit: 'GB' })).toBe(1024 * 1024 * 1024);
    });

    test('isClamavScanEnforced when demo or config flag', () => {
        expect(isClamavScanEnforced({}, true)).toBe(true);
        expect(isClamavScanEnforced({ clamavMustScan: true }, false)).toBe(true);
        expect(isClamavScanEnforced({ clamavMustScan: false }, false)).toBe(false);
    });

    test('isClamavThreatSignature detects zip-bomb heuristics', () => {
        expect(isClamavThreatSignature('Heuristics.Limits.Exceeded')).toBe(true);
        expect(isClamavThreatSignature('Heuristics.Zip.OverlappingFiles')).toBe(true);
        expect(isClamavThreatSignature('Eicar-Test-Signature')).toBe(false);
        expect(getThreatSignatures(['Heuristics.Zip.Bomb', 'OK'])).toEqual(['Heuristics.Zip.Bomb']);
    });
});

describe('scanPathWithClamav', () => {
    const config = { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavMustScan: true };
    const noopUnlink = async () => {};

    test('rejects oversize file when enforced', async () => {
        const unlinked: string[] = [];
        await expect(
            scanPathWithClamav({
                filePath: '/tmp/x',
                displayName: 'big.zip',
                fileSizeBytes: 30 * 1024 * 1024,
                config,
                demoMode: false,
                clamscanInstance: null,
                unlink: async (p) => { unlinked.push(p); },
            })
        ).rejects.toThrow(/exceeds/);
        expect(unlinked).toEqual(['/tmp/x']);
    });

    test('rejects when scanner offline and enforced', async () => {
        await expect(
            scanPathWithClamav({
                filePath: '/tmp/x',
                displayName: 'a.txt',
                fileSizeBytes: 100,
                config,
                demoMode: false,
                clamscanInstance: null,
                unlink: noopUnlink,
            })
        ).rejects.toThrow(/unavailable/i);
    });

    test('rejects infected files', async () => {
        await expect(
            scanPathWithClamav({
                filePath: '/tmp/x',
                displayName: 'evil.zip',
                fileSizeBytes: 100,
                config,
                demoMode: false,
                clamscanInstance: {
                    isInfected: async () => ({ isInfected: true, viruses: ['Eicar-Signature'] }),
                },
                unlink: noopUnlink,
            })
        ).rejects.toThrow(/Virus detected/);
    });

    test('rejects zip heuristic signatures when not marked infected', async () => {
        await expect(
            scanPathWithClamav({
                filePath: '/tmp/x',
                displayName: 'bomb.zip',
                fileSizeBytes: 100,
                config,
                demoMode: false,
                clamscanInstance: {
                    isInfected: async () => ({
                        isInfected: false,
                        viruses: ['Heuristics.Zip.OverlappingFiles'],
                    }),
                },
                unlink: noopUnlink,
            })
        ).rejects.toThrow(/Virus detected/);
    });

    test('skips scan when oversized but not enforced', async () => {
        await scanPathWithClamav({
            filePath: '/tmp/x',
            displayName: 'big.bin',
            fileSizeBytes: 30 * 1024 * 1024,
            config: { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavMustScan: false },
            demoMode: false,
            clamscanInstance: {
                isInfected: async () => ({ isInfected: true }),
            },
            unlink: noopUnlink,
        });
    });

    test('passes clean scan', async () => {
        await scanPathWithClamav({
            filePath: '/tmp/x',
            displayName: 'ok.txt',
            fileSizeBytes: 100,
            config: { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavMustScan: false },
            demoMode: false,
            clamscanInstance: {
                isInfected: async () => ({ isInfected: false, viruses: [] }),
            },
            unlink: noopUnlink,
        });
    });
});
