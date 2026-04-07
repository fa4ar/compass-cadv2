"use client";

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function BannedPage() {
    const searchParams = useSearchParams();
    const { logout } = useAuth();

    const reason = useMemo(() => {
        const value = searchParams.get('reason');
        return value && value.trim().length > 0
            ? value
            : 'Причина блокировки не указана администрацией.';
    }, [searchParams]);

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
