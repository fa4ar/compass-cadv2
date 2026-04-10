"use client";

import React, { useState, useEffect } from 'react';
import { User, X, Pencil, FileText, Trash2, RefreshCw, Car, Shield, Plus, Briefcase, Info, BadgeCheck, MoreHorizontal, Receipt, AlertCircle, Tag, FileText as WarrantIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FineIssuanceModal } from '@/components/police-dispatcher/FineIssuanceModal';
import { WarrantRequestModal } from '@/components/police-dispatcher/WarrantRequestModal';
import { TagsManagementPanel } from '@/components/police-dispatcher/TagsManagementPanel';
import { CustomTagCreator } from '@/components/police-dispatcher/CustomTagCreator';

interface ViewCharacterModalProps {
    show: boolean;
    onClose: () => void;
    character: any;
    getImageUrl: (url?: string) => string | null;
    getStatusColor: (status?: string, isAlive?: boolean) => any;
    formatDate: (date?: string) => string;
    charLicenses: any[];
    charVehicles: any[];
    charWeapons: any[];
    charFines?: any[];
    charTags?: any[];
    charWarrants?: any[];
    allCharacters?: any[];
    toggleVehicleStatus: (id: number, current: string) => void;
    toggleWeaponStatus: (id: number, current: string) => void;
    deleteVehicle: (id: number) => void;
    deleteWeapon: (id: number) => void;
    openEditModal: (char: any) => void;
    openDepartmentModal: (char: any) => void;
    handleDeleteCharacter: () => void;
    setShowLicenseModal: (show: boolean) => void;
    setShowVehicleModal: (show: boolean) => void;
    setShowWeaponModal: (show: boolean) => void;
    onViewVehicle?: (vehicle: any) => void;
    onIssueFine?: (char: any) => void;
    onRequestWarrant?: (char: any) => void;
    currentCharacterId?: string;
}

export const ViewCharacterModal: React.FC<ViewCharacterModalProps> = ({
    show,
    onClose,
    character,
    getImageUrl,
    getStatusColor,
    formatDate,
    charLicenses,
    charVehicles,
    charWeapons,
    charFines = [],
    charTags = [],
    charWarrants = [],
    allCharacters = [],
    toggleVehicleStatus,
    toggleWeaponStatus,
    deleteVehicle,
    deleteWeapon,
    openEditModal,
    openDepartmentModal,
    handleDeleteCharacter,
    setShowLicenseModal,
    setShowVehicleModal,
    setShowWeaponModal,
    onViewVehicle,
    onIssueFine,
    onRequestWarrant,
    currentCharacterId
}) => {
    const [showFineModal, setShowFineModal] = useState(false);
    const [showWarrantModal, setShowWarrantModal] = useState(false);
    const [showCustomTagModal, setShowCustomTagModal] = useState(false);
    const [tags, setTags] = useState(charTags);
    const [warrants, setWarrants] = useState(charWarrants);

    useEffect(() => {
        setTags(charTags);
        setWarrants(charWarrants);
    }, [charTags, charWarrants]);

    const handleFineIssued = (fine: any) => {
        // Refresh fines from parent
        onIssueFine?.(character);
    };

    const handleWarrantRequested = (warrant: any) => {
        setWarrants([...warrants, warrant]);
        onRequestWarrant?.(character);
    };

    const handleTagsChange = (newTags: any[]) => {
        setTags(newTags);
    };

    const handleCustomTagCreated = (tag: any) => {
        setTags([...tags, tag]);
    };

    if (!show || !character) return null;

    const statusStyle = getStatusColor(character.status, character.isAlive);
    const isAlive = character.isAlive !== false;
    const birthDate = character.birthDate ? new Date(character.birthDate) : null;
    const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    const activeDept = character.departmentMembers?.find((m: any) => m.isActive);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl h-[650px] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header Section */}
                <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/20">
                    <div className="flex items-center gap-5">
                        {/* Photo Square */}
                        <div className="relative shrink-0">
                            <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-zinc-800 bg-zinc-900 shadow-lg relative">
                                {getImageUrl(character.photoUrl) ? (
                                    <img src={getImageUrl(character.photoUrl)!} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-10 h-10 text-zinc-700" />
                                    </div>
                                )}
                                {!isAlive && <div className="absolute inset-0 bg-rose-950/20 backdrop-grayscale-[0.5]" />}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-zinc-950 ${isAlive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
                        </div>

                        {/* Name and Basic Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {character.firstName} {character.lastName}
                                </h2>
                                {character.nickname && (
                                    <span className="text-blue-400 font-medium text-lg">"{character.nickname}"</span>
                                )}
                                {activeDept && (
                                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 px-2 py-0 h-6 flex items-center gap-1 ml-2">
                                        <Shield className="w-3.5 h-3.5" />
                                        {activeDept.department?.code || 'Officer'}
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-1 text-zinc-400 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />
                                    <span>{character.gender === 'male' ? 'Male' : character.gender === 'female' ? 'Female' : 'Other'}</span>
                                </div>
                                <span className="text-zinc-800">•</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-zinc-300 font-medium">{age} лет</span>
                                    <span className="text-zinc-600">({birthDate?.toLocaleDateString('ru-RU')})</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons top right */}
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-9 w-9 bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700/50">
                                    <MoreHorizontal className="w-4 h-4 text-zinc-300" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                <DropdownMenuItem onClick={() => openEditModal(character)} className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                                    <Pencil className="w-4 h-4 mr-2" /> Edit Character
                                </DropdownMenuItem>
                                {!activeDept && (
                                    <DropdownMenuItem onClick={() => openDepartmentModal(character)} className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                                        <FileText className="w-4 h-4 mr-2" /> Assign Department
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleDeleteCharacter} className="focus:bg-red-950 focus:text-red-400 text-red-400 cursor-pointer">
                                     <Trash2 className="w-4 h-4 mr-2" /> Delete Character
                                 </DropdownMenuItem>
                                 {onIssueFine && (
                                     <DropdownMenuItem onClick={() => setShowFineModal(true)} className="focus:bg-blue-950 focus:text-blue-400 text-blue-400 cursor-pointer">
                                         <Receipt className="w-4 h-4 mr-2" /> Выдать штраф
                                     </DropdownMenuItem>
                                 )}
                                 {onRequestWarrant && (
                                     <DropdownMenuItem onClick={() => setShowWarrantModal(true)} className="focus:bg-red-950 focus:text-red-400 text-red-400 cursor-pointer">
                                         <WarrantIcon className="w-4 h-4 mr-2" /> Запросить ордер
                                     </DropdownMenuItem>
                                 )}
                             </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={onClose} variant="secondary" size="icon" className="h-9 w-9 bg-zinc-800/50 hover:bg-zinc-800 border-zinc-700/50">
                            <X className="w-4 h-4 text-zinc-300" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {/* Tabs Content */}
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="w-full bg-zinc-900/50 border border-zinc-800/50 p-1 mb-6">
                            <TabsTrigger value="overview" className="flex-1 text-xs data-[state=active]:bg-zinc-800">Обзор</TabsTrigger>
                            <TabsTrigger value="assets" className="flex-1 text-xs data-[state=active]:bg-zinc-800">Имущество</TabsTrigger>
                            <TabsTrigger value="licenses" className="flex-1 text-xs data-[state=active]:bg-zinc-800">Лицензии</TabsTrigger>
                            <TabsTrigger value="fines" className="flex-1 text-xs data-[state=active]:bg-zinc-800 flex items-center gap-1.5">
                                Штрафы
                                {charFines.filter(f => f.status === 'unpaid').length > 0 && (
                                    <span className="flex h-2 w-2 rounded-full bg-rose-500" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="tags" className="flex-1 text-xs data-[state=active]:bg-zinc-800 flex items-center gap-1.5">
                                Теги
                                {tags.length > 0 && (
                                    <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="warrants" className="flex-1 text-xs data-[state=active]:bg-zinc-800 flex items-center gap-1.5">
                                Ордера
                                {warrants.filter(w => w.status === 'active').length > 0 && (
                                    <span className="flex h-2 w-2 rounded-full bg-red-500" />
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl space-y-3">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Info className="w-3 h-3" /> Физические данные
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase">Рост</p>
                                                <p className="text-sm text-zinc-200 font-medium">{character.height || '--'} см</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase">Вес</p>
                                                <p className="text-sm text-zinc-200 font-medium">{character.weight || '--'} кг</p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[10px] text-zinc-500 uppercase">SSN (Номер соцстрахования)</p>
                                                <p className="text-sm text-zinc-200 font-mono tracking-wider">{character.ssn || 'Не назначен'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {character.job && (
                                        <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl space-y-2">
                                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                <Briefcase className="w-3 h-3" /> Место работы
                                            </h4>
                                            <p className="text-sm text-blue-400 font-semibold">{character.job.name}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl space-y-2 h-full">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Биография / Описание</h4>
                                        <p className="text-sm text-zinc-400 italic leading-relaxed">
                                            {character.description || 'Описание персонажа отсутствует.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {activeDept && (
                                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-blue-400 uppercase tracking-tight">{activeDept.department?.name}</p>
                                            <p className="text-sm text-zinc-200">{activeDept.rank?.name} • <span className="text-zinc-500">#{activeDept.badgeNumber}</span></p>
                                        </div>
                                    </div>
                                    {activeDept.callSign && (
                                        <div className="text-right">
                                            <p className="text-[10px] text-zinc-500 uppercase">Позывной</p>
                                            <p className="text-sm font-mono font-bold text-zinc-200">{activeDept.callSign}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="assets" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Vehicles Section */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Car className="w-3.5 h-3.5" /> Транспортные средства
                                        </h4>
                                        <Button size="sm" variant="ghost" onClick={() => setShowVehicleModal(true)} className="h-7 px-2 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/5">
                                            <Plus className="w-3 h-3 mr-1" /> Добавить
                                        </Button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {charVehicles.length === 0 ? (
                                            <div className="p-4 border border-dashed border-zinc-800 rounded-xl text-center">
                                                <p className="text-xs text-zinc-600 italic">Транспорт не зарегистрирован</p>
                                            </div>
                                        ) : (
                                            charVehicles.map(v => (
                                                <div 
                                                    key={v.id} 
                                                    className="group flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl hover:border-zinc-700/50 transition-all cursor-pointer"
                                                    onClick={() => onViewVehicle?.(v)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center">
                                                            <Car className="w-4 h-4 text-zinc-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-zinc-100">{v.plate}</p>
                                                            <p className="text-[10px] text-zinc-500 uppercase">{v.color} {v.model}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" onClick={() => toggleVehicleStatus(v.id, v.status)} className="h-7 w-7 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10">
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => deleteVehicle(v.id)} className="h-7 w-7 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Weapons Section */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5" /> Зарегистрированное оружие
                                        </h4>
                                        <Button size="sm" variant="ghost" onClick={() => setShowWeaponModal(true)} className="h-7 px-2 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/5">
                                            <Plus className="w-3 h-3 mr-1" /> Добавить
                                        </Button>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {charWeapons.length === 0 ? (
                                            <div className="p-4 border border-dashed border-zinc-800 rounded-xl text-center">
                                                <p className="text-xs text-zinc-600 italic">Оружие не зарегистрировано</p>
                                            </div>
                                        ) : (
                                            charWeapons.map(w => (
                                                <div key={w.id} className="group flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl hover:border-zinc-700/50 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center">
                                                            <Shield className="w-4 h-4 text-zinc-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-100">{w.model}</p>
                                                            <p className="text-[10px] text-zinc-500 font-mono">S/N: {w.serial}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" onClick={() => toggleWeaponStatus(w.id, w.status)} className="h-7 w-7 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10">
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => deleteWeapon(w.id)} className="h-7 w-7 text-zinc-500 hover:text-rose-400 hover:bg-rose-400/10">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="licenses" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Активные лицензии и разрешения</h4>
                                <Button size="sm" variant="ghost" onClick={() => setShowLicenseModal(true)} className="h-7 px-2 text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/5">
                                    <Pencil className="w-3 h-3 mr-1" /> Управление
                                </Button>
                            </div>
                            
                            {charLicenses.length === 0 ? (
                                <div className="p-8 border border-dashed border-zinc-800 rounded-2xl text-center">
                                    <BadgeCheck className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-600 italic">У этого персонажа нет лицензий</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {charLicenses.map(cl => (
                                        <div key={cl.id} className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl flex items-center gap-4 hover:border-zinc-700/50 transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <BadgeCheck className="w-12 h-12 -mr-4 -mt-4 rotate-12" />
                                            </div>
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
                                                <BadgeCheck className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-zinc-100 tracking-tight truncate">{cl.license.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="outline" className="text-[8px] uppercase font-bold px-1.5 py-0 h-3.5 bg-zinc-800/50 text-zinc-400 border-zinc-700/50">
                                                        {cl.license.type}
                                                    </Badge>
                                                    <span className="text-[9px] text-zinc-600 font-mono uppercase">ID: LIC-{cl.id.toString().padStart(4, '0')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="fines" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Штрафы персонажа</h4>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                                        НЕОПЛАЧЕНО: 
                                        <span className="text-rose-500">${charFines.filter(f => f.status === 'unpaid').reduce((sum, f) => sum + f.amount, 0).toLocaleString()}</span>
                                    </div>
                                    {onIssueFine && (
                                        <Button size="sm" variant="ghost" onClick={() => setShowFineModal(true)} className="h-7 px-2 text-[10px] text-amber-400 hover:text-amber-300 hover:bg-amber-400/5">
                                            <Receipt className="w-3 h-3 mr-1" /> Выдать штраф
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {charFines.length === 0 ? (
                                <div className="p-8 border border-dashed border-zinc-800 rounded-2xl text-center">
                                    <Receipt className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-600 italic">Нарушений не найдено</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {charFines.map(fine => (
                                        <div key={fine.id} className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl space-y-3 relative group overflow-hidden">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${fine.status === 'paid' ? 'bg-emerald-500' : fine.isSelfIssued ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                            
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-zinc-100">{fine.reason}</p>
                                                        {fine.isSelfIssued && (
                                                            <Badge className="text-[8px] uppercase font-bold px-1.5 py-0 h-4 bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                                Самовыписанный
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 uppercase flex items-center gap-1 mt-0.5">
                                                        <User className="w-2.5 h-2.5" />
                                                        Выписал: {fine.issuer ? `${fine.issuer.firstName} ${fine.issuer.lastName}` : fine.officer ? `${fine.officer.firstName} ${fine.officer.lastName}` : 'Система'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-lg font-bold ${fine.status === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        ${fine.amount.toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500 uppercase font-medium">{new Date(fine.issuedAt).toLocaleDateString('ru-RU')}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                                                <Badge className={`text-[9px] uppercase font-bold px-2 py-0 h-4 ${
                                                    fine.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                }`}>
                                                    {fine.status === 'paid' ? 'Оплачен' : 'Не оплачен'}
                                                </Badge>
                                                {fine.status === 'unpaid' && (
                                                    <p className="text-[9px] text-zinc-500 italic flex items-center gap-1">
                                                        <AlertCircle className="w-2.5 h-2.5" /> Требуется оплата
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="tags" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <TagsManagementPanel
                                characterId={character.id}
                                tags={tags}
                                onTagsChange={handleTagsChange}
                                currentCharacterId={currentCharacterId}
                            />
                            <CustomTagCreator
                                isOpen={showCustomTagModal}
                                onClose={() => setShowCustomTagModal(false)}
                                onTagCreated={handleCustomTagCreated}
                                characterId={character.id}
                                existingCustomTagsCount={tags.filter(t => t.isCustom).length}
                            />
                        </TabsContent>

                        <TabsContent value="warrants" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center px-1">
                                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Ордера на персонажа</h4>
                                {onRequestWarrant && (
                                    <Button size="sm" variant="ghost" onClick={() => setShowWarrantModal(true)} className="h-7 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/5">
                                        <WarrantIcon className="w-3 h-3 mr-1" /> Запросить ордер
                                    </Button>
                                )}
                            </div>

                            {warrants.length === 0 ? (
                                <div className="p-8 border border-dashed border-zinc-800 rounded-2xl text-center">
                                    <WarrantIcon className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                                    <p className="text-sm text-zinc-600 italic">Ордеров не найдено</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {warrants.map(warrant => (
                                        <div key={warrant.id} className={`p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl space-y-3 relative group overflow-hidden ${
                                            warrant.status === 'active' ? 'border-red-500/30' : ''
                                        } ${warrant.status === 'active' ? 'animate-pulse' : ''}`}>
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                warrant.status === 'active' ? 'bg-red-500' : 
                                                warrant.status === 'executed' ? 'bg-emerald-500' : 
                                                warrant.status === 'pending' ? 'bg-amber-500' : 'bg-zinc-500'
                                            }`} />
                                            
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`text-[9px] uppercase font-bold px-2 py-0 h-4 ${
                                                            warrant.status === 'active' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                                            warrant.status === 'executed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                            warrant.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                            'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                                        }`}>
                                                            {warrant.status === 'active' ? 'АКТИВЕН' : 
                                                             warrant.status === 'executed' ? 'ИСПОЛНЕН' : 
                                                             warrant.status === 'pending' ? 'ОЖИДАЕТ' : 
                                                             warrant.status === 'cancelled' ? 'ОТМЕНЕН' : 
                                                             warrant.status.toUpperCase()}
                                                        </Badge>
                                                        <p className="text-sm font-bold text-zinc-100">{warrant.warrantType === 'arrest' ? 'Арест' : warrant.warrantType === 'search' ? 'Обыск' : 'Наблюдение'}</p>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 mt-1">{warrant.reason}</p>
                                                    {warrant.evidence && (
                                                        <p className="text-[9px] text-zinc-500 italic mt-1">Доказательства: {warrant.evidence}</p>
                                                    )}
                                                    <p className="text-[10px] text-zinc-500 uppercase flex items-center gap-1 mt-1">
                                                        <User className="w-2.5 h-2.5" />
                                                        Запросил: {warrant.requester ? `${warrant.requester.firstName} ${warrant.requester.lastName}` : 'Неизвестно'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-zinc-500 uppercase font-medium">{new Date(warrant.createdAt).toLocaleDateString('ru-RU')}</p>
                                                    {warrant.expiresAt && (
                                                        <p className="text-[9px] text-zinc-500">Истекает: {new Date(warrant.expiresAt).toLocaleDateString('ru-RU')}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {warrant.witnesses && warrant.witnesses.length > 0 && (
                                                <div className="pt-2 border-t border-zinc-800/50">
                                                    <p className="text-[10px] text-zinc-500 uppercase mb-1">Свидетели ({warrant.witnesses.length})</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {warrant.witnesses.map((witness: any) => (
                                                            <Badge key={witness.witnessId} variant="outline" className="text-[8px] bg-zinc-800/50 text-zinc-400 border-zinc-700/50">
                                                                {witness.firstName} {witness.lastName}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Modals */}
            <FineIssuanceModal
                isOpen={showFineModal}
                onClose={() => setShowFineModal(false)}
                characters={allCharacters}
                onFineIssued={handleFineIssued}
                currentCharacterId={currentCharacterId}
            />
            <WarrantRequestModal
                isOpen={showWarrantModal}
                onClose={() => setShowWarrantModal(false)}
                characters={allCharacters}
                onWarrantRequested={handleWarrantRequested}
                currentCharacterId={currentCharacterId}
            />
        </div>
    );
};