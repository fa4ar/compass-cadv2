"use client";

import React from 'react';
import { User, X, Pencil, FileText, Trash2, RefreshCw, Car, Shield, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
    toggleVehicleStatus,
    toggleWeaponStatus,
    deleteVehicle,
    deleteWeapon,
    openEditModal,
    openDepartmentModal,
    handleDeleteCharacter,
    setShowLicenseModal,
    setShowVehicleModal,
    setShowWeaponModal
}) => {
    if (!show || !character) return null;

    const statusStyle = getStatusColor(character.status, character.isAlive);
    const isAlive = character.isAlive !== false;
    const birthDate = character.birthDate ? new Date(character.birthDate) : null;
    const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Status bar */}
                <div className={`h-1 ${isAlive ? 'bg-green-500' : 'bg-red-500'}`} />

                {/* Close button */}
                <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/50 rounded-full hover:bg-black/70 z-10">
                    <X className="w-4 h-4 text-white" />
                </button>

                {/* Photo */}
                <div className="aspect-square bg-zinc-800 overflow-hidden">
                    {getImageUrl(character.photoUrl) ? (
                        <img src={getImageUrl(character.photoUrl)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <User className="w-16 h-16 text-zinc-600" />
                        </div>
                    )}
                    {!isAlive && <div className="absolute inset-0 bg-red-950/40" />}
                </div>

                {/* Info */}
                <div className="p-4 space-y-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{character.firstName} {character.lastName}</h2>
                        {character.nickname && <p className="text-sm text-blue-400">"{character.nickname}"</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {character.gender && (
                            <div><p className="text-[10px] text-zinc-500 uppercase">Gender</p><p className="text-zinc-200">{character.gender}</p></div>
                        )}
                        {birthDate && (
                            <div><p className="text-[10px] text-zinc-500 uppercase">Birth Date</p><p className="text-zinc-200">{birthDate.toLocaleDateString('ru-RU')}</p></div>
                        )}
                        {age !== null && (
                            <div><p className="text-[10px] text-zinc-500 uppercase">Age</p><p className="text-zinc-200">{age} years</p></div>
                        )}
                        {character.height && (
                            <div><p className="text-[10px] text-zinc-500 uppercase">Height</p><p className="text-zinc-200">{character.height} cm</p></div>
                        )}
                        {character.weight && (
                            <div><p className="text-[10px] text-zinc-500 uppercase">Weight</p><p className="text-zinc-200">{character.weight} kg</p></div>
                        )}
                        {character.ssn && (
                            <div><p className="text-[10px] text-zinc-500 uppercase">SSN</p><p className="text-zinc-200 font-mono">{character.ssn}</p></div>
                        )}
                    </div>

                    {character.job && (
                        <div className="p-3 bg-zinc-800 rounded">
                            <p className="text-[10px] text-zinc-500 uppercase">Job</p>
                            <p className="text-zinc-200">{character.job.name}</p>
                        </div>
                    )}

                    {character.description && (
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase">Description</p>
                            <p className="text-zinc-300 text-sm">{character.description}</p>
                        </div>
                    )}

                    {character.departmentMembers && character.departmentMembers.length > 0 && (
                        <div className="p-3 bg-zinc-800 rounded">
                            <p className="text-[10px] text-zinc-500 uppercase">Department</p>
                            {character.departmentMembers.filter((m: any) => m.isActive).map((member: any) => (
                                <div key={member.id}>
                                    <p className="text-zinc-200">{member.department?.name}</p>
                                    <p className="text-xs text-zinc-500">{member.rank?.name} • #{member.badgeNumber}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] text-zinc-500 uppercase">Licenses</p>
                            <Button size="sm" variant="ghost" onClick={() => setShowLicenseModal(true)} className="h-6 px-2 text-xs text-blue-400">
                                <Pencil className="w-3 h-3 mr-1" /> Manage
                            </Button>
                        </div>
                        {charLicenses.length === 0 ? (
                            <p className="text-xs text-zinc-600">No licenses</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {charLicenses.map(cl => (
                                    <span key={cl.id} className="px-2 py-1 bg-blue-900/30 border border-blue-800 rounded text-[10px] text-blue-300">{cl.license.name}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] text-zinc-500 uppercase">Vehicles</p>
                            <Button size="sm" variant="ghost" onClick={() => setShowVehicleModal(true)} className="h-6 px-2 text-xs text-blue-400">
                                <Plus className="w-3 h-3 mr-1" /> Add
                            </Button>
                        </div>
                        {charVehicles.length === 0 ? (
                            <p className="text-xs text-zinc-600">No vehicles</p>
                        ) : (
                            <div className="space-y-2">
                                {charVehicles.map(v => (
                                    <div key={v.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                                        <div className="flex items-center gap-2">
                                            <Car className="w-4 h-4 text-zinc-500" />
                                            <div>
                                                <p className="text-sm font-bold text-zinc-200">{v.plate}</p>
                                                <p className="text-[10px] text-zinc-500">{v.color} {v.model}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => toggleVehicleStatus(v.id, v.status)} className="h-6 w-6 p-0"><RefreshCw className="w-3 h-3" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteVehicle(v.id)} className="h-6 w-6 p-0 text-zinc-600"><Trash2 className="w-3 h-3" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] text-zinc-500 uppercase">Weapons</p>
                            <Button size="sm" variant="ghost" onClick={() => setShowWeaponModal(true)} className="h-6 px-2 text-xs text-blue-400">
                                <Plus className="w-3 h-3 mr-1" /> Add
                            </Button>
                        </div>
                        {charWeapons.length === 0 ? (
                            <p className="text-xs text-zinc-600">No weapons</p>
                        ) : (
                            <div className="space-y-2">
                                {charWeapons.map(w => (
                                    <div key={w.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-zinc-500" />
                                            <div>
                                                <p className="text-sm text-zinc-200">{w.model}</p>
                                                <p className="text-[10px] text-zinc-500">S/N: {w.serial}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => toggleWeaponStatus(w.id, w.status)} className="h-6 w-6 p-0"><RefreshCw className="w-3 h-3" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteWeapon(w.id)} className="h-6 w-6 p-0 text-zinc-600"><Trash2 className="w-3 h-3" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                        <Button onClick={() => openEditModal(character)} variant="outline" className="flex-1 bg-zinc-800 border-zinc-700 text-xs">
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        {!character.departmentMembers?.some((m: any) => m.isActive) && (
                            <Button onClick={() => openDepartmentModal(character)} variant="outline" className="flex-1 bg-zinc-800 border-zinc-700 text-xs">
                                <FileText className="w-3 h-3 mr-1" /> Department
                            </Button>
                        )}
                        <Button onClick={handleDeleteCharacter} variant="outline" className="flex-1 bg-zinc-800 border-zinc-700 text-red-400 text-xs">
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};