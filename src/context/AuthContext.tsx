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
    isBanned?: boolean;
    banReason?: string;
    roles: string[];
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isBanned: boolean;
    hasRole: (roles: string[]) => boolean;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const getCookieOptions = (days = 7) => {
        const expires = new Date();
        expires.setDate(expires.getDate() + days);
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        
        let domain = '';
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            const parts = hostname.split('.');
            if (parts.length >= 2) {
                // Пытаемся установить куки на основной домен (например, .example.com)
                // Это позволит и frontend (cad.example.com) и backend (api.example.com) видеть их
                domain = `; domain=.${parts.slice(-2).join('.')}`;
            }
        }
        
        return `; path=/; expires=${expires.toUTCString()}${domain}${isSecure ? '; Secure; SameSite=Lax' : ''}`;
    };

    const clearAuthState = () => {
        console.log('🧹 [AUTH] Clearing auth state (localStorage & Cookies)');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        const clearOptions = `; path=/; max-age=0`;
        const domainOptions = getCookieOptions(0).replace(/expires=[^;]+/, 'max-age=0');
        
        document.cookie = `accessToken=${clearOptions}`;
        document.cookie = `accessToken=${domainOptions}`;
        document.cookie = `refreshToken=${clearOptions}`;
        document.cookie = `refreshToken=${domainOptions}`;
        
        setUser(null);
    };

    const redirectBannedUser = (reason?: string | null, clearSession = true) => {
        console.log('🚫 [AUTH] Redirecting banned user, clearSession:', clearSession);
        
        // ВАЖНО: Используем window.location.pathname для проверки, чтобы избежать циклов
        if (typeof window !== 'undefined' && window.location.pathname === '/banned') {
            console.log('ℹ️ [AUTH] Already on /banned, skipping redirect');
            return;
        }

        if (clearSession) {
            clearAuthState();
        }

        // Если мы на клиенте, делаем жесткий редирект для надежности
        if (typeof window !== 'undefined') {
            const bannedUrl = new URL('/banned', window.location.origin);
            const nextReason = (reason || '').trim();
            if (nextReason) {
                bannedUrl.searchParams.set('reason', nextReason);
            }
            console.log('🚀 [AUTH] Executing window.location.replace to:', bannedUrl.toString());
            window.location.replace(bannedUrl.toString());
        }
    };

    const fetchUser = async (skipRefresh = false) => {
        let token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        console.log('🔄 [AUTH] Starting fetchUser, token present:', !!token);
        
        // СИНХРОНИЗАЦИЯ: Если есть в localStorage, но нет в Cookies (Middleware нужен Cookie)
        if (token && !document.cookie.includes('accessToken')) {
            const cookieOptions = getCookieOptions(7);
            document.cookie = `accessToken=${token}${cookieOptions}`;
            if (refreshToken) {
                document.cookie = `refreshToken=${refreshToken}${cookieOptions}`;
            }
        }
        
        if (!token) {
            console.log('ℹ️ [AUTH] No token found, setting isLoading to false');
            setIsLoading(false);
            return;
        }

        try {
            const apiUrl = getApiUrl();
            console.log('📡 [AUTH] Fetching user from:', `${apiUrl}/api/auth/me`);
            
            const response = await fetch(`${apiUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 [AUTH] Response status:', response.status);

            if (response.status === 401 && !skipRefresh) {
                console.log('🔄 [AUTH] Token expired, attempting refresh...');
                const storedRefreshToken = localStorage.getItem('refreshToken');
                if (storedRefreshToken) {
                    const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken: storedRefreshToken })
                    });

                    if (refreshRes.ok) {
                        const tokens = await refreshRes.json();
                        console.log('✅ [AUTH] Token refreshed successfully');
                        localStorage.setItem('accessToken', tokens.accessToken);
                        localStorage.setItem('refreshToken', tokens.refreshToken);
                        
                        const cookieOptions = getCookieOptions(7);
                        document.cookie = `accessToken=${tokens.accessToken}${cookieOptions}`;
                        document.cookie = `refreshToken=${tokens.refreshToken}${cookieOptions}`;
                        
                        // Рекурсивный вызов с skipRefresh=true чтобы не зациклиться
                        await fetchUser(true);
                        return;
                    } else {
                        console.error('❌ [AUTH] Token refresh failed');
                        clearAuthState();
                        setIsLoading(false);
                        return;
                    }
                } else {
                    console.log('ℹ️ [AUTH] No refresh token, logging out');
                    clearAuthState();
                    setIsLoading(false);
                    return;
                }
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
                console.log('✅ [AUTH] User loaded:', data.user.username, 'Banned:', data.user.isBanned);
                setUser(data.user);
                
                // Проверка на бан после загрузки
                if (data.user?.isBanned) {
                    redirectBannedUser(data.user.banReason || '', false);
                }
            } else {
                // ВАЖНО: Не вызываем clearAuthState() при ошибках сервера (5xx), 
                // только при явном 401 или если токена нет вообще.
                console.warn('⚠️ [AUTH] Request failed but NOT clearing state to prevent loop. Status:', response.status);
                if (response.status === 401) {
                    clearAuthState();
                }
            }
        } catch (err) {
            console.error('❌ [AUTH] Network error or CORS issue fetching user:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();

        // Аварийный тайм-аут: если загрузка длится слишком долго, принудительно выключаем её
        const timeout = setTimeout(() => {
            setIsLoading(current => {
                if (current) {
                    console.warn('⚠️ [AUTH] Initial load timeout reached, forcing isLoading to false');
                    return false;
                }
                return current;
            });
        }, 5000); // 5 секунд достаточно для инициализации

        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }, []);

    const hasRole = (requiredRoles: string[]): boolean => {
        if (!user || !user.roles || user.roles.length === 0) return false;
        return requiredRoles.some(role => user.roles.includes(role));
    };

    const logout = () => {
        clearAuthState();
        window.location.replace('/auth/login');
    };

    // ✅ МГНОВЕННАЯ СИНХРОНИЗАЦИЯ: Слушаем сокет для обновления ролей
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token && socket) {
            // Привязываем токен для бэкенда
            socket.auth = { token };
            
            // Если сокет еще не подключен - подключаем
            if (!socket.connected) {
                socket.connect();
            }

            // Слушаем событие от бэкенда (когда бот или фоновая проверка нашли изменения в Дискорде)
            const handleRolesUpdated = (data: { roles: string[] }) => {
                console.log('⚡️ [AUTH_SOCKET] Roles updated instantly:', data.roles);
                
                // Проверяем, изменились ли роли реально
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
                        console.log('🚫 [AUTH] You have been banned:', data.reason);
                        setUser(prev => prev ? { ...prev, isBanned: true, banReason: data.reason || undefined } : null);
                        redirectBannedUser(data.reason, !isAdmin);
                    } else {
                        console.log('✅ [AUTH] You have been unbanned.');
                        if (isAdmin) {
                            // Для админов просто обновляем состояние и перезагружаем текущую страницу
                            setUser(prev => prev ? { ...prev, isBanned: false, banReason: undefined } : null);
                            window.location.reload();
                        } else {
                            // Для обычных юзеров делаем чистый логаут
                            console.log('Logging out for clean state...');
                            clearAuthState();
                            window.location.replace('/auth/login?unbanned=true');
                        }
                    }
                }
            };

            socket.on('roles_updated', handleRolesUpdated);
            socket.on('user_banned', handleUserBanned);

            return () => {
                socket.off('roles_updated', handleRolesUpdated);
                socket.off('user_banned', handleUserBanned);
            };
        }
    }, [user?.id, socket]);

    const refreshUser = async () => {
        await fetchUser();
    };

    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                console.warn('⚠️ [AUTH] Loading is taking too long (>5s). Showing debug UI.');
                setShowDebug(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    return (
        <AuthContext.Provider value={{ 
            user, 
            isLoading, 
            isAuthenticated: !!user,
            isBanned: !!user?.isBanned,
            hasRole,
            logout,
            refreshUser
        }}>
            {children}
            {showDebug && isLoading && (
                <div className="fixed bottom-4 left-4 z-[10000] bg-red-900/90 text-white p-4 rounded-lg border border-red-500 shadow-2xl max-w-xs text-[10px] font-mono">
                    <p className="font-bold mb-2 text-xs">Auth Debugger</p>
                    <p>Status: {isLoading ? 'LOADING' : 'READY'}</p>
                    <p>Auth: {!!user ? 'YES' : 'NO'}</p>
                    <p>Domain: {typeof window !== 'undefined' ? window.location.hostname : 'N/A'}</p>
                    <p>API: {process.env.NEXT_PUBLIC_API_URL || 'DEFAULT'}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 bg-white text-black px-2 py-1 rounded"
                    >
                        Reload Page
                    </button>
                    <button 
                        onClick={() => clearAuthState()} 
                        className="mt-2 ml-2 bg-zinc-800 text-white px-2 py-1 rounded border border-zinc-600"
                    >
                        Clear Auth
                    </button>
                </div>
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
