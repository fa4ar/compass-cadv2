"use client";

import React from 'react';
import { X, Car, Shield, Calendar, Palette, Tag, AlertTriangle, FileText, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ViewVehicleModalProps {
    show: boolean;
    onClose: () => void;
    vehicle: any;
    getImageUrl: (url?: string) => string | null;
    toggleVehicleStatus: (id: number, current: string) => void;
    deleteVehicle: (id: number) => void;
}

export const ViewVehicleModal: React.FC<ViewVehicleModalProps> = ({
    show,
    onClose,
    vehicle,
    getImageUrl,
    toggleVehicleStatus,
    deleteVehicle
}) => {
    if (!show || !vehicle) return null;

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'valid': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'stolen': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'impounded': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    const getInsuranceColor = (insurance: string) => {
        switch (insurance?.toLowerCase()) {
            case 'valid': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'expired': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
            <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center">
                            <Car className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Детали транспорта</h3>
                            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{vehicle.plate}</p>
                        </div>
                    </div>
                    <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Image */}
                    <div className="aspect-video w-full bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative group">
                        {getImageUrl(vehicle.imageUrl) ? (
                            <img src={getImageUrl(vehicle.imageUrl)!} alt={vehicle.model} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700">
                                <Car className="w-16 h-16 mb-2" />
                                <p className="text-xs uppercase tracking-widest font-bold">Фото отсутствует</p>
                            </div>
                        )}
                        <div className="absolute top-4 right-4">
                            <Badge className={`${getStatusColor(vehicle.status)} px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-md`}>
                                {vehicle.status === 'Valid' ? 'Активен' : vehicle.status === 'Stolen' ? 'Угнан' : vehicle.status === 'Impounded' ? 'Штрафстоянка' : vehicle.status}
                            </Badge>
                        </div>
                    </div>

                    {/* Main Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
                                <Tag className="w-3 h-3" /> Модель
                            </p>
                            <p className="text-lg font-bold text-zinc-100">{vehicle.model}</p>
                        </div>
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
                                <Palette className="w-3 h-3" /> Цвет
                            </p>
                            <p className="text-lg font-bold text-zinc-100">{vehicle.color || 'Неизвестно'}</p>
                        </div>
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Номер (Plate)
                            </p>
                            <p className="text-lg font-mono font-bold text-blue-400">{vehicle.plate}</p>
                        </div>
                        <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Страховка
                            </p>
                            <Badge variant="outline" className={`${getInsuranceColor(vehicle.insurance)} mt-1`}>
                                {vehicle.insurance === 'Valid' ? 'Действительна' : vehicle.insurance === 'Expired' ? 'Истекла' : vehicle.insurance || 'Действительна'}
                            </Badge>
                        </div>
                    </div>

                    {/* Additional Info / Alerts */}
                    {vehicle.status?.toLowerCase() === 'stolen' && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-rose-400">Внимание: Транспорт в угоне</p>
                                <p className="text-xs text-rose-500/70">Этот автомобиль числится в розыске. Правоохранительные органы уведомлены.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-zinc-800/50 bg-zinc-900/20 flex gap-3">
                    <Button 
                        onClick={() => toggleVehicleStatus(vehicle.id, vehicle.status)} 
                        variant="outline" 
                        className="flex-1 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Изменить статус
                    </Button>
                    <Button 
                        onClick={() => {
                            if (confirm('Вы уверены, что хотите снять этот транспорт с регистрации?')) {
                                deleteVehicle(vehicle.id);
                                onClose();
                            }
                        }} 
                        variant="outline" 
                        className="flex-1 bg-zinc-800 border-zinc-700 hover:bg-rose-950 hover:text-rose-400 hover:border-rose-900/50 text-rose-500"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                    </Button>
                </div>
            </div>
        </div>
    );
};
