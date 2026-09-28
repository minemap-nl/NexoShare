import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../api/constants';

export function useAuth() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/users/me`, { credentials: 'include' });
                if (cancelled) return;
                if (res.ok) {
                    const me = await res.json();
                    setUser(me);
                    localStorage.setItem('user', JSON.stringify(me));
                } else {
                    localStorage.removeItem('user');
                    setUser(null);
                }
            } catch (e) {
                console.error('Session check failed', e);
                if (!cancelled) {
                    localStorage.removeItem('user');
                    setUser(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const login = useCallback((u: any) => {
        localStorage.setItem('user', JSON.stringify(u));
        setUser(u);
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
        } catch (e) {
            console.error('Logout request failed', e);
        }

        localStorage.clear();
        setUser(null);
        window.location.href = '/login';
    }, []);

    return { user, token: null, login, logout, loading };
}
