"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, ChevronDown, Loader2, LogIn, Shield, Sun, Moon, Palette } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuPortal,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function UserMenu() {
    const router = useRouter();
    const { user, isLoading: authLoading, logout, isAuthenticated, hasRole } = useAuth();
    const { theme, setTheme } = useTheme();
    const [localLoading, setLocalLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            setLocalLoading(false);
        }
    }, [authLoading]);

    const handleLogout = () => {
        logout();
    };

    const getAvatarUrl = (avatarUrl?: string) => {
        if (!avatarUrl) return null;
        if (avatarUrl.startsWith('http')) return avatarUrl;
        if (avatarUrl.startsWith('a_') || avatarUrl.startsWith('avatar:')) {
            return null;
        }
        return avatarUrl;
    };

    const handleLoginClick = () => {
        router.push('/auth/login');
    };

    const isAdmin = hasRole(['admin', 'Admin']);

    if (localLoading || authLoading) {
        return (
            <Button variant="ghost" size="sm" className="opacity-50">
                <Loader2 className="w-4 h-4 animate-spin" />
            </Button>
        );
    }

    if (!isAuthenticated) {
        return (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLoginClick}
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
            >
                <LogIn className="w-4 h-4" />
                <span className="text-sm font-medium">Login</span>
            </Button>
        );
    }

    const avatarUrl = getAvatarUrl(user?.avatarUrl);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 h-auto py-1 rounded-full hover:bg-zinc-800/50">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={user?.username} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-4 h-4 text-zinc-400" />
                        )}
                    </div>
                    <span className="text-sm font-medium text-zinc-300 hidden sm:inline">{user?.username}</span>
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800">
                <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                </DropdownMenuItem>
                {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/admin')} className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                </DropdownMenuItem>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                        <Palette className="w-4 h-4 mr-2" />
                        Theme
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as any)}>
                                <DropdownMenuRadioItem value="light" className="flex items-center gap-2 cursor-pointer">
                                    <Sun className="w-3 h-3" /> Light
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="dark" className="flex items-center gap-2 cursor-pointer">
                                    <Moon className="w-3 h-3" /> Dark
                                </DropdownMenuRadioItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuRadioItem value="custom-slate" className="flex items-center gap-2 cursor-pointer">
                                    <div className="w-3 h-3 rounded-full bg-slate-500" /> Slate
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="custom-zinc" className="flex items-center gap-2 cursor-pointer">
                                    <div className="w-3 h-3 rounded-full bg-zinc-500" /> Zinc
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="custom-rose" className="flex items-center gap-2 cursor-pointer">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" /> Rose
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:text-red-400">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}