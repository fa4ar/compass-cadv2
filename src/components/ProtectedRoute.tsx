"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles = [] }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated, logout } = useAuth();
    const router = useRouter();

    // ✅ ПЕРЕНАПРАВЛЕНИЕ: Переносим логику редиректа в useEffect
    useEffect(() => {
        // Редирект на логин теперь централизован в AuthContext.tsx
        // Здесь мы только проверяем наличие доступа если пользователь уже загружен
        if (!isLoading && !isAuthenticated) {
            console.log('🔄 [PROTECTED] Not authenticated, letting AuthContext handle redirect...');
        }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-zinc-500 text-sm font-medium animate-pulse">Initializing CAD...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl p-8 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-blue-500/5">
                        <LogOut className="w-10 h-10 text-blue-500" />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-white mb-2">Session Expired</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                        Your session has ended or you are not logged in. Please sign in to access this area.
                    </p>
                    
                    <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 py-6"
                        onClick={() => window.location.href = '/auth/login'}
                    >
                        Go to Login
                    </Button>
                </div>
            </div>
        );
    }

    const hasAccess = allowedRoles.length === 0 || allowedRoles.some(role => user?.roles?.includes(role));

    if (!hasAccess) {
        return (
            <div className="relative min-h-screen">
                {/* Фоновый контент (неактивный) */}
                <div className="fixed inset-0 pointer-events-none opacity-20 grayscale brightness-50 select-none">
                    {children}
                </div>

                {/* Основной оверлей с ошибкой */}
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/40 backdrop-blur-md transition-all duration-500 animate-in fade-in">
                    <div className="w-[450px] bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/5">
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                        </div>
                        
                        <h1 className="text-2xl font-bold text-white mb-2">Restricted Access</h1>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                            Authorization denied. Your Discord account does not have the required roles to access this terminal. 
                            If you believe this is a mistake, contact your faction administrator.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <Button 
                                variant="outline" 
                                onClick={() => window.history.back()}
                                className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-100 py-6"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Go Back
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={logout}
                                className="bg-red-600/90 hover:bg-red-600 py-6"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
