export type ShareOwnershipResult =
    | { ok: true; userId: number }
    | { ok: false; status: 404 | 403; error: string };

/** Pure ownership check for share rows (IDOR defense). */
export function evaluateShareOwnership(
    row: { user_id: number } | undefined | null,
    requesterId: number
): ShareOwnershipResult {
    if (!row) return { ok: false, status: 404, error: 'Share not found' };
    if (row.user_id !== requesterId) return { ok: false, status: 403, error: 'Access denied' };
    return { ok: true, userId: row.user_id };
}
