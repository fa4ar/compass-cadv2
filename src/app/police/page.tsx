"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Shield, Users, FileSearch, Laptop, Map, AlertTriangle, Search, Navigation, MapPinned, ArrowRightLeft, CheckCircle, BarChart3, MessageCircle, PlusSquare, Ambulance, Clock, Car, Footprints, Siren, X, User, LogOut, MapPin, Send, Loader2, UserPlus, UserMinus, Receipt, AlertCircle, DollarSign } from 'lucide-react';
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
import { useAuth } from '@/context/AuthContext';
import { socket } from '@/lib/socket';
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
    callId?: number;
    characterId?: number;
    userId?: number;
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
    const [vehicleModel, setVehicleModel] = useState("");
    const [vehiclePlate, setVehiclePlate] = useState("");

    const [currentMember, setCurrentMember] = useState<DepartmentMember | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
    const [unitMessage, setUnitMessage] = useState("");

    const isSupervisor = currentMember?.rank?.isSupervisor || user?.roles?.some(r => r.toLowerCase() === 'admin' || r.toLowerCase() === 'supervisor') || false;
    const canManageUnits = isSupervisor || user?.roles?.some(r => r.toLowerCase() === 'dispatcher') || false;
    const isInPair = currentUnit?.partnerUserId || false;

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
    const [fineForm, setFineForm] = useState({
        characterId: null,
        amount: "",
        reason: ""
    });

    useEffect(() => {
        fetchData();
        checkActiveUnit();

        // Load persisted UI state
        const savedTab = localStorage.getItem('policeActiveTab');
        if (savedTab) setActiveTab(savedTab);

        const savedNotes = localStorage.getItem('policeNotes');
        if (savedNotes) setNotes(savedNotes);

        socket.connect();

        socket.on('new_911_call', (newCall: any) => {
            setCalls(prev => [newCall, ...prev]);
            playSound('new_call_911').then(() => console.log('[Police] Sound played')).catch(e => console.error('[Police] Sound error:', e));
            toast({ title: 'Новый вызов!', description: `${newCall.callerName}: ${newCall.description}` });
        });

        socket.on('update_911_call', (updatedCall: any) => {
            setCalls(prev => prev.map(c => c.id === updatedCall.id ? updatedCall : c));
            if (selectedCallForNotes?.id === updatedCall.id) {
                setSelectedCallForNotes(updatedCall);
            }
        });

        socket.on('new_911_note', ({ callId, note }: { callId: number, note: any }) => {
            setCalls(prev => prev.map(c => {
                if (c.id === callId) {
                    return { ...c, notes: [...(c.notes || []), note] };
                }
                return c;
            }));
            if (selectedCallForNotes?.id === callId) {
                setSelectedCallForNotes((prev: any) => ({
                    ...prev,
                    notes: [...(prev.notes || []), note]
                }));
            }
        });

        socket.on('delete_911_call', ({ id }: { id: number }) => {
            setCalls(prev => prev.filter(c => c.id !== id));
            if (selectedCallForNotes?.id === id) setSelectedCallForNotes(null);
        });

        socket.on('dispatcher_message', (data: { message: string; from: string }) => {
            playSound('message_received');
            toast({ title: 'Сообщение от диспетчера', description: `${data.from}: ${data.message}` });
        });

        socket.on('unit_unassigned', () => {
            fetchData();
        });

        socket.on('unit_assigned', (data: { userId: number; callId: number; unitCallSign: string }) => {
            playSound('notification');
            toast({ title: 'Прикреплен к вызову', description: `Юнит ${data.unitCallSign} прикреплен к вызову #${data.callId}` });
            fetchData();
        });

        socket.on('unit_status_changed', (data: { userId: number; status: string; unitCallSign: string }) => {
            setUnits(prev => prev.map(u => u.userId === data.userId ? { ...u, status: data.status } : u));
        });

        socket.on('unit_pair_update', () => {
            fetchData();
        });

        socket.on('pair_invite', (data: { fromUserId: number; fromCallSign: string }) => {
            playSound('notification');
            toast({ 
                title: 'Приглашение в пару', 
                description: `${data.fromCallSign} пригласил вас в патрульную пару. Используйте кнопку в карточке юнита для принятия.`,
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
            socket.off('unit_unassigned');
            socket.off('unit_assigned');
            socket.off('unit_status_changed');
            socket.off('unit_pair_update');
            socket.off('pair_invite');
            socket.off('pair_formed');
            socket.off('pair_disbanded');
            socket.disconnect();
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

    const getImageUrl = (url?: string) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return `${apiUrl}${url}`;
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
                    setVehicleModel(unitData.vehicleModel || "");
                    setVehiclePlate(unitData.vehiclePlate || "");
                    setOnDuty(true);
                }
            }
        } catch (err) {
            console.error('Failed to check active unit', err);
        }
    };

    const fetchData = async () => {
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
                setCalls(data);
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
                    subdivision,
                    vehicleModel,
                    vehiclePlate
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
                setNewCallNoteText("");
                fetchData();

                const updatedRes = await fetch(`${apiUrl}/api/calls911/active`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (updatedRes.ok) {
                    const data = await updatedRes.json();
                    const current = data.find((c: any) => c.id === callId);
                    if (current) setSelectedCallForNotes(current);
                }
            }
        } catch (err) {
            console.error('Failed to add call note', err);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!onDuty || !selectedCharacter) return;

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/units/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: parseInt(selectedCharacter),
                    status
                })
            });

            if (res.ok) {
                toast({ title: 'Статус обновлен', description: `Новый статус: ${status}` });
                fetchData();
            } else {
                toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to update status', err);
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
                fetchData();
            } else {
                const data = await res.json();
                toast({ title: 'Ошибка', description: data.error || 'Не удалось прикрепиться', variant: 'destructive' });
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
                toast({ title: 'Откреплено', description: 'Вы откреплены от вызова' });
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
                fetchData();
            }
        } catch (err) {
            console.error('Failed to set main unit', err);
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
                fetchData();
            }
        } catch (err) {
            console.error('Failed to accept pair invite', err);
        }
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
                                    {isSupervisor && (
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
                                                            {units.map((row: any) => (
                                                                <tr 
                                                                    key={row.unit} 
                                                                    className={`${row.status === "Dispatched" ? "bg-blue-950/20" : ""} ${canManageUnits ? "cursor-pointer hover:bg-zinc-800/50" : ""}`}
                                                                    onClick={() => canManageUnits && setSelectedUnit(row)}
                                                                >
                                                                    <td className={`px-3 py-2 font-semibold ${row.status === "Available" ? "text-green-400" : "text-blue-400"}`}>
                                                                        <div className="flex items-center gap-2">
                                                                            <span>{row.unit}</span>
                                                                            {row.isPaired && (
                                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] text-blue-400">
                                                                                    <User className="w-3 h-3" />
                                                                                    +2
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.beat}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.call}</td>
                                                                    <td className={`px-3 py-2 font-medium ${row.status === "Available" ? "text-green-400" : "text-blue-400"}`}>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-2 h-2 rounded-full ${row.status === "Available" ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" : row.status === "Enroute" ? "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" : "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]"}`} />
                                                                            {row.status === "Available" ? "Доступен" : row.status === "Enroute" ? "В пути" : row.status === "Busy" ? "Занят" : row.status}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-400">{row.time}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.nature}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.location}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        </div>
                                    )}

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
                                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                                                    <Laptop className="w-3 h-3 text-blue-500" /> Лицензии
                                                                </p>
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
                                                                    ) : <p className="text-xs text-zinc-600 italic py-2">Нет лицензий</p>}
                                                                </div>
                                                            </div>

                                                            {/* Vehicles */}
                                                            <div className="space-y-2">
                                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                                                    <Car className="w-3 h-3 text-blue-500" /> Транспорт
                                                                </p>
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
                                                                    ) : <p className="text-xs text-zinc-600 italic py-2">Нет транспорта</p>}
                                                                </div>
                                                            </div>

                                                            {/* Weapons */}
                                                            <div className="space-y-2">
                                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                                                                    <AlertTriangle className="w-3 h-3 text-amber-500" /> Оружие
                                                                </p>
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
                                                                    ) : <p className="text-xs text-zinc-600 italic py-2">Нет оружия</p>}
                                                                </div>
                                                            </div>

                                                            {/* Fines */}
                                                            <div className="space-y-2 col-span-1 md:col-span-3">
                                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1.5">
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
                                                                </p>
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
                                                                    ) : <p className="text-xs text-zinc-600 italic py-2">Чистая история</p>}
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

                            {activeTab !== "Статус юнитов" && activeTab !== "NCIC" && activeTab !== "Карта" && (
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
                                    {["2HR", "Номер", "DOT", "BOLO"].map((label) => (
                                        <Button
                                            key={label}
                                            variant="outline"
                                            size="sm"
                                            disabled={!onDuty}
                                            className="w-full justify-start bg-zinc-800/50 border-zinc-700 disabled:opacity-50"
                                        >
                                            {label}
                                        </Button>
                                    ))}
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
                                                {currentUnit?.status === 'Available' ? '10-8 ДОСТУПЕН' :
                                                 currentUnit?.status === 'Busy' ? '10-6 ЗАНЯТ' :
                                                 currentUnit?.status === 'Enroute' ? '10-97 В ПУТИ' :
                                                 currentUnit?.status === 'On Scene' ? '10-23 НА ВЫЗОВЕ' :
                                                 'НЕИЗВЕСТНО'}
                                            </div>
                                            <div className="space-y-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus("Available")}
                                                    className="w-full bg-green-900/30 border-green-700/50 text-green-400 hover:bg-green-900/50"
                                                >
                                                    <Car className="w-4 h-4 mr-2" />
                                                    10-8 (Доступен)
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus("Busy")}
                                                    className="w-full bg-yellow-900/30 border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/50"
                                                >
                                                    <Siren className="w-4 h-4 mr-2" />
                                                    10-6 (Занят)
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleUpdateStatus("Enroute")}
                                                    className="w-full bg-blue-900/30 border-blue-700/50 text-blue-400 hover:bg-blue-900/50"
                                                >
                                                    <Footprints className="w-4 h-4 mr-2" />
                                                    10-97 (В пути)
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleDutyEnd}
                                                    className="w-full bg-zinc-900/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50"
                                                >
                                                    <LogOut className="w-4 h-4 mr-2" />
                                                    10-7 (Вне смены)
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

            {/* Duty Selection Modal - Simplified */}
            {showDutyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <Card className="w-full max-w-sm bg-zinc-950 border-zinc-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-500" />
                                    10-8 Выход на смену
                                </CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setShowDutyModal(false)} className="text-zinc-500 hover:text-white">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-zinc-500">Позывной</Label>
                                    <Input placeholder="1A-12" value={callSign} onChange={(e) => setCallSign(e.target.value.toUpperCase())} className="bg-zinc-900 border-zinc-800" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase text-zinc-500">Отдел / Дивизион</Label>
                                    <Input placeholder="Traffic" value={subdivision} onChange={(e) => setSubdivision(e.target.value)} className="bg-zinc-900 border-zinc-800" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-zinc-500">Транспорт</Label>
                                        <Input placeholder="Ford Explorer" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="bg-zinc-900 border-zinc-800" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-zinc-500">Номер</Label>
                                        <Input placeholder="89ABC123" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} className="bg-zinc-900 border-zinc-800 font-mono" />
                                    </div>
                                </div>
                            </div>

                            {characters.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-[10px] uppercase text-zinc-500">Выберите персонажа</Label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCharacter('')}
                                            className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${!selectedCharacter ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                        >
                                            Нет
                                        </button>
                                        {characters.map((char) => (
                                            <button
                                                key={char.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCharacter(String(char.id));
                                                    const policeMember = char.departmentMembers?.find(m => m.isActive && m.department?.type === 'police');
                                                    if (policeMember?.callSign) setCallSign(policeMember.callSign);
                                                    if (policeMember?.division) setSubdivision(policeMember.division);
                                                }}
                                                className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${String(selectedCharacter) === String(char.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                                            >
                                                {char.firstName} {char.lastName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button className="w-full bg-blue-600" onClick={handleDutyStart} disabled={isSubmitting || !callSign}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Начать смену'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
            {/* Call Notes Modal */}
            {selectedCallForNotes && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center p-4 border-b border-zinc-800 shrink-0">
                            <div className="flex items-center gap-2 text-blue-400">
                                <MessageCircle className="w-5 h-5" />
                                <h2 className="text-lg font-bold text-zinc-100">Детали вызова #{selectedCallForNotes.id}</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCallForNotes(null)}>
                                <X className="w-5 h-5 text-zinc-500" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-4 overflow-hidden flex flex-col">
                            <div className="bg-zinc-800/40 p-3 rounded-lg border border-zinc-800 text-sm space-y-1">
                                <p className="text-zinc-500 text-[10px] uppercase">Суть вызова</p>
                                <p className="text-zinc-200">{selectedCallForNotes.description}</p>
                                <p className="text-zinc-500 text-[10px] uppercase pt-2">Местоположение</p>
                                <p className="text-zinc-200 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-500" /> {selectedCallForNotes.location}</p>
                            </div>

                            {selectedCallForNotes.units && selectedCallForNotes.units.length > 0 && (
                                <div className="bg-zinc-800/40 p-3 rounded-lg border border-zinc-800">
                                    <p className="text-zinc-500 text-[10px] uppercase mb-2">Прикрепленные юниты</p>
                                    <div className="space-y-2">
                                        {selectedCallForNotes.units.map((unit: any) => (
                                            <div 
                                                key={unit.userId} 
                                                className={`flex items-center justify-between p-2 rounded border ${
                                                    selectedCallForNotes.mainUnitId === unit.userId 
                                                        ? 'bg-red-900/30 border-red-700' 
                                                        : 'bg-zinc-800/50 border-zinc-700'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {unit.user?.avatarUrl && (
                                                        <img src={unit.user.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                                    )}
                                                    <div>
                                                        <p className="text-zinc-200 text-xs font-medium">
                                                            {unit.callSign || unit.character?.firstName + ' ' + unit.character?.lastName || unit.user?.username}
                                                        </p>
                                                        {selectedCallForNotes.mainUnitId === unit.userId && (
                                                            <span className="text-[10px] text-red-400 font-bold">ГЛАВНЫЙ</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {canManageUnits && selectedCallForNotes.mainUnitId !== unit.userId && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        className="h-6 px-2 text-[10px] text-red-400 hover:bg-red-900/20"
                                                        onClick={() => handleSetMainUnit(selectedCallForNotes.id, unit.userId)}
                                                    >
                                                        Назначить главным
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {currentUnit?.callId !== selectedCallForNotes.id && onDuty && (
                                        <Button 
                                            size="sm" 
                                            className="w-full mt-2 bg-blue-600 hover:bg-blue-500"
                                            onClick={() => handleAttachToCall(selectedCallForNotes.id)}
                                        >
                                            <PlusSquare className="w-3.5 h-3.5 mr-2" />
                                            Прикрепиться к вызову
                                        </Button>
                                    )}
                                    {currentUnit?.callId === selectedCallForNotes.id && (
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="w-full mt-2 border-red-800 text-red-400 hover:bg-red-900/20"
                                            onClick={handleDetachFromCall}
                                        >
                                            <X className="w-3.5 h-3.5 mr-2" />
                                            Открепиться
                                        </Button>
                                    )}
                                </div>
                            )}

                            {(!selectedCallForNotes.units || selectedCallForNotes.units.length === 0) && onDuty && (
                                <Button 
                                    size="sm" 
                                    className="w-full bg-blue-600 hover:bg-blue-500"
                                    onClick={() => handleAttachToCall(selectedCallForNotes.id)}
                                >
                                    <PlusSquare className="w-3.5 h-3.5 mr-2" />
                                    Прикрепиться к вызову
                                </Button>
                            )}

                            <div className="flex-1 overflow-auto space-y-3 pr-1">
                                <Label className="text-[10px] uppercase text-zinc-500">Дополнения (Чат)</Label>
                                {selectedCallForNotes.notes?.length > 0 ? (
                                    selectedCallForNotes.notes.map((note: any) => (
                                        <div key={note.id} className="bg-zinc-800/20 p-2 rounded border-l-2 border-blue-500/50">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-blue-400 font-bold text-xs">{note.author}</span>
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
                                    onKeyDown={(e) => e.key === 'Enter' && handleCallNoteSubmit(selectedCallForNotes.id)}
                                />
                                <Button size="sm" onClick={() => handleCallNoteSubmit(selectedCallForNotes.id)}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

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
                                    <p className={`font-medium ${selectedUnit.status === "Available" ? "text-green-400" : "text-blue-400"}`}>
                                        {selectedUnit.status === "Available" ? "Доступен" : selectedUnit.status === "Busy" ? "Занят" : selectedUnit.status}
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

                            {selectedUnit.callId && (
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
                                    <Button variant="outline" className="w-full border-green-800 text-green-400 hover:bg-green-900/20" onClick={handleAcceptPairInvite}>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Принять приглашение
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
        </div>
    );
}