/** Loose archive/container uploads (not Office Open XML). */
export const ARCHIVE_EXTENSIONS = [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz', '.zst',
    '.tgz', '.tbz2', '.lz', '.lzma', '.cab', '.arj',
] as const;

const DEMO_EXECUTABLE_BLOCKED = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.php', '.php3', '.php4', '.phtml', '.pl', '.py', '.cgi',
    '.jsp', '.asp', '.aspx', '.jar', '.msi', '.com', '.scr', '.hta', '.app', '.dmg', '.pkg',
] as const;

/** Demo: executables + archive formats (Office .docx/.pptx/.xlsx are not archives here). */
export function buildDemoForceBlockedExtensions(): string[] {
    return [...DEMO_EXECUTABLE_BLOCKED, ...ARCHIVE_EXTENSIONS];
}

export function isArchiveExtension(ext: string): boolean {
    const lower = ext.toLowerCase();
    return (ARCHIVE_EXTENSIONS as readonly string[]).includes(lower);
}
