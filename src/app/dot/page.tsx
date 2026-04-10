"use client";

import React, { useState } from 'react';
import { Car, User, Search, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function DotPage() {
    return (
        <ProtectedRoute allowedRoles={['dot', 'admin']}>
            <DotPageContent />
        </ProtectedRoute>
    );
}

function DotPageContent() {
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [vehicleResults, setVehicleResults] = useState<any>(null);
    const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);

    const [personFirstName, setPersonFirstName] = useState('');
    const [personLastName, setPersonLastName] = useState('');
    const [personSSN, setPersonSSN] = useState('');
    const [personResults, setPersonResults] = useState<any[]>([]);
    const [isSearchingPerson, setIsSearchingPerson] = useState(false);

    const handleVehicleSearch = async () => {
        if (!vehiclePlate.trim()) {
            toast({ title: 'Ошибка', description: 'Введите номерной знак', variant: 'destructive' });
            return;
        }

        setIsSearchingVehicle(true);
        setVehicleResults(null);
        
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/ncic/search?plate=${vehiclePlate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const vehicleResult = data.find((item: any) => item.vehicles && item.vehicles.length > 0);
                    if (vehicleResult) {
                        setVehicleResults(vehicleResult);
                    } else {
                        toast({ title: 'Не найдено', description: 'Транспортное средство не найдено', variant: 'destructive' });
                    }
                } else {
                    toast({ title: 'Не найдено', description: 'Транспортное средство не найдено', variant: 'destructive' });
                }
            }
        } catch (err) {
            console.error('Failed vehicle search:', err);
            toast({ title: 'Ошибка', description: 'Не удалось выполнить поиск', variant: 'destructive' });
        } finally {
            setIsSearchingVehicle(false);
        }
    };

    const handlePersonSearch = async () => {
        if (!personFirstName.trim() && !personLastName.trim() && !personSSN.trim()) {
            toast({ title: 'Ошибка', description: 'Заполните хотя бы одно поле', variant: 'destructive' });
            return;
        }

        setIsSearchingPerson(true);
        setPersonResults([]);
        
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const params = new URLSearchParams();
            if (personFirstName) params.append('firstName', personFirstName);
            if (personLastName) params.append('lastName', personLastName);
            if (personSSN) params.append('ssn', personSSN);

            const res = await fetch(`${apiUrl}/api/ncic/search?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setPersonResults(data);
            }
        } catch (err) {
            console.error('Failed person search:', err);
            toast({ title: 'Ошибка', description: 'Не удалось выполнить поиск', variant: 'destructive' });
        } finally {
            setIsSearchingPerson(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Truck className="w-8 h-8 text-orange-500" />
                        <h1 className="text-3xl font-bold text-white">Общественные Службы</h1>
                    </div>
                    <p className="text-zinc-400">Система поиска транспортных средств и граждан</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vehicle Search */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Car className="w-5 h-5 text-blue-500" />
                                Поиск транспортного средства
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-zinc-400">Номерной знак</Label>
                                <Input
                                    value={vehiclePlate}
                                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                                    placeholder="89ABC123"
                                    className="bg-zinc-800 border-zinc-700 h-10 uppercase font-mono"
                                    onKeyDown={(e) => e.key === 'Enter' && handleVehicleSearch()}
                                />
                            </div>

                            <Button
                                onClick={handleVehicleSearch}
                                disabled={isSearchingVehicle || !vehiclePlate.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-500"
                            >
                                {isSearchingVehicle ? (
                                    <Search className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4 mr-2" />
                                )}
                                Найти
                            </Button>

                            {vehicleResults && (
                                <div className="space-y-3 pt-4 border-t border-zinc-800">
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                        <h3 className="text-sm font-semibold text-blue-400 mb-3">Транспортное средство</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Номер:</span>
                                                <span className="text-zinc-200 font-mono">{vehicleResults.vehicles[0].plate}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Модель:</span>
                                                <span className="text-zinc-200">{vehicleResults.vehicles[0].model || 'Не указано'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Цвет:</span>
                                                <span className="text-zinc-200">{vehicleResults.vehicles[0].color || 'Не указано'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Статус:</span>
                                                <span className={`font-medium ${vehicleResults.vehicles[0].status === 'stolen' ? 'text-red-400' : 'text-green-400'}`}>
                                                    {vehicleResults.vehicles[0].status === 'stolen' ? 'УГОНАНО' : 'АКТИВНО'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                                        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Владелец</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Имя:</span>
                                                <span className="text-zinc-200">{vehicleResults.firstName || 'Не указано'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Фамилия:</span>
                                                <span className="text-zinc-200">{vehicleResults.lastName || 'Не указано'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">SSN:</span>
                                                <span className="text-zinc-200 font-mono">{vehicleResults.ssn || 'Не указано'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Дата рождения:</span>
                                                <span className="text-zinc-200">{vehicleResults.dateOfBirth ? new Date(vehicleResults.dateOfBirth).toLocaleDateString('ru-RU') : 'Не указано'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Person Search */}
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-green-500" />
                                Поиск гражданина
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm text-zinc-400">Имя</Label>
                                <Input
                                    value={personFirstName}
                                    onChange={(e) => setPersonFirstName(e.target.value)}
                                    placeholder="Sam"
                                    className="bg-zinc-800 border-zinc-700 h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm text-zinc-400">Фамилия</Label>
                                <Input
                                    value={personLastName}
                                    onChange={(e) => setPersonLastName(e.target.value)}
                                    placeholder="Nolan"
                                    className="bg-zinc-800 border-zinc-700 h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm text-zinc-400">SSN</Label>
                                <Input
                                    value={personSSN}
                                    onChange={(e) => setPersonSSN(e.target.value)}
                                    placeholder="123-45-6789"
                                    className="bg-zinc-800 border-zinc-700 h-10 font-mono"
                                    onKeyDown={(e) => e.key === 'Enter' && handlePersonSearch()}
                                />
                            </div>

                            <Button
                                onClick={handlePersonSearch}
                                disabled={isSearchingPerson || (!personFirstName.trim() && !personLastName.trim() && !personSSN.trim())}
                                className="w-full bg-green-600 hover:bg-green-500"
                            >
                                {isSearchingPerson ? (
                                    <Search className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4 mr-2" />
                                )}
                                Найти
                            </Button>

                            {personResults.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-zinc-800 max-h-96 overflow-y-auto">
                                    {personResults.map((person: any, index: number) => (
                                        <div key={index} className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                                    <User className="w-5 h-5 text-green-500" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-white">{person.firstName} {person.lastName}</h4>
                                                    <p className="text-xs text-zinc-500 font-mono">{person.ssn || 'Нет SSN'}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Дата рождения:</span>
                                                    <span className="text-zinc-200">{person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString('ru-RU') : 'Не указано'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-zinc-500">Пол:</span>
                                                    <span className="text-zinc-200">{person.gender || 'Не указано'}</span>
                                                </div>
                                                {person.vehicles && person.vehicles.length > 0 && (
                                                    <div className="pt-2 border-t border-zinc-700">
                                                        <span className="text-zinc-500 text-xs block mb-1">Транспортные средства:</span>
                                                        {person.vehicles.map((vehicle: any, vIndex: number) => (
                                                            <div key={vIndex} className="text-zinc-200 text-xs flex justify-between">
                                                                <span>{vehicle.plate}</span>
                                                                <span>{vehicle.model || 'Не указано'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {personResults.length === 0 && !isSearchingPerson && personFirstName && (
                                <p className="text-center text-zinc-500 text-sm">Нет результатов</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
