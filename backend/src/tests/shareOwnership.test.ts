import { describe, expect, test } from 'bun:test';
import { evaluateShareOwnership } from '../lib/shareOwnership';

describe('evaluateShareOwnership', () => {
    test('404 when share missing', () => {
        expect(evaluateShareOwnership(undefined, 1)).toEqual({
            ok: false,
            status: 404,
            error: 'Share not found',
        });
        expect(evaluateShareOwnership(null, 1).ok).toBe(false);
    });

    test('403 when another user owns the share', () => {
        expect(evaluateShareOwnership({ user_id: 2 }, 1)).toEqual({
            ok: false,
            status: 403,
            error: 'Access denied',
        });
    });

    test('ok when owner matches', () => {
        expect(evaluateShareOwnership({ user_id: 7 }, 7)).toEqual({
            ok: true,
            userId: 7,
        });
    });
});
