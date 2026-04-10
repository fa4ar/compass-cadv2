"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, IdCard, Shield, Radio, Heart, Settings, Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    { key: 'ems', label: 'EMS / Fire', path: '/ems', icon: Heart, requiredRoles: ['ems'] },
];

export default function RoleSwitcher() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, hasRole, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) return null;

    const isAdmin = hasRole(['admin', 'Admin']);

    const availablePages = ROLE_PAGES.filter(role => {
        if (role.disabled) return false;
        if (role.requiredRoles && role.requiredRoles.length > 0) {
            return hasRole(role.requiredRoles);
        }
        return true;
    });

    const adminPage = isAdmin ? { key: 'admin', label: 'Admin Panel', path: '/admin', icon: Settings } : null;
    const allLinks = [...(adminPage ? [adminPage] : []), ...availablePages];

    const current =
        allLinks.find((role) => role.path && pathname?.startsWith(role.path)) || availablePages[0];
    const CurrentIcon = current?.icon || IdCard;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2.5 h-9 hover:bg-zinc-900 rounded-lg px-3 transition-all border border-zinc-800/40 hover:border-zinc-700 focus-visible:ring-0 outline-none"
                >
                    <CurrentIcon className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-[13px] text-zinc-300 uppercase tracking-wide">{current?.label || 'Portal'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-600 ml-0.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 p-1.5 rounded-xl shadow-2xl z-[100]">
                <div className="px-3 py-2 mb-1.5">
                    <span className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">Select Portal</span>
                </div>
                {allLinks.map((role) => {
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
                                flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors mb-0.5
                                ${isActive 
                                    ? 'bg-blue-600/10 text-blue-400 font-bold' 
                                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'}
                            `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-600'}`} />
                            <span className="text-sm">{role.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
