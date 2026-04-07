"use client";

import React, { useState, useEffect } from 'react';
import { Radio, Users, FileSearch, Laptop, Map, Phone, AlertTriangle, Search, Navigation, MapPinned, CheckCircle, BarChart3, MessageCircle, PlusSquare, Ambulance, Clock, Car, Footprints, Siren, FileText, MapPin, Send, User, Building2, Car as CarIcon, Package, X, RefreshCw, Trash2, LogOut, ChevronDown, Receipt } from 'lucide-react';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
    partnerUserId?: number;
    partnerOfficer?: string;
    partnerUser?: {
        username: string;
        avatarUrl: string;
    };
    user?: {
        username: string;
        avatarUrl: string;
    };
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
    units?: Unit[];
    mainUnitId?: number;
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
    const [selectedCharacter, setSelectedCharacter] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    
    // Message to unit
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [messageUnit, setMessageUnit] = useState<Unit | null>(null);

    // Drag and drop for pair creation
    const [draggedUnit, setDraggedUnit] = useState<Unit | null>(null);
    const [dropTargetUnit, setDropTargetUnit] = useState<Unit | null>(null);
    const [showCreatePairModal, setShowCreatePairModal] = useState(false);
    const [createPairData, setCreatePairData] = useState<{ unit1: Unit; unit2: Unit; pairName: string } | null>(null);

    // Create 911 call
    const [showCreateCallModal, setShowCreateCallModal] = useState(false);
    const [newCallData, setNewCallData] = useState({
        callerName: '',
        phoneNumber: '',
        location: '',
        description: '',
        type: 'other',
        priority: 'routine',
        isEmergency: false
    });

    // Sounds
    const { playSound } = useSound();

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return `${apiUrl}${url}`;
    };

    // Group units to show only one row per pair
    const groupUnits = (unitList: Unit[]) => {
        const result: Unit[] = [];
        const processed = new Set<number>();

        unitList.forEach(u => {
            if (u.userId && processed.has(u.userId)) return;

            if (u.partnerUserId || (u as any).pairedWith?.length > 0) {
                const partnerId = u.partnerUserId || (u as any).pairedWith?.[0]?.userId;
                if (partnerId) {
                    processed.add(partnerId);
                }
            }
            if (u.userId) processed.add(u.userId);
            result.push(u);
        });

        return result;
    };

    const displayUnits = React.useMemo(() => groupUnits(units), [units]);

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
            toast({ title: 'Сообщение от супервайзера', description: `${data.from}: ${data.message}` });
        });

        socket.on('supervisor_message', (data: { message: string; from: string }) => {
            playSound('message_received');
            toast({ title: 'Сообщение от супервайзера', description: `${data.from}: ${data.message}` });
        });

        socket.on('pair_formed', () => {
            fetchData();
            toast({ title: 'Пара создана', description: 'Новая патрульная пара создана' });
        });

        socket.on('pair_disbanded', () => {
            fetchData();
            toast({ title: 'Пара расформирована', description: 'Патрульная пара была разделена' });
        });

        socket.on('unit_pair_update', () => {
            fetchData();
        });

        socket.on('unit_status_changed', (data: { userId: number; status: string; unit?: string }) => {
            setUnits(prev => prev.map(u => 
                u.userId === data.userId ? { ...u, status: data.status } : u
            ));
        });

        socket.on('unit_unassigned', (data: { userId: number; callId: number }) => {
            fetchData();
            toast({ title: 'Юнит откреплен', description: `Юнит откреплен от вызова #${data.callId}` });
        });

        socket.on('call_assigned_to_unit', (data: { userId: number; call: any }) => {
            console.log('[SOCKET] call_assigned_to_unit:', data);
            fetchData();
            if (data.call) {
                // Update selected call if it's the same
                if (selectedCall && selectedCall.id === data.call.id) {
                    setSelectedCall(prev => prev ? { 
                        ...prev, 
                        units: data.call.responders ? data.call.responders.map((r: any) => ({
                            userId: data.userId,
                            callSign: r.callSign,
                            character: { firstName: r.name?.split(' ')[0], lastName: r.name?.split(' ')[1] },
                            status: r.status
                        })) : [],
                        mainUnitId: data.call.mainUnitId
                    } : null);
                }
                toast({ title: 'Юнит прикреплен', description: `Юнит прикреплен к вызову #${data.call.id}` });
            }
        });

        socket.on('unit_on_duty', () => {
            fetchData();
        });

        socket.on('unit_off_duty', (data: { userId: number }) => {
            setUnits(prev => prev.filter(u => u.userId !== data.userId));
        });

        return () => {
            socket.off('new_911_call');
            socket.off('update_911_call');
            socket.off('new_911_note');
            socket.off('delete_911_call');
            socket.off('supervisor_request');
            socket.off('dispatcher_message');
            socket.off('supervisor_message');
            socket.off('pair_formed');
            socket.off('pair_disbanded');
            socket.off('unit_pair_update');
            socket.off('unit_status_changed');
            socket.off('unit_unassigned');
            socket.off('unit_on_duty');
            socket.off('unit_off_duty');
            socket.disconnect();
        };
    }, [selectedCall?.id]);

    const fetchData = async () => {
        console.log('[DISPATCHER] fetchData called');
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const [unitsRes, callsRes] = await Promise.all([
                fetch(`${apiUrl}/api/units`, { 
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    } 
                }),
                fetch(`${apiUrl}/api/calls911/active`, { 
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    } 
                })
            ]);

            if (unitsRes.ok) {
                const data = await unitsRes.json();
                setUnits(data);
            } else {
                console.error('[DISPATCHER] Units fetch failed:', unitsRes.status);
            }
            if (callsRes.ok) {
                const data = await callsRes.json();
                setCalls(data);
            } else {
                console.error('[DISPATCHER] Calls fetch failed:', callsRes.status);
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
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
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
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
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
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                }
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

    // Drag and drop handlers for pair creation - use original units array
    const handleDragStart = (unit: Unit) => {
        if (!unit.userId || unit.partnerUserId) return; // Can't drag paired units
        setDraggedUnit(unit);
    };

    const handleDragOver = (e: React.DragEvent, unit: Unit) => {
        e.preventDefault();
        if (!draggedUnit || draggedUnit.unit === unit.unit) return;
        
        // Only allow dropping on non-paired units
        if (!unit.userId || unit.partnerUserId) return;
        
        setDropTargetUnit(unit);
    };

    const handleDragLeave = () => {
        setDropTargetUnit(null);
    };

    const handleDrop = (targetUnit: Unit) => {
        if (!draggedUnit || !targetUnit) return;
        if (draggedUnit.unit === targetUnit.unit) return;
        
        // Create pair with these two units
        setCreatePairData({
            unit1: draggedUnit,
            unit2: targetUnit,
            pairName: `${draggedUnit.unit}-${targetUnit.unit}`
        });
        setShowCreatePairModal(true);
        setDraggedUnit(null);
        setDropTargetUnit(null);
    };

    const handleDragEnd = () => {
        setDraggedUnit(null);
        setDropTargetUnit(null);
    };

    const handleCreatePair = async () => {
        if (!createPairData?.unit1 || !createPairData?.unit2) return;
        
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/units/create-pair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    userId1: createPairData.unit1.userId,
                    userId2: createPairData.unit2.userId,
                    pairName: createPairData.pairName || `${createPairData.unit1.unit}-${createPairData.unit2.unit}`
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                toast({ title: 'Пара создана', description: `Патрульная пара "${data.pairName || createPairData.pairName || 'Без названия'}" создана` });
                setShowCreatePairModal(false);
                setCreatePairData(null);
                fetchData();
            } else {
                const data = await res.json();
                toast({ title: 'Ошибка', description: data.error || 'Не удалось создать пару', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to create pair', err);
            toast({ title: 'Ошибка', description: 'Не удалось создать пару', variant: 'destructive' });
        }
    };

    const handleCreateCall = async () => {
        if (!newCallData.callerName || !newCallData.location || !newCallData.description) {
            toast({ title: 'Ошибка', description: 'Заполните обязательные поля', variant: 'destructive' });
            return;
        }
        
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/calls911`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newCallData)
            });
            
            if (res.ok) {
                const data = await res.json();
                toast({ title: 'Вызов создан', description: `Вызов #${data.id} создан` });
                setShowCreateCallModal(false);
                setNewCallData({
                    callerName: '',
                    phoneNumber: '',
                    location: '',
                    description: '',
                    type: 'other',
                    priority: 'routine',
                    isEmergency: false
                });
                fetchData();
            } else {
                const data = await res.json();
                toast({ title: 'Ошибка', description: data.error || 'Не удалось создать вызов', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to create call', err);
            toast({ title: 'Ошибка', description: 'Не удалось создать вызов', variant: 'destructive' });
        }
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
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({ 
                    text: newNoteText,
                    author: callSign // Use dispatcher callsign
                })
            });

            if (res.ok) {
                setNewNoteText("");
                fetchData();
                const updatedCallRes = await fetch(`${apiUrl}/api/calls911/active`, { 
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-store, no-cache, must-revalidate',
                        'Pragma': 'no-cache'
                    } 
                });
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
        setSearchError(null);
        
        const searchId = 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('[DISPATCHER SEARCH] ' + searchId + ' Starting search');
        
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            let endpoint = '';
            const body: any = {};
            
            if (searchType === 'person') {
                const parts = searchQuery.split(' ');
                endpoint = `${apiUrl}/api/dispatcher/search/person`;
                body.firstName = parts[0] || '';
                body.lastName = parts[1] || '';
                body.ssn = parts[2] || '';
            } else if (searchType === 'vehicle') {
                endpoint = `${apiUrl}/api/dispatcher/search/vehicle`;
                body.plate = searchQuery;
            } else if (searchType === 'weapon') {
                endpoint = `${apiUrl}/api/dispatcher/search/weapon`;
                body.serialNumber = searchQuery;
            }
            
            console.log('[DISPATCHER SEARCH] endpoint:', endpoint);
            
            // Добавляем timestamp для обхода кэширования на уровне прокси/CDN
            const urlWithCacheBuster = new URL(endpoint);
            urlWithCacheBuster.searchParams.append('_t', Date.now().toString());
            urlWithCacheBuster.searchParams.append('requestId', searchId);
            
            const res = await fetch(urlWithCacheBuster.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'X-Request-ID': searchId,
                    'X-Cache-Bypass': 'true'
                },
                body: JSON.stringify(body)
            });
            
            console.log('[DISPATCHER SEARCH] ' + searchId + ' Response status:', res.status);
            console.log('[DISPATCHER SEARCH] ' + searchId + ' Response headers:', 
                Object.fromEntries([...res.headers.entries()]));
            
            if (res.ok) {
                const data = await res.json();
                console.log('[DISPATCHER SEARCH] ' + searchId + ' Data received:', data);
                setSearchResults(Array.isArray(data) ? data : [data]);
                if (data && data.length > 0) {
                    playSound('search_success');
                    setSearchError(null);
                } else {
                    playSound('search_error');
                    setSearchError('Ничего не найдено');
                }
            } else {
                const errorText = await res.text();
                console.error('[DISPATCHER SEARCH] error:', errorText);
                setSearchResults([]);
                setSearchError('Ошибка поиска: ' + res.status);
                playSound('search_error');
            }
        } catch (err) {
            console.error('[DISPATCHER SEARCH] exception:', err);
            setSearchResults([]);
            setSearchError('Ошибка поиска');
        } finally {
            setIsSearching(false);
            console.log('[DISPATCHER SEARCH] completed');
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
                    'Authorization': 'Bearer ' + token,
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                },
                body: JSON.stringify({
                    characterId: messageUnit.characterId || null,
                    userId: messageUnit.userId || null,
                    message: messageText,
                    from: callSign
                })
            });
            
            if (res.ok) {
                toast({ title: 'Message Sent', description: 'Message sent to ' + messageUnit.unit });
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

    // Helper function to render status badge
    const renderStatusBadge = (status: string) => {
        if (status === 'pending') {
            return <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/20 text-amber-500">ОЖИДАЕТ</span>;
        } else if (status === 'dispatched') {
            return <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/20 text-blue-500">ОТПРАВЛЕН</span>;
        } else {
            return <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-500/20 text-zinc-500">{status}</span>;
        }
    };

    // Helper function to render unit status badge
    const renderUnitStatusBadge = (status: string) => {
        const statusClasses: Record<string, string> = {
            'Available': 'bg-green-500/20 text-green-400',
            'Busy': 'bg-amber-500/20 text-amber-400',
            'Enroute': 'bg-blue-500/20 text-blue-400',
            'On Scene': 'bg-emerald-500/20 text-emerald-400',
            'Dispatched': 'bg-purple-500/20 text-purple-400',
            'Resolving': 'bg-indigo-500/20 text-indigo-400'
        };
        const statusText: Record<string, string> = {
            'Available': '10-8 ДОСТУПЕН',
            'Busy': '10-6 ЗАНЯТ',
            'Enroute': '10-97 В ПУТИ',
            'On Scene': '10-23 НА МЕСТЕ',
            'Dispatched': '10-10 НАЗНАЧЕН',
            'Resolving': '10-10 ОБРАБАТЫВАЕТСЯ'
        };
        const className = statusClasses[status] || 'bg-zinc-500/20 text-zinc-400';
        const text = statusText[status] || status;
        
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${className}`}>
            {text}
        </span>;
    };

    return (
        <div className="fixed top-14 inset-x-0 bottom-0 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col p-3">
                <Card className="flex-1 bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Radio className="w-5 h-5 text-blue-500" />
                                Консоль Диспетчера {callSign ? `[${callSign}]` : ''} - {units.filter(u => u.status === 'Available').length} Активных Юнитов / {calls.length} Вызовов
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
                                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setShowCreateCallModal(true)}>
                                            + Создать
                                        </Button>
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
                                                            className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer ${selectedCall && selectedCall.id === call.id ? 'bg-blue-900/10' : ''}`}
                                                            onClick={() => setSelectedCall(call)}
                                                        >
                                                            <td className="px-3 py-2 text-zinc-400 font-mono text-xs">{new Date(call.createdAt).toLocaleTimeString()}</td>
                                                            <td className="px-3 py-2 text-zinc-200">{call.callerName}</td>
                                                            <td className="px-3 py-2 text-zinc-300">{call.location}</td>
                                                            <td className="px-3 py-2 text-zinc-100">{call.description.substring(0, 30)}...</td>
                                                            <td className="px-3 py-2">
                                                                {renderStatusBadge(call.status)}
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
                                                {displayUnits.map((u) => (
                                                    <tr
                                                        key={u.unit}
                                                        draggable={!u.partnerUserId && !!u.userId}
                                                        onDragStart={() => handleDragStart(u)}
                                                        onDragOver={(e) => handleDragOver(e, u)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={() => handleDrop(u)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`
                                                            border-b border-zinc-800/50 hover:bg-zinc-800/30 
                                                            ${selectedUnit?.unit === u.unit ? 'bg-blue-900/10' : ''}
                                                            ${dropTargetUnit?.unit === u.unit && draggedUnit?.unit !== u.unit ? 'bg-purple-500/20 border-2 border-purple-500' : ''}
                                                            ${draggedUnit?.unit === u.unit ? 'opacity-50' : ''}
                                                            ${!u.partnerUserId && u.userId ? 'cursor-grab' : ''}
                                                        `}
                                                        onClick={() => setSelectedUnit(u)}
                                                    >
                                                        <td className="px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-blue-400 font-bold">{u.unit}</span>
                                                                {u.partnerUserId && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] text-blue-400 cursor-help transition-colors hover:bg-blue-500/30">
                                                                                    <User className="w-3 h-3" />
                                                                                    +2
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="bg-zinc-900 border-zinc-700 p-3 shadow-2xl">
                                                                                <div className="space-y-2">
                                                                                    <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
                                                                                        <Users className="w-3.5 h-3.5 text-blue-400" />
                                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Состав экипажа</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="relative">
                                                                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                                                                                {u.user?.avatarUrl ? (
                                                                                                    <img src={getImageUrl(u.user.avatarUrl)!} alt={u.user.username} className="w-full h-full object-cover" />
                                                                                                ) : (
                                                                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-4 h-4" /></div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-xs font-bold text-white">{u.officer}</span>
                                                                                            <span className="text-[10px] text-zinc-500">@{u.user?.username || 'user'}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="relative">
                                                                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                                                                                {u.partnerUser?.avatarUrl ? (
                                                                                                    <img src={getImageUrl(u.partnerUser.avatarUrl)!} alt={u.partnerUser.username} className="w-full h-full object-cover" />
                                                                                                ) : (
                                                                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-4 h-4" /></div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-xs font-bold text-white">{u.partnerOfficer}</span>
                                                                                            <span className="text-[10px] text-zinc-500">@{u.partnerUser?.username || 'user'}</span>
                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-zinc-300">{u.officer}</td>
                                                        <td className="px-3 py-2">
                                                            {renderUnitStatusBadge(u.status)}
                                                        </td>
                                                        <td className="px-3 py-2 text-zinc-500 text-xs font-mono">{u.time}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    title="Доступен"
                                                                    className="h-7 w-7 text-green-500 hover:bg-green-500/10"
                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateUnitStatus(u.characterId, u.userId, 'Available'); }}
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    title="Занят"
                                                                    className="h-7 w-7 text-amber-500 hover:bg-amber-500/10"
                                                                    onClick={(e) => { e.stopPropagation(); handleUpdateUnitStatus(u.characterId, u.userId, 'Busy'); }}
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

                                                {/* Assigned Units */}
                                                {selectedCall.units && selectedCall.units.length > 0 && (
                                                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                                                        <Label className="text-[10px] uppercase text-zinc-500">Прикреплённые юниты</Label>
                                                        <div className="space-y-2">
                                                            {selectedCall.units.map((unit: any) => {
                                                                const isMainUnit = selectedCall.mainUnitId === unit.userId;
                                                                return (
                                                                    <div 
                                                                        key={unit.userId}
                                                                        className={`flex items-center justify-between p-2 rounded border ${
                                                                            isMainUnit ? 'bg-red-900/30 border-red-700' : 'bg-zinc-800/50 border-zinc-700'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex -space-x-2">
                                                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                                                                    {unit.user?.avatarUrl ? (
                                                                                        <img src={getImageUrl(unit.user.avatarUrl)!} alt="" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-3 h-3" /></div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-zinc-200 text-[11px] font-medium">
                                                                                    {unit.callSign || unit.character?.firstName + ' ' + unit.character?.lastName || unit.user?.username}
                                                                                </p>
                                                                                {isMainUnit && (
                                                                                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-tighter">ГЛАВНЫЙ</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

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
                                            {searchType === 'person' ? (
                                                <div className="flex gap-1 flex-1">
                                                    <Input 
                                                        placeholder="Имя" 
                                                        className="bg-zinc-800/50 border-zinc-700 h-8 text-xs flex-1"
                                                        value={searchQuery.split(' ')[0] || ''}
                                                        onChange={(e) => setSearchQuery(e.target.value + (searchQuery.split(' ')[1] ? ' ' + searchQuery.split(' ')[1] : ''))}
                                                    />
                                                    <Input 
                                                        placeholder="Фамилия" 
                                                        className="bg-zinc-800/50 border-zinc-700 h-8 text-xs flex-1"
                                                        value={searchQuery.split(' ')[1] || ''}
                                                        onChange={(e) => setSearchQuery((searchQuery.split(' ')[0] || '') + ' ' + e.target.value)}
                                                    />
                                                </div>
                                            ) : (
                                                <Input 
                                                    placeholder={searchType === 'vehicle' ? 'Гос. номер' : 'Серийный номер'} 
                                                    className="bg-zinc-800/50 border-zinc-700 h-8 text-xs flex-1"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full h-7 text-[10px] bg-zinc-800/50 border-zinc-700" onClick={handleSearch} disabled={isSearching}>
                                            <Search className="w-3 h-3 mr-1" />
                                            {isSearching ? 'Поиск...' : 'Поиск'}
                                        </Button>
                                        
                                        {searchError && (
                                            <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400 text-center">
                                                {searchError}
                                            </div>
                                        )}
                                        
                                        {searchResults.length > 0 && (
                                            <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                                                {searchResults.map((result, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className="text-[10px] p-1.5 bg-zinc-800/50 rounded border border-zinc-700 cursor-pointer hover:bg-zinc-700"
                                                        onClick={() => result.type === 'person' && setSelectedCharacter(result.data)}
                                                    >
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

            {/* Character Details Modal */}
            {selectedCharacter && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCharacter(null)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="aspect-video bg-zinc-800 shrink-0 relative">
                            {selectedCharacter.photoUrl ? (
                                <img src={selectedCharacter.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-16 h-16 text-zinc-600" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedCharacter.isAlive ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                    {selectedCharacter.isAlive ? 'ЖИВ' : 'МЕРТВ'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 space-y-4 overflow-auto flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedCharacter.firstName} {selectedCharacter.lastName}</h2>
                                    {selectedCharacter.nickname && <p className="text-sm text-blue-400">"{selectedCharacter.nickname}"</p>}
                                    {selectedCharacter.middleName && <p className="text-xs text-zinc-500">Отчество: {selectedCharacter.middleName}</p>}
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${selectedCharacter.status === 'Good' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                    {selectedCharacter.status === 'Good' ? 'НЕТ ПРОБЛЕМ' : selectedCharacter.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                {selectedCharacter.ssn && (
                                    <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                        <p className="text-zinc-500 uppercase">SSN</p>
                                        <p className="text-zinc-200 font-mono">{selectedCharacter.ssn}</p>
                                    </div>
                                )}
                                {selectedCharacter.birthDate && (
                                    <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                        <p className="text-zinc-500 uppercase">Дата рождения</p>
                                        <p className="text-zinc-200">{new Date(selectedCharacter.birthDate).toLocaleDateString('ru-RU')}</p>
                                    </div>
                                )}
                            </div>

                            {selectedCharacter.job && (
                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                    <p className="text-[10px] text-zinc-500 uppercase">Работа</p>
                                    <p className="text-zinc-200">{selectedCharacter.job.name}</p>
                                </div>
                            )}

                            {selectedCharacter.description && (
                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                    <p className="text-[10px] text-zinc-500 uppercase">Описание</p>
                                    <p className="text-zinc-300 text-sm">{selectedCharacter.description}</p>
                                </div>
                            )}

                            {/* Warrants */}
                            <div>
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                    <AlertTriangle className="w-3 h-3" /> Ордера
                                </p>
                                <div className="space-y-1.5 mt-2">
                                    {selectedCharacter.warrants && selectedCharacter.warrants.length > 0 ? (
                                        selectedCharacter.warrants.map((w: any) => (
                                            <div key={w.id} className="bg-amber-500/10 rounded border border-amber-500/30 p-2">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-xs font-bold text-amber-400">{w.crime}</p>
                                                    <span className="text-[10px] text-amber-500">{w.status}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-400">{w.description}</p>
                                            </div>
                                        ))
                                    ) : <p className="text-[10px] text-zinc-600 italic">Нет ордеров</p>}
                                </div>
                            </div>

                            {/* Citations */}
                            <div>
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                    <Receipt className="w-3 h-3" /> Штрафы
                                </p>
                                <div className="space-y-1.5 mt-2">
                                    {selectedCharacter.citations && selectedCharacter.citations.length > 0 ? (
                                        selectedCharacter.citations.map((c: any) => (
                                            <div key={c.id} className="bg-blue-500/10 rounded border border-blue-500/30 p-2">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-xs font-bold text-blue-400">{c.reason}</p>
                                                    <span className="text-xs font-mono text-blue-300">${c.amount}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : <p className="text-[10px] text-zinc-600 italic">Нет штрафов</p>}
                                </div>
                            </div>

                            {/* Licenses */}
                            <div>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                    <FileText className="w-3 h-3" /> Лицензии
                                </p>
                                <div className="space-y-1.5 mt-2">
                                    {selectedCharacter.licenses && selectedCharacter.licenses.length > 0 ? (
                                        selectedCharacter.licenses.map((lic: any) => (
                                            <div key={lic.id} className="flex items-center justify-between bg-zinc-800/30 rounded border border-zinc-800 p-1.5">
                                                <div>
                                                    <p className="text-xs text-zinc-200 font-medium">{lic.license?.name}</p>
                                                    <p className="text-[10px] text-zinc-600">{lic.license?.type}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${lic.isActive ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                    {lic.isActive ? 'ВАЛИДНА' : 'ОТЗВАНА'}
                                                </span>
                                            </div>
                                        ))
                                    ) : <p className="text-[10px] text-zinc-600 italic">Нет лицензий</p>}
                                </div>
                            </div>

                            {/* Vehicles */}
                            <div>
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                    <Car className="w-3 h-3" /> Транспорт
                                </p>
                                <div className="space-y-2 mt-2">
                                    {selectedCharacter.vehicles && selectedCharacter.vehicles.length > 0 ? (
                                        selectedCharacter.vehicles.map((veh: any) => (
                                            <div key={veh.id} className="bg-zinc-800/50 rounded-lg border border-zinc-800/80 overflow-hidden">
                                                {veh.imageUrl && (
                                                    <img src={veh.imageUrl} alt={veh.model} className="w-full h-16 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                                                )}
                                                <div className="p-2 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-white font-mono">{veh.plate}</p>
                                                        <p className="text-[10px] text-zinc-400">{veh.make} {veh.model}{veh.color ? ` · ${veh.color}` : ''}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${veh.status === 'Valid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                        {veh.status === 'Valid' ? 'ВАЛИДЕН' : 'НЕВАЛИДЕН'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : <p className="text-[10px] text-zinc-600 italic">Нет транспорта</p>}
                                </div>
                            </div>

                            {/* Weapons */}
                            <div>
                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                    <AlertTriangle className="w-3 h-3" /> Оружие
                                </p>
                                <div className="space-y-1.5 mt-2">
                                    {selectedCharacter.weapons && selectedCharacter.weapons.length > 0 ? (
                                        selectedCharacter.weapons.map((w: any) => (
                                            <div key={w.id} className="bg-zinc-800/50 rounded border border-zinc-800 p-2 flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-amber-400">{w.weaponType}</p>
                                                    <p className="text-[10px] text-zinc-500">SN: {w.serialNumber}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${w.status === 'Valid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                    {w.status === 'Valid' ? 'ВАЛИДНА' : 'НЕВАЛИДЕН'}
                                                </span>
                                            </div>
                                        ))
                                    ) : <p className="text-[10px] text-zinc-600 italic">Нет оружия</p>}
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedCharacter.notes && selectedCharacter.notes.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                        <FileText className="w-3 h-3" /> Заметки
                                    </p>
                                    <div className="space-y-1 mt-2">
                                        {selectedCharacter.notes.map((n: any) => (
                                            <div key={n.id} className="text-[10px] p-2 bg-zinc-800/30 rounded border border-zinc-800">
                                                <span className="text-zinc-400">{n.text}</span>
                                                <div className="text-[9px] text-zinc-600 mt-1">{new Date(n.createdAt).toLocaleString('ru-RU')}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button variant="outline" className="w-full" onClick={() => setSelectedCharacter(null)}>Закрыть</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Pair Modal - Drag and Drop */}
            {showCreatePairModal && createPairData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowCreatePairModal(false); setCreatePairData(null); }}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Users className="w-8 h-8 text-purple-500" />
                                </div>
                                <h2 className="text-xl font-bold text-white">Создать патрульную пару</h2>
                                <p className="text-zinc-400 mt-1 text-sm">Объедините двух юнитов в пару</p>
                            </div>
                            
                            <div className="flex items-center justify-center gap-0">
                                {/* Unit 1 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-blue-500/50 mb-2">
                                        {createPairData.unit1?.user?.avatarUrl ? (
                                            <img src={getImageUrl(createPairData.unit1.user.avatarUrl)!} alt={createPairData.unit1.officer} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500"><User className="w-8 h-8" /></div>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-white text-center">{createPairData.unit1?.officer}</p>
                                    <p className="text-xs text-zinc-500">@{createPairData.unit1?.user?.username || 'user'}</p>
                                    <p className="text-xs text-blue-400 font-bold mt-1">{createPairData.unit1?.unit}</p>
                                </div>
                                
                                {/* Plus */}
                                <div className="mx-4 -mt-8">
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">+</span>
                                    </div>
                                </div>
                                
                                {/* Unit 2 */}
                                <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-blue-500/50 mb-2">
                                        {createPairData.unit2?.user?.avatarUrl ? (
                                            <img src={getImageUrl(createPairData.unit2.user.avatarUrl)!} alt={createPairData.unit2.officer} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500"><User className="w-8 h-8" /></div>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-white text-center">{createPairData.unit2?.officer}</p>
                                    <p className="text-xs text-zinc-500">@{createPairData.unit2?.user?.username || 'user'}</p>
                                    <p className="text-xs text-blue-400 font-bold mt-1">{createPairData.unit2?.unit}</p>
                                </div>
                            </div>
                            
                            <div>
                                <Label className="text-xs text-zinc-400 uppercase tracking-wide">Название пары</Label>
                                <Input 
                                    value={createPairData.pairName}
                                    onChange={(e) => setCreatePairData({ ...createPairData, pairName: e.target.value })}
                                    placeholder="Например: Alpha-1"
                                    className="mt-1 bg-zinc-800 border-zinc-700"
                                />
                            </div>
                            
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => { setShowCreatePairModal(false); setCreatePairData(null); }}>
                                    Отмена
                                </Button>
                                <Button className="flex-1 bg-purple-600 hover:bg-purple-500" onClick={handleCreatePair}>
                                    Создать пару
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create 911 Call Modal */}
            {showCreateCallModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateCallModal(false)}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Создать вызов 911</h2>
                                <Button variant="ghost" size="icon" onClick={() => setShowCreateCallModal(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label className="text-xs text-zinc-400">Заявитель *</Label>
                                    <Input 
                                        value={newCallData.callerName}
                                        onChange={(e) => setNewCallData({ ...newCallData, callerName: e.target.value })}
                                        placeholder="Имя заявителя"
                                        className="mt-1 bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                
                                <div className="col-span-2">
                                    <Label className="text-xs text-zinc-400">Телефон</Label>
                                    <Input 
                                        value={newCallData.phoneNumber}
                                        onChange={(e) => setNewCallData({ ...newCallData, phoneNumber: e.target.value })}
                                        placeholder="(555) 123-4567"
                                        className="mt-1 bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                
                                <div className="col-span-2">
                                    <Label className="text-xs text-zinc-400">Местоположение *</Label>
                                    <Input 
                                        value={newCallData.location}
                                        onChange={(e) => setNewCallData({ ...newCallData, location: e.target.value })}
                                        placeholder="Адрес или район"
                                        className="mt-1 bg-zinc-800 border-zinc-700"
                                    />
                                </div>
                                
                                <div className="col-span-2">
                                    <Label className="text-xs text-zinc-400">Тип инцидента</Label>
                                    <select 
                                        value={newCallData.type}
                                        onChange={(e) => setNewCallData({ ...newCallData, type: e.target.value })}
                                        className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-200"
                                    >
                                        <option value="other">Другое</option>
                                        <option value="traffic_accident">ДТП</option>
                                        <option value="disturbance">Нарушение порядка</option>
                                        <option value="robbery">Ограбление</option>
                                        <option value="assault">Нападение</option>
                                        <option value="domestic">Семейный конфликт</option>
                                        <option value="welfare_check">Проверка безопасности</option>
                                        <option value="suspicious">Подозрительная активность</option>
                                        <option value="fire">Пожар</option>
                                        <option value="medical">Медицинская помощь</option>
                                        <option value="accident">Авария</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <Label className="text-xs text-zinc-400">Приоритет</Label>
                                    <select 
                                        value={newCallData.priority}
                                        onChange={(e) => setNewCallData({ ...newCallData, priority: e.target.value })}
                                        className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-200"
                                    >
                                        <option value="routine">Обычный</option>
                                        <option value="low">Низкий</option>
                                        <option value="medium">Средний</option>
                                        <option value="high">Высокий</option>
                                        <option value="emergency">Экстренный</option>
                                    </select>
                                </div>
                                
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={newCallData.isEmergency}
                                            onChange={(e) => setNewCallData({ ...newCallData, isEmergency: e.target.checked })}
                                            className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
                                        />
                                        <span className="text-sm text-zinc-300">Экстренный</span>
                                    </label>
                                </div>
                                
                                <div className="col-span-2">
                                    <Label className="text-xs text-zinc-400">Описание *</Label>
                                    <textarea 
                                        value={newCallData.description}
                                        onChange={(e) => setNewCallData({ ...newCallData, description: e.target.value })}
                                        placeholder="Детали вызова..."
                                        className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-200 h-24 resize-none"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowCreateCallModal(false)}>
                                    Отмена
                                </Button>
                                <Button className="flex-1 bg-red-600 hover:bg-red-500" onClick={handleCreateCall}>
                                    Создать вызов
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}