"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, IdCard } from 'lucide-react';

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
};

const ROLE_PAGES: RolePage[] = [
    { key: 'civilian', label: 'Civilian', path: '/citizen', icon: IdCard },
    { key: 'police', label: 'Police', path: '/police' },
    { key: 'dispatcher', label: 'Dispatcher', path: '/dispatcher', disabled: true },
    { key: 'ems', label: 'EMS / Fire', path: '/ems', disabled: true },
];

export default function RoleSwitcher() {
    const pathname = usePathname();
    const router = useRouter();

    const current =
        ROLE_PAGES.find((role) => role.path && pathname?.startsWith(role.path)) || ROLE_PAGES[0];
    const CurrentIcon = current.icon || IdCard;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground px-3 py-1.5 rounded-md transition-colors ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                >
                    <CurrentIcon className="w-5 h-5 text-zinc-400" />
                    <span className="font-semibold text-sm">{current.label}</span>
                    <ChevronDown className="w-4 h-4 text-zinc-500 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44">
                {ROLE_PAGES.map((role) => {
                    const isActive = role.key === current.key;
                    return (
                        <DropdownMenuItem
                            key={role.key}
                            disabled={role.disabled || !role.path}
                            onClick={() => {
                                if (role.path && !role.disabled) {
                                    router.push(role.path);
                                }
                            }}
                            className={isActive ? 'text-blue-400 font-semibold' : undefined}
                        >
                            <span>{role.label}</span>
                            {isActive && <span className="ml-auto text-[10px] uppercase text-blue-400">Current</span>}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
