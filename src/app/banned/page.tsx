"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { getApiUrl } from '@/lib/utils';

function BannedPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, logout, refreshUser } = useAuth();
    const [isUnbanning, setIsUnbanning] = useState(false);

    const reason = useMemo(() => {
        const value = searchParams.get('reason');
        return value && value.trim().length > 0
            ? value
            : 'Причина блокировки не указана администрацией.';
    }, [searchParams]);

    const isAdmin = useMemo(() => {
        const roles = (user?.roles || []).map((role) => role.toLowerCase());
        return roles.includes('admin') || roles.includes('supervisor');
    }, [user]);

    useEffect(() => {
        if (user && !user.isBanned) {
            router.replace('/citizen');
        }
    }, [user?.id, user?.isBanned, router]);

    const handleAdminUnban = async () => {
        if (!user) return;
        setIsUnbanning(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/users/${user.id}/ban`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ isBanned: false })
            });

            if (response.ok) {
                await refreshUser();
                router.replace('/citizen');
            }
        } finally {
            setIsUnbanning(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-6">
            <Card className="max-w-lg w-full bg-zinc-900/60 border-red-500/20 p-8 space-y-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">Доступ заблокирован</h1>
                    <p className="text-zinc-400 text-sm">Ваш аккаунт заблокирован и доступ к системе временно ограничен.</p>
                </div>
                <div className="bg-black/40 rounded-lg border border-zinc-800 p-4">
                    <p className="text-[10px] text-red-400 uppercase tracking-widest font-bold mb-2">Причина</p>
                    <p className="text-zinc-300 text-sm break-words">{reason}</p>
                </div>
                {isAdmin && (
                    <Button
                        onClick={handleAdminUnban}
                        disabled={isUnbanning}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isUnbanning ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Shield className="w-4 h-4 mr-2" />
                        )}
                        {isUnbanning ? 'Разбан...' : 'Разбанить себя (Admin)'}
                    </Button>
                )}
                <Button
                    variant="outline"
                    onClick={logout}
                    className="w-full border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                </Button>
            </Card>
        </div>
    );
}

export default function BannedPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-black flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                </div>
            }
        >
            <BannedPageContent />
        </Suspense>
    );
}
