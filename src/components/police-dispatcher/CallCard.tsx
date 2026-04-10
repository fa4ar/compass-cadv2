import React from 'react';
import { MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';

interface Call {
    id: number;
    callerName: string;
    location: string;
    description: string;
    status: string;
    createdAt: string;
    notes?: any[];
}

interface CallCardProps {
    call: Call;
    isSelected: boolean;
    onClick: () => void;
    onDelete?: (callId: number) => void;
    showDelete?: boolean;
}

export const CallCard: React.FC<CallCardProps> = ({ 
    call, 
    isSelected, 
    onClick, 
    onDelete,
    showDelete = false 
}) => {
    return (
        <tr
            className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-900/10' : ''
            }`}
            onClick={onClick}
        >
            <td className="px-3 py-2 font-medium text-zinc-100">#{call.id}</td>
            <td className="px-3 py-2 text-zinc-300 font-mono text-xs">
                {new Date(call.createdAt).toLocaleTimeString()}
            </td>
            <td className="px-3 py-2 text-zinc-100">{call.callerName}</td>
            <td className="px-3 py-2 text-zinc-300">{call.location}</td>
            <td className="px-3 py-2 text-zinc-100">{call.description}</td>
            <td className="px-3 py-2">
                <StatusBadge status={call.status} type="call" size="sm" />
            </td>
            <td className="px-3 py-2 text-right">
                <div className="relative inline-block">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    {call.notes && call.notes.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                </div>
            </td>
            {showDelete && (
                <td className="px-3 py-2 text-right">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(call.id);
                        }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </td>
            )}
        </tr>
    );
};
