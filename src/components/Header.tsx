"use client";

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ChevronDown, IdCard, Shield, Radio, Heart, Settings, Compass } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import UserMenu from '@/components/UserMenu';

type RolePage = {
    key: string;
    label: string;
    path?: string;
    disabled?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
    requiredRoles?: string[];
};

const ROLE_PAGES: RolePage[] = [
    { key: 'civilian', label: 'Civilian', path: '/citizen', icon: IdCard, requiredRoles: ['citizen'] },
    { key: 'dispatcher', label: 'Dispatcher', path: '/dispatcher', icon: Radio, requiredRoles: ['dispatcher'] },
    { key: 'officer', label: 'Police', path: '/police', icon: Shield, requiredRoles: ['police'] },
    { key: 'map', label: 'Live Map', path: '/map', icon: Compass, requiredRoles: ['police', 'dispatcher'] },
    { key: 'ems', label: 'EMS / Fire', path: '/ems', icon: Heart, disabled: true },
];

function HeaderSkeleton() {
    return (
        <div className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 shrink-0 shadow-xl sticky top-0 z-[100] w-full">
            <div className="flex-1 flex items-center gap-2">
                <div className="h-6 w-24 bg-zinc-800/50 animate-pulse rounded-full"></div>
            </div>
            
            <div className="flex-none flex justify-center absolute left-1/2 -translate-x-1/2">
                <div className="h-10 w-32 bg-zinc-800/50 animate-pulse rounded-2xl"></div>
            </div>
            
            <div className="flex-1 flex items-center gap-3 justify-end">
                <div className="h-8 w-8 bg-zinc-800/50 animate-pulse rounded-full"></div>
            </div>
        </div>
    );
}

export default function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, hasRole, isAuthenticated, isLoading } = useAuth();
    
    const isAdmin = useMemo(() => hasRole(['admin', 'Admin']), [hasRole]);
    
    const availablePages = useMemo(() => 
        ROLE_PAGES.filter(role => !role.disabled && (!role.requiredRoles?.length || hasRole(role.requiredRoles))),
        [hasRole]
    );
    
    const adminPage = useMemo(() => 
        isAdmin ? { key: 'admin', label: 'Admin Panel', path: '/admin', icon: Settings } : null,
        [isAdmin]
    );
    
    const current = useMemo(() => {
        const pages = adminPage ? [adminPage, ...availablePages] : availablePages;
        return pages.find(p => p.path && pathname?.startsWith(p.path)) || pages[0];
    }, [adminPage, availablePages, pathname]);

    const CurrentIcon = current?.icon || IdCard;

    if (isLoading) return <HeaderSkeleton />;
    
    // Если не авторизован - не показываем шапку
    if (!isAuthenticated) return null;

    // Если забанен - показываем только лого и меню пользователя (чтобы можно было выйти)
    if (user?.isBanned) {
        return (
            <div className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 shrink-0 shadow-xl sticky top-0 z-[100] w-full">
                <div className="flex-1 flex items-center gap-2">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] bg-red-950/20 border border-red-900/30 px-3 py-1 rounded-full">
                        ACCOUNT SUSPENDED
                    </span>
                </div>
                <div className="flex-1 flex items-center gap-3 justify-end">
                    <UserMenu />
                </div>
            </div>
        );
    }

    return (
        <div className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 shrink-0 shadow-xl sticky top-0 z-[100] w-full">
            <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                    COMPASS CAD
                </span>
            </div>
            
            <div className="flex-none flex justify-center absolute left-1/2 -translate-x-1/2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="group flex items-center gap-3 hover:bg-zinc-900/80 px-5 py-2 rounded-2xl transition-all duration-300 border border-transparent hover:border-zinc-800 focus-visible:ring-0 outline-none"
                        >
                            <div className="relative">
                                <CurrentIcon className="w-5 h-5 text-blue-500 transition-transform group-hover:scale-110 duration-300" />
                                <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            </div>
                            <span className="font-bold text-[13px] text-zinc-200 uppercase tracking-wider">{current?.label || 'Portal'}</span>
                            <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-64 bg-zinc-950 border-zinc-800 p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2.5 mb-2 rounded-xl bg-zinc-900/50">
                            <span className="text-[9px] uppercase font-black text-zinc-500 tracking-[0.25em]">OPERATIONAL PORTALS</span>
                        </div>
                        
                        <div className="space-y-1">
                            {availablePages.map((role) => {
                                const isActive = role.path && pathname?.startsWith(role.path);
                                const Icon = role.icon || IdCard;
                                return (
                                    <DropdownMenuItem
                                        key={role.key}
                                        onClick={() => {
                                            if (role.path) {
                                                router.push(role.path);
                                            }
                                        }}
                                        className={`
                                            flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-200
                                            ${isActive 
                                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]' 
                                                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent'}
                                        `}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-600'}`} />
                                        <span className="font-semibold text-sm">{role.label}</span>
                                        {isActive && <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>}
                                    </DropdownMenuItem>
                                );
                            })}
                        </div>
                        
                        {adminPage && (
                            <>
                                <div className="h-px bg-zinc-800 my-2.5 mx-2"></div>
                                <DropdownMenuItem
                                    key={adminPage.key}
                                    onClick={() => router.push(adminPage.path!)}
                                    className={`
                                        flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-200
                                        ${pathname?.startsWith('/admin') 
                                            ? 'bg-red-600/10 text-red-500 border border-red-500/20' 
                                            : 'text-red-400/60 hover:bg-red-600/10 hover:text-red-500 border border-transparent'}
                                    `}
                                >
                                    <Settings className="w-4 h-4" />
                                    <span className="font-semibold text-sm">{adminPage.label}</span>
                                    {pathname?.startsWith('/admin') && <div className="ml-auto w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="flex-1 flex items-center gap-3 justify-end">
                <UserMenu />
            </div>
        </div>
    );
}
