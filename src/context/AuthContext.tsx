"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { socket } from '../lib/socket';

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
    hasRole: (roles: string[]) => boolean;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const clearAuthState = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        document.cookie = 'accessToken=; path=/; max-age=0';
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refreshToken=; path=/; max-age=0';
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setUser(null);
    };

    const redirectBannedUser = (reason?: string | null, clearSession = true) => {
        if (clearSession) {
            clearAuthState();
        }

        const bannedUrl = new URL('/banned', window.location.origin);
        const nextReason = (reason || '').trim();
        if (nextReason) {
            bannedUrl.searchParams.set('reason', nextReason);
        }

        const currentUrl = new URL(window.location.href);
        const currentReason = (currentUrl.searchParams.get('reason') || '').trim();
        const isAlreadyOnBannedPage = currentUrl.pathname === '/banned';

        if (isAlreadyOnBannedPage && currentReason === nextReason) {
            return;
        }

        window.location.replace(bannedUrl.toString());
    };

    const fetchUser = async (skipRefresh = false) => {
        let token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        console.log('🔄 [AUTH] Starting fetchUser, token present:', !!token);
        
        // СИНХРОНИЗАЦИЯ: Если есть в localStorage, но нет в Cookies (Middleware нужен Cookie)
        if (token && !document.cookie.includes('accessToken')) {
            const expires = new Date();
            expires.setDate(expires.getDate() + 7);
            document.cookie = `accessToken=${token}; path=/; expires=${expires.toUTCString()}`;
            if (refreshToken) {
                document.cookie = `refreshToken=${refreshToken}; path=/; expires=${expires.toUTCString()}`;
            }
        }
        
        if (!token) {
            console.log('ℹ️ [AUTH] No token found, setting isLoading to false');
            setIsLoading(false);
            return;
        }

        try {
            // Определяем API URL динамически, если NEXT_PUBLIC_API_URL не задан или равен localhost
            let apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
            
            // Если мы на домене, а apiUrl указывает на localhost - это ошибка конфигурации сборки
            if (typeof window !== 'undefined') {
                const isDomain = window.location.hostname !== 'localhost' && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
                if (isDomain && (!apiUrl || apiUrl.includes('localhost'))) {
                    // Пытаемся угадать API URL на основе текущего домена
                    apiUrl = `${window.location.protocol}//api.${window.location.hostname}`;
                    console.warn(`⚠️ [AUTH] API URL points to localhost but we are on a domain. Dynamic fallback to: ${apiUrl}`);
                } else if (!apiUrl) {
                    apiUrl = 'http://localhost:4000';
                }
            }

            console.log('📡 [AUTH] Fetching user from:', `${apiUrl}/api/auth/me`);
            
            let response = await fetch(`${apiUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('📡 [AUTH] Response status:', response.status);

            if (response.status === 401 && !skipRefresh) {
                console.log('🔄 [AUTH] Token expired, attempting refresh...');
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken })
                    });

                    if (refreshRes.ok) {
                        const tokens = await refreshRes.json();
                        console.log('✅ [AUTH] Token refreshed successfully');
                        localStorage.setItem('accessToken', tokens.accessToken);
                        localStorage.setItem('refreshToken', tokens.refreshToken);
                        
                        const expires = new Date();
                        expires.setDate(expires.getDate() + 7);
                        document.cookie = `accessToken=${tokens.accessToken}; path=/; expires=${expires.toUTCString()}`;
                        document.cookie = `refreshToken=${tokens.refreshToken}; path=/; expires=${expires.toUTCString()}`;
                        
                        token = tokens.accessToken;
                        response = await fetch(`${apiUrl}/api/auth/me`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    } else {
                        console.error('❌ [AUTH] Token refresh failed');
                        clearAuthState();
                        setIsLoading(false);
                        return;
                    }
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
                clearAuthState();
            }
        } catch (err) {
            console.error('Failed to fetch user:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
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

    return (
        <AuthContext.Provider value={{ 
            user, 
            isLoading, 
            isAuthenticated: !!user,
            hasRole,
            logout,
            refreshUser
        }}>
            {children}
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
