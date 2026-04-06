"use client";

import React from 'react';
import { User, X, Pencil, FileText, Trash2, RefreshCw, Car, Shield, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-zinc-900 border-zinc-800 w-full max-w-2xl shadow-2xl overflow-hidden">
                <div className="relative h-56">
                    {getImageUrl(character.photoUrl) ? (
                        <img src={getImageUrl(character.photoUrl)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                            <User className="w-20 h-20 text-zinc-600" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                    <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                            {character.isAlive ? (character.status || 'Active') : 'Deceased'}
                        </span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onClose}
                        className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                    <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-3xl font-bold text-white">{character.firstName} {character.lastName}</h2>
                        {character.nickname && <p className="text-xl text-blue-300">"{character.nickname}"</p>}
                    </div>
                </div>
                
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 uppercase">Gender</p>
                            <p className="text-zinc-200 font-medium">{character.gender || '-'}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 uppercase">Birth Date</p>
                            <p className="text-zinc-200 font-medium">{formatDate(character.birthDate)}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 uppercase">Height</p>
                            <p className="text-zinc-200 font-medium">{character.height ? `${character.height} cm` : '-'}</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                            <p className="text-xs text-zinc-500 uppercase">Weight</p>
                            <p className="text-zinc-200 font-medium">{character.weight ? `${character.weight} kg` : '-'}</p>
                        </div>
                        {character.ssn && (
                            <div className="bg-zinc-800/50 rounded-lg p-3">
                                <p className="text-xs text-zinc-500 uppercase">SSN</p>
                                <p className="text-zinc-200 font-medium">{character.ssn}</p>
                            </div>
                        )}
                    </div>
                    
                    {character.job && (
                        <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                            <p className="text-xs text-green-400 uppercase mb-1">Job</p>
                            <p className="text-zinc-200 font-medium">{character.job.name}</p>
                        </div>
                    )}
                    
                    {character.description && (
                        <div className="mb-6">
                            <p className="text-xs text-zinc-500 uppercase mb-2">Description</p>
                            <p className="text-zinc-300 leading-relaxed">{character.description}</p>
                        </div>
                    )}
                    
                    {character.departmentMembers && character.departmentMembers.length > 0 && (
                        <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                            <p className="text-xs text-blue-400 uppercase mb-2">Department</p>
                            {character.departmentMembers.filter((m: any) => m.isActive).map((member: any) => (
                                <div key={member.id} className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-zinc-200 font-medium">{member.department?.name || 'Unknown Department'}</p>
                                            {member.department?.type === 'police' && (
                                                <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded">Police</span>
                                            )}
                                            {member.department?.type === 'ems' && (
                                                <span className="text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">EMS</span>
                                            )}
                                            {member.department?.type === 'fire' && (
                                                <span className="text-xs bg-orange-600/30 text-orange-400 px-2 py-0.5 rounded">Fire</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-400">
                                            {member.rank?.name || 'No rank'} • Badge #{member.badgeNumber}
                                            {member.callSign && ` • ${member.callSign}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Licenses Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-zinc-500 uppercase">Licenses</p>
                            <Button size="sm" variant="ghost" onClick={() => setShowLicenseModal(true)} className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300">
                                <Pencil className="w-3 h-3 mr-1" /> Manage
                            </Button>
                        </div>
                        {charLicenses.length === 0 ? (
                            <p className="text-xs text-zinc-600 italic">No licenses held</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {charLicenses.map(cl => (
                                    <div key={cl.id} className="px-3 py-1 bg-blue-900/30 border border-blue-800 rounded-full flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-blue-300 uppercase">{cl.license.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Vehicles Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-zinc-500 uppercase">Registered Vehicles</p>
                            <Button size="sm" variant="ghost" onClick={() => setShowVehicleModal(true)} className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300">
                                <Plus className="w-3 h-3 mr-1" /> Register
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {charVehicles.length === 0 ? (
                                <p className="text-xs text-zinc-600 italic">No vehicles registered</p>
                            ) : (
                                charVehicles.map(v => (
                                    <div key={v.id} className="flex items-center justify-between p-2 bg-zinc-800/40 rounded border border-zinc-800">
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="w-12 h-10 rounded bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                                                {v.imageUrl ? (
                                                    <img 
                                                        src={getImageUrl(v.imageUrl)!} 
                                                        alt={v.model} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => (e.currentTarget.src = "/placeholder-car.png")}
                                                    />
                                                ) : (
                                                    <Car className="w-5 h-5 text-zinc-600" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-zinc-100">{v.plate}</p>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full border uppercase tracking-wider font-bold ${v.status === 'Valid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                        {v.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 font-medium uppercase">{v.color} {v.model}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => toggleVehicleStatus(v.id, v.status)} className="h-8 w-8 p-0 text-zinc-500 hover:text-blue-400">
                                                <RefreshCw className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteVehicle(v.id)} className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Weapons Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs text-zinc-500 uppercase">Registered Weapons</p>
                            <Button size="sm" variant="ghost" onClick={() => setShowWeaponModal(true)} className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300">
                                <Plus className="w-3 h-3 mr-1" /> Register
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {charWeapons.length === 0 ? (
                                <p className="text-xs text-zinc-600 italic">No weapons registered</p>
                            ) : (
                                charWeapons.map(w => (
                                    <div key={w.id} className="flex items-center justify-between p-2 bg-zinc-800/40 rounded border border-zinc-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center">
                                                <Shield className="w-4 h-4 text-zinc-400" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-zinc-200">{w.model}</p>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full border uppercase ${w.status === 'Valid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                        {w.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 uppercase">S/N: {w.serial}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => toggleWeaponStatus(w.id, w.status)} className="h-8 w-8 p-0 text-zinc-500 hover:text-blue-400">
                                                <RefreshCw className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => deleteWeapon(w.id)} className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    <div className="flex gap-3 pt-4 border-t border-zinc-800">
                        <Button onClick={() => openEditModal(character)} variant="outline" className="flex-1 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700">
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                        {!character.departmentMembers?.some((m: any) => m.isActive) && (
                            <Button onClick={() => openDepartmentModal(character)} variant="outline" className="flex-1 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700">
                                <FileText className="w-4 h-4 mr-2" />
                                Department
                            </Button>
                        )}
                        <Button onClick={handleDeleteCharacter} variant="outline" className="flex-1 bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700 text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
