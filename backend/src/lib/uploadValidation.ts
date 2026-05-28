import { buildDemoForceBlockedExtensions } from './blockedExtensions';

/** Baseline guest blocklist when DB/config list is empty (executables only). */
export const DEFAULT_GUEST_BLOCKED_EXTENSIONS: readonly string[] = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.php', '.php3', '.php4', '.phtml', '.pl', '.py', '.cgi',
    '.jsp', '.asp', '.aspx', '.jar', '.msi', '.com', '.scr', '.hta', '.app', '.dmg', '.pkg',
];

export type UploadAudience = 'user' | 'guest';

export function checkExtension(filename: string, blocklist: string[]): boolean {
    const ext = pathExtname(filename);
    if (blocklist.includes(ext)) return false;

    const parts = filename.split('.');
    if (parts.length > 2) {
        const secondLast = '.' + parts[parts.length - 2].toLowerCase();
        if (blocklist.includes(secondLast)) return false;
    }
    return true;
}

function pathExtname(filename: string): string {
    const base = filename.replace(/\\/g, '/').split('/').pop() || filename;
    const idx = base.lastIndexOf('.');
    if (idx <= 0) return '';
    return base.slice(idx).toLowerCase();
}

function normalizeBlocklist(list: unknown): string[] {
    if (!Array.isArray(list)) return [];
    return list
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .map((x) => (x.startsWith('.') ? x.toLowerCase() : `.${x.toLowerCase()}`));
}

/**
 * Effective blocklist for an upload audience (after demo policy on config).
 * Guest: never empty — falls back to DEFAULT_GUEST_BLOCKED_EXTENSIONS.
 * User: admin list only (demo merges archives + executables via applyDemoSecurityPolicy).
 */
export function getUploadBlocklist(
    config: { blockedExtensionsUser?: string[]; blockedExtensionsGuest?: string[] },
    audience: UploadAudience
): string[] {
    if (audience === 'guest') {
        const fromConfig = normalizeBlocklist(config.blockedExtensionsGuest);
        if (fromConfig.length > 0) return fromConfig;
        return [...DEFAULT_GUEST_BLOCKED_EXTENSIONS];
    }
    return normalizeBlocklist(config.blockedExtensionsUser);
}

export function getBlockedFilenameReason(filename: string, blocklist: string[]): string | null {
    if (!filename || !String(filename).trim()) return 'Invalid file name';
    if (blocklist.length === 0) return null;
    if (checkExtension(filename, blocklist)) return null;
    const ext = pathExtname(filename) || '(no extension)';
    return `File type not allowed (${ext}): ${filename}`;
}

/** Throws Error when any name is blocked. */
export function assertUploadFileNamesAllowed(
    fileNames: string[],
    config: { blockedExtensionsUser?: string[]; blockedExtensionsGuest?: string[] },
    audience: UploadAudience
): void {
    const blocklist = getUploadBlocklist(config, audience);
    if (blocklist.length === 0) return;

    for (const raw of fileNames) {
        const name = String(raw ?? '').trim();
        if (!name) throw new Error('Invalid file name in upload list');
        const reason = getBlockedFilenameReason(name, blocklist);
        if (reason) throw new Error(reason);
    }
}

/** Demo blocklist for tests / reference. */
export const DEMO_BLOCKED_ALL = buildDemoForceBlockedExtensions();
