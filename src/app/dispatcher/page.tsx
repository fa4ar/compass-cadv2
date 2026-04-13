"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Users, FileSearch, Laptop, Map, Phone, AlertTriangle, Search, Navigation, MapPinned, CheckCircle, BarChart3, MessageCircle, PlusSquare, Ambulance, Clock, Car, Footprints, Siren, FileText, MapPin, Send, User, Building2, Car as CarIcon, Package, X, RefreshCw, Trash2, LogOut, ChevronDown, Receipt, Eye, EyeOff } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useSound } from '@/hooks/useSound';
import { StatusBadge } from '@/components/police-dispatcher/StatusBadge';
import { CallCard } from '@/components/police-dispatcher/CallCard';
import { DutyModal } from '@/components/police-dispatcher/DutyModal';
import { MessageModal } from '@/components/police-dispatcher/MessageModal';
import { PairCreationModal } from '@/components/police-dispatcher/PairCreationModal';
import RadioPanel from '@/components/police-dispatcher/RadioPanel';
import { useRadio } from '@/context/RadioContext';
import type { Call911 } from '@/types/coordinates';
import api from '@/lib/axios';

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
    const { socket, isConnected } = useSocket();
    const { authenticateDispatch, setDispatchSession } = useRadio();
    const queryClient = useQueryClient();

    // Tanstack Query для units
    const { data: units = [], isLoading: unitsLoading, refetch: refetchUnits } = useQuery({
        queryKey: ['units'],
        queryFn: async () => {
            const res = await api.get('/api/units');
            return Array.isArray(res.data) ? res.data : [];
        },
        refetchInterval: false,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    // Tanstack Query для calls
    const { data: calls = [], isLoading: callsLoading, refetch: refetchCalls } = useQuery({
        queryKey: ['calls911', 'active'],
        queryFn: async () => {
            const res = await api.get('/api/calls911/active');
            return Array.isArray(res.data) ? res.data : [];
        },
        refetchInterval: false,
    });

    const isLoading = unitsLoading || callsLoading;

    const [selectedCall, setSelectedCall] = useState<Call911 | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [newNoteText, setNewNoteText] = useState("");
    const [showDutyModal, setShowDutyModal] = useState(true);
    const [callSign, setCallSign] = useState("");
    const [onDuty, setOnDuty] = useState(false);
    
    // 🔧 ДОБАВЛЕНЫ НЕДОСТАЮЩИЕ useState
    const [draggedUnit, setDraggedUnit] = useState<Unit | null>(null);
    const [dropTargetUnit, setDropTargetUnit] = useState<Unit | null>(null);
    const [showCreatePairModal, setShowCreatePairModal] = useState(false);
    const [createPairData, setCreatePairData] = useState<{
        unit1: Unit | null;
        unit2: Unit | null;
        pairName: string;
        customCallSign: string;
    } | null>(null);
    
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

    // Status dropdown state
    const [showStatusMenu, setShowStatusMenu] = useState(false);

    // Create 911 call
    const [showCreateCallModal, setShowCreateCallModal] = useState(false);
    const [newCallData, setNewCallData] = useState({
        callerName: '',
        phoneNumber: '',
        location: '',
        description: '',
        type: 'other',
        priority: 'routine',
        isEmergency: false,
        x: 0,
        y: 0,
        z: 0
    });

    // BOLO system
    const [bolos, setBolos] = useState<any[]>([]);
    const [showBoloModal, setShowBoloModal] = useState(false);
    const [showBoloList, setShowBoloList] = useState(false);
    const [newBoloData, setNewBoloData] = useState({
        type: 'vehicle',
        description: '',
        plate: '',
        color: '',
        model: '',
        priority: 'medium',
        expiresAt: ''
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

    // ========== UPDATE UNIT STATUS ==========
    const updateUnitStatusMutation = useMutation({
        mutationFn: async ({ characterId, userId, status }: { characterId?: number; userId?: number; status: string }) => {
            if (!characterId && !userId) {
                throw new Error('Нет данных о юните');
            }
            const res = await api.patch('/api/units/status', { characterId, userId, status });
            return res.data;
        },
        onSuccess: async () => {
            toast({ title: 'Статус обновлен', description: 'Статус юнита изменен' });
            await queryClient.invalidateQueries({ queryKey: ['units'] });
            await refetchUnits();
        },
        onError: (error: any) => {
            toast({ title: 'Ошибка', description: error.response?.data?.error || 'Не удалось обновить статус', variant: 'destructive' });
        }
    });

    const handleUpdateUnitStatus = useCallback((characterId: number | undefined, userId: number | undefined, status: string) => {
        if (!characterId && !userId) {
            toast({ title: 'Ошибка', description: 'Нет данных о юните', variant: 'destructive' });
            return;
        }
        updateUnitStatusMutation.mutate({ characterId, userId, status });
    }, [updateUnitStatusMutation]);

    // ========== UPDATE CALL STATUS ==========
    const updateCallStatusMutation = useMutation({
        mutationFn: async ({ callId, status }: { callId: number; status: string }) => {
            const res = await api.patch(`/api/calls911/${callId}/status`, { status });
            return res.data;
        },
        onSuccess: (data, variables) => {
            toast({ title: 'Статус обновлен', description: `Статус вызова #${variables.callId} изменен` });
            queryClient.invalidateQueries({ queryKey: ['calls911', 'active'] });
            if (selectedCall?.id === variables.callId) {
                setSelectedCall(data);
            }
        },
        onError: (error: any) => {
            toast({ title: 'Ошибка', description: error.response?.data?.error || 'Не удалось обновить статус', variant: 'destructive' });
        }
    });

    const handleUpdateCallStatus = useCallback((callId: number, status: string) => {
        updateCallStatusMutation.mutate({ callId, status });
    }, [updateCallStatusMutation]);

    // ========== DELETE CALL ==========
    const deleteCallMutation = useMutation({
        mutationFn: async (callId: number) => {
            const res = await api.delete(`/api/calls911/${callId}`);
            return res.data;
        },
        onSuccess: (_, callId) => {
            toast({ title: 'Вызов удален', description: `Вызов #${callId} удален` });
            queryClient.invalidateQueries({ queryKey: ['calls911', 'active'] });
            if (selectedCall?.id === callId) {
                setSelectedCall(null);
            }
        },
        onError: (error: any) => {
            toast({ title: 'Ошибка', description: error.response?.data?.error || 'Не удалось удалить вызов', variant: 'destructive' });
        }
    });

    const handleDeleteCall = useCallback((callId: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот вызов?')) return;
        deleteCallMutation.mutate(callId);
    }, [deleteCallMutation, selectedCall]);

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

    // Socket connection handlers
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handlers = {
            new_911_call: (newCall: Call911) => {
                queryClient.setQueryData(['calls911', 'active'], (prev: Call911[] = []) => [newCall, ...prev]);
                playSound('new_call_911').catch(e => console.error('[Dispatcher] Sound error:', e));
                toast({ title: 'Новый вызов!', description: `${newCall.callerName}: ${newCall.description}` });
            },
            update_911_call: (updatedCall: Call911) => {
                console.log('[SOCKET] update_911_call received:', updatedCall);
                queryClient.setQueryData(['calls911', 'active'], (prev: Call911[] = []) => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
                if (selectedCall?.id === updatedCall.id) {
                    setSelectedCall(updatedCall);
                }
            },
            new_911_note: ({ callId, note }: { callId: number, note: CallNote }) => {
                console.log('[SOCKET] new_911_note received:', { callId, note });
                queryClient.setQueryData(['calls911', 'active'], (prev: Call911[] = []) => prev.map(c => {
                    if (c.id === callId) {
                        return { ...c, notes: [...(c.notes || []), note] };
                    }
                    return c;
                }));
                if (selectedCall?.id === callId) {
                    console.log('[SOCKET] Updating selectedCall with new note');
                    setSelectedCall(prev => prev ? { ...prev, notes: Array.isArray(prev.notes) ? [...prev.notes, note] : [note] } : null);
                }
            },
            delete_911_call: ({ id }: { id: number }) => {
                queryClient.setQueryData(['calls911', 'active'], (prev: Call911[] = []) => prev.filter(c => c.id !== id));
                if (selectedCall?.id === id) setSelectedCall(null);
            },
            supervisor_request: (data: { unit: string; message: string }) => {
                playSound('supervisor_request');
                toast({ title: 'Запрос супервайзера!', description: `Юнит ${data.unit}: ${data.message}`, variant: 'destructive' });
            },
            dispatcher_message: (data: { message: string; from: string }) => {
                playSound('message_received');
                toast({ title: 'Сообщение от супервайзера', description: `${data.from}: ${data.message}` });
            },
            supervisor_message: (data: { message: string; from: string }) => {
                playSound('message_received');
                toast({ title: 'Сообщение от супервайзера', description: `${data.from}: ${data.message}` });
            },
            pair_formed: () => {
                refetchUnits();
                toast({ title: 'Пара создана', description: 'Новая патрульная пара создана' });
            },
            pair_disbanded: () => {
                refetchUnits();
                toast({ title: 'Пара расформирована', description: 'Патрульная пара была разделена' });
            },
            unit_pair_update: () => {
                refetchUnits();
            },
            unit_status_changed: (data: { userId: number; status: string; unit?: string }) => {
                queryClient.setQueryData(['units'], (prev: Unit[] = []) => prev.map(u =>
                    u.userId === data.userId ? { ...u, status: data.status } : u
                ));
            },
            unit_attached_to_call: (data: any) => {
                console.log('[SOCKET] unit_attached_to_call:', data);
                playSound('notification');
                toast({ title: data.isLeadUnit ? 'Новый главный юнит' : 'Юнит прикреплен', description: `${data.unitCallSign} прикреплен к вызову #${data.callId}${data.isLeadUnit ? ' (ГЛАВНЫЙ)' : ''}` });
                queryClient.setQueryData(['calls911', 'active'], (prev: Call911[] = []) => prev.map(c => {
                    if (c.id === data.callId && data.call) {
                        return { ...c, units: data.call.units || c.units, status: data.call.status || c.status };
                    }
                    return c;
                }));
                refetchUnits();
            },
            unit_detached_from_call: (data: any) => {
                console.log('[SOCKET] unit_detached_from_call:', data);
                playSound('notification');
                toast({ title: 'Юнит откреплен', description: `${data.unitCallSign} откреплен от вызова #${data.callId}` });
                queryClient.setQueryData(['calls911', 'active'], (prev: Call911[] = []) => prev.map(c => {
                    if (c.id === data.callId && data.call) {
                        return { ...c, units: data.call.units || c.units, status: data.call.status || c.status };
                    }
                    return c;
                }));
                refetchUnits();
            },
            lead_unit_changed: (data: any) => {
                console.log('[SOCKET] lead_unit_changed:', data);
                playSound('notification');
                toast({ title: 'Новый главный юнит', description: `Главный юнит на вызове #${data.callId} изменен` });
                refetchUnits();
            },
            unit_on_duty: () => {
                refetchUnits();
            },
            unit_off_duty: (data: { userId: number }) => {
                queryClient.setQueryData(['units'], (prev: Unit[] = []) => prev.filter(u => u.userId !== data.userId));
            },
            bolo_created: (bolo: any) => {
                setBolos(prev => [bolo, ...prev]);
                toast({ title: 'Новый BOLO', description: `${bolo.type}: ${bolo.description}` });
            },
            bolo_updated: (bolo: any) => {
                setBolos(prev => Array.isArray(prev) ? prev.map(b => b.id === bolo.id ? bolo : b) : []);
            },
            bolo_closed: (bolo: any) => {
                setBolos(prev => Array.isArray(prev) ? prev.map(b => b.id === bolo.id ? bolo : b) : []);
            }
        };

        // Register all handlers
        Object.entries(handlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        return () => {
            Object.entries(handlers).forEach(([event, handler]) => {
                socket.off(event, handler);
            });
        };
    }, [socket, isConnected, playSound, refetchUnits, selectedCall, queryClient]);

    // Separate effect for call-specific socket listeners that depend on selectedCall
    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleUnitAttached = (data: any) => {
            if (selectedCall?.id === data.callId && data.call) {
                setSelectedCall(prev => prev ? { 
                    ...prev, 
                    status: data.call.status, 
                    mainUnitId: data.call.mainUnitId, 
                    units: data.call.units || prev.units 
                } : null);
            }
        };

        const handleUnitDetached = (data: any) => {
            if (selectedCall?.id === data.callId && data.call) {
                setSelectedCall(prev => prev ? {
                    ...prev, 
                    status: data.call.status, 
                    mainUnitId: data.newMainUnitId, 
                    units: data.call.units || []
                } : null);
            }
        };

        const handleLeadUnitChanged = (data: any) => {
            if (selectedCall?.id === data.callId && data.call) {
                setSelectedCall(prev => prev ? {
                    ...prev, 
                    mainUnitId: data.newLeadUserId, 
                    units: Array.isArray(data.call.units) 
                        ? data.call.units.map((u: any) => ({ ...u, isLead: u.userId === data.newLeadUserId })) 
                        : []
                } : null);
            }
        };

        socket.on('unit_attached_to_call', handleUnitAttached);
        socket.on('unit_detached_from_call', handleUnitDetached);
        socket.on('lead_unit_changed', handleLeadUnitChanged);

        return () => {
            socket.off('unit_attached_to_call', handleUnitAttached);
            socket.off('unit_detached_from_call', handleUnitDetached);
            socket.off('lead_unit_changed', handleLeadUnitChanged);
        };
    }, [socket, isConnected, selectedCall]);

    const handleDutyStart = async () => {
        if (!callSign.trim()) {
            toast({ title: 'Ошибка', description: 'Введите позывной', variant: 'destructive' });
            return;
        }

        try {
            // Авторизуемся в радио системе как диспетчер
            await authenticateDispatch(callSign.toUpperCase());
            toast({ title: 'Диспетчер авторизован', description: `Позывной: ${callSign.toUpperCase()}` });
            
            setOnDuty(true);
            setShowDutyModal(false);
            localStorage.setItem('dispatcherCallSign', callSign.toUpperCase());
            localStorage.setItem('dispatcherOnDuty', 'true');
        } catch (error) {
            console.error('Failed to authenticate dispatch:', error);
            toast({ title: 'Ошибка авторизации', description: 'Не удалось авторизоваться в радио системе', variant: 'destructive' });
        }
    };

    const handleGoOffDuty = () => {
        setOnDuty(false);
        setShowDutyModal(true);
        localStorage.setItem('dispatcherOnDuty', 'false');
        toast({ title: 'Статус диспетчера', description: 'Вы вышли со смены.' });
    };

    // Drag and drop handlers for pair creation
    const handleDragStart = (unit: Unit) => {
        if (!unit.userId || unit.partnerUserId) return;
        setDraggedUnit(unit);
    };

    const handleDragOver = (e: React.DragEvent, unit: Unit) => {
        e.preventDefault();
        if (!draggedUnit || draggedUnit.unit === unit.unit) return;
        if (!unit.userId || unit.partnerUserId) return;
        setDropTargetUnit(unit);
    };

    const handleDragLeave = () => {
        setDropTargetUnit(null);
    };

    const handleDrop = (targetUnit: Unit) => {
        if (!draggedUnit || !targetUnit) return;
        if (draggedUnit.unit === targetUnit.unit) return;
        
        setCreatePairData({
            unit1: draggedUnit,
            unit2: targetUnit,
            pairName: `${draggedUnit.unit}-${targetUnit.unit}`,
            customCallSign: ''
        });
        setShowCreatePairModal(true);
        setDraggedUnit(null);
        setDropTargetUnit(null);
    };

    const handleDragEnd = () => {
        setDraggedUnit(null);
        setDropTargetUnit(null);
    };

    const createPairMutation = useMutation({
        mutationFn: async (pairData: { userId1: number; userId2: number; pairName: string; customCallSign?: string }) => {
            const res = await api.post('/api/units/create-pair', pairData);
            return res.data;
        },
        onSuccess: (data, variables) => {
            toast({ title: 'Пара создана', description: `Патрульная пара "${data.pairName || variables.pairName || 'Без названия'}" создана` });
            setShowCreatePairModal(false);
            setCreatePairData(null);
            refetchUnits();
        },
        onError: (error: any) => {
            toast({ title: 'Ошибка', description: error.response?.data?.error || 'Не удалось создать пару', variant: 'destructive' });
        }
    });

    const handleCreatePair = () => {
        if (!createPairData?.unit1 || !createPairData?.unit2) return;
        createPairMutation.mutate({
            userId1: createPairData.unit1.userId!,
            userId2: createPairData.unit2.userId!,
            pairName: createPairData.pairName || `${createPairData.unit1.unit}-${createPairData.unit2.unit}`,
            customCallSign: createPairData.customCallSign || undefined
        });
    };

    const createCallMutation = useMutation({
        mutationFn: async (callData: typeof newCallData) => {
            const res = await api.post('/api/calls911', callData);
            return res.data;
        },
        onSuccess: (data) => {
            toast({ title: 'Вызов создан', description: `Вызов #${data.id} создан` });
            setShowCreateCallModal(false);
            setNewCallData({
                callerName: '',
                phoneNumber: '',
                location: '',
                description: '',
                type: 'other',
                priority: 'routine',
                isEmergency: false,
                x: 0,
                y: 0,
                z: 0
            });
            refetchCalls();
        },
        onError: (error: any) => {
            toast({ title: 'Ошибка', description: error.response?.data?.error || 'Не удалось создать вызов', variant: 'destructive' });
        }
    });

    const handleCreateCall = () => {
        if (!newCallData.callerName || !newCallData.location || !newCallData.description) {
            toast({ title: 'Ошибка', description: 'Заполните обязательные поля', variant: 'destructive' });
            return;
        }
        createCallMutation.mutate(newCallData);
    };

    const addNoteMutation = useMutation({
        mutationFn: async ({ callId, text, author }: { callId: number; text: string; author: string }) => {
            const res = await api.post(`/api/calls911/${callId}/notes`, { text, author });
            return res.data;
        },
        onSuccess: async (_, variables) => {
            setNewNoteText("");
            await refetchCalls();
            const calls = queryClient.getQueryData(['calls911', 'active']) as Call911[];
            const current = calls?.find((c: any) => c.id === variables.callId);
            if (current) setSelectedCall(current);
        },
        onError: (error: any) => {
            console.error('Failed to add note', error);
            toast({ title: 'Ошибка', description: 'Не удалось добавить заметку', variant: 'destructive' });
        }
    });

    const handleNoteSubmit = (callId: number) => {
        if (!newNoteText.trim()) return;
        addNoteMutation.mutate({ callId, text: newNoteText, author: callSign });
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError(null);

        try {
            let endpoint = '';
            const body: any = {};

            if (searchType === 'person') {
                const parts = searchQuery.split(' ');
                endpoint = '/api/dispatcher/search/person';
                body.firstName = parts[0] || '';
                body.lastName = parts[1] || '';
                body.ssn = parts[2] || '';
            } else if (searchType === 'vehicle') {
                endpoint = '/api/dispatcher/search/vehicle';
                body.plate = searchQuery;
            } else if (searchType === 'weapon') {
                endpoint = '/api/dispatcher/search/weapon';
                body.serialNumber = searchQuery;
            }

            const res = await api.post(endpoint, body);

            setSearchResults(Array.isArray(res.data) ? res.data : [res.data]);
            if (res.data && res.data.length > 0) {
                playSound('search_success');
                setSearchError(null);
            } else {
                playSound('search_error');
                setSearchError('Ничего не найдено');
            }
        } catch (err) {
            console.error('[DISPATCHER SEARCH] exception:', err);
            setSearchResults([]);
            setSearchError('Ошибка поиска');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendMessageToUnit = async () => {
        if (!messageText.trim() || !messageUnit) return;

        try {
            await api.post('/api/dispatcher/message-unit', {
                characterId: messageUnit.characterId || null,
                userId: messageUnit.userId || null,
                message: messageText,
                from: callSign
            });

            toast({ title: 'Сообщение отправлено', description: 'Сообщение отправлено юниту ' + messageUnit.unit });
            playSound('notification');
            setMessageText("");
            setShowMessageModal(false);
            setMessageUnit(null);
        } catch (err) {
            console.error('Failed to send message', err);
            toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
        }
    };

    const renderStatusBadge = (status: string) => {
        const statusConfig: Record<string, { label: string; color: string }> = {
            'pending': { label: 'ОЖИДАЕТ', color: 'bg-amber-500/20 text-amber-500' },
            'resolved': { label: 'РЕШЕН', color: 'bg-green-500/20 text-green-500' },
            'closed': { label: 'ЗАКРЫТ', color: 'bg-zinc-500/20 text-zinc-500' },
            'cancelled': { label: 'ОТМЕНЕН', color: 'bg-red-500/20 text-red-500' }
        };
        
        const config = statusConfig[status];
        if (config) {
            return <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${config.color}`}>{config.label}</span>;
        }
        return <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-500/20 text-zinc-500">{status}</span>;
    };

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
            'Available': 'ДОСТУПЕН',
            'Busy': 'ЗАНЯТ',
            'Enroute': 'В ПУТИ',
            'On Scene': 'НА МЕСТЕ',
            'Dispatched': 'НАЗНАЧЕН',
            'Resolving': 'ОБРАБАТЫВАЕТСЯ'
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
                                <Button variant="outline" size="sm" onClick={() => { refetchUnits(); refetchCalls(); }} className="h-8 bg-zinc-800/50 border-zinc-700">
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleGoOffDuty} className="h-8 bg-zinc-800/50 border-red-900/50 text-red-400 hover:bg-red-950/30">
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Выход со смены
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
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-500" onClick={() => setShowCreateCallModal(true)}>
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
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Тип</th>
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
                                                            <td className="px-3 py-2">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${call.callType === 'police' ? 'bg-blue-500/20 text-blue-400' :
                                                                    call.callType === 'fire' ? 'bg-orange-500/20 text-orange-400' :
                                                                    call.callType === 'ems' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                    'bg-zinc-500/20 text-zinc-400'
                                                                }`}>
                                                                    {call.callType === 'police' ? 'ПОЛИЦИЯ' : call.callType === 'fire' ? 'ПОЖАРНАЯ' : call.callType === 'ems' ? 'СКОРАЯ' : call.callType?.toUpperCase() || '-'}
                                                                </span>
                                                            </td>
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
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="pt-2 relative">
                                                    <Label className="text-[10px] uppercase text-zinc-500">Статус</Label>
                                                    <div className="relative">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full h-8 text-xs bg-zinc-800 border-zinc-700 justify-between"
                                                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                                                        >
                                                            <span className={`flex items-center gap-2`}>
                                                                {renderStatusBadge(selectedCall.status)}
                                                            </span>
                                                            <ChevronDown className="w-3 h-3" />
                                                        </Button>
                                                        {showStatusMenu && (
                                                            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-10">
                                                                {[
                                                                    { value: 'pending', label: 'Ожидает' },
                                                                    { value: 'resolved', label: 'Решен' },
                                                                    { value: 'closed', label: 'Закрыт' },
                                                                    { value: 'cancelled', label: 'Отменен' }
                                                                ].map((status) => (
                                                                    <button
                                                                        key={status.value}
                                                                        className={`w-full px-3 py-2 text-xs text-left hover:bg-zinc-700 flex items-center gap-2 first:rounded-t last:rounded-b ${selectedCall.status === status.value ? 'bg-zinc-700' : ''}`}
                                                                        onClick={() => {
                                                                            handleUpdateCallStatus(selectedCall.id, status.value);
                                                                            setShowStatusMenu(false);
                                                                        }}
                                                                    >
                                                                        {renderStatusBadge(status.value)}
                                                                        {status.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
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
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-green-900/20 border-green-700/50 text-green-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'Available')}>Доступен</Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-amber-900/20 border-amber-700/50 text-amber-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'Busy')}>Занят</Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-blue-900/20 border-blue-700/50 text-blue-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'Enroute')}>В пути</Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-red-900/20 border-red-700/50 text-red-400" onClick={() => handleUpdateUnitStatus(selectedUnit.characterId, selectedUnit.userId, 'On Scene')}>На месте</Button>
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
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-blue-400 font-bold">{result.data.firstName} {result.data.lastName}</span>
                                                                    {result.data.tags && result.data.tags.length > 0 && (
                                                                        <div className="flex gap-1 flex-wrap">
                                                                            {result.data.tags.slice(0, 3).map((tag: any) => (
                                                                                <span 
                                                                                    key={tag.id}
                                                                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${tag.tagType === 'dangerous' ? 'animate-pulse' : ''}`}
                                                                                    style={{ 
                                                                                        backgroundColor: tag.color + '20', 
                                                                                        color: tag.color,
                                                                                        border: `1px solid ${tag.color}40`
                                                                                    }}
                                                                                >
                                                                                    {tag.tagName}
                                                                                </span>
                                                                            ))}
                                                                            {result.data.tags.length > 3 && (
                                                                                <span className="text-zinc-500 text-[8px]">+{result.data.tags.length - 3}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {result.data.ssn && <span className="text-zinc-500 ml-1">SSN: {result.data.ssn}</span>}
                                                                {result.data.warrants && result.data.warrants.filter((w: any) => w.status === 'active').length > 0 && (
                                                                    <div className="mt-1 flex items-center gap-1">
                                                                        <FileText className="w-2.5 h-2.5 text-red-500" />
                                                                        <span className="text-red-400 text-[9px] font-bold">
                                                                            {result.data.warrants.filter((w: any) => w.status === 'active').length} активный ордер
                                                                        </span>
                                                                    </div>
                                                                )}
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

                            <div className="flex-1 min-w-[320px] max-w-[400px] space-y-3 min-h-0 flex flex-col">
                                <RadioPanel />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <DutyModal
                isOpen={showDutyModal}
                onClose={() => setShowDutyModal(false)}
                onStart={handleDutyStart}
                characters={[]}
                isLoading={false}
                callSign={callSign}
                setCallSign={setCallSign}
                subdivision={""}
                setSubdivision={() => {}}
                selectedCharacter={""}
                setSelectedCharacter={() => {}}
                type="dispatcher"
            />

            <MessageModal
                isOpen={showMessageModal}
                onClose={() => setShowMessageModal(false)}
                unit={messageUnit}
                onSend={handleSendMessageToUnit}
            />

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
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => setSelectedCharacter(null)}>Закрыть</Button>
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
                                
                                <div className="mx-4 -mt-8">
                                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">+</span>
                                    </div>
                                </div>
                                
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
                            
                            <div>
                                <Label className="text-xs text-zinc-400 uppercase tracking-wide">Позывной (опционально)</Label>
                                <Input 
                                    value={createPairData.customCallSign}
                                    onChange={(e) => setCreatePairData({ ...createPairData, customCallSign: e.target.value })}
                                    placeholder="Например: 2A-12"
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
                                
                                <div>
                                    <Label className="text-xs text-zinc-400">Координата X</Label>
                                    <Input
                                        type="number"
                                        value={newCallData.x}
                                        onChange={(e) => setNewCallData({ ...newCallData, x: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="mt-1 bg-zinc-800 border-zinc-700"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs text-zinc-400">Координата Y</Label>
                                    <Input
                                        type="number"
                                        value={newCallData.y}
                                        onChange={(e) => setNewCallData({ ...newCallData, y: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                        className="mt-1 bg-zinc-800 border-zinc-700"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs text-zinc-400">Координата Z</Label>
                                    <Input
                                        type="number"
                                        value={newCallData.z}
                                        onChange={(e) => setNewCallData({ ...newCallData, z: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
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