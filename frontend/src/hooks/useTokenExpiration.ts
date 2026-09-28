import { useEffect } from 'react';
import { API_URL } from '../api/constants';
import { useUI } from '../context/UIContext';

/**
 * Cookie-based sessions don't expose JWT in JS. Poll /users/me so
 * expired/invalid cookies still trigger logout.
 */
export function useTokenExpiration(_token: string | null, logout: () => void) {
    const { notify } = useUI();

    useEffect(() => {
        let cancelled = false;

        const checkSession = async () => {
            try {
                const res = await fetch(`${API_URL}/users/me`, { credentials: 'include' });
                if (cancelled) return;
                if (res.status === 401) {
                    notify('Session expired. Login again.', 'info');
                    logout();
                }
            } catch {
                /* network blip — don't force logout */
            }
        };

        const interval = setInterval(() => { void checkSession(); }, 60_000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [logout, notify]);
}
