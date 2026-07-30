/** Extract OIDC group names from userinfo (Authentik and common providers). */
export function extractOidcGroups(userData: Record<string, unknown>): string[] {
    const raw = userData.groups ?? userData.group;
    if (Array.isArray(raw)) {
        return raw.map((g) => String(g).trim()).filter(Boolean);
    }
    if (typeof raw === 'string' && raw.trim()) {
        return [raw.trim()];
    }
    for (const key of Object.keys(userData)) {
        if (key.toLowerCase().includes('groups') || key.endsWith('/groups')) {
            const val = userData[key];
            if (Array.isArray(val)) {
                return val.map((g) => String(g).trim()).filter(Boolean);
            }
            if (typeof val === 'string' && val.trim()) {
                return [val.trim()];
            }
        }
    }
    return [];
}

export function normalizeSsoAdminGroups(ssoAdminGroups: string[] | undefined): string[] {
    return (ssoAdminGroups || []).map((g) => g.trim()).filter(Boolean);
}

/** Empty list = group policy disabled. */
export function areSsoAdminGroupsConfigured(ssoAdminGroups: string[] | undefined): boolean {
    return normalizeSsoAdminGroups(ssoAdminGroups).length > 0;
}

/**
 * Compare a user's IdP groups to the configured admin-group list.
 *
 * OIDC only tells us which groups *this user* has — not whether a name exists in the IdP directory.
 * A typo and a real group the user is not in look identical: no match → demotion risk when the list is non-empty.
 */
export function userMatchesSsoAdminGroups(
    userGroups: string[],
    ssoAdminGroups: string[] | undefined
): { configured: boolean; matches: boolean; matchedGroups: string[] } {
    const configured = normalizeSsoAdminGroups(ssoAdminGroups);
    if (configured.length === 0) {
        return { configured: false, matches: true, matchedGroups: [] };
    }
    const matchedGroups = userGroups.filter((g) => configured.includes(g));
    return {
        configured: true,
        matches: matchedGroups.length > 0,
        matchedGroups,
    };
}

export type SsoAdminResolution =
    /** No admin groups configured — leave existing is_admin alone; new SSO users are non-admin. */
    | { mode: 'skip' }
    /**
     * Admin groups configured but IdP returned no groups claim for this user.
     * Do not change is_admin (avoids mass lockout on scope/mapping failures).
     */
    | { mode: 'claim_missing' }
    /** Non-empty config + IdP returned groups — membership decides admin. */
    | { mode: 'enforce'; isAdmin: boolean };

/**
 * On each SSO login:
 * - empty config → skip
 * - IdP sent no groups → claim_missing (keep current is_admin)
 * - otherwise enforce exact string match against configured names
 *
 * We cannot tell typo vs "exists but user not a member" without an IdP admin API.
 */
export function resolveSsoAdminFromGroups(
    userData: Record<string, unknown>,
    ssoAdminGroups: string[] | undefined
): SsoAdminResolution {
    const configured = normalizeSsoAdminGroups(ssoAdminGroups);
    if (configured.length === 0) return { mode: 'skip' };

    const userGroups = extractOidcGroups(userData);
    if (userGroups.length === 0) return { mode: 'claim_missing' };

    return {
        mode: 'enforce',
        isAdmin: userGroups.some((g) => configured.includes(g)),
    };
}
