"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Flame, Truck, Ambulance, Heart, Activity, Stethoscope, Building, Siren, Search, MapPin, Phone, AlertTriangle, Users, FileText, RefreshCw, X, Send, User, LogOut, Loader2, Plus, CheckCircle, Clock, Map, Monitor, Navigation } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const LiveMap = dynamic(() => import('@/components/Map/LiveMap'), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
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
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useSound } from '@/hooks/useSound';

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
    unitType?: 'ems' | 'fire';
}

interface Patient {
    id: string;
    firstName: string;
    lastName: string;
    ssn?: string;
    birthDate?: string;
    bloodType?: string;
    allergies?: string[];
    medicalHistory?: string[];
    medications?: string[];
    photoUrl?: string;
    isAlive: boolean;
    status?: string;
}

interface Call {
    id: number;
    callerName: string;
    phoneNumber?: string;
    location: string;
    description: string;
    callType: string;
    priority: string;
    status: string;
    units?: any[];
    mainUnitId?: number;
    notes?: any[];
}

const EMS_TOP_ACTIONS = [
    { label: "Статус юнитов", icon: Users },
    { label: "Поиск пациентов", icon: Search },
    { label: "Вызовы", icon: Phone },
    { label: "Тriage", icon: Activity },
    { label: "Карта", icon: Map },
];

const EMS_CALL_TYPES = [
    "Пожар в здании",
    "Пожар авто",
    "Медицинский вызов",
    "Остановка сердца",
    "Травма/ДТП",
    "Опасные материалы",
    "Спасательные работы",
    "Ложный вызов",
];

const EMS_UNIT_STATUSES = [
    { value: "Available", label: "Доступен", color: "green" },
    { value: "Enroute", label: "В пути на вызов", color: "blue" },
    { value: "On Scene", label: "На месте", color: "emerald" },
    { value: "Transporting", label: "Транспортировка в больницу", color: "purple" },
    { value: "Busy", label: "Занят", color: "amber" },
    { value: "Mayday", label: "Паника", color: "red" },
];

const PRIORITY_LEVELS = [
    { value: "echo", label: "Красный (Эхо)", color: "red" },
    { value: "delta", label: "Оранжевый (Дельта)", color: "orange" },
    { value: "charlie", label: "Желтый (Чарли)", color: "yellow" },
    { value: "bravo", label: "Синий (Браво)", color: "blue" },
    { value: "alpha", label: "Серый (Альфа)", color: "gray" },
];

const TRIAGE_ZONES = [
    { id: "red", label: "КРАСНЫЙ", color: "bg-red-900/30 border-red-700", description: "Немедленная помощь" },
    { id: "yellow", label: "ЖЕЛТЫЙ", color: "bg-yellow-900/30 border-yellow-700", description: "Вскоре" },
    { id: "green", label: "ЗЕЛЕНЫЙ", color: "bg-green-900/30 border-green-700", description: "Минимальная помощь" },
    { id: "black", label: "ЧЕРНЫЙ", color: "bg-zinc-900/30 border-zinc-700", description: "Безнадежен" },
];

export default function EMSPage() {
    return (
        <ProtectedRoute allowedRoles={["ems", "fire", "admin"]}>
            <EMSPageContent />
        </ProtectedRoute>
    );
}

function EMSPageContent() {
    const { user } = useAuth();
    const { socket, isConnected } = useSocket();
    const queryClient = useQueryClient();

    // Tanstack Query для units
    const { data: units = [], isLoading: unitsLoading, refetch: refetchUnits } = useQuery({
        queryKey: ['units'],
        queryFn: async () => {
            const res = await api.get('/api/units');
            const data = Array.isArray(res.data) ? res.data : [];
            // Filter for EMS/Fire units only
            return data.filter((u: any) =>
                u.departmentMember?.department?.type === 'ems' || u.departmentMember?.department?.type === 'fire'
            );
        },
        refetchInterval: false,
    });

    // Tanstack Query для calls
    const { data: calls = [], isLoading: callsLoading, refetch: refetchCalls } = useQuery({
        queryKey: ['calls911', 'active'],
        queryFn: async () => {
            const res = await api.get('/api/calls911/active');
            const data = Array.isArray(res.data) ? res.data : (res.data.calls || []);
            // Show all calls (EMS can see all calls)
            return data;
        },
        refetchInterval: false,
    });

    // Tanstack Query для characters
    const { data: characters = [], isLoading: charactersLoading, refetch: refetchCharacters } = useQuery({
        queryKey: ['characters'],
        queryFn: async () => {
            const res = await api.get('/api/characters');
            const data = Array.isArray(res.data) ? res.data : [];
            // Filter for EMS/Fire characters
            return data.filter((c: Character) =>
                c.departmentMembers?.some(
                    (m) => m.isActive && m.department?.type === "ems" || m.department?.type === "fire",
                ),
            );
        },
        refetchInterval: false,
    });

    const [patients, setPatients] = useState<Patient[]>([]);
    const isLoading = unitsLoading || callsLoading || charactersLoading;
    const [activeTab, setActiveTab] = useState<string>("Статус юнитов");
    const [notes, setNotes] = useState<string>("");
    const [showDutyModal, setShowDutyModal] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [onDuty, setOnDuty] = useState(false);
    const [currentUnit, setCurrentUnit] = useState<Unit | null>(null);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [newCallNoteText, setNewCallNoteText] = useState("");
    const [callSign, setCallSign] = useState("");
    const [subdivision, setSubdivision] = useState("");
    const [unitType, setUnitType] = useState<"ems" | "fire">("ems");
    const [currentMember, setCurrentMember] = useState<DepartmentMember | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [unitMessage, setUnitMessage] = useState("");
    const [patientFirstName, setPatientFirstName] = useState("");
    const [patientLastName, setPatientLastName] = useState("");
    const [patientSSN, setPatientSSN] = useState("");
    const [isSearchingPatients, setIsSearchingPatients] = useState(false);
    const [triagePatients, setTriagePatients] = useState<Record<string, Patient[]>>({
        red: [],
        yellow: [],
        green: [],
        black: [],
    });
    const [showMaydayModal, setShowMaydayModal] = useState(false);
    const [maydayReason, setMaydayReason] = useState("");

    const isSupervisor =
        currentMember?.rank?.isSupervisor ||
        user?.roles?.some(
            (r) => r.toLowerCase() === "admin" || r.toLowerCase() === "supervisor",
        ) ||
        false;
    const canManageUnits = isSupervisor || false;

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith("http")) return url;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        return `${apiUrl}${url}`;
    };

    const { playSound } = useSound();

    useEffect(() => {
        refetchUnits();
        refetchCalls();
        refetchCharacters();
        checkActiveUnit();

        const savedTab = localStorage.getItem("emsActiveTab");
        if (savedTab) setActiveTab(savedTab);

        const savedNotes = localStorage.getItem("emsNotes");
        if (savedNotes) setNotes(savedNotes);

        // EMS Socket Events
        socket.on('new_911_call', (newCall: any) => {
            console.log('[SOCKET] new_911_call received:', newCall);
            // Add all calls (EMS can see all calls)
            queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => [newCall, ...prev]);
            playSound('new_call_911').then(() => console.log('[EMS] Sound played')).catch(e => console.error('[EMS] Sound error:', e));
        });

        socket.on('update_911_call', (updatedCall: any) => {
            console.log('[SOCKET] update_911_call received:', updatedCall);
            // Update all calls (EMS can see all calls)
            queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
            setSelectedCall((prev) => {
                if (prev?.id === updatedCall.id) {
                    return updatedCall;
                }
                return prev;
            });
        });

        socket.on('delete_911_call', ({ id }: { id: number }) => {
            queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.filter(c => c.id !== id));
            setSelectedCall((prev: any) => (prev?.id === id ? null : prev));
        });

        socket.on('new_911_note', ({ callId, note }: { callId: number; note: any }) => {
            console.log('[SOCKET] new_911_note received:', { callId, note });
            queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.map(c => {
                if (c.id === callId) {
                    return { ...c, notes: [...(c.notes || []), note] };
                }
                return c;
            }));
            setSelectedCall((prev: any) => {
                if (prev?.id === callId) {
                    return { ...prev, notes: [...(prev.notes || []), note] };
                }
                return prev;
            });
        });

        socket.on('unit_attached_to_call', (data: { userId: number; callId: number; unitCallSign: string; isLeadUnit: boolean; call: any }) => {
            console.log('[SOCKET] unit_attached_to_call:', data);
            playSound('notification');
            toast({ title: data.isLeadUnit ? 'Новый главный юнит' : 'Юнит прикреплен', description: `${data.unitCallSign} прикреплен к вызову #${data.callId}${data.isLeadUnit ? ' (ГЛАВНЫЙ)' : ''}` });

            // Update calls immediately without full refetch
            queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.map(c => {
                if (c.id === data.callId) {
                    return {
                        ...c,
                        status: data.call.status,
                        units: data.call.units || c.units,
                        mainUnitId: data.call.mainUnitId || c.mainUnitId
                    };
                }
                return c;
            }));

            // Update selected call if it's the one being modified
            setSelectedCall((prev: any) => {
                if (prev?.id === data.callId) {
                    return {
                        ...prev,
                        status: data.call.status,
                        units: data.call.units || prev.units,
                        mainUnitId: data.call.mainUnitId || prev.mainUnitId
                    };
                }
                return prev;
            });
        });

        socket.on('unit_detached_from_call', (data: { userId: number; callId: number; unitCallSign: string; newMainUnitId: number | null; call: any }) => {
            console.log('[SOCKET] unit_detached_from_call:', data);
            playSound('notification');
            toast({ title: 'Юнит откреплен', description: `${data.unitCallSign} откреплен от вызова #${data.callId}` });

            // Update calls immediately without full refetch
            queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.map(c => {
                if (c.id === data.callId) {
                    return {
                        ...c,
                        status: data.call?.status || c.status,
                        mainUnitId: data.call?.mainUnitId,
                        units: data.call?.units || c.units
                    };
                }
                return c;
            }));

            // Update selected call if it's the one being modified
            setSelectedCall((prev: any) => {
                if (prev?.id === data.callId) {
                    return {
                        ...prev,
                        status: data.call?.status || prev.status,
                        units: data.call?.units || prev.units,
                        mainUnitId: data.newMainUnitId || undefined
                    };
                }
                return prev;
            });
        });

        socket.on("ems_unit_status_changed", (data: { userId: number; status: string; unitCallSign: string }) => {
            queryClient.setQueryData(['units'], (prev: Unit[] = []) => prev.map(u => u.userId === data.userId ? { ...u, status: data.status } : u));
            setCurrentUnit((prev) => {
                if (prev?.userId === data.userId) {
                    return { ...prev, status: data.status };
                }
                return prev;
            });
        });

        socket.on("ems_mayday", (data: { unitCallSign: string; reason: string }) => {
            playSound("notification");
            toast({
                title: "Паника",
                description: `${data.unitCallSign}: ${data.reason}`,
                variant: "destructive",
                duration: 10000,
            });
        });

        socket.on("ems_unit_attached", (data: { userId: number; callId: number; unitCallSign: string }) => {
            playSound("notification");
            toast({
                title: "Юнит прикреплен",
                description: `${data.unitCallSign} прикреплен к вызову #${data.callId}`,
            });
            refetchUnits(); refetchCalls(); refetchCharacters();
        });

        socket.on("ems_unit_detached", (data: { userId: number; callId: number; unitCallSign: string }) => {
            playSound("notification");
            toast({
                title: "Юнит откреплен",
                description: `${data.unitCallSign} откреплен от вызова #${data.callId}`,
            });
            refetchUnits(); refetchCalls(); refetchCharacters();
        });

        socket.on("ems_patient_updated", (patient: Patient) => {
            setPatients((prev) =>
                prev.map((p) => (p.id === patient.id ? patient : p)),
            );
            setSelectedPatient((prev) => {
                if (prev?.id === patient.id) {
                    return patient;
                }
                return prev;
            });
        });

        return () => {
            socket.off('new_911_call');
            socket.off('update_911_call');
            socket.off('delete_911_call');
            socket.off('unit_attached_to_call');
            socket.off('unit_detached_from_call');
            socket.off('ems_unit_status_changed');
            socket.off('ems_mayday');
            socket.off('ems_unit_attached');
            socket.off('ems_unit_detached');
            socket.off('ems_patient_updated');
        };
    }, [selectedCall?.id]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        localStorage.setItem("emsActiveTab", tab);
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNotes(val);
        localStorage.setItem("emsNotes", val);
    };

    const checkActiveUnit = async () => {
        try {
            const res = await api.get('/api/units/me');
            const unitData = res.data;
            if (unitData) {
                setCurrentUnit(unitData);
                setSelectedCharacter(unitData.characterId);
                setCurrentMember(unitData.departmentMember);
                setCallSign(unitData.callSign || "");
                setSubdivision(unitData.subdivision || "");
                setUnitType(unitData.unitType || 'ems');
                setOnDuty(true);
            }
        } catch (err) {
            console.error("Failed to check active unit", err);
        }
    };

    const handleDutyStart = async () => {
        setIsSubmitting(true);
        try {
            const char = characters.find(
                (c) => String(c.id) === String(selectedCharacter),
            );
            const member = char?.departmentMembers?.find(
                (m) => m.isActive && (m.department?.type === "ems" || m.department?.type === "fire"),
            );

            const res = await api.post('/api/units', {
                characterId: selectedCharacter ? parseInt(selectedCharacter) : null,
                departmentMemberId: member?.id || null,
                callSign,
                subdivision,
                unitType,
            });

            const unitData = res.data;
            setCurrentUnit(unitData);
            setOnDuty(true);
            setShowDutyModal(false);
            playSound("notification");
            toast({
                title: "На смене",
                description: `Вы вышли на смену как ${unitData.unit}`,
            });
            refetchUnits(); refetchCalls(); refetchCharacters();
        } catch (err: any) {
            console.error("Failed to start duty", err);
            toast({
                title: "Ошибка",
                description: err.response?.data?.error || "Не удалось начать смену",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDutyEnd = async () => {
        try {
            await api.delete('/api/units/me');
            setOnDuty(false);
            setCurrentUnit(null);
            playSound("notification");
            toast({
                title: "Смена окончена",
                description: "Вы вышли со смены",
            });
            refetchUnits(); refetchCalls(); refetchCharacters();
        } catch (err) {
            console.error("Failed to end duty", err);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!onDuty) return;

        try {
            setCurrentUnit((prev) => (prev ? { ...prev, status } : null));
            queryClient.setQueryData(['units'], (prev: Unit[] = []) =>
                prev.map((u) =>
                    u.userId === currentUnit?.userId ? { ...u, status } : u,
                ),
            );

            const res = await api.patch('/api/units/status', { status });
            setCurrentUnit(res.data);

            if (status === "Mayday") {
                socket.emit("ems_mayday", {
                    unitCallSign: currentUnit?.unit,
                    reason: maydayReason || "Паника",
                });
            }

            toast({
                title: "Статус обновлен",
                description: `Новый статус: ${EMS_UNIT_STATUSES.find(s => s.value === status)?.label}`,
            });
        } catch (err) {
            console.error("Failed to update status", err);
            refetchUnits(); refetchCalls(); refetchCharacters();
        }
    };

    const handlePatientSearch = async () => {
        if (!patientFirstName.trim() && !patientLastName.trim() && !patientSSN.trim()) return;

        setIsSearchingPatients(true);
        try {
            const params = new URLSearchParams();
            if (patientFirstName) params.append('firstName', patientFirstName);
            if (patientLastName) params.append('lastName', patientLastName);
            if (patientSSN) params.append('ssn', patientSSN);

            const res = await api.get(`/api/characters?${params.toString()}`);
            const data = res.data;
            setPatients(data);
            if (data.length > 0) {
                playSound("search_success");
                toast({
                    title: "Поиск успешен",
                    description: `Найдено ${data.length} граждан`,
                });
            } else {
                playSound("search_error");
                toast({
                    title: "Не найдено",
                    description: "Граждане с указанными данными не найдены",
                    variant: "destructive",
                });
            }
        } catch (err) {
            console.error("Failed to search patients", err);
            playSound("search_error");
            toast({
                title: "Ошибка",
                description: "Не удалось выполнить поиск",
                variant: "destructive",
            });
        } finally {
            setIsSearchingPatients(false);
        }
    };

    const handleMarkAsDead = async (patientId: string) => {
        if (!confirm("Вы уверены, что хотите отметить пациента как мертвого?")) return;

        try {
            const res = await api.patch(`/api/characters/${patientId}`, { isAlive: false });
            const data = res.data;
            setPatients((prev) =>
                prev.map((p) => (p.id === patientId ? data : p)),
            );
            setSelectedPatient((prev) => {
                if (prev?.id === patientId) {
                    return data;
                }
                return prev;
            });
            toast({
                title: "Пациент отмечен",
                description: "Пациент отмечен как мертвый",
                variant: "destructive",
            });
        } catch (err) {
            console.error("Failed to mark patient as dead", err);
        }
    };

    const handleTriageMove = (patientId: string, fromZone: string, toZone: string) => {
        setTriagePatients((prev) => {
            const updated = { ...prev };
            const patient = prev[fromZone].find((p) => p.id === patientId);
            if (patient) {
                updated[fromZone] = prev[fromZone].filter((p) => p.id !== patientId);
                updated[toZone] = [...prev[toZone], patient];
            }
            return updated;
        });
    };

    const handleCallNoteSubmit = async (callId: number) => {
        if (!newCallNoteText.trim()) return;

        try {
            const res = await api.post(`/api/calls911/${callId}/notes`, {
                text: newCallNoteText,
                author: callSign
            });

            const newNote = res.data;
            setNewCallNoteText("");
            queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.map(c => {
                if (c.id === callId) {
                    return { ...c, notes: [...(c.notes || []), newNote] };
                }
                return c;
            }));
            setSelectedCall((prev: any) => {
                if (prev?.id === callId) {
                    return { ...prev, notes: [...(prev.notes || []), newNote] };
                }
                return prev;
            });
            refetchUnits(); refetchCalls(); refetchCharacters();
        } catch (err) {
            console.error('Failed to add call note', err);
        }
    };

    const handleAttachToCall = async (callId: number) => {
        if (!onDuty || !currentUnit) {
            toast({ title: 'Ошибка', description: 'Вы не на смене', variant: 'destructive' });
            return;
        }

        try {
            const res = await api.post(`/api/calls911/${callId}/attach`);
            const updatedCall = res.data;
            toast({ title: 'Прикреплено', description: `Вы прикреплены к вызову #${callId}` });

            // Fetch fresh call data to ensure units are updated
            const freshRes = await api.get('/api/calls911/active');
            const data = freshRes.data;
            const freshCall = data.find((c: any) => c.id === callId);

            if (freshCall) {
                setSelectedCall(freshCall);
                queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.map(c => c.id === callId ? freshCall : c));
            } else {
                // Fallback if fresh fetch fails
                setSelectedCall(updatedCall);
                queryClient.setQueryData(['calls911', 'active'], (prev: any[] = []) => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
            }

            // Update current unit with callId
            setCurrentUnit(prev => prev ? { ...prev, callId } : null);
        } catch (err) {
            console.error('Failed to attach to call', err);
        }
    };

    const getPriorityConfig = (priority: string) => {
        const config = PRIORITY_LEVELS.find((p) => p.value === priority);
        return config || PRIORITY_LEVELS[4]; // Default to alpha
    };

    const getUnitStatusConfig = (status: string) => {
        const config = EMS_UNIT_STATUSES.find((s) => s.value === status);
        return config || EMS_UNIT_STATUSES[0];
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100">
            {/* Header */}
            <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                <div className="max-w-[1800px] mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-600/50 flex items-center justify-center">
                                    <Flame className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white">Пожарная служба</h1>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Система управления вызовами</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <a href="/ems/medical-report">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Медицинский отчёт
                                </a>
                            </Button>
                            {onDuty && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowMaydayModal(true)}
                                    className="border-red-800 bg-red-900/20 text-red-500 hover:bg-red-900/30 animate-pulse"
                                >
                                    <Siren className="w-4 h-4 mr-2" />
                                    Паника
                                </Button>
                            )}
                            
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1800px] mx-auto p-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                        {/* Top Actions */}
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800 overflow-x-auto">
                            {EMS_TOP_ACTIONS.map((action) => (
                                <Button
                                    key={action.label}
                                    variant={activeTab === action.label ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleTabChange(action.label)}
                                    className={
                                        activeTab === action.label
                                            ? "bg-red-600 hover:bg-red-500"
                                            : "border-zinc-700 text-zinc-400 hover:text-white"
                                    }
                                >
                                    <action.icon className="w-4 h-4 mr-2" />
                                    {action.label}
                                </Button>
                            ))}
                        </div>

                        {/* Content Area */}
                        <div className="flex gap-4 min-h-[calc(100vh-250px)]">
                            {/* Left Panel - Main Content */}
                            <div className="flex-1 space-y-4 min-h-0">
                                {/* Units Status */}
                                {activeTab === "Статус юнитов" && (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                                        <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                                            <span className="text-sm font-medium text-zinc-300">Статус юнитов</span>
                                            <Button variant="ghost" size="icon" onClick={() => { refetchUnits(); refetchCalls(); refetchCharacters(); }}>
                                                <RefreshCw className="w-4 h-4 text-zinc-500" />
                                            </Button>
                                        </div>
                                        <div className="p-4">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                                                </div>
                                            ) : units.length === 0 ? (
                                                <div className="text-center py-8 text-zinc-600">
                                                    Нет активных юнитов
                                                </div>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-zinc-500 text-[10px] uppercase">
                                                            <th className="px-3 py-2 text-left">Юнит</th>
                                                            <th className="px-3 py-2 text-left">Офицер</th>
                                                            <th className="px-3 py-2 text-left">Статус</th>
                                                            <th className="px-3 py-2 text-left">Район</th>
                                                            <th className="px-3 py-2 text-left">Вызов</th>
                                                            <th className="px-3 py-2 text-left">Время</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {units.map((unit) => {
                                                            const statusConfig = getUnitStatusConfig(unit.status);
                                                            return (
                                                                <tr key={unit.unit} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                                                    <td className="px-3 py-2 font-medium text-white">{unit.unit}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{unit.officer}</td>
                                                                    <td className="px-3 py-2">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400`}>
                                                                            {statusConfig.label}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-500">{unit.beat}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{unit.call}</td>
                                                                    <td className="px-3 py-2 text-zinc-500 text-xs font-mono">{unit.time}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Patient Search */}
                                {activeTab === "Поиск пациентов" && (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                                        <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800">
                                            <span className="text-sm font-medium text-zinc-300">Поиск пациентов</span>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div className="grid grid-cols-3 gap-2">
                                                <Input
                                                    placeholder="Имя"
                                                    value={patientFirstName}
                                                    onChange={(e) => setPatientFirstName(e.target.value)}
                                                    className="bg-zinc-800/50 border-zinc-700"
                                                />
                                                <Input
                                                    placeholder="Фамилия"
                                                    value={patientLastName}
                                                    onChange={(e) => setPatientLastName(e.target.value)}
                                                    className="bg-zinc-800/50 border-zinc-700"
                                                />
                                                <Input
                                                    placeholder="SSN"
                                                    value={patientSSN}
                                                    onChange={(e) => setPatientSSN(e.target.value)}
                                                    className="bg-zinc-800/50 border-zinc-700"
                                                />
                                            </div>
                                            <Button onClick={handlePatientSearch} disabled={isSearchingPatients} className="w-full">
                                                <Search className="w-4 h-4 mr-2" />
                                                Поиск пациента
                                            </Button>

                                            {selectedPatient && (
                                                <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
                                                    <div className="aspect-video bg-zinc-800 relative">
                                                        {selectedPatient.photoUrl ? (
                                                            <img src={getImageUrl(selectedPatient.photoUrl)!} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <User className="w-16 h-16 text-zinc-600" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-2 right-2">
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${selectedPatient.isAlive ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                                                {selectedPatient.isAlive ? 'ЖИВ' : 'МЕРТВ'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 space-y-4">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <h2 className="text-xl font-bold text-white">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                                                                {selectedPatient.ssn && <p className="text-sm text-zinc-500">SSN: {selectedPatient.ssn}</p>}
                                                            </div>
                                                            {selectedPatient.isAlive && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleMarkAsDead(selectedPatient.id)}
                                                                    className="border-red-800 text-red-400 hover:bg-red-900/20"
                                                                >
                                                                    <X className="w-4 h-4 mr-2" />
                                                                    Пометить как мертвого
                                                                </Button>
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                                            {selectedPatient.birthDate && (
                                                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                                                    <p className="text-zinc-500 uppercase">Дата рождения</p>
                                                                    <p className="text-zinc-200">{new Date(selectedPatient.birthDate).toLocaleDateString('ru-RU')}</p>
                                                                </div>
                                                            )}
                                                            {(selectedPatient as any).gender && (
                                                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                                                    <p className="text-zinc-500 uppercase">Пол</p>
                                                                    <p className="text-zinc-200">{(selectedPatient as any).gender === 'male' ? 'Мужской' : (selectedPatient as any).gender === 'female' ? 'Женский' : (selectedPatient as any).gender}</p>
                                                                </div>
                                                            )}
                                                            {selectedPatient.bloodType && (
                                                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                                                    <p className="text-zinc-500 uppercase">Группа крови</p>
                                                                    <p className="text-zinc-200 font-bold">{selectedPatient.bloodType}</p>
                                                                </div>
                                                            )}
                                                            {(selectedPatient as any).height && (
                                                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                                                    <p className="text-zinc-500 uppercase">Рост</p>
                                                                    <p className="text-zinc-200">{(selectedPatient as any).height} см</p>
                                                                </div>
                                                            )}
                                                            {(selectedPatient as any).weight && (
                                                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                                                    <p className="text-zinc-500 uppercase">Вес</p>
                                                                    <p className="text-zinc-200">{(selectedPatient as any).weight} кг</p>
                                                                </div>
                                                            )}
                                                            {(selectedPatient as any).phoneNumber && (
                                                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700">
                                                                    <p className="text-zinc-500 uppercase">Телефон</p>
                                                                    <p className="text-zinc-200">{(selectedPatient as any).phoneNumber}</p>
                                                                </div>
                                                            )}
                                                            {(selectedPatient as any).address && (
                                                                <div className="bg-zinc-800/50 p-2 rounded border border-zinc-700 col-span-2">
                                                                    <p className="text-zinc-500 uppercase">Адрес</p>
                                                                    <p className="text-zinc-200">{(selectedPatient as any).address}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                                                            <div className="bg-red-500/10 p-3 rounded border border-red-500/30">
                                                                <p className="text-[10px] text-red-400 uppercase font-bold mb-2">Аллергии</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {selectedPatient.allergies.map((allergy, idx) => (
                                                                        <span key={idx} className="px-2 py-1 bg-red-500/20 rounded text-xs text-red-400">
                                                                            {allergy}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedPatient.medicalHistory && selectedPatient.medicalHistory.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Медицинская история</p>
                                                                <div className="space-y-2">
                                                                    {selectedPatient.medicalHistory.map((item, idx) => (
                                                                        <div key={idx} className="text-xs p-2 bg-zinc-800/50 rounded border border-zinc-700 text-zinc-300">
                                                                            {item}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedPatient.medications && selectedPatient.medications.length > 0 && (
                                                            <div>
                                                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Принимаемые лекарства</p>
                                                                <div className="space-y-2">
                                                                    {selectedPatient.medications.map((med, idx) => (
                                                                        <div key={idx} className="text-xs p-2 bg-zinc-800/50 rounded border border-zinc-700 text-zinc-300">
                                                                            {med}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {!selectedPatient && patients.length > 0 && (
                                                <div className="space-y-2 max-h-96 overflow-auto">
                                                    {patients.map((patient) => (
                                                        <div
                                                            key={patient.id}
                                                            onClick={() => setSelectedPatient(patient)}
                                                            className="p-3 bg-zinc-800/50 rounded border border-zinc-700 hover:bg-zinc-800 cursor-pointer flex items-center gap-3"
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                                                {patient.photoUrl ? (
                                                                    <img src={getImageUrl(patient.photoUrl)!} alt="" className="w-full h-full object-cover rounded-full" />
                                                                ) : (
                                                                    <User className="w-5 h-5 text-zinc-500" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-white">{patient.firstName} {patient.lastName}</p>
                                                                <p className="text-xs text-zinc-500">{patient.ssn || 'Нет SSN'}</p>
                                                            </div>
                                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${patient.isAlive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {patient.isAlive ? 'ЖИВ' : 'МЕРТВ'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Calls */}
                                {activeTab === "Вызовы" && (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                                        <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                                            <span className="text-sm font-medium text-zinc-300">Активные вызовы</span>
                                            <Button variant="ghost" size="icon" onClick={() => { refetchUnits(); refetchCalls(); refetchCharacters(); }}>
                                                <RefreshCw className="w-4 h-4 text-zinc-500" />
                                            </Button>
                                        </div>
                                        <div className="p-4">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                                                </div>
                                            ) : calls.length === 0 ? (
                                                <div className="text-center py-8 text-zinc-600">
                                                    Нет активных вызовов
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {calls.map((call) => {
                                                        const priorityConfig = getPriorityConfig(call.priority);
                                                        const callTypeConfig = call.callType === 'ems' ? { color: 'emerald', label: 'СКОРАЯ' } :
                                                            call.callType === 'fire' ? { color: 'orange', label: 'ПОЖАРНАЯ' } :
                                                            call.callType === 'medical' ? { color: 'pink', label: 'МЕДИЦИНА' } :
                                                            call.callType === 'police' ? { color: 'blue', label: 'ПОЛИЦИЯ' } :
                                                            { color: 'zinc', label: call.callType?.toUpperCase() || '-' };
                                                        return (
                                                            <div
                                                                key={call.id}
                                                                onClick={() => setSelectedCall(call)}
                                                                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                                                                    selectedCall?.id === call.id
                                                                        ? 'bg-red-900/20 border-red-700'
                                                                        : 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                                                                }`}
                                                            >
                                                                <div className="flex items-start justify-between mb-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${priorityConfig.color}-500/20 border border-${priorityConfig.color}-500/30`}>
                                                                            <Phone className="w-5 h-5 text-${priorityConfig.color}-400" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-bold text-white">Вызов #{call.id}</p>
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-${callTypeConfig.color}-500/20 text-${callTypeConfig.color}-400 border border-${callTypeConfig.color}-500/30`}>
                                                                                {callTypeConfig.label}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border bg-${priorityConfig.color}-500/20 text-${priorityConfig.color}-400 border-${priorityConfig.color}-500/30`}>
                                                                        {priorityConfig.label}
                                                                    </span>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                                        {call.location}
                                                                    </div>
                                                                    <p className="text-sm text-zinc-400">{call.description}</p>
                                                                    <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                                                                        <span>Заявитель: {call.callerName}</span>
                                                                        {call.phoneNumber && <span>Телефон: {call.phoneNumber}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Triage */}
                                {activeTab === "Triage" && (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                                        <div className="bg-zinc-800/50 px-4 py-3 border-b border-zinc-800">
                                            <span className="text-sm font-medium text-zinc-300">Сортировка пациентов (Triage)</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-4 gap-4">
                                            {TRIAGE_ZONES.map((zone) => (
                                                <div
                                                    key={zone.id}
                                                    className={`p-4 rounded-lg border ${zone.color} min-h-[300px]`}
                                                    onDragOver={(e) => e.preventDefault()}
                                                >
                                                    <div className="text-center mb-4">
                                                        <p className="text-sm font-bold uppercase">{zone.label}</p>
                                                        <p className="text-[10px] text-zinc-500">{zone.description}</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {triagePatients[zone.id]?.map((patient) => (
                                                            <div
                                                                key={patient.id}
                                                                draggable
                                                                onDragStart={() => setSelectedPatient(patient)}
                                                                className="p-2 bg-zinc-800/50 rounded border border-zinc-700 text-xs"
                                                            >
                                                                <p className="font-medium text-white">{patient.firstName} {patient.lastName}</p>
                                                                <p className="text-zinc-500">{patient.bloodType || 'Неизвестно'}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Map */}
                                {activeTab === "Карта" && (
                                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden h-[600px]">
                                        <LiveMap />
                                    </div>
                                )}

                                {/* Default - Module Offline */}
                                {!["Статус юнитов", "Поиск пациентов", "Вызовы", "Triage", "Карта"].includes(activeTab) && (
                                    <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
                                        <div className="text-center">
                                            <Monitor className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-zinc-400">Модуль {activeTab} оффлайн</h3>
                                            <p className="text-xs text-zinc-600 mt-1">Этот модуль запланирован для будущего развертывания.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Panel - Actions */}
                            <div className="w-72 space-y-3 shrink-0">
                                {/* Duty Status */}
                                <div className="rounded-lg border border-zinc-700 p-3">
                                    <span className="text-xs font-medium text-zinc-400 block mb-2">Мой статус</span>
                                    {onDuty ? (
                                        <div className="space-y-2">
                                            <div className={`text-center py-2 rounded-lg font-bold text-sm ${
                                                currentUnit?.status === 'Available' ? 'bg-green-900/30 text-green-400 border border-green-700/50' :
                                                currentUnit?.status === 'Enroute' ? 'bg-blue-900/30 text-blue-400 border border-blue-700/50' :
                                                currentUnit?.status === 'On Scene' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50' :
                                                currentUnit?.status === 'Transporting' ? 'bg-purple-900/30 text-purple-400 border border-purple-700/50' :
                                                currentUnit?.status === 'Mayday' ? 'bg-red-900/30 text-red-400 border border-red-700/50 animate-pulse' :
                                                'bg-zinc-800/50 text-zinc-400 border border-zinc-700'
                                            }`}>
                                                {getUnitStatusConfig(currentUnit?.status || 'Available').label}
                                            </div>
                                            <div className="space-y-1">
                                                {EMS_UNIT_STATUSES.filter(s => s.value !== 'Mayday').map((status) => (
                                                    <Button
                                                        key={status.value}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleUpdateStatus(status.value)}
                                                        className={`w-full bg-${status.color}-900/30 border-${status.color}-700/50 text-${status.color}-400 hover:bg-${status.color}-900/50 ${currentUnit?.status === status.value ? 'ring-2 ring-' + status.color + '-500 text-' + status.color + '-300' : ''}`}
                                                    >
                                                        {status.value === 'Available' && <Truck className="w-4 h-4 mr-2" />}
                                                        {status.value === 'Enroute' && <Ambulance className="w-4 h-4 mr-2" />}
                                                        {status.value === 'On Scene' && <MapPin className="w-4 h-4 mr-2" />}
                                                        {status.value === 'Transporting' && <Heart className="w-4 h-4 mr-2" />}
                                                        {status.value === 'Busy' && <Activity className="w-4 h-4 mr-2" />}
                                                        {status.label}
                                                    </Button>
                                                ))}
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
                                            <Truck className="w-4 h-4 mr-2" />
                                            Выйти на смену
                                        </Button>
                                    )}
                                </div>

                                {/* Notes */}
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

            {/* Duty Modal */}
            {showDutyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <Card className="w-full max-w-sm bg-zinc-950 border-zinc-800">
                        <CardHeader className="pb-3 text-center">
                            <Flame className="w-6 h-6 text-red-500 mx-auto mb-2" />
                            <CardTitle className="text-lg font-bold text-white"> </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setUnitType('ems')}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${unitType === 'ems' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                >
                                    <Ambulance className="w-4 h-4 inline mr-1" />
                                    EMS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUnitType('fire')}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${unitType === 'fire' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                >
                                    <Flame className="w-4 h-4 inline mr-1" />
                                    FIRE
                                </button>
                            </div>
                            <Input 
                                placeholder="EMS-1"
                                value={callSign}
                                onChange={(e) => setCallSign(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handleDutyStart()}
                                className="bg-zinc-900 border-zinc-800 text-center"
                                autoFocus
                            />
                            <Input 
                                placeholder="Подразделение"
                                value={subdivision}
                                onChange={(e) => setSubdivision(e.target.value)}
                                className="bg-zinc-900 border-zinc-800"
                            />
                            {characters.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-[10px] uppercase text-zinc-500">Выберите персонажа</Label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCharacter('')}
                                            className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${!selectedCharacter ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                        >
                                            Нет
                                        </button>
                                        {characters.map((char) => (
                                            <button
                                                key={char.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCharacter(String(char.id));
                                                    const emsMember = char.departmentMembers?.find(m => m.isActive && (m.department?.type === 'ems' || m.department?.type === 'fire'));
                                                    if (emsMember?.callSign) setCallSign(emsMember.callSign);
                                                    if (emsMember?.division) setSubdivision(emsMember.division);
                                                }}
                                                className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${String(selectedCharacter) === String(char.id) ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                            >
                                                {char.firstName} {char.lastName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <Button className="w-full bg-red-600 hover:bg-red-500" onClick={handleDutyStart} disabled={isSubmitting || !callSign}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Начать смену'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Mayday Modal */}
            {showMaydayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <Card className="w-full max-w-md bg-zinc-950 border-red-800">
                        <CardHeader className="border-b border-red-900 pb-4">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                <Siren className="w-5 h-5 text-red-500 animate-pulse" />
                                Паника
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                                <p className="text-xs text-red-500/80 leading-relaxed">
                                    Внимание: Это объявление о нажатой кнопки паники отправит уведомление всем юнитам и диспетчерам. Используйте только в экстренных ситуациях.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Причина</Label>
                                <textarea
                                    className="w-full h-24 bg-zinc-900/50 border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 resize-none"
                                    placeholder="Опишите ситуацию..."
                                    value={maydayReason}
                                    onChange={(e) => setMaydayReason(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-red-900">
                                <Button 
                                    variant="ghost" 
                                    onClick={() => { setShowMaydayModal(false); setMaydayReason(''); }}
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Отмена
                                </Button>
                                <Button
                                    onClick={() => {
                                        handleUpdateStatus('Mayday');
                                        setShowMaydayModal(false);
                                        setMaydayReason('');
                                    }}
                                    className="flex-1 bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20"
                                >
                                    <Siren className="w-4 h-4 mr-2" />
                                    Нажать кнопку паники
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Call Details Modal */}
            {selectedCall && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setSelectedCall(null)}>
                    <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
                            <div className="flex items-center gap-2 text-red-400">
                                <Phone className="w-5 h-5" />
                                <h2 className="text-lg font-bold text-zinc-100">Детали вызова #{selectedCall.id}</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCall(null)}>
                                <X className="w-5 h-5 text-zinc-500" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-4 overflow-hidden flex flex-col">
                            <div className="bg-zinc-800/40 p-3 rounded-lg border border-zinc-800 text-sm space-y-1">
                                <p className="text-zinc-500 text-[10px] uppercase">Тип вызова</p>
                                <p className="text-zinc-200">{selectedCall.callType}</p>
                                <p className="text-zinc-500 text-[10px] uppercase pt-2">Местоположение</p>
                                <p className="text-zinc-200 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-500" /> {selectedCall.location}</p>
                                <p className="text-zinc-500 text-[10px] uppercase pt-2">Описание</p>
                                <p className="text-zinc-200">{selectedCall.description}</p>
                            </div>

                            {currentUnit?.callId !== selectedCall.id && onDuty && (
                                <Button
                                    size="sm"
                                    className="w-full bg-red-600 hover:bg-red-500"
                                    onClick={() => handleAttachToCall(selectedCall.id)}
                                >
                                    <Navigation className="w-3.5 h-3.5 mr-1" />
                                    Прикрепиться к вызову
                                </Button>
                            )}

                            <div className="flex-1 overflow-auto space-y-3 pr-1">
                                <Label className="text-[10px] uppercase text-zinc-500">Дополнения (Чат)</Label>
                                {selectedCall.notes && selectedCall.notes.length > 0 ? (
                                    selectedCall.notes.map((note: any) => (
                                        <div key={note.id} className="bg-zinc-800/20 p-2 rounded border-l-2 border-red-500/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-red-400 font-bold text-xs">{note.author}</span>
                                                <span className="text-[9px] text-zinc-600 italic">{new Date(note.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <p className="text-zinc-300 text-xs leading-relaxed">{note.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-zinc-600 italic text-xs">Нет дополнений. Введите инфо ниже.</div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-zinc-800 shrink-0">
                                <Input
                                    placeholder="Добавить информацию для всех..."
                                    className="h-9 text-sm bg-zinc-800/50 border-zinc-700"
                                    value={newCallNoteText}
                                    onChange={(e) => setNewCallNoteText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCallNoteSubmit(selectedCall.id)}
                                />
                                <Button size="sm" onClick={() => handleCallNoteSubmit(selectedCall.id)}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

        </div>
    );
}
