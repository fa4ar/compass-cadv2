import React from 'react';
import { Users, User } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UnitUser {
    username: string;
    avatarUrl?: string;
}

interface Unit {
    officer: string;
    user?: UnitUser;
    partnerOfficer?: string;
    partnerUser?: UnitUser;
    partnerUserId?: number;
}

interface UnitTooltipProps {
    unit: Unit;
    children: React.ReactNode;
    getImageUrl?: (url?: string) => string | null;
}

export const UnitTooltip: React.FC<UnitTooltipProps> = ({ unit, children, getImageUrl = (url) => url || null }) => {
    if (!unit.partnerUserId && !unit.partnerOfficer) {
        return <>{children}</>;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-900 border-zinc-700 p-3 shadow-2xl">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Состав экипажа</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                    {unit.user?.avatarUrl ? (
                                        <img src={getImageUrl(unit.user.avatarUrl)!} alt={unit.user.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-4 h-4" /></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{unit.officer}</span>
                                <span className="text-[10px] text-zinc-500">@{unit.user?.username || 'user'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                    {unit.partnerUser?.avatarUrl ? (
                                        <img src={getImageUrl(unit.partnerUser.avatarUrl)!} alt={unit.partnerUser.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-4 h-4" /></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{unit.partnerOfficer}</span>
                                <span className="text-[10px] text-zinc-500">@{unit.partnerUser?.username || 'user'}</span>
                            </div>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};
