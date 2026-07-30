import { createHash } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import type { Response } from 'express';
import type { Pool } from 'pg';

export type PrezipType = 'share' | 'reverse';

export function getShareZipsDir(uploadDir: string): string {
    return path.resolve(process.env.SHARE_ZIPS_DIR || path.join(uploadDir, 'share_zips'));
}

export function getZipPath(zipsDir: string, type: PrezipType, id: string): string {
    return path.join(zipsDir, `${type}_${id}.zip`);
}

export function getZipTempPath(zipsDir: string, type: PrezipType, id: string): string {
    return path.join(zipsDir, `${type}_${id}.zip.tmp`);
}

export function computeManifest(files: { id: number; size: number | string; storage_path: string }[]): string {
    const sorted = [...files].sort((a, b) => a.id - b.id);
    const payload = sorted.map((f) => `${f.id}:${f.size}:${f.storage_path}`).join('|');
    return createHash('sha256').update(payload).digest('hex').slice(0, 64);
}

class PrezipQueue {
    private running = 0;
    private queue: Array<(value: unknown) => void> = [];

    constructor(private maxConcurrent: number) {}

    async wait(): Promise<void> {
        if (this.running >= this.maxConcurrent) {
            await new Promise((resolve) => this.queue.push(resolve));
        }
        this.running++;
    }

    release(): void {
        this.running--;
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next(null);
        }
    }
}

const prezipQueue = new PrezipQueue(3);

function tableForType(type: PrezipType): string {
    return type === 'share' ? 'shares' : 'reverse_shares';
}

async function queryFiles(pool: Pool, type: PrezipType, id: string) {
    if (type === 'share') {
        return pool.query(
            'SELECT id, size, storage_path, original_name, mime_type FROM files WHERE share_id = $1 ORDER BY id',
            [id]
        );
    }
    return pool.query(
        'SELECT id, size, storage_path, original_name, mime_type FROM files WHERE reverse_share_id = $1 ORDER BY id',
        [id]
    );
}

export async function invalidatePrezip(pool: Pool, zipsDir: string, type: PrezipType, id: string): Promise<void> {
    const zipPath = getZipPath(zipsDir, type, id);
    const tmpPath = getZipTempPath(zipsDir, type, id);
    await fs.unlink(zipPath).catch(() => {});
    await fs.unlink(tmpPath).catch(() => {});
    await pool.query(
        `UPDATE ${tableForType(type)} SET prezip_status = NULL, prezip_manifest = NULL, prezip_size = NULL WHERE id = $1`,
        [id]
    );
}

export async function buildPrezip(
    pool: Pool,
    zipsDir: string,
    type: PrezipType,
    id: string,
    zipOptions: { zipLevel?: number; zipNoMedia?: boolean }
): Promise<void> {
    const table = tableForType(type);
    const filesRes = await queryFiles(pool, type, id);
    const files = filesRes.rows;
    if (files.length === 0) {
        await invalidatePrezip(pool, zipsDir, type, id);
        return;
    }

    const manifest = computeManifest(files);
    await pool.query(`UPDATE ${table} SET prezip_status = $1, prezip_manifest = $2 WHERE id = $3`, [
        'pending',
        manifest,
        id,
    ]);

    await prezipQueue.wait();
    try {
        const check = await pool.query(`SELECT prezip_manifest FROM ${table} WHERE id = $1`, [id]);
        if (check.rows[0]?.prezip_manifest !== manifest) {
            return;
        }

        await fs.mkdir(zipsDir, { recursive: true });
        const zipPath = getZipPath(zipsDir, type, id);
        const tmpPath = getZipTempPath(zipsDir, type, id);
        await fs.unlink(tmpPath).catch(() => {});

        const totalSize = files.reduce((acc: number, f: { size: number | string }) => acc + parseInt(String(f.size), 10), 0);
        const useCompression = totalSize < 100 * 1024 * 1024;

        await new Promise<void>((resolve, reject) => {
            const output = createWriteStream(tmpPath);
            const archive = new ZipArchive({
                zlib: { level: useCompression ? (zipOptions.zipLevel ?? 5) : 0 },
                store: !useCompression,
            });

            output.on('close', () => resolve());
            output.on('error', reject);
            archive.on('error', reject);
            archive.pipe(output);

            const usedNames = new Set<string>();
            for (const f of files) {
                const isMedia =
                    zipOptions.zipNoMedia &&
                    (f.mime_type?.startsWith('image') ||
                        f.mime_type?.startsWith('video') ||
                        f.mime_type?.startsWith('audio'));
                const shouldStore = !useCompression || isMedia;
                let entryName = f.original_name;
                if (usedNames.has(entryName)) {
                    let counter = 1;
                    const ext = path.extname(entryName);
                    const base = path.basename(entryName, ext);
                    while (usedNames.has(`${base} (${counter})${ext}`)) counter++;
                    entryName = `${base} (${counter})${ext}`;
                }
                usedNames.add(entryName);
                archive.file(f.storage_path, { name: entryName, store: shouldStore } as Parameters<ZipArchive['file']>[1]);
            }
            archive.finalize();
        });

        const stat = await fs.stat(tmpPath);
        await fs.rename(tmpPath, zipPath);
        await pool.query(
            `UPDATE ${table} SET prezip_status = $1, prezip_manifest = $2, prezip_size = $3 WHERE id = $4`,
            ['ready', manifest, stat.size, id]
        );
    } catch (e) {
        console.error(`Prezip build failed (${type}/${id}):`, e);
        await pool.query(`UPDATE ${table} SET prezip_status = $1 WHERE id = $2`, ['failed', id]);
        await fs.unlink(getZipTempPath(zipsDir, type, id)).catch(() => {});
    } finally {
        prezipQueue.release();
    }
}

export function schedulePrezip(
    pool: Pool,
    zipsDir: string,
    type: PrezipType,
    id: string,
    zipOptions: { zipLevel?: number; zipNoMedia?: boolean }
): void {
    void buildPrezip(pool, zipsDir, type, id, zipOptions);
}

export async function tryStreamPrezip(
    res: Response,
    pool: Pool,
    zipsDir: string,
    type: PrezipType,
    id: string,
    manifest: string,
    attachmentName: string
): Promise<boolean> {
    const table = tableForType(type);
    const row = await pool.query(
        `SELECT prezip_status, prezip_manifest, prezip_size FROM ${table} WHERE id = $1`,
        [id]
    );
    if (row.rows.length === 0) return false;
    const { prezip_status, prezip_manifest, prezip_size } = row.rows[0];
    if (prezip_status !== 'ready' || prezip_manifest !== manifest || !prezip_size) {
        return false;
    }

    const zipPath = getZipPath(zipsDir, type, id);
    try {
        await fs.access(zipPath);
    } catch {
        return false;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', Number(prezip_size));
    res.attachment(attachmentName);

    return new Promise((resolve) => {
        const stream = createReadStream(zipPath);
        stream.on('error', () => resolve(false));
        stream.pipe(res);
        stream.on('end', () => resolve(true));
    });
}

export async function cleanupOrphanedShareZips(pool: Pool, zipsDir: string): Promise<void> {
    try {
        await fs.mkdir(zipsDir, { recursive: true });
        const entries = await fs.readdir(zipsDir);
        for (const name of entries) {
            if (!name.endsWith('.zip') && !name.endsWith('.zip.tmp')) continue;
            const base = name.replace(/\.zip\.tmp$/, '').replace(/\.zip$/, '');
            const match = base.match(/^(share|reverse)_(.+)$/);
            if (!match) {
                await fs.unlink(path.join(zipsDir, name)).catch(() => {});
                continue;
            }
            const [, type, id] = match as [string, PrezipType, string];
            const table = tableForType(type);
            const exists = await pool.query(`SELECT id FROM ${table} WHERE id = $1`, [id]);
            if (exists.rows.length === 0) {
                await fs.unlink(path.join(zipsDir, name)).catch(() => {});
                continue;
            }
            const filesRes = await queryFiles(pool, type, id);
            if (filesRes.rows.length === 0) {
                await invalidatePrezip(pool, zipsDir, type, id);
                continue;
            }
            const manifest = computeManifest(filesRes.rows);
            const status = await pool.query(`SELECT prezip_manifest FROM ${table} WHERE id = $1`, [id]);
            if (status.rows[0]?.prezip_manifest !== manifest) {
                await invalidatePrezip(pool, zipsDir, type, id);
            }
        }
    } catch (e) {
        console.error('Orphan share_zips cleanup error:', e);
    }
}
