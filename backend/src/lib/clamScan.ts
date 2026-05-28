export type ScanConfig = {
    maxScanSizeVal?: number;
    maxScanSizeUnit?: string;
    clamavMustScan?: boolean;
};

export type ScanMessageOverrides = {
    virusDetected?: (displayName: string) => string;
    sizeExceeded?: (displayName: string, fileSizeMB: string, limitMB: string) => string;
    streamLimit?: (displayName: string, suggestedMB: number) => string;
    scanError?: () => string;
    scannerOffline?: () => string;
};

export type ScanPathParams = {
    filePath: string;
    displayName: string;
    fileSizeBytes: number;
    config: ScanConfig;
    demoMode: boolean;
    clamscanInstance: { isInfected: (path: string) => Promise<{ isInfected: boolean; viruses?: string[] }> } | null;
    unlink: (filePath: string) => Promise<void>;
    messages?: ScanMessageOverrides;
};

const SIZE_MULTIPLIERS: Record<string, number> = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
};

export function getMaxScanBytes(config: ScanConfig): number {
    const val = config.maxScanSizeVal ?? 25;
    const unit = config.maxScanSizeUnit || 'MB';
    return val * (SIZE_MULTIPLIERS[unit] ?? SIZE_MULTIPLIERS.MB);
}

export function isClamavScanEnforced(config: ScanConfig, demoMode: boolean): boolean {
    return demoMode || !!config.clamavMustScan;
}

/** ClamAV limit / zip-bomb heuristics that must reject uploads when scan is enforced. */
export function isClamavThreatSignature(signature: string): boolean {
    if (!signature) return false;
    if (signature.includes('Heuristics.Limits.Exceeded')) return true;
    if (signature.startsWith('Heuristics.Zip.')) return true;
    if (signature.includes('Zip.Bomb') || signature.includes('ZipBomb')) return true;
    return false;
}

export function getThreatSignatures(viruses: string[] | undefined): string[] {
    if (!viruses?.length) return [];
    return viruses.filter(isClamavThreatSignature);
}

function defaultMessages(): Required<ScanMessageOverrides> {
    return {
        virusDetected: (displayName) => `Virus detected in ${displayName}! Upload refused.`,
        sizeExceeded: (displayName, fileSizeMB, limitMB) =>
            `File "${displayName}" (${fileSizeMB} MB) exceeds the virus scan limit (${limitMB} MB). ` +
            `To scan larger files, increase 'Max Virus Scan File Size' in settings AND update ClamAV's StreamMaxLength in clamd.conf.`,
        streamLimit: (displayName, suggestedMB) =>
            `ClamAV rejected file "${displayName}": stream limit exceeded. ` +
            `Increase StreamMaxLength in clamd.conf to at least ${suggestedMB}M and restart ClamAV.`,
        scanError: () => 'Error during virusscan. Try again later.',
        scannerOffline: () => 'Security error: Virus scanner unavailable, upload refused.',
    };
}

function resolveMessages(overrides?: ScanMessageOverrides): Required<ScanMessageOverrides> {
    const base = defaultMessages();
    return {
        virusDetected: overrides?.virusDetected ?? base.virusDetected,
        sizeExceeded: overrides?.sizeExceeded ?? base.sizeExceeded,
        streamLimit: overrides?.streamLimit ?? base.streamLimit,
        scanError: overrides?.scanError ?? base.scanError,
        scannerOffline: overrides?.scannerOffline ?? base.scannerOffline,
    };
}

function isStreamLimitError(message: string): boolean {
    return message.includes('INSTREAM size limit exceeded') || message.includes('StreamMaxLength');
}

function isPropagatedScanError(message: string): boolean {
    return (
        message.includes('Virus') ||
        message.includes('exceeds') ||
        message.includes('virus scan limit') ||
        message.includes('scanner unavailable') ||
        message.includes('virusscan')
    );
}

/**
 * Scan one file on disk via ClamAV (size gate, offline gate, infection / heuristics).
 * Throws on reject; no-op when scan skipped (non-enforced oversize / offline).
 */
export async function scanPathWithClamav(params: ScanPathParams): Promise<void> {
    const {
        filePath,
        displayName,
        fileSizeBytes,
        config,
        demoMode,
        clamscanInstance,
        unlink,
        messages: messageOverrides,
    } = params;

    const messages = resolveMessages(messageOverrides);
    const enforced = isClamavScanEnforced(config, demoMode);
    const maxScanBytes = getMaxScanBytes(config);

    if (fileSizeBytes > maxScanBytes) {
        const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
        const limitMB = (maxScanBytes / (1024 * 1024)).toFixed(0);
        if (enforced) {
            await unlink(filePath);
            throw new Error(messages.sizeExceeded(displayName, fileSizeMB, limitMB));
        }
        console.warn(
            `⚠️ Skipping virus scan for "${displayName}" (${fileSizeMB} MB): exceeds limit of ${limitMB} MB.`
        );
        return;
    }

    if (!clamscanInstance) {
        if (enforced) {
            console.error("⛔ Upload blocked: ClamAV is offline, but 'Enforce Virus Scan' is turned on.");
            await unlink(filePath);
            throw new Error(messages.scannerOffline());
        }
        console.warn('⚠️ Virusscan skipped: ClamAV is offline (not enforced).');
        return;
    }

    try {
        const result = await clamscanInstance.isInfected(filePath);
        const viruses = result.viruses ?? [];

        if (result.isInfected) {
            await unlink(filePath);
            throw new Error(messages.virusDetected(displayName));
        }

        if (enforced && getThreatSignatures(viruses).length > 0) {
            await unlink(filePath);
            throw new Error(messages.virusDetected(displayName));
        }
    } catch (e: unknown) {
        const err = e as { message?: string };
        const msg = err?.message ?? String(e);

        if (isPropagatedScanError(msg)) throw e;

        if (isStreamLimitError(msg)) {
            const suggestedMB = Math.ceil(fileSizeBytes / (1024 * 1024)) + 10;
            await unlink(filePath);
            throw new Error(messages.streamLimit(displayName, suggestedMB));
        }

        if (enforced && (msg.includes('Heuristics.Limits.Exceeded') || msg.includes('Heuristics.Zip.'))) {
            await unlink(filePath);
            throw new Error(messages.virusDetected(displayName));
        }

        if (enforced) {
            console.error(`Scan error (Closed): ${msg}`);
            await unlink(filePath);
            throw new Error(messages.scanError());
        }
        console.warn(`Scan error (Open): ${msg}`);
    }
}

export const SCAN_MESSAGES_FINALIZE: ScanMessageOverrides = {
    virusDetected: (displayName) => `Virus detected in ${displayName}!`,
    sizeExceeded: (displayName, fileSizeMB, limitMB) =>
        `File "${displayName}" (${fileSizeMB} MB) exceeds virus scan limit (${limitMB} MB). ` +
        `Increase 'Max Virus Scan File Size' in settings AND ClamAV's StreamMaxLength in clamd.conf.`,
    streamLimit: (displayName, suggestedMB) =>
        `ClamAV rejected "${displayName}": stream limit exceeded. ` +
        `Increase StreamMaxLength in clamd.conf to at least ${suggestedMB}M.`,
    scanError: () => 'Virus scan error. Try again later.',
    scannerOffline: () => 'Virus scanner unavailable, upload refused.',
};

export const SCAN_MESSAGES_STAGED: ScanMessageOverrides = {
    ...SCAN_MESSAGES_FINALIZE,
    sizeExceeded: (displayName, fileSizeMB, limitMB) =>
        `File "${displayName}" (${fileSizeMB} MB) exceeds virus scan limit (${limitMB} MB). ` +
        `Increase 'Max Virus Scan File Size' in settings AND ClamAV's StreamMaxLength.`,
};

export const SCAN_MESSAGES_REVERSE: ScanMessageOverrides = {
    virusDetected: (displayName) => `Virus in ${displayName}!`,
    sizeExceeded: (displayName, fileSizeMB, limitMB) =>
        `File "${displayName}" (${fileSizeMB} MB) exceeds virus scan limit (${limitMB} MB). ` +
        `Contact the administrator to increase the virus scan limit.`,
    streamLimit: () =>
        'Virus scanner rejected file due to size limit. Please contact the administrator.',
    scanError: () => 'Virus scan error. Try again later.',
    scannerOffline: () => 'Security error: Virus scanner is unavailable.',
};
