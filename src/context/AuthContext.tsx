"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { socket } from '@/lib/socket';

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

    const fetchUser = async (skipRefresh = false) => {
        let token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
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
            setIsLoading(false);
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            let response = await fetch(`${apiUrl}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 && !skipRefresh) {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken })
                    });

                    if (refreshRes.ok) {
                        const tokens = await refreshRes.json();
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
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        document.cookie = 'accessToken=; path=/; max-age=0';
                        document.cookie = 'refreshToken=; path=/; max-age=0';
                        setIsLoading(false);
                        return;
                    }
                }
            }

            if (response.status === 403) {
                const data = await response.json();
                if (data.banned) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    setUser(null);
                    window.location.href = `/?banned=true&reason=${encodeURIComponent(data.reason || '')}`;
                    return;
                }
            }

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                
                // Проверка на бан после загрузки
                if (data.user?.isBanned) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    document.cookie = 'accessToken=; path=/; max-age=0';
                    document.cookie = 'refreshToken=; path=/; max-age=0';
                    setUser(null);
                    window.location.href = `/?banned=true&reason=${encodeURIComponent(data.user.banReason || '')}`;
                }
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                document.cookie = 'accessToken=; path=/; max-age=0';
                document.cookie = 'refreshToken=; path=/; max-age=0';
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

    const hasRole = (requiredRoles: string[]): boolean => {
        if (!user || !user.roles || user.roles.length === 0) return false;
        return requiredRoles.some(role => user.roles.includes(role));
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        document.cookie = 'accessToken=; path=/; max-age=0';
        document.cookie = 'refreshToken=; path=/; max-age=0';
        setUser(null);
        window.location.href = '/auth/login';
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
                if (user?.id === data.userId && data.isBanned) {
                    console.log('🚫 [AUTH] You have been banned:', data.reason);
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    setUser(null);
                    window.location.href = `/?banned=true&reason=${encodeURIComponent(data.reason || '')}`;
                } else if (user?.id === data.userId && !data.isBanned) {
                    console.log('✅ [AUTH] You have been unbanned. Logging out for clean state...');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    document.cookie = 'accessToken=; path=/; max-age=0';
                    document.cookie = 'refreshToken=; path=/; max-age=0';
                    setUser(null);
                    window.location.href = '/auth/login?unbanned=true';
                }
            };

            socket.on('roles_updated', handleRolesUpdated);
            socket.on('user_banned', handleUserBanned);

            return () => {
                socket.off('roles_updated', handleRolesUpdated);
                socket.off('user_banned', handleUserBanned);
            };
        }
    }, [user?.id]); // Перезапускаем при логине/смене юзера

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