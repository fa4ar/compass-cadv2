import React from 'react';
import { User, CheckCircle, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { UnitTooltip } from './UnitTooltip';

interface UnitUser {
    username: string;
    avatarUrl?: string;
}

interface Unit {
    unit: string;
    officer: string;
    status: string;
    beat: string;
    call: string;
    time: string;
    nature: string;
    location: string;
    userId?: number;
    partnerUserId?: number;
    partnerOfficer?: string;
    partnerUser?: UnitUser;
    user?: UnitUser;
    pairedWith?: any[];
}

interface UnitTableRowProps {
    unit: Unit;
    isSelected?: boolean;
    isDraggable?: boolean;
    isDropTarget?: boolean;
    onDragStart?: (unit: Unit) => void;
    onDragOver?: (e: React.DragEvent, unit: Unit) => void;
    onDragLeave?: () => void;
    onDrop?: (unit: Unit) => void;
    onDragEnd?: () => void;
    onClick?: (unit: Unit) => void;
    onUpdateStatus?: (unit: Unit, status: string) => void;
    canManageUnits?: boolean;
    getImageUrl?: (url?: string) => string | null;
    showStatusActions?: boolean;
}

export const UnitTableRow: React.FC<UnitTableRowProps> = ({
    unit,
    isSelected = false,
    isDraggable = false,
    isDropTarget = false,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    onClick,
    onUpdateStatus,
    canManageUnits = false,
    getImageUrl = (url) => url || null,
    showStatusActions = false
}) => {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'Available': 'text-green-400',
            'Busy': 'text-yellow-400',
            'Enroute': 'text-blue-400',
            'On Scene': 'text-emerald-400',
            'Dispatched': 'text-purple-400',
            'Resolving': 'text-indigo-400'
        };
        return colors[status] || 'text-red-400';
    };

    const getStatusDotColor = (status: string) => {
        const colors: Record<string, string> = {
            'Available': 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]',
            'Busy': 'bg-yellow-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
            'Enroute': 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]',
            'On Scene': 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
            'Dispatched': 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)]',
            'Resolving': 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]'
        };
        return colors[status] || 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]';
    };

    const isPaired = unit.partnerUserId || (unit.pairedWith && unit.pairedWith.length > 0);

    return (
        <tr
            draggable={isDraggable && !isPaired}
            onDragStart={() => onDragStart?.(unit)}
            onDragOver={(e) => onDragOver?.(e, unit)}
            onDragLeave={onDragLeave}
            onDrop={() => onDrop?.(unit)}
            onDragEnd={onDragEnd}
            className={`
                border-b border-zinc-800/50 hover:bg-zinc-800/30 
                ${isSelected ? 'bg-blue-900/10' : ''}
                ${isDropTarget ? 'bg-purple-500/20 border-2 border-purple-500' : ''}
                ${isDraggable && !isPaired ? 'cursor-grab' : ''}
                ${unit.status === "Dispatched" ? "bg-blue-950/20" : ""}
            `}
            onClick={() => onClick?.(unit)}
        >
            <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                    <span className={`font-bold ${unit.status === "Available" ? "text-green-400" : "text-blue-400"}`}>
                        {unit.unit}
                    </span>
                    {isPaired && (
                        <UnitTooltip unit={unit} getImageUrl={getImageUrl}>
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] text-blue-400 cursor-help transition-colors hover:bg-blue-500/30">
                                <User className="w-3 h-3" />
                                +2
                            </div>
                        </UnitTooltip>
                    )}
                </div>
            </td>
            <td className="px-3 py-2 text-zinc-300">{unit.officer}</td>
            <td className="px-3 py-2">
                <StatusBadge status={unit.status} type="unit" size="md" />
            </td>
            <td className="px-3 py-2 text-zinc-500 text-xs font-mono">{unit.time}</td>
            <td className="px-3 py-2 text-zinc-300">{unit.nature}</td>
            <td className="px-3 py-2 text-zinc-300">{unit.location}</td>
            {showStatusActions && onUpdateStatus && (
                <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            title="Доступен"
                            className="h-7 w-7 text-green-500 hover:bg-green-500/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(unit, 'Available');
                            }}
                        >
                            <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            title="Занят"
                            className="h-7 w-7 text-amber-500 hover:bg-amber-500/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(unit, 'Busy');
                            }}
                        >
                            <Siren className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </td>
            )}
        </tr>
    );
};
