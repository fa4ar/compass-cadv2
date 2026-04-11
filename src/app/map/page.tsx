"use client";

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';
const LiveMap = dynamic(() => import('@/components/Map/LiveMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#050505] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Initializing Tactical Map...</span>
            </div>
        </div>
    )
});
import { Map as MapIcon, Layers, Radio, Users, Phone, AlertTriangle, Clock, MapPin, Shield, Activity } from 'lucide-react';

interface Call911 {
    id: number; type: string; location: string; description: string;
    priority: string; callerName: string; status: string;
    x: number; y: number; z: number; createdAt: number;
    source?: string;
}

interface Blip {
    identifier: string; x: number; y: number; z: number; heading: number;
    type: string; label: string; color: string; location?: string;
    status?: string; department?: string; inVehicle?: boolean;
}

export default function MapPage() {
    const [calls, setCalls] = useState<Call911[]>([]);
    const [units, setUnits] = useState<Blip[]>([]);
    const [selectedCall, setSelectedCall] = useState<Call911 | null>(null);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const [blipsRes, callsRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fivem/active-units`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/calls911/active`, { headers })
                ]);

                if (blipsRes.ok) {
                    const blipsData = await blipsRes.json();
                    if (blipsData && blipsData.units) setUnits(blipsData.units);
                }

                if (callsRes.ok) {
                    const callsData = await callsRes.json();
                    if (callsData && callsData.calls) {
                        setCalls(Array.isArray(callsData.calls) ? callsData.calls : []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };

        fetchData();
    }, []);

    const gameCalls = calls;

    const priorityColors = {
        low: 'bg-green-600',
        medium: 'bg-amber-600',
        high: 'bg-orange-600',
        critical: 'bg-red-600'
    };

    const statusColors = {
        pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
        closed: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    };

    return (
        <ProtectedRoute allowedRoles={['police', 'dispatcher', 'admin']}>
            <div className="fixed top-14 inset-x-0 bottom-9 bg-zinc-950 flex flex-col overflow-hidden">
                {/* Заголовок карты */}
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 rounded-lg">
                            <MapIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <h1 className="text-sm font-black text-zinc-100 uppercase tracking-widest">
                            Карта диспетчера
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>GPS активен</span>
                        </div>
                        <div className="h-4 w-px bg-zinc-800" />
                    </div>
                </div>

                {/* Основное содержимое */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Сайдбар с юнитами и вызовами */}
                    <div className="w-80 border-r border-zinc-800 bg-zinc-900/30 flex flex-col">
                        {/* Активные юниты */}
                        <div className="border-b border-zinc-800">
                            <div className="p-4">
                                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Активные юниты
                                    <span className="ml-auto px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                                        {units.length}
                                    </span>
                                </h2>
                            </div>
                            <div className="px-3 pb-3 space-y-1.5 max-h-48 overflow-auto">
                                {units.length === 0 ? (
                                    <div className="text-center py-4">
                                        <Shield className="w-6 h-6 text-zinc-700 mx-auto mb-1" />
                                        <p className="text-[10px] text-zinc-600">Нет активных юнитов</p>
                                    </div>
                                ) : (
                                    units.map((unit) => (
                                        <div
                                            key={unit.identifier}
                                            className="p-2 rounded bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800/80 transition-all"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: unit.color }} />
                                                <span className="text-xs font-bold text-zinc-200">{unit.label}</span>
                                                {unit.status && (
                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                                        unit.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                                        unit.status === 'Active' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                        'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                                    }`}>
                                                        {unit.status}
                                                    </span>
                                                )}
                                            </div>
                                            {unit.location && (
                                                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="truncate">{unit.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Активные вызовы 911 */}
                        <div className="flex-1 flex flex-col">
                            <div className="p-4 border-b border-zinc-800">
                                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Активные вызовы 911
                                    <span className="ml-auto px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">
                                        {gameCalls.length}
                                    </span>
                                </h2>
                            </div>

                            <div className="flex-1 overflow-auto p-3 space-y-2">
                                {gameCalls.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Phone className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                                        <p className="text-xs text-zinc-600">Нет активных вызовов</p>
                                    </div>
                                ) : (
                                    gameCalls.map((call) => (
                                        <div
                                            key={call.id}
                                            onClick={() => setSelectedCall(call)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedCall?.id === call.id
                                                    ? 'bg-blue-600/20 border-blue-500/50'
                                                    : 'bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800/80 hover:border-zinc-600'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-zinc-200">#{call.id}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-white ${priorityColors[call.priority as keyof typeof priorityColors]}`}>
                                                        {call.priority}
                                                    </span>
                                                </div>
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${statusColors[call.status as keyof typeof statusColors]}`}>
                                                    {call.status}
                                                </span>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                                    <AlertTriangle className="w-3 h-3 text-red-400" />
                                                    <span className="font-medium text-zinc-300">{call.type}</span>
                                                </div>

                                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                                    <MapPin className="w-3 h-3 text-blue-400" />
                                                    <span className="truncate">{call.location}</span>
                                                </div>

                                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{new Date(call.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Карта */}
                    <div className="flex-1 relative">
                        <LiveMap selectedCall={selectedCall} onCallSelect={setSelectedCall} onCallsUpdate={setCalls} />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
