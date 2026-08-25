import { describe, expect, test } from 'bun:test';
import {
    getMaxScanBytes,
    getThreatSignatures,
    isClamavScanEnforced,
    isClamavThreatSignature,
    scanPathWithClamav,
    shouldScanInternalShare,
} from '../lib/clamScan';

describe('clamScan helpers', () => {
    test('getMaxScanBytes uses unit multipliers', () => {
        expect(getMaxScanBytes({ maxScanSizeVal: 25, maxScanSizeUnit: 'MB' })).toBe(25 * 1024 * 1024);
        expect(getMaxScanBytes({ maxScanSizeVal: 1, maxScanSizeUnit: 'GB' })).toBe(1024 * 1024 * 1024);
    });

    test('shouldScanInternalShare respects flag and demo', () => {
        expect(shouldScanInternalShare({}, false)).toBe(false);
        expect(shouldScanInternalShare({ clamavScanInternalShares: true }, false)).toBe(true);
        expect(shouldScanInternalShare({}, true)).toBe(true);
    });

    test('isClamavScanEnforced by context', () => {
        expect(isClamavScanEnforced({}, true, 'internal')).toBe(true);
        expect(isClamavScanEnforced({ clamavScanInternalShares: true, clamavMustScan: true }, false, 'internal')).toBe(true);
        expect(isClamavScanEnforced({ clamavScanInternalShares: true, clamavMustScan: false }, false, 'internal')).toBe(false);
        expect(isClamavScanEnforced({ clamavMustScan: false }, false, 'reverse')).toBe(true);
    });

    test('isClamavThreatSignature detects zip-bomb heuristics', () => {
        expect(isClamavThreatSignature('Heuristics.Limits.Exceeded')).toBe(true);
        expect(isClamavThreatSignature('Heuristics.Zip.OverlappingFiles')).toBe(true);
        expect(isClamavThreatSignature('Eicar-Test-Signature')).toBe(false);
        expect(getThreatSignatures(['Heuristics.Zip.Bomb', 'OK'])).toEqual(['Heuristics.Zip.Bomb']);
    });
});

describe('scanPathWithClamav', () => {
    const config = { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavMustScan: true, clamavScanInternalShares: true };
    const noopUnlink = async () => {};

    test('skips internal scan when internal toggle off', async () => {
        const unlinked: string[] = [];
        await scanPathWithClamav({
            filePath: '/tmp/x',
            displayName: 'a.txt',
            fileSizeBytes: 100,
            config: { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavScanInternalShares: false },
            demoMode: false,
            scanContext: 'internal',
            clamscanInstance: {
                isInfected: async () => ({ isInfected: true }),
            },
            unlink: async (p) => { unlinked.push(p); },
        });
        expect(unlinked).toEqual([]);
    });

    test('rejects oversize file when enforced', async () => {
        const unlinked: string[] = [];
        await expect(
            scanPathWithClamav({
                filePath: '/tmp/x',
                displayName: 'big.zip',
                fileSizeBytes: 30 * 1024 * 1024,
                config,
                demoMode: false,
                scanContext: 'internal',
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
                scanContext: 'reverse',
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
                scanContext: 'reverse',
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
                scanContext: 'reverse',
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
            config: { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavScanInternalShares: true, clamavMustScan: false },
            demoMode: false,
            scanContext: 'internal',
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
            config: { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavScanInternalShares: true, clamavMustScan: false },
            demoMode: false,
            scanContext: 'internal',
            clamscanInstance: {
                isInfected: async () => ({ isInfected: false, viruses: [] }),
            },
            unlink: noopUnlink,
        });
    });

    test('fails closed with clear timeout when scan hangs', async () => {
        const unlinked: string[] = [];
        await expect(
            scanPathWithClamav({
                filePath: '/tmp/hang',
                displayName: 'slow.bin',
                fileSizeBytes: 100,
                config: { maxScanSizeVal: 25, maxScanSizeUnit: 'MB', clamavMustScan: true, clamavScanInternalShares: true },
                demoMode: true,
                scanContext: 'internal',
                clamscanInstance: {
                    isInfected: () => new Promise(() => { /* never resolves */ }),
                },
                unlink: async (p) => { unlinked.push(p); },
                scanTimeoutMs: 30,
            })
        ).rejects.toThrow(/timed out|try again/i);
        expect(unlinked).toEqual(['/tmp/hang']);
    });
});
