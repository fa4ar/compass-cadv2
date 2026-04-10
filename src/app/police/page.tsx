"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Users, FileSearch, Laptop, Map, AlertTriangle, Search, Navigation, MapPinned, ArrowRightLeft, CheckCircle, BarChart3, MessageCircle, PlusSquare, Ambulance, Clock, Car, Footprints, Siren, X, User, LogOut, MapPin, Send, Loader2, UserPlus, UserMinus, Receipt, AlertCircle, DollarSign, RefreshCw, Settings2, Maximize2, Move } from 'lucide-react';
import { ResizableBox } from 'react-resizable';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const LiveMap = dynamic(() => import('@/components/Map/LiveMap'), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Загрузка карты...</span>
            </div>
        </div>
    )
});

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useSound } from '@/hooks/useSound';
import { StatusBadge } from '@/components/police-dispatcher/StatusBadge';
import { CallCard } from '@/components/police-dispatcher/CallCard';
import { CallDetailsModal } from '@/components/police-dispatcher/CallDetailsModal';
import { UnitTooltip } from '@/components/police-dispatcher/UnitTooltip';
import { UnitDetailsPanel } from '@/components/police-dispatcher/UnitDetailsPanel';
import { DutyModal } from '@/components/police-dispatcher/DutyModal';
import { MessageModal } from '@/components/police-dispatcher/MessageModal';
import { PairCreationModal } from '@/components/police-dispatcher/PairCreationModal';
import { NCICSearchPanel } from '@/components/police-dispatcher/NCICSearchPanel';
import { FineModal } from '@/components/police-dispatcher/FineModal';
import { WarrantModal } from '@/components/police-dispatcher/WarrantModal';
import { LayoutEditor } from '@/components/police-dispatcher/LayoutEditor';

interface Character {
    id: string;
    firstName: string;
    lastName: string;
    departmentMembers?: DepartmentMember[];
}

interface DepartmentMember {
    id: number;
    departmentId: number;
    rankId: number;
    isActive: boolean;
    rank?: {
        isSupervisor: boolean;
        name: string;
    };
    department?: {
        type: string;
        name: string;
    };
    callSign?: string;
    badgeNumber?: string;
    division?: string;
}

interface Unit {
    unit: string;
    officer: string;
    status: string;
    beat: string;
    call: string;
    time: string;
    nature: string;
    location: string;
    partnerUserId?: number;
    partnerOfficer?: string;
    partnerUser?: {
        username: string;
        avatarUrl: string;
    };
    callId?: number;
    characterId?: number;
    userId?: number;
    user?: {
        username: string;
        avatarUrl: string;
    };
}

const TOP_ACTIONS = [
    { label: "Статус юнитов", icon: BarChart3 },
    { label: "NCIC", icon: FileSearch },
    { label: "BOLO", icon: AlertTriangle },
    { label: "Отчеты", icon: PlusSquare },
    { label: "Ордера", icon: Shield },
];

const SUPERVISOR_ACTIONS = [
    { label: "Карта", icon: Map, requiredRole: "supervisor" },
];


export default function PolicePage() {
    return (
        <ProtectedRoute allowedRoles={['police', 'dispatcher', 'admin']}>
            <PolicePageContent />
        </ProtectedRoute>
    );
}

function PolicePageContent() {
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();
    const [units, setUnits] = useState<Unit[]>([]);
    const [calls, setCalls] = useState<any[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>("Статус юнитов");
    const [notes, setNotes] = useState<string>("");
    const [showDutyModal, setShowDutyModal] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [onDuty, setOnDuty] = useState(false);
    const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
    const [selectedCallForNotes, setSelectedCallForNotes] = useState<any | null>(null);
    const [newCallNoteText, setNewCallNoteText] = useState("");
    const [callSign, setCallSign] = useState("");
    const [subdivision, setSubdivision] = useState("");

    const [currentMember, setCurrentMember] = useState<DepartmentMember | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
    const [unitMessage, setUnitMessage] = useState("");

    // Quick actions modals
    const [showBoloModal, setShowBoloModal] = useState(false);
    const [showPlateCheckModal, setShowPlateCheckModal] = useState(false);
    const [showDotModal, setShowDotModal] = useState(false);
    const [show2hrModal, setShow2hrModal] = useState(false);
    const [showVehicleInfoModal, setShowVehicleInfoModal] = useState(false);

    // Quick actions form states
    const [boloForm, setBoloForm] = useState({ type: 'vehicle', description: '', plate: '', color: '', model: '' });
    const [plateCheckForm, setPlateCheckForm] = useState({ plate: '' });
    const [dotForm, setDotForm] = useState({ location: '', description: '' });
    const [twoHrForm, setTwoHrForm] = useState({ location: '', description: '' });
    const [vehicleInfo, setVehicleInfo] = useState<any>(null);

    const isSupervisor = currentMember?.rank?.isSupervisor || user?.roles?.some(r => r.toLowerCase() === 'admin' || r.toLowerCase() === 'supervisor') || false;
    const canManageUnits = isSupervisor || false;
    const isInPair = currentUnit?.partnerUserId || false;

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return `${apiUrl}${url}`;
    };

    const groupUnits = (unitList: any[]) => {
        const result: any[] = [];
        const processed = new Set<number>();

        unitList.forEach(u => {
            if (u.userId && processed.has(u.userId)) return;

            if (u.partnerUserId || (u.pairedWith && u.pairedWith.length > 0)) {
                const partnerId = u.partnerUserId || u.pairedWith?.[0]?.userId;
                if (partnerId) {
                    const partner = unitList.find(p => p.userId === partnerId);
                    if (partner && partner.userId) {
                        processed.add(partner.userId);
                    }
                }
            }
            result.push(u);
            if (u.userId) processed.add(u.userId);
        });
        return result;
    };

    const groupedUnits = React.useMemo(() => groupUnits(units), [units]);

    // Sounds
    const { playSound } = useSound();

    // NCIC State
    const [ncicFields, setNcicFields] = useState({
        firstName: "",
        lastName: "",
        ssn: "",
        plate: "",
        weaponSerial: ""
    });
    const [ncicResults, setNcicResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Fines State
    const [showFineModal, setShowFineModal] = useState(false);
    const [showPairInviteModal, setShowPairInviteModal] = useState(false);
    const [pairInviteData, setPairInviteData] = useState<{ fromUserId: number; fromCallSign: string } | null>(null);
    const [fineForm, setFineForm] = useState({
        characterId: null,
        amount: "",
        reason: ""
    });

    // Warrants State
    const [warrants, setWarrants] = useState<any[]>([]);
    const [showWarrantModal, setShowWarrantModal] = useState(false);
    const [showWarrantCreateModal, setShowWarrantCreateModal] = useState(false);
    const [warrantForm, setWarrantForm] = useState({
        characterId: null as number | null,
        type: 'arrest',
        title: '',
        description: '',
        justification: '',
        expiresInDays: 30
    });
    const [selectedWarrant, setSelectedWarrant] = useState<any | null>(null);
    const [isLoadingWarrants, setIsLoadingWarrants] = useState(false);

    // Drag and drop for pair creation
    const [draggedUnit, setDraggedUnit] = useState<any | null>(null);
    const [dropTargetUnit, setDropTargetUnit] = useState<any | null>(null);
    const [showCreatePairModal, setShowCreatePairModal] = useState(false);
    const [createPairData, setCreatePairData] = useState<{ unit1: any; unit2: any; pairName: string } | null>(null);

    // Layout customization state
    const [isEditMode, setIsEditMode] = useState(false);
    const [layout, setLayout] = useState<any>({
        unitsTable: { x: 0, y: 0, width: 800, height: 400 },
        callsTable: { x: 0, y: 410, width: 800, height: 300 },
        actionsPanel: { x: 810, y: 0, width: 224, height: 500 }
    });

    useEffect(() => {
        const savedLayout = localStorage.getItem('policeLayout');
        if (savedLayout) {
            try {
                setLayout(JSON.parse(savedLayout));
            } catch (e) {
                console.error('Failed to parse saved layout', e);
            }
        }
    }, []);

    const saveLayout = (newLayout: any) => {
        setLayout(newLayout);
        localStorage.setItem('policeLayout', JSON.stringify(newLayout));
    };

    const handleLayoutChange = (key: string, data: any) => {
        const newLayout = { ...layout, [key]: { ...layout[key], ...data } };
        saveLayout(newLayout);
    };

    useEffect(() => {
        fetchData();
        checkActiveUnit();

        // Load persisted UI state
        const savedTab = localStorage.getItem('policeActiveTab');
        if (savedTab) setActiveTab(savedTab);

        const savedNotes = localStorage.getItem('policeNotes');
        if (savedNotes) setNotes(savedNotes);

        // Socket connection handled by SocketProvider

        socket.on('new_911_call', (newCall: any) => {
            console.log('[SOCKET] new_911_call received:', newCall);
            // Only add police calls (not EMS/Fire)
            const isPoliceCall = newCall.callType === 'police' || !newCall.callType;
            if (isPoliceCall) {
                setCalls(prev => [newCall, ...prev]);
                playSound('new_call_911').then(() => console.log('[Police] Sound played')).catch(e => console.error('[Police] Sound error:', e));
            }
        });

        socket.on('update_911_call', (updatedCall: any) => {
            console.log('[SOCKET] update_911_call received:', updatedCall);
            // Only process police calls
            const isPoliceCall = updatedCall.callType === 'police' || !updatedCall.callType;
            if (!isPoliceCall) return;
            
            setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
            // Update selected call modal with units if present
            setSelectedCallForNotes((prev: any) => {
                if (prev?.id === updatedCall.id) {
                    return { 
                        ...updatedCall, 
                        units: updatedCall.units || prev.units 
                    };
                }
                return prev;
            });
        });

        socket.on('new_911_note', ({ callId, note }: { callId: number, note: any }) => {
            setCalls(prev => prev.map(c => {
                if (c.id === callId) {
                    return { ...c, notes: [...(c.notes || []), note] };
                }
                return c;
            }));
            setSelectedCallForNotes((prev: any) => {
                if (prev?.id === callId) {
                    return { ...prev, notes: [...(prev.notes || []), note] };
                }
                return prev;
            });
        });

        socket.on('delete_911_call', ({ id }: { id: number }) => {
            setCalls(prev => prev.filter(c => c.id !== id));
            setSelectedCallForNotes((prev: any) => (prev?.id === id ? null : prev));
        });

        socket.on('dispatcher_message', (data: { message: string; from: string }) => {
            playSound('message_received');
            toast({ title: 'Сообщение от супервайзера', description: `${data.from}: ${data.message}` });
        });

        socket.on('supervisor_message', (data: { message: string; from: string }) => {
            playSound('message_received');
            toast({ title: 'Сообщение от супервайзера', description: `${data.from}: ${data.message}` });
        });

        socket.on('unit_unassigned', () => {
            fetchData();
        });

        const handleCallUpdate = (data: any) => {
            setCalls(prev => prev.map(c => c.id === data.callId ? { ...c, ...data.call } : c));
            if (selectedCallForNotes?.id === data.callId) {
                setSelectedCallForNotes(prev => prev ? { ...prev, ...data.call } : null);
            }
        };

        socket.on('unit_attached_to_call', (data: { userId: number; callId: number; unitCallSign: string; isLeadUnit: boolean; call: any }) => {
            console.log('[SOCKET] unit_attached_to_call:', data);
            playSound('notification');
            toast({ title: data.isLeadUnit ? 'Новый главный юнит' : 'Юнит прикреплен', description: `${data.unitCallSign} прикреплен к вызову #${data.callId}${data.isLeadUnit ? ' (ГЛАВНЫЙ)' : ''}` });
            
            handleCallUpdate({ callId: data.callId, call: { status: data.call.status, mainUnitId: data.call.mainUnitId, units: data.call.units } });

            // Update currentUnit.callId if the attached unit is the current user
            if (currentUnit?.userId === data.userId) {
                setCurrentUnit(prev => prev ? { ...prev, callId: data.callId } : null);
            }

            // Also refresh full data in background
            fetchData();
        });

        socket.on('unit_detached_from_call', (data: { userId: number; callId: number; unitCallSign: string; newMainUnitId: number | null; call: any }) => {
            console.log('[SOCKET] unit_detached_from_call:', data);
            playSound('notification');
            toast({ title: 'Юнит откреплен', description: `${data.unitCallSign} откреплен от вызова #${data.callId}` });
            
            handleCallUpdate({ callId: data.callId, call: { status: data.call?.status, mainUnitId: data.newMainUnitId, units: data.call?.units } });

            setCalls(prev => prev.map(c => {
                if (c.id === data.callId) {
                    return {
                        ...c,
                        status: data.call?.status || c.status,
                        mainUnitId: data.newMainUnitId,
                        units: data.call?.units || c.units
                    };
                }
                return c;
            }));
            
            // Update selected call modal if open
            if (selectedCallForNotes?.id === data.callId) {
                setSelectedCallForNotes((prev: typeof selectedCallForNotes) => prev ? { 
                    ...prev, 
                    status: data.call?.status || prev.status,
                    mainUnitId: data.newMainUnitId,
                    units: data.call?.units || []
                } : null);
            }
            
            // Update currentUnit.callId if the detached unit is the current user
            if (currentUnit?.userId === data.userId) {
                setCurrentUnit(prev => prev ? { ...prev, callId: undefined } : null);
            }
            
            fetchData();
        });

        socket.on('lead_unit_changed', (data: { callId: number; newLeadUserId: number; previousLeadUserId: number | null; call: any }) => {
            console.log('[SOCKET] lead_unit_changed:', data);
            playSound('notification');
            toast({ title: 'Новый главный юнит', description: `Главный юнит на вызове #${data.callId} изменен` });
            
            // Update calls immediately
            setCalls(prev => prev.map(c => {
                if (c.id === data.callId) {
                    return {
                        ...c,
                        mainUnitId: data.newLeadUserId,
                        units: data.call.units.map((u: any) => ({
                            ...u,
                            isLead: u.userId === data.newLeadUserId
                        }))
                    };
                }
                return c;
            }));
            
            // Update selected call modal if open
            if (selectedCallForNotes?.id === data.callId) {
                setSelectedCallForNotes((prev: typeof selectedCallForNotes) => prev ? { 
                    ...prev, 
                    mainUnitId: data.newLeadUserId,
                    units: data.call.units.map((u: any) => ({
                        ...u,
                        isLead: u.userId === data.newLeadUserId
                    }))
                } : null);
            }
            
            fetchData();
        });

        socket.on('unit_assigned', (data: { userId: number; callId: number; unitCallSign: string }) => {
            playSound('notification');
            toast({ title: 'Прикреплен к вызову', description: `Юнит ${data.unitCallSign} прикреплен к вызову #${data.callId}` });
            fetchData();
        });

        socket.on('call_assigned_to_unit', (data: { userId: number; call: any }) => {
            // Deprecated - now using unit_attached_to_call
            // Keeping for backwards compatibility but no action needed
        });

        socket.on('unit_status_changed', (data: { userId: number; status: string; unitCallSign: string }) => {
            setUnits(prev => prev.map(u => u.userId === data.userId ? { ...u, status: data.status } : u));
            setCurrentUnit(prev => {
                if (prev?.userId === data.userId) {
                    return { ...prev, status: data.status };
                }
                return prev;
            });
        });

        socket.on('unit_on_duty', () => {
            fetchData();
        });

        socket.on('unit_off_duty', (data: { userId: number }) => {
            fetchData();
            if (user?.id === data.userId) {
                setOnDuty(false);
                setCurrentUnit(null);
            }
        });

        socket.on('unit_pair_update', () => {
            fetchData();
        });

        socket.on('pair_invite', (data: { fromUserId: number; fromCallSign: string }) => {
            playSound('notification');
            setPairInviteData(data);
            setShowPairInviteModal(true);
            toast({ 
                title: 'Приглашение в пару', 
                description: `${data.fromCallSign} пригласил вас в патрульную пару.`,
                duration: 10000 
            });
        });

        socket.on('pair_formed', () => {
            fetchData();
            toast({ title: 'Пара создана', description: 'Вы теперь в патрульной паре' });
        });

        socket.on('pair_disbanded', () => {
            fetchData();
            toast({ title: 'Пара расформирована', description: 'Патрульная пара была разделена' });
        });

        return () => {
            socket.off('new_911_call');
            socket.off('update_911_call');
            socket.off('new_911_note');
            socket.off('delete_911_call');
            socket.off('dispatcher_message');
            socket.off('supervisor_message');
            socket.off('unit_unassigned');
            socket.off('unit_assigned');
            socket.off('unit_attached_to_call');
            socket.off('unit_detached_from_call');
            socket.off('lead_unit_changed');
            socket.off('unit_status_changed');
            socket.off('unit_pair_update');
            socket.off('pair_invite');
            socket.off('pair_formed');
            socket.off('pair_disbanded');
        };
    }, [selectedCallForNotes?.id]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        localStorage.setItem('policeActiveTab', tab);
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNotes(val);
        localStorage.setItem('policeNotes', val);
    };

    const checkActiveUnit = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/units/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const unitData = await res.json();
                if (unitData) {
                    setCurrentUnit(unitData);
                    setSelectedCharacter(unitData.characterId);
                    setCurrentMember(unitData.departmentMember);
                    setCallSign(unitData.callSign || "");
                    setSubdivision(unitData.subdivision || "");
                    setOnDuty(true);
                }
            }
        } catch (err) {
            console.error('Failed to check active unit', err);
        }
    };

    const fetchData = async () => {
        const currentSelectedId = selectedCallForNotes?.id;
        setIsLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const [unitsRes, callsRes, charsRes] = await Promise.all([
                fetch(`${apiUrl}/api/units`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/calls911/active`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/characters`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (unitsRes.ok) {
                const data = await unitsRes.json();
                setUnits(data);
            }
            if (callsRes.ok) {
                const data = await callsRes.json();
                // Only show police calls (not EMS/Fire)
                const policeCalls = data.filter((c: any) => 
                    c.callType === 'police' || c.callType === undefined || !c.callType
                );
                setCalls(policeCalls);
                // Restore selected call from fresh data
                if (currentSelectedId) {
                    const updatedCall = data.find((c: any) => c.id === currentSelectedId);
                    if (updatedCall) {
                        setSelectedCallForNotes(updatedCall);
                    }
                }
            }
            if (charsRes.ok) {
                const data = await charsRes.json();
                const policeChars = data.filter((c: Character) =>
                    c.departmentMembers?.some(m => m.isActive && m.department?.type === 'police')
                );
                setCharacters(policeChars);
                
                // Auto-select if only one character exists
                if (policeChars.length === 1 && !selectedCharacter) {
                    setSelectedCharacter(String(policeChars[0].id));
                }
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDutyStart = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const char = characters.find(c => String(c.id) === String(selectedCharacter));
            const member = char?.departmentMembers?.find(m => m.isActive && m.department?.type === 'police');

            const res = await fetch(`${apiUrl}/api/units`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: selectedCharacter ? parseInt(selectedCharacter) : null,
                    departmentMemberId: member?.id || null,
                    callSign,
                    subdivision
                })
            });

            if (res.ok) {
                const unitData = await res.json();
                setCurrentUnit(unitData);

                // Find and set the member that went on duty
                const activeChar = characters.find(c => String(c.id) === String(selectedCharacter));
                const activeMember = activeChar?.departmentMembers?.find(m => m.isActive && m.department?.type === 'police');
                if (activeMember) setCurrentMember(activeMember);

                setOnDuty(true);
                setShowDutyModal(false);
                playSound('notification');
                toast({ title: 'На смене', description: `Вы вышли на смену как ${unitData.unit}` });
                fetchData();
            } else {
                const data = await res.json();
                toast({ title: 'Ошибка', description: data.error || 'Не удалось начать смену', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to start duty', err);
            toast({ title: 'Ошибка', description: 'Не удалось начать смену', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCallNoteSubmit = async (callId: number) => {
        if (!newCallNoteText.trim()) return;

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
                    text: newCallNoteText,
                    author: callSign // Use callsign as author
                })
            });

            if (res.ok) {
                const newNote = await res.json();
                setNewCallNoteText("");
                // Update local state immediately for instant feedback
                setSelectedCallForNotes((prev: any) => {
                    if (prev?.id === callId) {
                        return { ...prev, notes: [...(prev.notes || []), newNote] };
                    }
                    return prev;
                });
                setCalls(prev => prev.map(c => {
                    if (c.id === callId) {
                        return { ...c, notes: [...(c.notes || []), newNote] };
                    }
                    return c;
                }));
            }
        } catch (err) {
            console.error('Failed to add call note', err);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!onDuty) {
            console.log('[handleUpdateStatus] Skipped - not onDuty');
            return;
        }

        const charId = selectedCharacter || currentUnit?.characterId;
        if (!charId && !user?.id) {
            console.log('[handleUpdateStatus] Skipped - no characterId or userId');
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.log('[handleUpdateStatus] No token');
                return;
            }

            // Update local state immediately for instant feedback
            setCurrentUnit(prev => prev ? { ...prev, status } : null);
            setUnits(prev => prev.map(u => u.userId === (charId ? parseInt(String(charId)) : currentUnit?.userId || user?.id) ? { ...u, status } : u));
            
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            console.log('[handleUpdateStatus] Sending request with targetId:', charId || user?.id, 'status:', status);
            
            const res = await fetch(`${apiUrl}/api/units/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: charId ? parseInt(String(charId)) : undefined,
                    userId: !charId ? user?.id : undefined,
                    status
                })
            });

            console.log('[handleUpdateStatus] Response:', res.status, res.ok);
            
            if (res.ok) {
                const data = await res.json();
                console.log('[handleUpdateStatus] Updated unit:', data);
                setCurrentUnit(data);
                toast({ title: 'Статус обновлен', description: `Новый статус: ${status}` });
            } else {
                const errData = await res.json();
                console.log('[handleUpdateStatus] Error:', errData);
                // Revert on error
                fetchData();
                toast({ title: 'Ошибка', description: errData.error || 'Не удалось обновить статус', variant: 'destructive' });
            }
        } catch (err) {
            console.error('[handleUpdateStatus] Failed:', err);
        }
    };

    const handleCloseCall = async (callId: number) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/${callId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'closed'
                })
            });

            if (res.ok) {
                toast({ title: 'Вызов закрыт', description: `Вызов #${callId} успешно закрыт и перенесен в архив.` });
                setSelectedCallForNotes(null);
                fetchData();
            } else {
                toast({ title: 'Ошибка', description: 'Не удалось закрыть вызов', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to close call', err);
        }
    };

    const handleAttachToCall = async (callId: number) => {
        if (!onDuty || !currentUnit) {
            toast({ title: 'Ошибка', description: 'Вы не на смене', variant: 'destructive' });
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/${callId}/attach`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const updatedCall = await res.json();
                toast({ title: 'Прикреплено', description: `Вы прикреплены к вызову #${callId}` });
                setSelectedCallForNotes(updatedCall);
                setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
                // Update currentUnit with callId for real-time badge update
                setCurrentUnit(prev => prev ? { ...prev, callId } : null);
                addSystemNote(callId, `${callSign} прикрепился к вызову`);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to attach to call', err);
        }
    };

    const handleDetachFromCall = async () => {
        if (!currentUnit?.callId) return;

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/detach`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const updatedCall = await res.json();
                toast({ title: 'Откреплено', description: 'Вы откреплены от вызова' });
                if (updatedCall) {
                    setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
                    if (selectedCallForNotes?.id === updatedCall.id) {
                        setSelectedCallForNotes(updatedCall);
                    }
                }
                // Clear callId from currentUnit for real-time badge update
                setCurrentUnit(prev => prev ? { ...prev, callId: undefined } : null);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to detach from call', err);
        }
    };

    const handleSetMainUnit = async (callId: number, targetUserId: number) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/${callId}/main-unit`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId: targetUserId })
            });

            if (res.ok) {
                const updatedCall = await res.json();
                toast({ title: 'Главный назначен', description: 'Новый главный юнит назначен' });
                setSelectedCallForNotes(updatedCall);
                setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
                addSystemNote(callId, `Главный юнит изменен на юнит #${targetUserId}`);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to set main unit', err);
        }
    };

    const handleUpdatePriority = async (callId: number, priority: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911/${callId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ priority })
            });

            if (res.ok) {
                const updatedCall = await res.json();
                const priorityLabels = { low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критический' };
                toast({ title: 'Приоритет обновлен', description: `Приоритет изменен на ${priorityLabels[priority as keyof typeof priorityLabels]}` });
                setSelectedCallForNotes(updatedCall);
                setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
                addSystemNote(callId, `Приоритет изменен на ${priorityLabels[priority as keyof typeof priorityLabels]}`);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to update priority', err);
        }
    };

    const addSystemNote = async (callId: number, message: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            await fetch(`${apiUrl}/api/calls911/${callId}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    text: message,
                    author: 'SYSTEM'
                })
            });
        } catch (err) {
            console.error('Failed to add system note', err);
        }
    };

    const handleDutyEnd = async () => {
        if (!onDuty) return;

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/units`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast({ title: 'Конец смены', description: 'Вы закончили патрулирование.' });
                setOnDuty(false);
                setCurrentUnit(null);
                setCurrentMember(null);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to end duty', err);
        }
    };

    const handleNCICSearch = async () => {
        const { firstName, lastName, ssn, plate, weaponSerial } = ncicFields;
        if (!firstName && !lastName && !ssn && !plate && !weaponSerial) return;

        setIsSearching(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const params = new URLSearchParams();
            if (firstName) params.append('firstName', firstName);
            if (lastName) params.append('lastName', lastName);
            if (ssn) params.append('ssn', ssn);
            if (plate) params.append('plate', plate);
            if (weaponSerial) params.append('weaponSerial', weaponSerial);

            const res = await fetch(`${apiUrl}/api/ncic/search?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNcicResults(data);
            }
        } catch (err) {
            console.error('NCIC Search failed', err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleIssueFine = async () => {
        if (!fineForm.characterId || !fineForm.amount || !fineForm.reason) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/fines`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: fineForm.characterId,
                    amount: parseFloat(fineForm.amount),
                    reason: fineForm.reason,
                    officerId: currentUnit?.characterId
                })
            });

            if (res.ok) {
                toast({ title: 'Штраф выписан', description: 'Нарушение успешно зафиксировано в базе.' });
                setShowFineModal(false);
                setFineForm({ characterId: null, amount: "", reason: "" });
                handleNCICSearch(); // Refresh results to show new fine
            }
        } catch (err) {
            console.error('Failed to issue fine', err);
            toast({ title: 'Ошибка', description: 'Не удалось выписать штраф', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchWarrants = async (characterId?: number) => {
        setIsLoadingWarrants(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const url = characterId 
                ? `${apiUrl}/api/roleplay/warrants/character/${characterId}`
                : `${apiUrl}/api/roleplay/warrants`;
            
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setWarrants(data);
            }
        } catch (err) {
            console.error('Failed to fetch warrants:', err);
        } finally {
            setIsLoadingWarrants(false);
        }
    };

    const handleCreateWarrant = async () => {
        if (!warrantForm.characterId || !warrantForm.title || !warrantForm.description || !warrantForm.justification) {
            toast({ title: 'Ошибка', description: 'Заполните все обязательные поля', variant: 'destructive' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/roleplay/warrants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(warrantForm)
            });

            if (res.ok) {
                toast({ title: 'Ордер создан', description: 'Ордер успешно добавлен в базу данных.' });
                setShowWarrantCreateModal(false);
                setWarrantForm({
                    characterId: null,
                    type: 'arrest',
                    title: '',
                    description: '',
                    justification: '',
                    expiresInDays: 30
                });
                fetchWarrants();
            } else {
                const data = await res.json();
                toast({ title: 'Ошибка', description: data.error || 'Не удалось создать ордер', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to create warrant:', err);
            toast({ title: 'Ошибка', description: 'Не удалось создать ордер', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExecuteWarrant = async (warrantId: number) => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/roleplay/warrants/${warrantId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'executed' })
            });

            if (res.ok) {
                toast({ title: 'Ордер выполнен', description: 'Статус ордера обновлен.' });
                fetchWarrants();
            }
        } catch (err) {
            console.error('Failed to execute warrant:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelWarrant = async (warrantId: number, reason: string) => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/roleplay/warrants/${warrantId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'cancelled', reason })
            });

            if (res.ok) {
                toast({ title: 'Ордер отменен', description: 'Ордер был отменен.' });
                fetchWarrants();
            }
        } catch (err) {
            console.error('Failed to cancel warrant:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick action handlers
    const handleBoloSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/roleplay/bolos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...boloForm,
                    createdBy: currentUnit?.userId || user?.id,
                    status: 'active'
                })
            });

            if (res.ok) {
                toast({ title: 'BOLO создан', description: 'BOLO был успешно создан.' });
                setShowBoloModal(false);
                setBoloForm({ type: 'vehicle', description: '', plate: '', color: '', model: '' });
            }
        } catch (err) {
            console.error('Failed to create BOLO:', err);
            toast({ title: 'Ошибка', description: 'Не удалось создать BOLO.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlateCheck = async () => {
        if (!plateCheckForm.plate.trim()) return;
        
        setIsSearching(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/ncic/search?plate=${plateCheckForm.plate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    // Find the result with vehicle info
                    const vehicleResult = data.find((item: any) => item.vehicles && item.vehicles.length > 0);
                    if (vehicleResult) {
                        setVehicleInfo(vehicleResult);
                        setShowVehicleInfoModal(true);
                        setShowPlateCheckModal(false);
                        setPlateCheckForm({ plate: '' });
                    } else {
                        toast({ title: 'Не найдено', description: 'Транспортное средство не найдено', variant: 'destructive' });
                    }
                } else {
                    toast({ title: 'Не найдено', description: 'Транспортное средство не найдено', variant: 'destructive' });
                }
            }
        } catch (err) {
            console.error('Failed plate check:', err);
            toast({ title: 'Ошибка', description: 'Не удалось выполнить поиск', variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchOwner = (firstName: string, lastName: string) => {
        setNcicFields(prev => ({ ...prev, firstName, lastName, plate: '' }));
        setActiveTab("NCIC");
        setShowVehicleInfoModal(false);
        setTimeout(() => handleNCICSearch(), 100);
    };

    const handleDotCall = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: 'dot',
                    location: dotForm.location || 'Не указано',
                    description: dotForm.description,
                    priority: 'medium',
                    callerName: currentUnit?.unit || 'Police Unit',
                    status: 'pending',
                    createdAt: Date.now()
                })
            });

            if (res.ok) {
                toast({ title: 'Вызов DOT создан', description: 'Вызов был успешно отправлен.' });
                setShowDotModal(false);
                setDotForm({ location: '', description: '' });
                fetchData();
            }
        } catch (err) {
            console.error('Failed to create DOT call:', err);
            toast({ title: 'Ошибка', description: 'Не удалось создать вызов DOT.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handle2hrCall = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/calls911`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: '2hr',
                    location: twoHrForm.location || 'Не указано',
                    description: twoHrForm.description,
                    priority: 'high',
                    callerName: currentUnit?.unit || 'Police Unit',
                    status: 'pending',
                    createdAt: Date.now()
                })
            });

            if (res.ok) {
                toast({ title: 'Вызов 2HR создан', description: 'Вызов был успешно отправлен.' });
                setShow2hrModal(false);
                setTwoHrForm({ location: '', description: '' });
                fetchData();
            }
        } catch (err) {
            console.error('Failed to create 2HR call:', err);
            toast({ title: 'Ошибка', description: 'Не удалось создать вызов 2HR.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendUnitMessage = async () => {
        if (!selectedUnit || !unitMessage.trim()) return;

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/units/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetUserId: selectedUnit.userId,
                    message: unitMessage
                })
            });

            if (res.ok) {
                playSound('message_sent');
                toast({ title: 'Сообщение отправлено', description: `Сообщение для ${selectedUnit.unit} доставлено` });
                setUnitMessage('');
                setSelectedUnit(null);
            }
        } catch (err) {
            console.error('Failed to send message', err);
            toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
        }
    };

    const handleUnassignUnit = async () => {
        if (!selectedUnit) return;

        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/units/${selectedUnit.userId}/call`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                playSound('notification');
                toast({ title: 'Юнит снят', description: `${selectedUnit.unit} снят с текущего вызова` });
                setSelectedUnit(null);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to unassign unit', err);
            toast({ title: 'Ошибка', description: 'Не удалось снять юнита', variant: 'destructive' });
        }
    };

    const handleInviteToPair = async () => {
        if (!selectedUnit) return;
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/units/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ targetUserId: selectedUnit.userId })
            });
            if (res.ok) {
                toast({ title: 'Приглашение отправлено', description: `Приглашение для ${selectedUnit.unit} отправлено` });
                setSelectedUnit(null);
            }
        } catch (err) {
            console.error('Failed to invite to pair', err);
        }
    };

    const handleLeavePair = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/units/leave`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                toast({ title: 'Выход из пары', description: 'Вы покинули патрульную пару' });
                fetchData();
            }
        } catch (err) {
            console.error('Failed to leave pair', err);
        }
    };

    const handleAcceptPairInvite = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/units/accept`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                playSound('notification');
                toast({ title: 'Принято', description: 'Вы присоединились к патрульной паре' });
                setShowPairInviteModal(false);
                setPairInviteData(null);
                fetchData();
            }
        } catch (err) {
            console.error('Failed to accept pair invite', err);
        }
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
                toast({ title: 'Пара создана', description: `Патрульная пара "${createPairData.pairName || 'Без названия'}" создана` });
                setShowCreatePairModal(false);
                setCreatePairData(null);
                setDraggedUnit(null);
                setDropTargetUnit(null);
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

    const handleDragStart = (unit: any) => {
        if (!canManageUnits) return;
        setDraggedUnit(unit);
    };

    const handleDragOver = (e: React.DragEvent, unit: any) => {
        e.preventDefault();
        if (!canManageUnits || !draggedUnit || draggedUnit.userId === unit.userId) return;
        
        // Only allow dropping on non-paired units
        if (!unit.partnerUserId && (!unit.pairedWith || unit.pairedWith.length === 0)) {
            setDropTargetUnit(unit);
        }
    };

    const handleDragLeave = () => {
        setDropTargetUnit(null);
    };

    const handleDrop = (targetUnit: any) => {
        if (!draggedUnit || !canManageUnits || !targetUnit) return;
        if (draggedUnit.userId === targetUnit.userId) return;
        
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

    return (
        <div className="fixed top-14 inset-x-0 bottom-0 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col p-3">
                <Card className="flex-1 bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" />
                                Статус юнитов - {units.length} Активно / {calls.length} Ожидающих вызовов
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
                        <div className="flex gap-2 mb-3 flex-wrap shrink-0">
                            {TOP_ACTIONS.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Button
                                        key={action.label}
                                        size="sm"
                                        onClick={() => handleTabChange(action.label)}
                                        className={`${activeTab === action.label ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                                    >
                                        <Icon className="w-4 h-4 mr-1.5" />
                                        {action.label}
                                    </Button>
                                );
                            })}
                            {isSupervisor && SUPERVISOR_ACTIONS.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Button
                                        key={action.label}
                                        size="sm"
                                        onClick={() => handleTabChange(action.label)}
                                        className={`${activeTab === action.label ? 'bg-blue-600 hover:bg-blue-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                                    >
                                        <Icon className="w-4 h-4 mr-1.5" />
                                        {action.label}
                                    </Button>
                                );
                            })}
                            <Button variant="outline" size="sm" onClick={fetchData} className="bg-zinc-800/50 border-zinc-700 ml-auto">
                                <Clock className="w-4 h-4 mr-1.5" />
                                Обновить
                            </Button>
                        </div>

                        <div className="flex-1 flex gap-3 min-h-0">
                            {activeTab === "Статус юнитов" && (
                                <div className="flex-1 space-y-3 min-h-0 flex flex-col">
                                    <div className="rounded-lg border border-zinc-700 flex-1 overflow-hidden flex flex-col min-h-0">
                                        <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-700 flex items-center gap-2 shrink-0">
                                            <Users className="w-4 h-4 text-zinc-400" />
                                            <span className="text-sm font-medium text-zinc-300">Юниты</span>
                                        </div>
                                        <div className="overflow-auto flex-1">
                                                {isLoading ? (
                                                    <div className="flex items-center justify-center h-32 text-zinc-500">Загрузка...</div>
                                                ) : units.length === 0 ? (
                                                    <div className="flex items-center justify-center h-32 text-zinc-500">Нет доступных юнитов</div>
                                                ) : (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-zinc-800/30 sticky top-0">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Юнит</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Район</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Вызов</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Статус</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Время</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Тип</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Локация</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {groupedUnits.map((row: any) => (
                                                                <tr 
                                                                    key={row.userId} 
                                                                    draggable={canManageUnits && !row.partnerUserId && (!row.pairedWith || row.pairedWith.length === 0)}
                                                                    onDragStart={() => handleDragStart(row)}
                                                                    onDragOver={(e) => handleDragOver(e, row)}
                                                                    onDragLeave={handleDragLeave}
                                                                    onDrop={() => handleDrop(row)}
                                                                    onDragEnd={handleDragEnd}
                                                                    className={`
                                                                        ${row.status === "Dispatched" ? "bg-blue-950/20" : ""} 
                                                                        ${canManageUnits && !row.partnerUserId && (!row.pairedWith || row.pairedWith.length === 0) ? "cursor-grab hover:bg-zinc-800/50" : ""}
                                                                        ${dropTargetUnit?.userId === row.userId && draggedUnit?.userId !== row.userId ? "bg-purple-500/20 border-2 border-purple-500" : ""}
                                                                        ${draggedUnit?.userId === row.userId ? "opacity-50" : ""}
                                                                    `}
                                                                    onClick={() => canManageUnits && setSelectedUnit(row)}
                                                                >
                                                                    <td className={`px-3 py-2 font-semibold ${row.status === "Available" ? "text-green-400" : "text-blue-400"}`}>
                                                                        <div className="flex items-center gap-2">
                                                                            <span>{row.unit}</span>
                                                                            {row.partnerUserId && (
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
                                                                                                            {row.user?.avatarUrl ? (
                                                                                                                <img src={getImageUrl(row.user.avatarUrl)!} alt={row.user.username} className="w-full h-full object-cover" />
                                                                                                            ) : (
                                                                                                                <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-4 h-4" /></div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="text-xs font-bold text-white">{row.officer}</span>
                                                                                                        <span className="text-[10px] text-zinc-500">@{row.user?.username || 'user'}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <div className="relative">
                                                                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                                                                                            {row.partnerUser?.avatarUrl ? (
                                                                                                                <img src={getImageUrl(row.partnerUser.avatarUrl)!} alt={row.partnerUser.username} className="w-full h-full object-cover" />
                                                                                                            ) : (
                                                                                                                <div className="w-full h-full flex items-center justify-center text-zinc-600"><User className="w-4 h-4" /></div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="text-xs font-bold text-white">{row.partnerOfficer}</span>
                                                                                                        <span className="text-[10px] text-zinc-500">@{row.partnerUser?.username || 'user'}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                </TooltipProvider>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.beat}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.call}</td>
                                                                    <td className={`px-3 py-2 font-medium ${row.status === "Available" ? "text-green-400" : row.status === "Busy" ? "text-yellow-400" : row.status === "Enroute" ? "text-blue-400" : row.status === "On Scene" ? "text-emerald-400" : row.status === "Dispatched" ? "text-purple-400" : row.status === "Resolving" ? "text-indigo-400" : "text-red-400"}`}>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-2 h-2 rounded-full ${row.status === "Available" ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" : row.status === "Enroute" ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" : row.status === "Busy" ? "bg-yellow-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" : row.status === "On Scene" ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" : row.status === "Dispatched" ? "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.8)]" : row.status === "Resolving" ? "bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"}`} />
                                                                            {row.status === "Available" ? "ДОСТУПЕН" : row.status === "Enroute" ? "В ПУТИ" : row.status === "Busy" ? "ЗАНЯТ" : row.status === "On Scene" ? "НА МЕСТЕ" : row.status === "Dispatched" ? "НАЗНАЧЕН" : row.status === "Resolving" ? "ОБРАБАТЫВАЕТСЯ" : row.status}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.time}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.nature}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.location}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>

                                    <div className="rounded-lg border border-zinc-700 overflow-hidden flex-1 flex flex-col min-h-0">
                                        <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-700 flex items-center gap-2 shrink-0">
                                            <AlertTriangle className="w-4 h-4 text-zinc-400" />
                                            <span className="text-sm font-medium text-zinc-300">Активные вызовы</span>
                                        </div>
                                        <div className="overflow-auto flex-1">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center h-32 text-zinc-500">Загрузка...</div>
                                            ) : calls.length === 0 ? (
                                                <div className="flex items-center justify-center h-32 text-zinc-500">Нет активных вызовов</div>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead className="bg-zinc-800/30 sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">ID</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Время</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Заявитель</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Локация</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Описание</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Статус</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Действия</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Инфо</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {calls.map((row: any) => (
                                                            <tr
                                                                key={row.id}
                                                                className="bg-yellow-950/10 border-b border-yellow-900/10 hover:bg-yellow-900/20 cursor-pointer transition-colors"
                                                                onClick={() => setSelectedCallForNotes(row)}
                                                            >
                                                                <td className="px-3 py-2 font-medium text-zinc-100">#{row.id}</td>
                                                                <td className="px-3 py-2 text-zinc-300 font-mono text-xs">{new Date(row.createdAt).toLocaleTimeString()}</td>
                                                                <td className="px-3 py-2 text-zinc-100">{row.callerName}</td>
                                                                <td className="px-3 py-2 text-zinc-300">{row.location}</td>
                                                                <td className="px-3 py-2 text-zinc-100">{row.description}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${row.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                                                        row.status === 'dispatched' ? 'bg-blue-500/20 text-blue-400' :
                                                                            'bg-zinc-500/20 text-zinc-400'
                                                                        }`}>
                                                                        {row.status === 'pending' ? 'В Ожидании' : row.status === 'dispatched' ? 'Принят' : row.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-right">
                                                                    {currentUnit?.callId === row.id && row.mainUnitId === currentUnit?.userId ? (
                                                                        <div className="bg-red-600 px-2 py-1 rounded text-[10px] font-bold text-white">
                                                                            Красный юнит
                                                                        </div>
                                                                    ) : onDuty && currentUnit?.callId !== row.id && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 px-2 text-[10px] bg-blue-600 hover:bg-blue-500 border-blue-500"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleAttachToCall(row.id);
                                                                            }}
                                                                        >
                                                                            Прикрепиться
                                                                        </Button>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right">
                                                                    <div className="relative inline-block">
                                                                        <MessageCircle className="w-4 h-4 text-blue-400" />
                                                                        {row.notes?.length > 0 && (
                                                                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "Сообщения" && (
                                <div className="flex-1 flex flex-col">
                                    <div className="rounded-lg border border-zinc-700 p-4">
                                        <span className="text-sm font-medium text-zinc-300">Панель сообщений</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === "NCIC" && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="bg-zinc-800/20 border border-zinc-700/50 p-4 rounded-xl mb-6 shadow-xl shrink-0">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Имя</Label>
                                                <Input
                                                    value={ncicFields.firstName}
                                                    onChange={(e) => setNcicFields({ ...ncicFields, firstName: e.target.value })}
                                                    placeholder="John"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Фамилия</Label>
                                                <Input
                                                    value={ncicFields.lastName}
                                                    onChange={(e) => setNcicFields({ ...ncicFields, lastName: e.target.value })}
                                                    placeholder="Doe"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">SSN / ID</Label>
                                                <Input
                                                    value={ncicFields.ssn}
                                                    onChange={(e) => setNcicFields({ ...ncicFields, ssn: e.target.value })}
                                                    placeholder="Необязательно"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Номер авто</Label>
                                                <Input
                                                    value={ncicFields.plate}
                                                    onChange={(e) => setNcicFields({ ...ncicFields, plate: e.target.value })}
                                                    placeholder="89ABC123"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Серия оружия</Label>
                                                <Input
                                                    value={ncicFields.weaponSerial}
                                                    onChange={(e) => setNcicFields({ ...ncicFields, weaponSerial: e.target.value })}
                                                    placeholder="SN-98123"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setNcicFields({ firstName: '', lastName: '', ssn: '', plate: '', weaponSerial: '' })}
                                                className="bg-zinc-800/50 border-zinc-700 text-xs text-zinc-400 hover:text-white"
                                            >
                                                Очистить всё
                                            </Button>
                                            <Button
                                                onClick={handleNCICSearch}
                                                disabled={isSearching}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-500 min-w-[120px] shadow-lg shadow-blue-900/20"
                                            >
                                                {isSearching ? <Clock className="w-3.5 h-3.5 animate-spin mr-2" /> : <Search className="w-3.5 h-3.5 mr-2" />}
                                                {isSearching ? 'Поиск...' : 'Поиск в NCIC'}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto space-y-4 pr-1">
                                        {ncicResults.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-700 rounded-xl bg-zinc-900/20">
                                                <FileSearch className="w-12 h-12 text-zinc-800 mb-4" />
                                                <p className="text-zinc-500 font-medium">Результатов не найдено</p>
                                                <p className="text-xs text-zinc-600 mt-1">Введите запрос для поиска в базе данных</p>
                                            </div>
                                        ) : (
                                            ncicResults.map((result: any) => (
                                                <Card key={result.id} className="bg-zinc-900/60 border-zinc-700/80 overflow-hidden shadow-2xl">
                                                    {/* Header stripe */}
                                                    <div className="bg-gradient-to-r from-blue-950/60 to-zinc-900/60 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="w-3.5 h-3.5 text-blue-400" />
                                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Запись NCIC — ID #{result.id}</span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${result.isAlive === false ? 'bg-red-900/40 border-red-700/50 text-red-400' : result.status === 'incarcerated' ? 'bg-orange-900/40 border-orange-700/50 text-orange-400' : 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400'}`}>
                                                            {result.isAlive === false ? '● МЕРТВ' : result.status === 'incarcerated' ? 'ЗАКЛЮЧЕН' : 'АКТИВЕН'}
                                                        </span>
                                                    </div>

                                                    <div className="p-5 flex flex-col lg:flex-row gap-6">
                                                        {/* Left: Mug shot + bio */}
                                                        <div className="flex flex-col gap-4 w-full lg:w-48 shrink-0">
                                                            {/* Photo */}
                                                            {result.photoUrl ? (
                                                                <img
                                                                    src={getImageUrl(result.photoUrl)!}
                                                                    alt={`${result.firstName} ${result.lastName}`}
                                                                    className="w-full h-52 object-cover rounded-xl border-2 border-zinc-700 shadow-xl"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-52 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 flex flex-col items-center justify-center gap-2 text-zinc-600">
                                                                    <User className="w-12 h-12" />
                                                                    <span className="text-[10px]">Нет фото</span>
                                                                </div>
                                                            )}

                                                            {/* Bio */}
                                                            <div className="space-y-1.5 text-xs">
                                                                <div className="flex justify-between">
                                                                    <span className="text-zinc-500">Имя</span>
                                                                    <span className="font-bold text-white">{result.firstName} {result.lastName}</span>
                                                                </div>
                                                                {result.nickname && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-zinc-500">Позывной</span>
                                                                        <span className="text-blue-400 italic">"{result.nickname}"</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between">
                                                                    <span className="text-zinc-500">SSN</span>
                                                                    <span className="font-mono text-zinc-300">{result.ssn || '—'}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-zinc-500">Д.Р.</span>
                                                                    <span className="text-zinc-300">{result.birthDate ? new Date(result.birthDate).toLocaleDateString('ru-RU') : '—'}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-zinc-500">Пол</span>
                                                                    <span className="text-zinc-300 capitalize">{result.gender === 'male' ? 'Мужской' : result.gender === 'female' ? 'Женский' : result.gender || '—'}</span>
                                                                </div>
                                                                {result.height && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-zinc-500">Рост</span>
                                                                        <span className="text-zinc-300">{result.height} см</span>
                                                                    </div>
                                                                )}
                                                                {result.weight && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-zinc-500">Вес</span>
                                                                        <span className="text-zinc-300">{result.weight} кг</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {result.description && (
                                                                <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-2">
                                                                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1">Заметки</p>
                                                                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-4">{result.description}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Right: Details */}
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            {/* Licenses */}
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                                                    <Laptop className="w-3 h-3 text-blue-500" /> Лицензии
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    {result.licenses?.length > 0 ? (
                                                                        result.licenses.map((lic: any) => (
                                                                            <div key={lic.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-lg border border-zinc-800/80">
                                                                                <div>
                                                                                    <p className="text-xs text-zinc-200 font-medium">{lic.license?.name}</p>
                                                                                    <p className="text-[10px] text-zinc-600">{lic.license?.type}</p>
                                                                                </div>
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${lic.isActive ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                                                    {lic.isActive ? 'ВАЛИДНА' : 'ОТЗВАНА'}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    ) : <div className="text-xs text-zinc-600 italic py-2">Нет лицензий</div>}
                                                                </div>
                                                            </div>

                                                            {/* Vehicles */}
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                                                    <Car className="w-3 h-3 text-blue-500" /> Транспорт
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {result.vehicles?.length > 0 ? (
                                                                        result.vehicles.map((veh: any) => (
                                                                            <div key={veh.id} className="bg-zinc-800/50 rounded-lg border border-zinc-800/80 overflow-hidden">
                                                                                {veh.imageUrl ? (
                                                                                    <img src={getImageUrl(veh.imageUrl)!} alt={veh.model} className="w-full h-20 object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                                                                                ) : (
                                                                                    <div className="w-full h-14 bg-zinc-800 flex items-center justify-center">
                                                                                        <Car className="w-6 h-6 text-zinc-700" />
                                                                                    </div>
                                                                                )}
                                                                                <div className="p-2 flex items-center justify-between">
                                                                                    <div>
                                                                                        <p className="text-xs font-bold text-white font-mono">{veh.plate}</p>
                                                                                        <p className="text-[10px] text-zinc-400">{veh.model}{veh.color ? ` · ${veh.color}` : ''}</p>
                                                                                    </div>
                                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${veh.status === 'Valid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                                                        {veh.status === 'Valid' ? 'ВАЛИДЕН' : 'НЕВАЛИДЕН'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : <div className="text-xs text-zinc-600 italic py-2">Нет транспорта</div>}
                                                                </div>
                                                            </div>

                                                            {/* Weapons */}
                                                            <div className="space-y-2">
                                                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Оружие
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    {result.weapons?.length > 0 ? (
                                                                        result.weapons.map((wep: any) => (
                                                                            <div key={wep.id} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-lg border border-zinc-800/80">
                                                                                <div>
                                                                                    <p className="text-xs text-zinc-200 font-medium">{wep.model}</p>
                                                                                    <p className="text-[10px] font-mono text-zinc-500">{wep.serial}</p>
                                                                                </div>
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${wep.status === 'Valid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-red-900/30 border-red-700/40 text-red-400'}`}>
                                                                                    {wep.status === 'Valid' ? 'ВАЛИДНО' : 'НЕВАЛИДНО'}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    ) : <div className="text-xs text-zinc-600 italic py-2">Нет оружия</div>}
                                                                </div>
                                                            </div>

                                                            {/* Fines */}
                                                            <div className="space-y-2 col-span-1 md:col-span-3">
                                                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Receipt className="w-3 h-3 text-rose-500" /> Судимости / Штрафы
                                                                    </div>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="ghost" 
                                                                        className="h-5 px-1.5 text-[9px] text-blue-400 hover:text-blue-300 hover:bg-blue-400/5"
                                                                        onClick={() => {
                                                                            setFineForm({ ...fineForm, characterId: result.id });
                                                                            setShowFineModal(true);
                                                                        }}
                                                                    >
                                                                        <PlusSquare className="w-2.5 h-2.5 mr-1" /> ВЫПИСАТЬ ШТРАФ
                                                                    </Button>
                                                                </div>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                    {result.fines?.length > 0 ? (
                                                                        result.fines.map((fine: any) => (
                                                                            <div key={fine.id} className="bg-zinc-800/50 p-2.5 rounded-lg border border-zinc-800/80 flex justify-between items-center group relative overflow-hidden">
                                                                                <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${fine.status === 'paid' ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
                                                                                <div className="pl-1">
                                                                                    <p className="text-xs text-zinc-200 font-medium line-clamp-1">{fine.reason}</p>
                                                                                    <p className="text-[9px] text-zinc-500 uppercase">
                                                                                        {new Date(fine.issuedAt).toLocaleDateString('ru-RU')} • Офицер: {fine.officer ? `${fine.officer.firstName[0]}. ${fine.officer.lastName}` : 'Система'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className={`text-xs font-bold ${fine.status === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                                        ${fine.amount.toLocaleString()}
                                                                                    </p>
                                                                                    <span className={`text-[8px] font-bold px-1 rounded-full border ${fine.status === 'paid' ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-400' : 'bg-rose-900/30 border-red-700/40 text-rose-400'}`}>
                                                                                        {fine.status === 'paid' ? 'ОПЛАЧЕН' : 'НЕ ОПЛАЧЕН'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : <div className="text-xs text-zinc-600 italic py-2">Чистая история</div>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "Карта" && isSupervisor && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="flex-1 relative min-h-[500px] rounded-lg overflow-hidden border border-zinc-700">
                                        <LiveMap />
                                    </div>
                                </div>
                            )}

                            {activeTab === "Ордера" && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Ордера</h3>
                                            <p className="text-xs text-zinc-500">Активные ордера на арест и обыск</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => fetchWarrants()}
                                                className="bg-zinc-800/50 border-zinc-700"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoadingWarrants ? 'animate-spin' : ''}`} />
                                                Обновить
                                            </Button>
                                            <Button 
                                                size="sm"
                                                onClick={() => setShowWarrantCreateModal(true)}
                                                className="bg-blue-600 hover:bg-blue-500"
                                                disabled={!onDuty}
                                            >
                                                <PlusSquare className="w-3.5 h-3.5 mr-2" />
                                                Создать ордер
                                            </Button>
                                        </div>
                                    </div>

                                    {warrants.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-700 rounded-xl bg-zinc-900/20">
                                            <div className="text-center">
                                                <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                                <p className="text-zinc-500 font-medium">Ордеров не найдено</p>
                                                <p className="text-xs text-zinc-600 mt-1">Активные ордера будут отображаться здесь</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-auto space-y-3">
                                            {warrants.map((warrant: any) => (
                                                <div key={warrant.id} className="p-4 bg-zinc-900/60 border border-zinc-700/80 rounded-xl">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                                warrant.type === 'arrest' ? 'bg-red-500/10 border border-red-500/30' :
                                                                warrant.type === 'search' ? 'bg-amber-500/10 border border-amber-500/30' :
                                                                'bg-blue-500/10 border border-blue-500/30'
                                                            }`}>
                                                                <Shield className={`w-5 h-5 ${
                                                                    warrant.type === 'arrest' ? 'text-red-400' :
                                                                    warrant.type === 'search' ? 'text-amber-400' :
                                                                    'text-blue-400'
                                                                }`} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                        warrant.status === 'active' ? 'bg-red-900/30 border-red-700/50 text-red-400' :
                                                                        warrant.status === 'executed' ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400' :
                                                                        warrant.status === 'cancelled' ? 'bg-zinc-700/50 border-zinc-600/50 text-zinc-400' :
                                                                        'bg-yellow-900/30 border-yellow-700/50 text-yellow-400'
                                                                    }`}>
                                                                        {warrant.status === 'active' ? 'АКТИВЕН' :
                                                                         warrant.status === 'executed' ? 'ВЫПОЛНЕН' :
                                                                         warrant.status === 'cancelled' ? 'ОТМЕНЕН' :
                                                                         'ОЖИДАНИЕ'}
                                                                    </span>
                                                                    <span className="text-[10px] text-zinc-600 uppercase">
                                                                        {warrant.type === 'arrest' ? 'ОРДЕР НА АРЕСТ' :
                                                                         warrant.type === 'search' ? 'ОРДЕР НА ОБЫСК' :
                                                                         warrant.type === 'bench' ? 'СУДЕБНЫЙ ОРДЕР' :
                                                                         'ПРОБАЦИЯ'}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-base font-bold text-white">{warrant.title}</h4>
                                                                <p className="text-xs text-zinc-400 mt-1">{warrant.description}</p>
                                                                <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
                                                                    <span>ID персонажа: {warrant.characterId}</span>
                                                                    <span>Выдан: {warrant.issuerName}</span>
                                                                    {warrant.expiresAt && (
                                                                        <span>Истекает: {new Date(warrant.expiresAt).toLocaleDateString('ru-RU')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {warrant.status === 'active' && (
                                                                <>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline"
                                                                        onClick={() => handleExecuteWarrant(warrant.id)}
                                                                        className="bg-emerald-900/20 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30"
                                                                    >
                                                                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                                        Выполнить
                                                                    </Button>
                                                                    <Button 
                                                                        size="sm" 
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            const reason = prompt('Причина отмены ордера:');
                                                                            if (reason) handleCancelWarrant(warrant.id, reason);
                                                                        }}
                                                                        className="bg-red-900/20 border-red-700/50 text-red-400 hover:bg-red-900/30"
                                                                    >
                                                                        <X className="w-3.5 h-3.5 mr-1" />
                                                                        Отменить
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {warrant.justification && (
                                                        <div className="mt-3 pt-3 border-t border-zinc-800">
                                                            <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Обоснование:</p>
                                                            <p className="text-xs text-zinc-400 italic">{warrant.justification}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab !== "Статус юнитов" && activeTab !== "NCIC" && activeTab !== "Карта" && activeTab !== "Ордера" && (
                                <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
                                    <div className="text-center">
                                        <Laptop className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-zinc-400">Модуль {activeTab} оффлайн</h3>
                                        <p className="text-xs text-zinc-600 mt-1">Этот тактический модуль запланирован для будущего развертывания.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === "Карта" && !isSupervisor && (
                                <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
                                    <div className="text-center">
                                        <Map className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-zinc-400">Доступ ограничен</h3>
                                        <p className="text-xs text-zinc-600 mt-1">Просмотр карты доступен только для супервайзеров.</p>
                                    </div>
                                </div>
                            )}

                            <div className="w-56 space-y-3 shrink-0">
                                <div className="rounded-lg border border-zinc-700 p-3 space-y-2">
                                    <span className="text-xs font-medium text-zinc-400">Быстрые действия</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!onDuty}
                                        className="w-full justify-start bg-zinc-800/50 border-zinc-700 disabled:opacity-50"
                                        onClick={() => setShow2hrModal(true)}
                                    >
                                        2HR
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!onDuty}
                                        className="w-full justify-start bg-zinc-800/50 border-zinc-700 disabled:opacity-50"
                                        onClick={() => setShowPlateCheckModal(true)}
                                    >
                                        Номер
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!onDuty}
                                        className="w-full justify-start bg-zinc-800/50 border-zinc-700 disabled:opacity-50"
                                        onClick={() => setShowDotModal(true)}
                                    >
                                        DOT
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!onDuty}
                                        className="w-full justify-start bg-zinc-800/50 border-zinc-700 disabled:opacity-50"
                                        onClick={() => setShowBoloModal(true)}
                                    >
                                        BOLO
                                    </Button>
                                </div>

                                <div className="rounded-lg border border-zinc-700 p-3">
                                    <span className="text-xs font-medium text-zinc-400 block mb-2">Мой статус</span>
                                    {onDuty ? (
                                        <div className="space-y-2">
                                            <div className={`text-center py-2 rounded-lg font-bold text-sm ${
                                                currentUnit?.status === 'Available' ? 'bg-green-900/30 text-green-400 border border-green-700/50' :
                                                currentUnit?.status === 'Busy' ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50' :
                                                currentUnit?.status === 'Enroute' ? 'bg-blue-900/30 text-blue-400 border border-blue-700/50' :
                                                'bg-zinc-800/50 text-zinc-400 border border-zinc-700'
                                            }`}>
                                                {currentUnit?.status === 'Available' ? 'ДОСТУПЕН' :
                                                 currentUnit?.status === 'Busy' ? 'ЗАНЯТ' :
                                                 currentUnit?.status === 'Enroute' ? 'В ПУТИ' :
                                                 currentUnit?.status === 'On Scene' ? 'НА ВЫЗОВЕ' :
                                                 'НЕИЗВЕСТНО'}
                                            </div>
                                            <div className="space-y-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus("Available")}
                                                    className={`w-full bg-green-900/30 border-green-700/50 hover:bg-green-900/50 ${currentUnit?.status === 'Available' ? 'ring-2 ring-green-500 text-green-300' : 'text-green-400'}`}
                                                >
                                                    <Car className="w-4 h-4 mr-2" />
                                                    Доступен
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus("Busy")}
                                                    className={`w-full bg-yellow-900/30 border-yellow-700/50 hover:bg-yellow-900/50 ${currentUnit?.status === 'Busy' ? 'ring-2 ring-yellow-500 text-yellow-300' : 'text-yellow-400'}`}
                                                >
                                                    <Siren className="w-4 h-4 mr-2" />
                                                    Занят
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus("Enroute")}
                                                    className={`w-full bg-blue-900/30 border-blue-700/50 hover:bg-blue-900/50 ${currentUnit?.status === 'Enroute' ? 'ring-2 ring-blue-500 text-blue-300' : 'text-blue-400'}`}
                                                >
                                                    <Footprints className="w-4 h-4 mr-2" />
                                                    В пути
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDutyEnd}
                                                    className="w-full bg-zinc-900/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50"
                                                >
                                                    <LogOut className="w-4 h-4 mr-2" />
                                                    Вне смены
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowDutyModal(true)}
                                            className="w-full bg-green-900/30 border-green-700/50 text-green-400 hover:bg-green-900/50"
                                        >
                                            <Car className="w-4 h-4 mr-2" />
                                            Выйти на смену
                                        </Button>
                                    )}
                                </div>


                                <div className="rounded-lg border border-zinc-700 p-3">
                                    <span className="text-xs font-medium text-zinc-400 block mb-2">Заметки</span>
                                    <textarea
                                        className="w-full h-32 bg-zinc-800/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200 resize-none"
                                        placeholder="Введите заметки..."
                                        value={notes}
                                        onChange={handleNotesChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Duty Selection Modal */}
            <DutyModal
                isOpen={showDutyModal}
                onClose={() => setShowDutyModal(false)}
                onStart={handleDutyStart}
                characters={characters}
                isLoading={isSubmitting}
                callSign={callSign}
                setCallSign={setCallSign}
                subdivision={subdivision}
                setSubdivision={setSubdivision}
                selectedCharacter={selectedCharacter}
                setSelectedCharacter={setSelectedCharacter}
                type="police"
            />
            {/* Call Details Modal */}
            <CallDetailsModal
                call={selectedCallForNotes}
                isOpen={!!selectedCallForNotes}
                onClose={() => setSelectedCallForNotes(null)}
                onAddNote={handleCallNoteSubmit}
                onAttachUnit={handleAttachToCall}
                onDetachUnit={handleDetachFromCall}
                onSetMainUnit={handleSetMainUnit}
                onCloseCall={handleCloseCall}
                currentUnit={currentUnit ? { callId: currentUnit.callId } : undefined}
                onDuty={onDuty}
                canManageUnits={canManageUnits}
                groupUnits={groupUnits}
                getImageUrl={getImageUrl}
            />

            {/* Supervisor Unit Actions Modal */}
            {selectedUnit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedUnit(null)}>
                    <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-[400px] max-w-[90vw] shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" />
                                {selectedUnit.unit}
                            </h3>
                            <button onClick={() => setSelectedUnit(null)} className="text-zinc-500 hover:text-zinc-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-zinc-800/50 p-2 rounded">
                                    <p className="text-[10px] text-zinc-500 uppercase">Офицер</p>
                                    <p className="text-zinc-200">{selectedUnit.officer}</p>
                                </div>
                                <div className="bg-zinc-800/50 p-2 rounded">
                                    <p className="text-[10px] text-zinc-500 uppercase">Статус</p>
                                    <p className={`font-medium ${selectedUnit.status === "Available" ? "text-green-400" : selectedUnit.status === "Busy" ? "text-yellow-400" : selectedUnit.status === "Enroute" ? "text-blue-400" : selectedUnit.status === "On Scene" ? "text-emerald-400" : selectedUnit.status === "Dispatched" ? "text-purple-400" : selectedUnit.status === "Resolving" ? "text-indigo-400" : "text-zinc-400"}`}>
                                        {selectedUnit.status === "Available" ? "ДОСТУПЕН" : selectedUnit.status === "Busy" ? "ЗАНЯТ" : selectedUnit.status === "Enroute" ? "В ПУТИ" : selectedUnit.status === "On Scene" ? "НА МЕСТЕ" : selectedUnit.status === "Dispatched" ? "НАЗНАЧЕН" : selectedUnit.status === "Resolving" ? "ОБРАБАТЫВАЕТСЯ" : selectedUnit.status}
                                    </p>
                                </div>
                                <div className="bg-zinc-800/50 p-2 rounded">
                                    <p className="text-[10px] text-zinc-500 uppercase">Вызов</p>
                                    <p className="text-zinc-200">{selectedUnit.call}</p>
                                </div>
                                <div className="bg-zinc-800/50 p-2 rounded">
                                    <p className="text-[10px] text-zinc-500 uppercase">Локация</p>
                                    <p className="text-zinc-200">{selectedUnit.location}</p>
                                </div>
                            </div>

                            {/* Only supervisors/dispatchers can send messages */}
                            {canManageUnits && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-zinc-400">Отправить сообщение</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Введите сообщение..."
                                            value={unitMessage}
                                            onChange={(e) => setUnitMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendUnitMessage()}
                                            className="bg-zinc-800/50 border-zinc-700"
                                        />
                                        <Button size="sm" onClick={handleSendUnitMessage} disabled={!unitMessage.trim()}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Only supervisors/dispatchers can unassign from call */}
                            {canManageUnits && selectedUnit.callId && (
                                <Button
                                    variant="outline"
                                    className="w-full border-red-800 text-red-400 hover:bg-red-900/20"
                                    onClick={handleUnassignUnit}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Снять с вызова
                                </Button>
                            )}

                            {!selectedUnit.partnerUserId && !isInPair && (
                                <>
                                    <Button variant="outline" className="w-full border-blue-800 text-blue-400 hover:bg-blue-900/20" onClick={handleInviteToPair}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Пригласить в пару
                                    </Button>
                                </>
                            )}

                            {isInPair && (
                                <Button variant="outline" className="w-full border-orange-800 text-orange-400 hover:bg-orange-900/20" onClick={handleLeavePair}>
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Покинуть пару
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Issue Fine Modal */}
            {showFineModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-rose-500" />
                                Выписать штраф
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                <p className="text-xs text-rose-500/80 leading-relaxed">
                                    Внимание: Все штрафы записываются в систему NCIC и не могут быть изменены после выдачи.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Причина нарушения</Label>
                                    <Input
                                        value={fineForm.reason}
                                        onChange={(e) => setFineForm({ ...fineForm, reason: e.target.value })}
                                        placeholder="Speeding, Reckless Driving, etc."
                                        className="bg-zinc-900/50 border-zinc-800 h-10"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Сумма штрафа ($)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <Input
                                            type="number"
                                            value={fineForm.amount}
                                            onChange={(e) => setFineForm({ ...fineForm, amount: e.target.value })}
                                            placeholder="250"
                                            className="bg-zinc-900/50 border-zinc-800 h-10 pl-9 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-900">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setShowFineModal(false)} 
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={handleIssueFine}
                                    disabled={isSubmitting || !fineForm.reason || !fineForm.amount}
                                    className="flex-1 bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/20"
                                >
                                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <Receipt className="w-4 h-4 mr-2" />}
                                    Выписать штраф
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Pair Invite Modal */}
            {showPairInviteModal && pairInviteData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowPairInviteModal(false); setPairInviteData(null); }}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                                <UserPlus className="w-8 h-8 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Приглашение в пару</h2>
                                <p className="text-zinc-400 mt-2">{pairInviteData.fromCallSign} приглашает вас в патрульную пару</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => { setShowPairInviteModal(false); setPairInviteData(null); }}>
                                    Отмена
                                </Button>
                                <Button className="flex-1 bg-green-600 hover:bg-green-500" onClick={handleAcceptPairInvite}>
                                    Принять
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Pair Modal - Drag and Drop */}
            {showCreatePairModal && createPairData && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowCreatePairModal(false); setCreatePairData(null); }}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                                <Users className="w-8 h-8 text-purple-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Создать патрульную пару</h2>
                                <p className="text-zinc-400 mt-2">Объедините двух юнитов в пару</p>
                            </div>
                            
                            <div className="flex items-center justify-center gap-4 py-4">
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <User className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <p className="text-sm font-medium text-white">{createPairData.unit1?.officer}</p>
                                    <p className="text-xs text-zinc-500">{createPairData.unit1?.unit}</p>
                                </div>
                                <div className="text-zinc-500">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <User className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <p className="text-sm font-medium text-white">{createPairData.unit2?.officer}</p>
                                    <p className="text-xs text-zinc-500">{createPairData.unit2?.unit}</p>
                                </div>
                            </div>

                            <div className="text-left">
                                <label className="text-xs text-zinc-400 uppercase tracking-wide">Название пары</label>
                                <Input 
                                    value={createPairData.pairName}
                                    onChange={(e) => setCreatePairData({ ...createPairData, pairName: e.target.value })}
                                    placeholder="Например: Alpha-1"
                                    className="mt-1 bg-zinc-800 border-zinc-700"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-2">
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

            {/* Create Warrant Modal */}
            {showWarrantCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <Card className="w-full max-w-lg bg-zinc-950 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-500" />
                                Создать ордер
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                <p className="text-xs text-red-500/80 leading-relaxed">
                                    Внимание: Ордера создаются в системе NCIC и доступны всем правоохранительным органам.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">ID персонажа *</Label>
                                    <Input
                                        type="number"
                                        value={warrantForm.characterId || ''}
                                        onChange={(e) => setWarrantForm({ ...warrantForm, characterId: e.target.value ? parseInt(e.target.value) : null })}
                                        placeholder="ID персонажа из NCIC"
                                        className="bg-zinc-900/50 border-zinc-800 h-10"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Тип ордера</Label>
                                    <select
                                        value={warrantForm.type}
                                        onChange={(e) => setWarrantForm({ ...warrantForm, type: e.target.value })}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200"
                                    >
                                        <option value="arrest">Ордер на арест (Arrest Warrant)</option>
                                        <option value="search">Ордер на обыск (Search Warrant)</option>
                                        <option value="bench">Судебный ордер (Bench Warrant)</option>
                                        <option value="probation">Ордер на пробацию (Probation Warrant)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Название *</Label>
                                    <Input
                                        value={warrantForm.title}
                                        onChange={(e) => setWarrantForm({ ...warrantForm, title: e.target.value })}
                                        placeholder="Например: Арест за кражу"
                                        className="bg-zinc-900/50 border-zinc-800 h-10"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Описание *</Label>
                                    <textarea
                                        value={warrantForm.description}
                                        onChange={(e) => setWarrantForm({ ...warrantForm, description: e.target.value })}
                                        placeholder="Описание преступления или основания для ордера..."
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 h-20 resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Обоснование *</Label>
                                    <textarea
                                        value={warrantForm.justification}
                                        onChange={(e) => setWarrantForm({ ...warrantForm, justification: e.target.value })}
                                        placeholder="Почему этот ордер необходим (обязательно для суда)..."
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 h-20 resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Срок действия (дней)</Label>
                                    <Input
                                        type="number"
                                        value={warrantForm.expiresInDays}
                                        onChange={(e) => setWarrantForm({ ...warrantForm, expiresInDays: parseInt(e.target.value) || 30 })}
                                        className="bg-zinc-900/50 border-zinc-800 h-10 w-32"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-900">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setShowWarrantCreateModal(false)} 
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={handleCreateWarrant}
                                    disabled={isSubmitting || !warrantForm.characterId || !warrantForm.title || !warrantForm.description || !warrantForm.justification}
                                    className="flex-1 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                                >
                                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                                    Создать ордер
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* BOLO Modal */}
            {showBoloModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Создать BOLO
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Тип</Label>
                                <select
                                    value={boloForm.type}
                                    onChange={(e) => setBoloForm({ ...boloForm, type: e.target.value })}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200"
                                >
                                    <option value="vehicle">Транспортное средство</option>
                                    <option value="person">Личность</option>
                                    <option value="other">Другое</option>
                                </select>
                            </div>

                            {boloForm.type === 'vehicle' && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Номерной знак</Label>
                                        <Input
                                            value={boloForm.plate}
                                            onChange={(e) => setBoloForm({ ...boloForm, plate: e.target.value })}
                                            placeholder="89ABC123"
                                            className="bg-zinc-900/50 border-zinc-800 h-10"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Цвет</Label>
                                        <Input
                                            value={boloForm.color}
                                            onChange={(e) => setBoloForm({ ...boloForm, color: e.target.value })}
                                            placeholder="Черный"
                                            className="bg-zinc-900/50 border-zinc-800 h-10"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Модель</Label>
                                        <Input
                                            value={boloForm.model}
                                            onChange={(e) => setBoloForm({ ...boloForm, model: e.target.value })}
                                            placeholder="Toyota Camry"
                                            className="bg-zinc-900/50 border-zinc-800 h-10"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Описание *</Label>
                                <textarea
                                    value={boloForm.description}
                                    onChange={(e) => setBoloForm({ ...boloForm, description: e.target.value })}
                                    placeholder="Описание объекта или причины розыска..."
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 h-24 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-900">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowBoloModal(false)}
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={handleBoloSubmit}
                                    disabled={isSubmitting || !boloForm.description}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-900/20"
                                >
                                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                                    Создать BOLO
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Plate Check Modal */}
            {showPlateCheckModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <Card className="w-full max-w-sm bg-zinc-950 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Car className="w-5 h-5 text-blue-500" />
                                Проверка номера
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Номерной знак *</Label>
                                <Input
                                    value={plateCheckForm.plate}
                                    onChange={(e) => setPlateCheckForm({ ...plateCheckForm, plate: e.target.value })}
                                    placeholder="89ABC123"
                                    className="bg-zinc-900/50 border-zinc-800 h-10 uppercase"
                                    onKeyDown={(e) => e.key === 'Enter' && handlePlateCheck()}
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-900">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowPlateCheckModal(false)}
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={handlePlateCheck}
                                    disabled={!plateCheckForm.plate}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                                >
                                    <Search className="w-4 h-4 mr-2" />
                                    Найти
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* DOT Call Modal */}
            {showDotModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Ambulance className="w-5 h-5 text-orange-500" />
                                Вызов DOT
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Локация</Label>
                                <Input
                                    value={dotForm.location}
                                    onChange={(e) => setDotForm({ ...dotForm, location: e.target.value })}
                                    placeholder="Место происшествия"
                                    className="bg-zinc-900/50 border-zinc-800 h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Описание</Label>
                                <textarea
                                    value={dotForm.description}
                                    onChange={(e) => setDotForm({ ...dotForm, description: e.target.value })}
                                    placeholder="Описание ситуации..."
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 h-24 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-900">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowDotModal(false)}
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={handleDotCall}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-900/20"
                                >
                                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                    Отправить
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 2HR Call Modal */}
            {show2hrModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-red-500" />
                                Вызов 2HR
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                <p className="text-xs text-red-500/80 leading-relaxed">
                                    Внимание: 2HR - это вызов с высоким приоритетом для экстренных ситуаций.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Локация</Label>
                                <Input
                                    value={twoHrForm.location}
                                    onChange={(e) => setTwoHrForm({ ...twoHrForm, location: e.target.value })}
                                    placeholder="Место происшествия"
                                    className="bg-zinc-900/50 border-zinc-800 h-10"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Описание</Label>
                                <textarea
                                    value={twoHrForm.description}
                                    onChange={(e) => setTwoHrForm({ ...twoHrForm, description: e.target.value })}
                                    placeholder="Описание ситуации..."
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 h-24 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-900">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShow2hrModal(false)}
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={handle2hrCall}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                                >
                                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                    Отправить
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Vehicle Info Modal */}
            {showVehicleInfoModal && vehicleInfo && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
                    <Card className="w-full max-w-lg bg-zinc-950 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Car className="w-5 h-5 text-blue-500" />
                                Информация о транспортном средстве
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {vehicleInfo.vehicles && vehicleInfo.vehicles.length > 0 && (
                                <div className="space-y-3">
                                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                        <h3 className="text-sm font-semibold text-blue-400 mb-3">Транспортное средство</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Номер:</span>
                                                <span className="text-zinc-200 font-mono">{vehicleInfo.vehicles[0].plate}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Модель:</span>
                                                <span className="text-zinc-200">{vehicleInfo.vehicles[0].model || 'Не указано'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Цвет:</span>
                                                <span className="text-zinc-200">{vehicleInfo.vehicles[0].color || 'Не указано'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-zinc-500">Статус:</span>
                                                <span className={`font-medium ${vehicleInfo.vehicles[0].status === 'stolen' ? 'text-red-400' : 'text-green-400'}`}>
                                                    {vehicleInfo.vehicles[0].status === 'stolen' ? 'УГОНАНО' : 'АКТИВНО'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Владелец</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Имя:</span>
                                        <span className="text-zinc-200">{vehicleInfo.firstName || 'Не указано'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Фамилия:</span>
                                        <span className="text-zinc-200">{vehicleInfo.lastName || 'Не указано'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">SSN:</span>
                                        <span className="text-zinc-200 font-mono">{vehicleInfo.ssn || 'Не указано'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-500">Дата рождения:</span>
                                        <span className="text-zinc-200">{vehicleInfo.dateOfBirth ? new Date(vehicleInfo.dateOfBirth).toLocaleDateString('ru-RU') : 'Не указано'}</span>
                                    </div>
                                </div>
                            </div>

                            {vehicleInfo.firstName && vehicleInfo.lastName && (
                                <Button
                                    onClick={() => handleSearchOwner(vehicleInfo.firstName, vehicleInfo.lastName)}
                                    className="w-full bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                                >
                                    <Search className="w-4 h-4 mr-2" />
                                    Поиск владельца в NCIC
                                </Button>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-zinc-900">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowVehicleInfoModal(false)}
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Закрыть
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}