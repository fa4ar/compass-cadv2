import React from 'react';

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
    type?: 'unit' | 'call';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', type = 'unit' }) => {
    const getUnitStatusConfig = (status: string) => {
        const configs: Record<string, { className: string; text: string }> = {
            'Available': {
                className: 'bg-green-500/20 text-green-400',
                text: 'ДОСТУПЕН'
            },
            'Busy': {
                className: 'bg-amber-500/20 text-amber-400',
                text: 'ЗАНЯТ'
            },
            'Enroute': {
                className: 'bg-blue-500/20 text-blue-400',
                text: 'В ПУТИ'
            },
            'On Scene': {
                className: 'bg-emerald-500/20 text-emerald-400',
                text: 'НА МЕСТЕ'
            },
            'Dispatched': {
                className: 'bg-purple-500/20 text-purple-400',
                text: 'НАЗНАЧЕН'
            },
            'Resolving': {
                className: 'bg-indigo-500/20 text-indigo-400',
                text: 'ОБРАБАТЫВАЕТСЯ'
            }
        };
        return configs[status] || { className: 'bg-zinc-500/20 text-zinc-400', text: status };
    };

    const getCallStatusConfig = (status: string) => {
        const configs: Record<string, { className: string; text: string }> = {
            'pending': {
                className: 'bg-amber-500/20 text-amber-500',
                text: 'ОЖИДАЕТ'
            },
            'dispatched': {
                className: 'bg-blue-500/20 text-blue-500',
                text: 'ОТПРАВЛЕН'
            }
        };
        return configs[status] || { className: 'bg-zinc-500/20 text-zinc-500', text: status };
    };

    const config = type === 'unit' ? getUnitStatusConfig(status) : getCallStatusConfig(status);
    
    const sizeClasses = {
        sm: 'px-1.5 py-0.5 rounded text-[10px]',
        md: 'px-2 py-0.5 rounded-full text-[10px]',
        lg: 'px-3 py-1 rounded-full text-xs'
    };

    return (
        <span className={`${sizeClasses[size]} font-bold uppercase ${config.className}`}>
            {config.text}
        </span>
    );
};
