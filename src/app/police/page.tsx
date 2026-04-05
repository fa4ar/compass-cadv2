"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Users, FileSearch, Laptop, Map, AlertTriangle, Search, Navigation, MapPinned, ArrowRightLeft, CheckCircle, BarChart3, MessageCircle, PlusSquare, Ambulance, Clock, Car, Footprints, Siren, X, User, LogOut, MapPin, Send } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { socket } from '@/lib/socket';

interface Character {
    id: string;
    firstName: string;
    lastName: string;
    departmentMembers?: DepartmentMember[];
}

interface DepartmentMember {
    departmentId: number;
    rankId: number;
    isActive: boolean;
    rank?: {
        isSupervisor: boolean;
        name: string;
    };
    department?: {
        type: string;
    };
    callSign?: string;
    badgeNumber?: string;
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
}

const TOP_ACTIONS = [
    { label: "Unit Status", icon: BarChart3 },  // Текущая ситуация, юниты и активные вызовы
    { label: "NCIC", icon: FileSearch },       // Глубокий поиск граждан, авто и оружия
    { label: "BOLO", icon: AlertTriangle },    // "Be On the Look Out" — список активных ориентировок
    { label: "Reports", icon: PlusSquare },    // Быстрое создание тикетов, штрафов и протоколов
    { label: "Warrants", icon: Shield },       // База активных судебных ордеров на арест
    { label: "Map", icon: Map },
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
    const [activeTab, setActiveTab] = useState<string>("Unit Status");
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

    const isSupervisor = currentMember?.rank?.isSupervisor || user?.roles?.some(r => r.toLowerCase() === 'admin') || false;

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

        return () => {
            socket.off('new_911_call');
            socket.off('update_911_call');
            socket.off('new_911_note');
            socket.off('delete_911_call');
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
            }
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDutyStart = async () => {
        if (!selectedCharacter) {
            toast({ title: 'Error', description: 'Select a character', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const char = characters.find(c => c.id === selectedCharacter);
            const member = char?.departmentMembers?.find(m => m.isActive);

            const res = await fetch(`${apiUrl}/api/units`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: parseInt(selectedCharacter),
                    departmentMemberId: member?.departmentId,
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
                const char = characters.find(c => c.id === selectedCharacter);
                const member = char?.departmentMembers?.find(m => m.isActive && m.department?.type === 'police');
                if (member) setCurrentMember(member);

                setOnDuty(true);
                setShowDutyModal(false);
                toast({ title: 'On Duty', description: `You are now on duty as ${unitData.unit}` });
                fetchData();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error || 'Failed to start duty', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to start duty', err);
            toast({ title: 'Error', description: 'Failed to start duty', variant: 'destructive' });
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
                toast({ title: 'Status Updated', description: `New status: ${status}` });
                fetchData();
            } else {
                toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
            }
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const handleDutyEnd = async () => {
        if (!onDuty || !selectedCharacter) return;

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/units/${selectedCharacter}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast({ title: 'Off Duty', description: 'You have ended your shift.' });
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

    return (
        <div className="fixed top-14 inset-x-0 bottom-0 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col p-3">
                <Card className="flex-1 bg-zinc-900/50 border-zinc-800 flex flex-col overflow-hidden">
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="text-lg font-bold text-zinc-100 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" />
                                Unit Status - {units.length} Active / {calls.length} Held Calls
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
                            <Button variant="outline" size="sm" onClick={fetchData} className="bg-zinc-800/50 border-zinc-700 ml-auto">
                                <Clock className="w-4 h-4 mr-1.5" />
                                Refresh
                            </Button>
                        </div>

                        <div className="flex-1 flex gap-3 min-h-0">
                            {activeTab === "Unit Status" && (
                                <div className="flex-1 space-y-3 min-h-0 flex flex-col">
                                    {isSupervisor && (
                                        <div className="rounded-lg border border-zinc-700 flex-1 overflow-hidden flex flex-col min-h-0">
                                            <div className="bg-zinc-800/50 px-3 py-2 border-b border-zinc-700 flex items-center gap-2 shrink-0">
                                                <Users className="w-4 h-4 text-zinc-400" />
                                                <span className="text-sm font-medium text-zinc-300">Units</span>
                                            </div>
                                            <div className="overflow-auto flex-1">
                                                {isLoading ? (
                                                    <div className="flex items-center justify-center h-32 text-zinc-500">Loading...</div>
                                                ) : units.length === 0 ? (
                                                    <div className="flex items-center justify-center h-32 text-zinc-500">No units available</div>
                                                ) : (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-zinc-800/30 sticky top-0">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Unit</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Beat</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Call</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Status</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Time</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Nature</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Location</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {units.map((row: any) => (
                                                                <tr key={row.unit} className={row.status === "Dispatched" ? "bg-blue-950/20" : ""}>
                                                                    <td className={`px-3 py-2 font-semibold ${row.status === "Available" ? "text-green-400" : "text-blue-400"}`}>
                                                                        {row.unit}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.beat}</td>
                                                                    <td className="px-3 py-2 text-zinc-300">{row.call}</td>
                                                                    <td className={`px-3 py-2 font-medium ${row.status === "Available" ? "text-green-400" : "text-blue-400"}`}>
                                                                        {row.status}
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
                                            <span className="text-sm font-medium text-zinc-300">Active Calls</span>
                                        </div>
                                        <div className="overflow-auto flex-1">
                                            {isLoading ? (
                                                <div className="flex items-center justify-center h-32 text-zinc-500">Loading...</div>
                                            ) : calls.length === 0 ? (
                                                <div className="flex items-center justify-center h-32 text-zinc-500">No active calls</div>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead className="bg-zinc-800/30 sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">ID</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Time</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Caller</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Location</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Description</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Status</th>
                                                            <th className="px-3 py-2 text-right text-xs font-medium text-zinc-400">Info</th>
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
                                                                        {row.status}
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

                            {activeTab === "Messages" && (
                                <div className="flex-1 flex flex-col">
                                    <div className="rounded-lg border border-zinc-700 p-4">
                                        <span className="text-sm font-medium text-zinc-300">Messages Panel</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === "NCIC" && (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className="bg-zinc-800/20 border border-zinc-700/50 p-4 rounded-xl mb-6 shadow-xl shrink-0">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">First Name</Label>
                                                <Input
                                                    value={ncicFields.firstName}
                                                    onChange={(e) => setNcicFields({ ...ncicFields, firstName: e.target.value })}
                                                    placeholder="John"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Last Name</Label>
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
                                                    placeholder="Optional"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Plate</Label>
                                                <Input
                                                    value={ncicFields.plate}
                                                    onChange={(e) => setNcicFields({ ...ncicFields, plate: e.target.value })}
                                                    placeholder="89ABC123"
                                                    className="bg-zinc-900/50 border-zinc-700 h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Weapon Serial</Label>
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
                                                Clear All
                                            </Button>
                                            <Button
                                                onClick={handleNCICSearch}
                                                disabled={isSearching}
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-500 min-w-[120px] shadow-lg shadow-blue-900/20"
                                            >
                                                {isSearching ? <Clock className="w-3.5 h-3.5 animate-spin mr-2" /> : <Search className="w-3.5 h-3.5 mr-2" />}
                                                {isSearching ? 'Searching...' : 'Search NCIC'}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-auto space-y-4 pr-1">
                                        {ncicResults.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-64 border border-dashed border-zinc-700 rounded-xl bg-zinc-900/20">
                                                <FileSearch className="w-12 h-12 text-zinc-800 mb-4" />
                                                <p className="text-zinc-500 font-medium">No results found or system idle</p>
                                                <p className="text-xs text-zinc-600 mt-1">Enter a query to search the database</p>
                                            </div>
                                        ) : (
                                            ncicResults.map((result: any) => (
                                                <Card key={result.id} className="bg-zinc-800/20 border-zinc-700 overflow-hidden">
                                                    <div className="p-4 flex flex-col md:flex-row gap-6">
                                                        {/* Personal Info */}
                                                        <div className="w-full md:w-64 space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-400">
                                                                    <User className="w-6 h-6" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-white leading-tight">
                                                                        {result.firstName} {result.lastName}
                                                                    </h3>
                                                                    <p className="text-xs text-zinc-500 font-mono mt-0.5">SSN: {result.ssn || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                                                    <p className="text-zinc-500 uppercase text-[10px]">Gender</p>
                                                                    <p className="text-zinc-300 font-medium capitalize">{result.gender || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                                                                    <p className="text-zinc-500 uppercase text-[10px]">DOB</p>
                                                                    <p className="text-zinc-300 font-medium">{result.birthDate ? new Date(result.birthDate).toLocaleDateString() : 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Details */}
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            {/* Licenses */}
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <Laptop className="w-3 h-3" /> Licenses
                                                                </p>
                                                                <div className="space-y-1.5">
                                                                    {result.licenses?.length > 0 ? (
                                                                        result.licenses.map((lic: any) => (
                                                                            <div key={lic.id} className="flex items-center justify-between bg-zinc-900/40 p-1.5 rounded border border-zinc-800/50">
                                                                                <span className="text-xs text-zinc-300">{lic.license.name}</span>
                                                                                <span className={`text-[10px] px-1 rounded ${lic.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                                    {lic.isActive ? 'VALID' : 'EXPIRED'}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    ) : <p className="text-[11px] text-zinc-600 italic">No licenses found</p>}
                                                                </div>
                                                            </div>

                                                            {/* Vehicles */}
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <Car className="w-3 h-3" /> Registered Vehicles
                                                                </p>
                                                                <div className="space-y-1.5">
                                                                    {result.vehicles?.length > 0 ? (
                                                                        result.vehicles.map((veh: any) => (
                                                                            <div key={veh.id} className="flex items-center justify-between bg-zinc-900/40 p-1.5 rounded border border-zinc-800/50">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs text-zinc-300 font-bold">{veh.plate}</span>
                                                                                    <span className="text-[10px] text-zinc-500">{veh.model}</span>
                                                                                </div>
                                                                                <span className={`text-[10px] px-1 rounded ${veh.status === 'Valid' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                                    {veh.status.toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    ) : <p className="text-[11px] text-zinc-600 italic">No vehicles found</p>}
                                                                </div>
                                                            </div>

                                                            {/* Weapons */}
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <AlertTriangle className="w-3 h-3" /> Firearms
                                                                </p>
                                                                <div className="space-y-1.5">
                                                                    {result.weapons?.length > 0 ? (
                                                                        result.weapons.map((wep: any) => (
                                                                            <div key={wep.id} className="flex items-center justify-between bg-zinc-900/40 p-1.5 rounded border border-zinc-800/50">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs text-zinc-300">{wep.model}</span>
                                                                                    <span className="text-[10px] font-mono text-zinc-500">{wep.serial}</span>
                                                                                </div>
                                                                                <span className={`text-[10px] px-1 rounded ${wep.status === 'Valid' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                                                    {wep.status.toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                        ))
                                                                    ) : <p className="text-[11px] text-zinc-600 italic">No weapons found</p>}
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

                            {activeTab === "Map" && (
                                <div className="flex-1 flex flex-col">
                                    <div className="rounded-lg border border-zinc-700 p-4">
                                        <span className="text-sm font-medium text-zinc-300">Map View</span>
                                    </div>
                                </div>
                            )}

                            {activeTab !== "Unit Status" && activeTab !== "NCIC" && activeTab !== "Map" && (
                                <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10">
                                    <div className="text-center">
                                        <Laptop className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-zinc-400">{activeTab} Module Offline</h3>
                                        <p className="text-xs text-zinc-600 mt-1">This tactical module is scheduled for future deployment.</p>
                                    </div>
                                </div>
                            )}

                            <div className="w-56 space-y-3 shrink-0">
                                <div className="rounded-lg border border-zinc-700 p-3 space-y-2">
                                    <span className="text-xs font-medium text-zinc-400">Quick Actions</span>
                                    {["2HR", "Plate", "DOT", "BOLO"].map((label) => (
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
                                    <span className="text-xs font-medium text-zinc-400 block mb-2">Quick Status</span>
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDuty ? handleUpdateStatus("Available") : setShowDutyModal(true)}
                                            className={`w-full bg-green-900/30 border-green-700/50 text-green-400 hover:bg-green-900/50 ${onDuty ? 'hover:bg-green-600/20' : ''}`}
                                        >
                                            <Car className="w-4 h-4 mr-2" />
                                            10-8 (Available)
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!onDuty}
                                            onClick={() => handleUpdateStatus("Busy")}
                                            className="w-full bg-yellow-900/30 border-yellow-700/50 text-yellow-400 hover:bg-yellow-900/50 disabled:opacity-30"
                                        >
                                            <Siren className="w-4 h-4 mr-2" />
                                            10-6 (Busy)
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!onDuty}
                                            onClick={() => handleUpdateStatus("Enroute")}
                                            className="w-full bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50 disabled:opacity-30"
                                        >
                                            <Footprints className="w-4 h-4 mr-2" />
                                            10-97 (Enroute)
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!onDuty}
                                            onClick={handleDutyEnd}
                                            className="w-full bg-zinc-900/30 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50 disabled:opacity-30"
                                        >
                                            <LogOut className="w-4 h-4 mr-2" />
                                            10-7 (Off Duty)
                                        </Button>
                                    </div>
                                </div>


                                <div className="rounded-lg border border-zinc-700 p-3">
                                    <span className="text-xs font-medium text-zinc-400 block mb-2">Notes</span>
                                    <textarea
                                        className="w-full h-32 bg-zinc-800/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200 resize-none"
                                        placeholder="Enter notes..."
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
            {showDutyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b border-zinc-800">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield className="w-6 h-6 text-blue-500" />
                                    Go On Duty (10-8)
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowDutyModal(false)}
                                    className="text-zinc-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5 text-zinc-500" /> Callsign (Позывной)
                                        </Label>
                                        <Input
                                            placeholder="e.g. 1A-12"
                                            value={callSign}
                                            onChange={(e) => setCallSign(e.target.value.toUpperCase())}
                                            className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5 text-zinc-500" /> Subdivision (Отдел)
                                        </Label>
                                        <Input
                                            placeholder="e.g. Traffic"
                                            value={subdivision}
                                            onChange={(e) => setSubdivision(e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                            <Car className="w-3.5 h-3.5 text-zinc-500" /> Vehicle (Автомобиль)
                                        </Label>
                                        <Input
                                            placeholder="e.g. Explorer"
                                            value={vehicleModel}
                                            onChange={(e) => setVehicleModel(e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                            <FileSearch className="w-3.5 h-3.5 text-zinc-500" /> Plate (Гос. номер)
                                        </Label>
                                        <Input
                                            placeholder="e.g. 89ABC123"
                                            value={vehiclePlate}
                                            onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                                            className="bg-zinc-800 border-zinc-700 text-white h-9 text-sm font-mono"
                                        />
                                    </div>
                                </div>
                                
                                <div className="h-px bg-zinc-800 w-full my-2" />

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-zinc-300">Select Character</Label>
                                    {characters.length === 0 ? (
                                        <div className="p-4 rounded-lg bg-zinc-800/30 border border-dashed border-zinc-700 text-center">
                                            <p className="text-sm text-zinc-500">No police characters found.</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            {characters.map((char) => {
                                                const policeMember = char.departmentMembers?.find(m => m.isActive && m.department?.type === 'police');
                                                return (
                                                    <button
                                                        key={char.id}
                                                        onClick={() => setSelectedCharacter(char.id)}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${selectedCharacter === char.id
                                                            ? 'bg-blue-600/10 border-blue-500 text-white'
                                                            : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'
                                                            }`}
                                                    >
                                                        <div className={`p-2 rounded-full ${selectedCharacter === char.id ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-500'}`}>
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="font-medium">{char.firstName} {char.lastName}</p>
                                                                {policeMember?.rank?.isSupervisor && (
                                                                    <Shield className="w-3 h-3 text-yellow-500" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                                                    {policeMember?.rank?.name || 'Officer'}
                                                                </p>
                                                                <span className="text-zinc-700">•</span>
                                                                <p className="text-xs text-blue-400 font-mono">
                                                                    {policeMember?.callSign || policeMember?.badgeNumber || 'No ID'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {selectedCharacter === char.id && (
                                                            <CheckCircle className="w-5 h-5 ml-auto text-blue-500" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                                    onClick={() => setShowDutyModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                                    onClick={handleDutyStart}
                                    disabled={!selectedCharacter || isSubmitting}
                                >
                                    {isSubmitting ? 'Loading...' : 'Save'}
                                </Button>
                            </div>
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
        </div>
    );
}