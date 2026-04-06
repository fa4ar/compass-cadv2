"use client";

import React, { useState, useEffect } from 'react';
import { Radio, Users, FileSearch, Laptop, Map, Phone, AlertTriangle, Search, Navigation, MapPinned, CheckCircle, BarChart3, MessageCircle, PlusSquare, Ambulance, Clock, Car, Footprints, Siren, FileText, MapPin, Send, User, Building2, Car as CarIcon, Package, X, RefreshCw, Trash2, LogOut, ChevronDown } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { socket } from '@/lib/socket';
import { useSound } from '@/hooks/useSound';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Unit {
    unit: string;
    officer: string;
    status: string;
    beat: string;
    call: string;
    time: string;
    nature: string;
    location: string;
    characterId?: number;
    userId?: number;
}

interface Call911 {
    id: number;
    callerName: string;
    location: string;
    description: string;
    status: string;
    createdAt: string;
    priority?: string;
    phoneNumber?: string;
    notes?: CallNote[];
}

interface CallNote {
    id: number;
    author: string;
    text: string;
    createdAt: string;
}

interface SearchResult {
    type: string;
    data: any;
}

type SearchType = 'person' | 'vehicle' | 'weapon';

export default function DispatcherPage() {
    return (
        <ProtectedRoute allowedRoles={['dispatcher']}>
            <DispatcherPageContent />
        </ProtectedRoute>
    );
}

function DispatcherPageContent() {
    const { user } = useAuth();
    const [units, setUnits] = useState<Unit[]>([]);
    const [calls, setCalls] = useState<Call911[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState<Call911 | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [newNoteText, setNewNoteText] = useState("");
    const [showDutyModal, setShowDutyModal] = useState(true);
    const [callSign, setCallSign] = useState("");
    const [onDuty, setOnDuty] = useState(false);
    
    // Search functionality
    const [searchType, setSearchType] = useState<SearchType>('person');
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    // Message to unit
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [messageUnit, setMessageUnit] = useState<Unit | null>(null);

    // Sounds
    const { playSound } = useSound();

    // PERSISTENCE: Load from localStorage on mount
    useEffect(() => {
        const savedCallSign = localStorage.getItem('dispatcherCallSign');
        const savedOnDuty = localStorage.getItem('dispatcherOnDuty') === 'true';

        if (savedCallSign) setCallSign(savedCallSign);
        if (savedOnDuty) {
            setOnDuty(true);
            setShowDutyModal(false);
        }
    }, []);

    // Save to localStorage when state changes
    useEffect(() => {
        if (onDuty) {
            localStorage.setItem('dispatcherCallSign', callSign);
            localStorage.setItem('dispatcherOnDuty', 'true');
        } else {
            localStorage.setItem('dispatcherOnDuty', 'false');
        }
    }, [onDuty, callSign]);

    useEffect(() => {
        fetchData();

        socket.connect();

        socket.on('new_911_call', (newCall: Call911) => {
            setCalls(prev => [newCall, ...prev]);
            playSound('new_call_911').then(() => console.log('[Dispatcher] Sound played')).catch(e => console.error('[Dispatcher] Sound error:', e));
            toast({ title: 'Новый вызов!', description: `${newCall.callerName}: ${newCall.description}` });
        });

        socket.on('update_911_call', (updatedCall: Call911) => {
            setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
            if (selectedCall?.id === updatedCall.id) {
                setSelectedCall(updatedCall);
            }
        });

        socket.on('new_911_note', ({ callId, note }: { callId: number, note: CallNote }) => {
            setCalls(prev => prev.map(c => {
                if (c.id === callId) {
                    return { ...c, notes: [...(c.notes || []), note] };
                }
                return c;
            }));
            if (selectedCall?.id === callId) {
                setSelectedCall(prev => prev ? { ...prev, notes: [...(prev.notes || []), note] } : null);
            }
        });

        socket.on('delete_911_call', ({ id }: { id: number }) => {
            setCalls(prev => prev.filter(c => c.id !== id));
            if (selectedCall?.id === id) setSelectedCall(null);
        });

        socket.on('supervisor_request', (data: { unit: string; message: string }) => {
            playSound('supervisor_request');
            toast({ title: 'Запрос супервайзера!', description: `Юнит ${data.unit}: ${data.message}`, variant: 'destructive' });
        });

        socket.on('dispatcher_message', (data: { message: string; from: string }) => {
            playSound('message_received');
            toast({ title: 'Сообщение', description: `${data.from}: ${data.message}` });
        });

        return () => {
            socket.off('new_911_call');
            socket.off('update_911_call');
            socket.off('new_911_note');
            socket.off('delete_911_call');
            socket.off('supervisor_request');
            socket.off('dispatcher_message');
            socket.disconnect();
        };
    }, [selectedCall?.id]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const [unitsRes, callsRes] = await Promise.all([
                fetch(`${apiUrl}/api/units`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/calls911/active`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (unitsRes.ok) {
                const data = await unitsRes.json();
                setUnits(data);
            }
            if (callsRes.ok) {
                const data = await callsRes.json();
                setCalls(data);
            }
        } catch (err) {
            console.error('Failed to fetch dispatcher data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateUnitStatus = async (characterId: number | undefined, userId: number | undefined, status: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const body: any = { status };
            if (characterId) body.characterId = characterId;
            if (userId) body.userId = userId;

            const res = await fetch(`${apiUrl}/api/units/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast({ title: 'Unit Status Updated', description: `Unit is now ${status}` });
                fetchData();
            } else {
                const data = await res.json();
                console.error('Update failed:', data);
            }
        } catch (err) {
            console.error('Failed to update unit status', err);
        }
    };

    const handleUpdateCallStatus = async (callId: number, status: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/${callId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                toast({ title: 'Call Updated', description: `Call #${callId} moved to ${status}` });
                setSelectedCall(null);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to update call status', err);
        }
    };

    const handleDeleteCall = async (callId: number) => {
        if (!confirm('Are you sure you want to delete this call?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/${callId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast({ title: 'Call Deleted', description: 'Emergency call has been removed.' });
                setSelectedCall(null);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to delete call', err);
        }
    };

    const handleDutyStart = () => {
        if (!callSign.trim()) {
            toast({ title: 'Error', description: 'Please enter a callsign', variant: 'destructive' });
            return;
        }
        setOnDuty(true);
        setShowDutyModal(false);
        localStorage.setItem('dispatcherCallSign', callSign.toUpperCase());
        localStorage.setItem('dispatcherOnDuty', 'true');
    };

    const handleGoOffDuty = () => {
        setOnDuty(false);
        setShowDutyModal(true);
        localStorage.setItem('dispatcherOnDuty', 'false');
        toast({ title: 'Dispatcher Status', description: 'You are now off duty.' });
    };

    const handleNoteSubmit = async (callId: number) => {
        if (!newNoteText.trim()) return;

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/${callId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    text: newNoteText,
                    author: callSign // Use dispatcher callsign
                })
            });

            if (res.ok) {
                setNewNoteText("");
                fetchData();
                const updatedCallRes = await fetch(`${apiUrl}/api/calls911/active`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (updatedCallRes.ok) {
                    const data = await updatedCallRes.json();
                    const current = data.find((c: any) => c.id === callId);
                    if (current) setSelectedCall(current);
                }
            }
        } catch (err) {
            console.error('Failed to add note', err);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            let endpoint = '';
            let body: any = {};
            
            if (searchType === 'person') {
                const [firstName, lastName, ssn] = searchQuery.split(' ');
                endpoint = `${apiUrl}/api/dispatcher/search/person`;
                body = { firstName: firstName || '', lastName: lastName || '', ssn: ssn || '' };
            } else if (searchType === 'vehicle') {
                endpoint = `${apiUrl}/api/dispatcher/search/vehicle`;
                body = { plate: searchQuery };
            } else if (searchType === 'weapon') {
                endpoint = `${apiUrl}/api/dispatcher/search/weapon`;
                body = { serialNumber: searchQuery };
            }
            
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            
            if (res.ok) {
                const data = await res.json();
                setSearchResults(Array.isArray(data) ? data : [data]);
                if (data && data.length > 0) {
                    playSound('search_success');
                } else {
                    playSound('search_error');
                }
            } else {
                setSearchResults([]);
                playSound('search_error');
            }
        } catch (err) {
            console.error('Search failed', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendMessageToUnit = async () => {
        if (!messageText.trim() || !messageUnit) return;
        
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/dispatcher/message-unit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: messageUnit.characterId || null,
                    userId: messageUnit.userId || null,
                    message: messageText,
                    from: callSign
                })
            });
            
            if (res.ok) {
                toast({ title: 'Message Sent', description: `Message sent to ${messageUnit.unit}` });
                playSound('notification');
                setMessageText("");
                setShowMessageModal(false);
                setMessageUnit(null);
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error || 'Failed to send message', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to send message', err);
            toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
        }
    };

    return (
        <div className="fixed top-14 inset-x-0 bottom-0 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col p-3">
                <Card className="flex-1 bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Radio className="w-5 h-5 text-blue-500" />
                                Консоль Диспетчера {callSign && `[${callSign}]`} - {units.filter(u => u.status === 'Available').length} Активных Юнитов / {calls.length} Вызовов
                            </span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={fetchData} className="h-8 bg-zinc-800/50 border-zinc-700">
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleGoOffDuty} className="h-8 bg-zinc-800/50 border-red-900/50 text-red-400 hover:bg-red-950/30">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Off Duty
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
                        <div className="flex gap-2 mb-3 flex-wrap shrink-0">
                            <Button size="sm" className="bg-green-600 hover:bg-green-500">
                                <Phone className="w-4 h-4 mr-1.5" />
                                Ответить 911
                            </Button>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                                <PlusSquare className="w-4 h-4 mr-1.5" />
                                Новый Вызов
                            </Button>
                            <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-800/50">
                                <MapPinned className="w-4 h-4 mr-1.5" />
                                Карта
                            </Button>
                        </div>

                        <div className="flex-1 flex gap-3 min-h-0">
                            <div className="flex-[2] space-y-3 min-h-0 flex flex-col">
                                <div className="rounded-lg border border-zinc-700 flex-1 overflow-hidden flex flex-col min-h-0">
                                    <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-700 flex items-center gap-2 shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        <span className="text-sm font-medium text-zinc-300">Активные вызовы 911</span>
                                        <span className="ml-auto text-xs text-zinc-500">{calls.length} вызовов</span>
                                    </div>
                                    <div className="overflow-auto flex-1">
                                        {calls.length === 0 ? (
                                            <div className="flex items-center justify-center h-full text-zinc-600 italic">Нет активных вызовов</div>
                                        ) : (
                                            <table className="w-full text-sm">
                                                <thead className="bg-zinc-800/30 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Время</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Заявитель</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Место</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Описание</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Статус</th>
                                                        <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Действия</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {calls.map((call) => (
                                                        <tr
                                                            key={call.id}
                                                            className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer ${selectedCall?.id === call.id ? 'bg-blue-900/10' : ''}`}
                                                            onClick={() => setSelectedCall(call)}
                                                        >
                                                            <td className="px-3 py-2 text-zinc-400 font-mono text-xs">{new Date(call.createdAt).toLocaleTimeString()}</td>
                                                            <td className="px-3 py-2 text-zinc-200">{call.callerName}</td>
                                                            <td className="px-3 py-2 text-zinc-300">{call.location}</td>
                                                            <td className="px-3 py-2 text-zinc-100">{call.description.substring(0, 30)}...</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${call.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                                                                        call.status === 'dispatched' ? 'bg-blue-500/20 text-blue-500' :
                                                                            'bg-zinc-500/20 text-zinc-500'
                                                                    }`}>
                                                                    {call.status === 'pending' ? 'ОЖИДАЕТ' : call.status === 'dispatched' ? 'ОТПРАВЛЕН' : call.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-right">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteCall(call.id); }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-zinc-700 flex-1 overflow-hidden flex flex-col min-h-0">
                                    <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-700 flex items-center gap-2 shrink-0">
                                        <Users className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm font-medium text-zinc-300">Активные Юниты</span>
                                        <span className="ml-auto text-xs text-zinc-500">{units.length} юнитов</span>
                                    </div>
                                    <div className="overflow-auto flex-1">
                                        <table className="w-full text-sm">
                                            <thead className="bg-zinc-800/30 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Юнит</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Офицер</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Статус</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Последнее действ.</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Управление</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {units.map((unit) => (
                                                    <tr
                                                        key={unit.unit}
                                                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${selectedUnit?.unit === unit.unit ? 'bg-blue-900/10' : ''}`}
                                                        onClick={() => setSelectedUnit(unit)}
                                                    >
                                                        <td className="px-3 py-2 text-blue-400 font-bold">{unit.unit}</td>
                                                        <td className="px-3 py-2 text-zinc-300">{unit.officer}</td>
                                                        <td className="px-3 py-2">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${unit.status === 'Available' ? 'bg-green-500/20 text-green-400' :
                                                                    unit.status === 'Busy' ? 'bg-amber-500/20 text-amber-400' :
                                                                        unit.status === 'Enroute' ? 'bg-blue-500/20 text-blue-400' :
                                                                            'bg-red-500/20 text-red-400'
                                                                }`}>
                                                                {unit.status === 'Available' ? 'ДОСТУПЕН' : unit.status === 'Busy' ? 'ЗАНЯТ' : unit.status === 'Enroute' ? 'В ПУТИ' : unit.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-zinc-500 text-xs font-mono">{unit.time}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    title="Доступен"
                                                                    className="h-7 w-7 text-green-500 hover:bg-green-500/10"
                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateUnitStatus(unit.characterId, unit.userId, 'Available'); }}
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    title="Занят"
                                                                    className="h-7 w-7 text-amber-500 hover:bg-amber-500/10"
                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateUnitStatus(unit.characterId, unit.userId, 'Busy'); }}
                                                                >
                                                                    <Siren className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 min-h-0 flex flex-col">
                                <div className="rounded-lg border border-zinc-700 flex-1 overflow-hidden flex flex-col min-h-0 bg-zinc-900/40">
                                    <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-700 shrink-0 flex items-center justify-between">
                                        <span className="text-sm font-medium text-zinc-300">Детали вызова</span>
                                        {selectedCall && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedCall(null)}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="p-3 space-y-4 overflow-auto flex-1">
                                        {!selectedCall ? (
                                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center space-y-2">
                                                <div className="p-3 bg-zinc-800 rounded-full">
                                                    <FileText className="w-8 h-8" />
                                                </div>
                                                <p className="text-sm">Выберите вызов для просмотра деталей и отправки юнитов</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase text-zinc-500">Заявитель</Label>
                                                    <p className="text-sm font-medium text-white">{selectedCall.callerName}</p>
                                                    <p className="text-xs text-zinc-500">{selectedCall.phoneNumber || 'Номер не указан'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase text-zinc-500">Местоположение</Label>
                                                    <div className="flex items-center gap-2 text-sm text-zinc-200">
                                                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                        {selectedCall.location}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase text-zinc-500">Суть вызова / Описание</Label>
                                                    <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700 text-xs text-zinc-300 leading-relaxed min-h-[60px]">
                                                        {selectedCall.description}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="bg-blue-600 hover:bg-blue-500"
                                                        onClick={() => handleUpdateCallStatus(selectedCall.id, 'dispatched')}
                                                        disabled={selectedCall.status === 'dispatched'}
                                                    >
                                                        <Send className="w-3.5 h-3.5 mr-1.5" />
                                                        Отправить
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-zinc-700 bg-zinc-800/50"
                                                        onClick={() => handleUpdateCallStatus(selectedCall.id, 'closed')}
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                                        Закрыть
                                                    </Button>
                                                </div>

                                                <div className="pt-2 border-t border-zinc-800 space-y-3 flex-1 flex flex-col min-h-0">
                                                    <Label className="text-[10px] uppercase text-zinc-500 block">Чат / Обновления вызова</Label>
                                                    <div className="flex-1 bg-zinc-950/40 rounded border border-zinc-800 overflow-auto p-2 space-y-2">
                                                        {selectedCall.notes && selectedCall.notes.length > 0 ? (
                                                            selectedCall.notes.map((note: any) => (
                                                                <div key={note.id} className="text-[11px] leading-tight">
                                                                    <span className="text-blue-400 font-bold">[{note.author}]: </span>
                                                                    <span className="text-zinc-300">{note.text}</span>
                                                                    <div className="text-[9px] text-zinc-600 italic">{new Date(note.createdAt).toLocaleTimeString()}</div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-center py-4 text-zinc-600 italic text-[10px]">Нет записей. Добавьте информацию.</div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <Input
                                                            placeholder="Добавить инфо..."
                                                            className="h-8 text-xs bg-zinc-800 border-zinc-700"
                                                            value={newNoteText}
                                                            onChange={(e) => setNewNoteText(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleNoteSubmit(selectedCall.id)}
                                                        />
                                                        <Button size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => handleNoteSubmit(selectedCall.id)}>
                                                            <Send className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-zinc-800 shrink-0">
                                                    <div className="grid gap-1">
                                                        {units.filter(u => u.status === 'Available').slice(0, 3).map(u => (
                                                            <Button
                                                                key={u.unit}
                                                                variant="outline"
                                                                size="sm"
                                                                className="justify-start h-8 text-xs bg-zinc-800/30 border-zinc-700"
                                                                onClick={() => handleUpdateUnitStatus(u.characterId, u.userId, 'Enroute')}
                                                            >
                                                                <Navigation className="w-3 h-3 mr-2" />
                                                                Назначить {u.unit}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="w-64 space-y-3 shrink-0">
                                <div className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/40">
                                    <span className="text-xs font-medium text-zinc-400 block mb-2">Детали выбранного юнита</span>
                                    {selectedUnit ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                                    <Car className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{selectedUnit.unit}</p>
                                                    <p className="text-[10px] text-zinc-500 uppercase">{selectedUnit.officer}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-green-900/20 border-green-700/50 text-green-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'Available')}>10-8</Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-amber-900/20 border-amber-700/50 text-amber-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'Busy')}>10-6</Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-blue-900/20 border-blue-700/50 text-blue-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'Enroute')}>10-97</Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-red-900/20 border-red-700/50 text-red-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'On Scene')}>10-23</Button>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-full h-7 text-[10px] bg-blue-900/20 border-blue-700/50 text-blue-400"
                                                onClick={() => {
                                                    setMessageUnit(selectedUnit);
                                                    setShowMessageModal(true);
                                                }}
                                            >
                                                <Send className="w-3 h-3 mr-1" />
                                                Отправить сообщение
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-zinc-600 italic">Выберите юнит для управления</p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/40">
                                    <span className="text-xs font-medium text-zinc-400 block mb-2">Быстрый поиск NCIC</span>
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 text-xs bg-zinc-800/50 border-zinc-700 flex-shrink-0">
                                                        {searchType === 'person' ? 'Личность' : searchType === 'vehicle' ? 'Авто' : 'Оружие'}
                                                        <ChevronDown className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                                                    <DropdownMenuItem onClick={() => setSearchType('person')} className="text-zinc-200">Личность</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSearchType('vehicle')} className="text-zinc-200">Авто</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSearchType('weapon')} className="text-zinc-200">Оружие</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <Input 
                                                placeholder={searchType === 'person' ? 'Имя Фамилия SSN' : searchType === 'vehicle' ? 'Гос. номер' : 'Серийный номер'} 
                                                className="bg-zinc-800/50 border-zinc-700 h-8 text-xs"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            />
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full h-7 text-[10px] bg-zinc-800/50 border-zinc-700" onClick={handleSearch} disabled={isSearching}>
                                            <Search className="w-3 h-3 mr-1" />
                                            {isSearching ? 'Поиск...' : 'Поиск'}
                                        </Button>
                                        
                                        {searchResults.length > 0 && (
                                            <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                                                {searchResults.map((result, idx) => (
                                                    <div key={idx} className="text-[10px] p-1.5 bg-zinc-800/50 rounded border border-zinc-700">
                                                        {result.type === 'person' && (
                                                            <div>
                                                                <span className="text-blue-400 font-bold">{result.data.firstName} {result.data.lastName}</span>
                                                                {result.data.ssn && <span className="text-zinc-500 ml-1">SSN: {result.data.ssn}</span>}
                                                            </div>
                                                        )}
                                                        {result.type === 'vehicle' && (
                                                            <div>
                                                                <span className="text-green-400 font-bold">{result.data.make} {result.data.model}</span>
                                                                <span className="text-zinc-500 ml-1">({result.data.plate})</span>
                                                            </div>
                                                        )}
                                                        {result.type === 'weapon' && (
                                                            <div>
                                                                <span className="text-red-400 font-bold">{result.data.weaponType}</span>
                                                                <span className="text-zinc-500 ml-1">SN: {result.data.serialNumber}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-zinc-700 p-3 bg-zinc-900/40">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-zinc-400">Системные сообщения</span>
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-auto">
                                        <div className="text-[10px] p-2 bg-blue-500/10 border-l border-blue-500 text-blue-400">
                                            <span className="font-bold">SYSTEM:</span> Вход диспетчера выполнен в {new Date().toLocaleTimeString()}
                                        </div>
                                        <div className="text-[10px] p-2 bg-zinc-800/50 border-l border-zinc-500 text-zinc-400 italic">
                                            Ожидание входящих вызовов 911...
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Duty Selection Modal - Simplified */}
            {showDutyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <Card className="w-full max-w-xs bg-zinc-950 border-zinc-800">
                        <CardHeader className="pb-3 text-center">
                            <Radio className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <CardTitle className="text-lg font-bold text-white">Dispatcher</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input 
                                placeholder="DISP-1"
                                value={callSign}
                                onChange={(e) => setCallSign(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleDutyStart()}
                                className="bg-zinc-900 border-zinc-800 text-center"
                                autoFocus
                            />
                            <Button className="w-full bg-blue-600" onClick={handleDutyStart}>
                                Start Duty
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {showMessageModal && messageUnit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-zinc-100">
                                    Отправить сообщение юниту {messageUnit.unit}
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setShowMessageModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-400 text-xs uppercase">Сообщение</Label>
                                <textarea 
                                    className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-zinc-200 resize-none"
                                    placeholder="Введите сообщение для юнита..."
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowMessageModal(false)}>
                                    Отмена
                                </Button>
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={handleSendMessageToUnit}>
                                    <Send className="w-4 h-4 mr-2" />
                                    Отправить
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
