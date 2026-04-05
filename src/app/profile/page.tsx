"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Camera, Loader2, Save, ArrowLeft, Key, RefreshCw, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import RoleSwitcher from '@/components/RoleSwitcher';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
    id: number;
    username: string;
    email: string;
    apiId?: string;
    avatarUrl?: string;
    createdAt: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [apiId, setApiId] = useState<string | null>(null);
    const [username, setUsername] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateApiId = async () => {
        setIsGenerating(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                toast({ title: "Ошибка", description: "Вы не авторизованы. Пожалуйста, перезайдите.", variant: "destructive" });
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/auth/api-id/generate`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.apiId) {
                    setApiId(data.apiId);
                    toast({ title: "Успех", description: "Ваш личный API ID сгенерирован!" });
                } else {
                    throw new Error("ID не получен от сервера");
                }
            } else {
                const errorData = await res.json().catch(() => ({ error: "Неизвестная ошибка" }));
                throw new Error(errorData.error || `Сервер ответил кодом ${res.status}`);
            }
        } catch (err: any) {
            console.error('Failed to generate API ID', err);
            toast({ 
                title: "Ошибка генерации", 
                description: err.message || "Не удалось связаться с сервером.", 
                variant: "destructive" 
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const copyApiId = () => {
        if (!apiId) return;
        navigator.clipboard.writeText(apiId);
        toast({ title: "Copied", description: "API ID copied to clipboard." });
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    router.push('/auth/login');
                    return;
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                
                const res = await fetch(`${apiUrl}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                    setUsername(data.user.username || '');
                    
                    // Fetch API ID separately
                    const apiIdRes = await fetch(`${apiUrl}/api/auth/api-id`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (apiIdRes.ok) {
                        const apiIdData = await apiIdRes.json();
                        setApiId(apiIdData.apiId);
                    }

                    if (data.user.avatarUrl) {
                        const url = data.user.avatarUrl.startsWith('http') 
                            ? data.user.avatarUrl 
                            : `${apiUrl}${data.user.avatarUrl}`;
                        setAvatarPreview(url);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch profile', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAvatarPreview(url);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username,
                    avatarUrl: avatarPreview || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data);
                router.push('/citizen');
            }
        } catch (err) {
            console.error('Failed to save profile', err);
        } finally {
            setIsSaving(false);
        }
    };

    const getAvatarUrl = (avatarUrl?: string) => {
        if (!avatarUrl) return null;
        if (avatarUrl.startsWith('http')) return avatarUrl;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return `${apiUrl}${avatarUrl}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-xl mx-auto">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => router.push('/citizen')} className="text-zinc-500 hover:text-zinc-300">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Назад
                        </Button>
                        <CardTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-400" />
                            Настройки профиля
                        </CardTitle>
                        <div className="w-20" /> {/* Spacer */}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center">
                            <div 
                                className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden cursor-pointer relative group border-2 border-zinc-700 hover:border-blue-500 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-10 h-10 text-zinc-600" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-6 h-6 text-zinc-200" />
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleAvatarChange}
                            />
                            <p className="text-xs text-zinc-500 mt-2">Нажмите для смены аватара</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Имя пользователя</label>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
                                placeholder="Введите имя..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Email</label>
                            <Input
                                value={user?.email || ''}
                                disabled
                                className="bg-zinc-800/30 border-zinc-700 text-zinc-500 cursor-not-allowed"
                            />
                        </div>

                        {/* --- API SETTINGS SECTION --- */}
                        <div className="pt-4 border-t border-zinc-800 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <label className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-blue-500" />
                                        Личный API ID
                                    </label>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">Требуется для связи с FiveM</p>
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={generateApiId}
                                    disabled={isGenerating}
                                    className="h-8 bg-zinc-800/50 border-zinc-700 text-xs hover:bg-zinc-800 transition-all active:scale-95"
                                >
                                    <RefreshCw className={`w-3 h-3 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {apiId ? 'Обновить' : 'Создать'}
                                </Button>
                            </div>

                            <div className="relative group">
                                <Input
                                    value={apiId || '•••• •••• •••• ••••'}
                                    readOnly
                                    className={`
                                        bg-zinc-950 border-zinc-800 text-sm font-mono tracking-widest text-center py-6
                                        ${!apiId ? 'text-zinc-700 italic select-none' : 'text-blue-400 font-black'}
                                    `}
                                />
                                {apiId && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={copyApiId}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            <p className="text-[10px] text-zinc-600 leading-tight">
                                Не передавайте этот ID никому. Используйте <code className="text-blue-500">/cad-link [ID]</code> в игре.
                            </p>
                        </div>

                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-6 font-bold"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Сохранить профиль
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
