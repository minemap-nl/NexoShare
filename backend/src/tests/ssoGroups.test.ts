import { describe, expect, test } from 'bun:test';
import {
    extractOidcGroups,
    resolveSsoAdminFromGroups,
    userMatchesSsoAdminGroups,
    areSsoAdminGroupsConfigured,
} from '../lib/ssoGroups';

describe('ssoGroups', () => {
    test('extractOidcGroups from groups array', () => {
        expect(extractOidcGroups({ groups: ['admins', 'users'] })).toEqual(['admins', 'users']);
    });

    test('empty admin groups skips enforcement', () => {
        expect(areSsoAdminGroupsConfigured([])).toBe(false);
        expect(resolveSsoAdminFromGroups({ groups: ['admins'] }, [])).toEqual({ mode: 'skip' });
    });

    test('empty IdP groups claim does not demote', () => {
        expect(resolveSsoAdminFromGroups({}, ['admins'])).toEqual({ mode: 'claim_missing' });
        expect(resolveSsoAdminFromGroups({ groups: [] }, ['admins'])).toEqual({ mode: 'claim_missing' });
    });

    test('non-empty config enforces membership (typo and non-member are both non-match)', () => {
        expect(resolveSsoAdminFromGroups({ groups: ['it-admins'] }, ['it-admins'])).toEqual({
            mode: 'enforce',
            isAdmin: true,
        });
        expect(resolveSsoAdminFromGroups({ groups: ['users'] }, ['it-admins'])).toEqual({
            mode: 'enforce',
            isAdmin: false,
        });
        expect(resolveSsoAdminFromGroups({ groups: ['users'] }, ['typo-group'])).toEqual({
            mode: 'enforce',
            isAdmin: false,
        });
    });

    test('userMatchesSsoAdminGroups for dashboard test', () => {
        expect(userMatchesSsoAdminGroups(['a'], [])).toEqual({
            configured: false,
            matches: true,
            matchedGroups: [],
        });
        expect(userMatchesSsoAdminGroups(['it-admins'], ['it-admins'])).toEqual({
            configured: true,
            matches: true,
            matchedGroups: ['it-admins'],
        });
        expect(userMatchesSsoAdminGroups(['users'], ['it-admins']).matches).toBe(false);
        expect(userMatchesSsoAdminGroups(['users'], ['typo']).matches).toBe(false);
    });
});
