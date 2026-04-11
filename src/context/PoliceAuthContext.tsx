"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { socket } from '../lib/socket';
import { getApiUrl } from '../lib/utils';

interface User {
    id: number;
    username: string;
    email?: string;
    avatarUrl?: string;
    theme?: string;
    uiProfiles?: Record<string, any>;
    isBanned?: boolean;
    banReason?: string;
    roles: string[];
}

interface PoliceAuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isBanned: boolean;
    hasRole: (roles: string[]) => boolean;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const PoliceAuthContext = createContext<PoliceAuthContextType | undefined>(undefined);

export function PoliceAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [socketConnected, setSocketConnected] = useState(false);

    const getCookieOptions = (days = 7) => {
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

        let domain = '';
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const isIP = hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
            if (!isIP && hostname !== 'localhost') {
                const parts = hostname.split('.');
                if (parts.length >= 2) {
                    const baseDomain = parts.slice(-2).join('.');
                    domain = `; domain=.${baseDomain}`;
                }
            }
        }

        return `; path=/; expires=${expires.toUTCString()}${domain}${isSecure ? '; Secure; SameSite=None' : ''}`;
    };

    const clearAuthState = () => {
        console.log('🧹 [POLICE_AUTH] Clearing Police auth state (localStorage & Cookies)');
        localStorage.removeItem('policeAccessToken');
        localStorage.removeItem('policeRefreshToken');

        const clearOptions = `; path=/; max-age=0`;
        const domainOptions = getCookieOptions(0).replace(/expires=[^;]+/, 'max-age=0');

        document.cookie = `policeAccessToken=${clearOptions}`;
        document.cookie = `policeAccessToken=${domainOptions}`;
        document.cookie = `policeRefreshToken=${clearOptions}`;
        document.cookie = `policeRefreshToken=${domainOptions}`;

        setUser(null);
    };

    const redirectBannedUser = (reason?: string | null, clearSession = true) => {
        console.log('🚫 [POLICE_AUTH] Redirecting banned user, clearSession:', clearSession);

        if (typeof window !== 'undefined' && window.location.pathname === '/banned') {
            console.log('ℹ️ [POLICE_AUTH] Already on /banned, skipping redirect');
            return;
        }

        if (clearSession) {
            clearAuthState();
        }

        if (typeof window !== 'undefined') {
            const bannedUrl = new URL('/banned', window.location.origin);
            const nextReason = (reason || '').trim();
            if (nextReason) {
                bannedUrl.searchParams.set('reason', nextReason);
            }
            console.log('🚀 [POLICE_AUTH] Executing window.location.replace to:', bannedUrl.toString());
            window.location.replace(bannedUrl.toString());
        }
    };

    const fetchUser = async (skipRefresh = false) => {
        let token = localStorage.getItem('policeAccessToken');
        let refreshToken = localStorage.getItem('policeRefreshToken');

        const cookieString = document.cookie;

        if (!token && cookieString.includes('policeAccessToken')) {
            const cookieParts = cookieString.split('policeAccessToken=');
            if (cookieParts[1]) {
                token = cookieParts[1].split(';')[0].trim();
            }
        }

        if (!refreshToken && cookieString.includes('policeRefreshToken')) {
            const cookieParts = cookieString.split('policeRefreshToken=');
            if (cookieParts[1]) {
                refreshToken = cookieParts[1].split(';')[0].trim();
            }
        }

        if (token && !localStorage.getItem('policeAccessToken')) {
            localStorage.setItem('policeAccessToken', token);
        }
        if (refreshToken && !localStorage.getItem('policeRefreshToken')) {
            localStorage.setItem('policeRefreshToken', refreshToken);
        }

        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const apiUrl = getApiUrl();

            const response = await fetch(`${apiUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 && !skipRefresh) {
                const storedRefreshToken = localStorage.getItem('policeRefreshToken');
                if (storedRefreshToken) {
                    const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken: storedRefreshToken })
                    });

                    if (refreshRes.ok) {
                        const tokens = await refreshRes.json();
                        localStorage.setItem('policeAccessToken', tokens.accessToken);
                        localStorage.setItem('policeRefreshToken', tokens.refreshToken);

                        const cookieOptions = getCookieOptions(7);
                        document.cookie = `policeAccessToken=${tokens.accessToken}${cookieOptions}`;
                        document.cookie = `policeRefreshToken=${tokens.refreshToken}${cookieOptions}`;

                        await fetchUser(true);
                        return;
                    }
                }

                console.log('🔴 [POLICE_AUTH] Token and refresh failed, redirecting to /auth/police/login');
                clearAuthState();
                if (typeof window !== 'undefined') {
                    window.location.replace('/auth/police/login');
                }
                return;
            }

            if (response.status === 403) {
                const data = await response.json();
                if (data.banned) {
                    redirectBannedUser(data.reason);
                    return;
                }
            }

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);

                if (data.user?.isBanned) {
                    redirectBannedUser(data.user.banReason || '', false);
                }
            }
        } catch (err: any) {
            console.error('[POLICE_AUTH] Network error fetching user:', err);
            const retryCount = (fetchUser as any).retryCount || 0;
            if (retryCount < 2) {
                (fetchUser as any).retryCount = retryCount + 1;
                console.log(`🔄 [POLICE_AUTH] Retrying (${retryCount + 1}/2)...`);
                setTimeout(() => fetchUser(skipRefresh), 1500);
                return;
            }
            console.error('[POLICE_AUTH] Max retries reached, giving up');
        } finally {
            (fetchUser as any).retryCount = 0;
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();

        const timeout = setTimeout(() => {
            setIsLoading(current => {
                if (current) {
                    return false;
                }
                return current;
            });
        }, 5000);

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (socketConnected) return;

        const interval = setInterval(() => {
            if (!socketConnected && user) {
                console.log('[POLICE_AUTH] Socket disconnected, refreshing user data...');
                fetchUser(true);
            }
        }, 300000);

        return () => clearInterval(interval);
    }, [socketConnected, user]);

    const hasRole = (requiredRoles: string[]): boolean => {
        if (!user || !user.roles || user.roles.length === 0) return false;
        return requiredRoles.some(role => user.roles.includes(role));
    };

    const logout = () => {
        clearAuthState();
        window.location.replace('/auth/police/login');
    };

    useEffect(() => {
        const token = localStorage.getItem('policeAccessToken');
        if (token && socket) {
            const handleConnect = () => {
                console.log('[POLICE_AUTH] Socket connected');
                setSocketConnected(true);
            };

            const handleDisconnect = () => {
                console.log('[POLICE_AUTH] Socket disconnected');
                setSocketConnected(false);
            };

            socket.auth = { token };

            if (!socket.connected) {
                socket.connect();
            } else {
                setSocketConnected(true);
            }

            const handleRolesUpdated = (data: { roles: string[] }) => {
                console.log('⚡️ [POLICE_AUTH_SOCKET] Roles updated instantly:', data.roles);

                const oldRoles = JSON.stringify([...(user?.roles || [])].sort());
                const newRoles = JSON.stringify([...data.roles].sort());

                if (oldRoles !== newRoles) {
                    setUser(prev => prev ? { ...prev, roles: data.roles } : null);
                }
            };

            const handleUserBanned = (data: { userId: number; isBanned: boolean; reason: string | null }) => {
                if (user?.id === data.userId) {
                    const userRoles = (user?.roles || []).map((r: string) => r.toLowerCase());
                    const isAdmin = userRoles.includes('admin') || userRoles.includes('supervisor');

                    if (data.isBanned) {
                        console.log('🚫 [POLICE_AUTH] You have been banned:', data.reason);
                        setUser(prev => prev ? { ...prev, isBanned: true, banReason: data.reason || undefined } : null);
                        redirectBannedUser(data.reason, !isAdmin);
                    } else {
                        console.log('✅ [POLICE_AUTH] You have been unbanned.');
                        if (isAdmin) {
                            setUser(prev => prev ? { ...prev, isBanned: false, banReason: undefined } : null);
                            window.location.reload();
                        } else {
                            clearAuthState();
                            window.location.replace('/auth/police/login?unbanned=true');
                        }
                    }
                }
            };

            const handleUserUpdated = (data: any) => {
                console.log('[POLICE_AUTH] User profile updated:', data);
                setUser(prev => prev ? { ...prev, ...data } : null);
            };

            socket.on('connect', handleConnect);
            socket.on('disconnect', handleDisconnect);
            socket.on('roles_updated', handleRolesUpdated);
            socket.on('user_banned', handleUserBanned);
            socket.on('user_updated', handleUserUpdated);

            return () => {
                socket.off('connect', handleConnect);
                socket.off('disconnect', handleDisconnect);
                socket.off('roles_updated', handleRolesUpdated);
                socket.off('user_banned', handleUserBanned);
                socket.off('user_updated', handleUserUpdated);
            };
        }
    }, [user?.id]);

    const refreshUser = async () => {
        await fetchUser();
    };

    return (
        <PoliceAuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            isBanned: !!user?.isBanned,
            hasRole,
            logout,
            refreshUser
        }}>
            {children}
        </PoliceAuthContext.Provider>
    );
}

export function usePoliceAuth() {
    const context = useContext(PoliceAuthContext);
    if (context === undefined) {
        throw new Error('usePoliceAuth must be used within a PoliceAuthProvider');
    }
    return context;
}
