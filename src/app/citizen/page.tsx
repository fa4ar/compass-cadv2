"use client";

import React, { useState, useEffect } from 'react';
import { User, RefreshCw, Plus, X, Loader2, ChevronDown, Eye, Pencil, Trash2, Phone, FileText, AlertTriangle, Car, Shield } from 'lucide-react';
import { CreateCharacterModal } from './components/CreateCharacterModal';
import { ViewCharacterModal } from './components/ViewCharacterModal';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ImageUpload';

interface Vehicle {
    id: number;
    plate: string;
    model: string;
    color: string;
    status: string;
}

interface Weapon {
    id: number;
    serial: string;
    model: string;
    status: string;
}

interface Character {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    nickname?: string;
    photoUrl?: string;
    gender?: string;
    status?: string;
    isAlive: boolean;
    birthDate?: string;
    height?: number;
    weight?: number;
    description?: string;
    ssn?: string;
    job?: {
        id: number;
        name: string;
        slug: string;
    };
    departmentMembers?: DepartmentMember[];
}

interface DepartmentMember {
    id: number;
    departmentId: number;
    rankId: number;
    badgeNumber: string;
    callSign?: string;
    division?: string;
    isActive: boolean;
    department?: {
        id: number;
        name: string;
        code: string;
        type: string;
    };
    rank?: {
        id: number;
        name: string;
        shortName?: string;
    };
}

interface Department {
    id: number;
    name: string;
    code: string;
    type: string;
    isActive?: boolean;
    ranks?: DepartmentRank[];
}

interface DepartmentRank {
    id: number;
    name: string;
    shortName?: string;
    level: number;
}


export default function CitizenPage() {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDepartmentModal, setShowDepartmentModal] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [callForm, setCallForm] = useState({
        callerName: '',
        location: '',
        description: '',
        phoneNumber: ''
    });

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        nickname: '',
        birthDate: '',
        gender: '' as 'male' | 'female' | 'other' | '',
        height: '',
        weight: '',
        description: '',
        photoUrl: '', // Теперь будет обязательным
    });

    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        nickname: '',
        birthDate: '',
        gender: '' as 'male' | 'female' | 'other' | '',
        height: '',
        weight: '',
        description: '',
        ssn: '',
    });

    const generateSSN = () => {
        const area = Math.floor(Math.random() * 899) + 100;
        const group = Math.floor(Math.random() * 99).toString().padStart(2, '0');
        const serial = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `${area}-${group}-${serial}`;
    };

    const [departmentForm, setDepartmentForm] = useState({
        departmentId: '',
        rankId: '',
        badgeNumber: '',
        callSign: '',
        division: '',
    });

    const [charVehicles, setCharVehicles] = useState<Vehicle[]>([]);
    const [charWeapons, setCharWeapons] = useState<Weapon[]>([]);
    const [charLicenses, setCharLicenses] = useState<any[]>([]);
    const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
    const [showVehicleModal, setShowVehicleModal] = useState(false);
    const [showWeaponModal, setShowWeaponModal] = useState(false);
    const [showLicenseModal, setShowLicenseModal] = useState(false);
    const [vehicleForm, setVehicleForm] = useState({ plate: '', model: '', color: '', imageUrl: '' });
    const [weaponForm, setWeaponForm] = useState({ serial: '', model: '' });

    const fetchCivilianData = async (charId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const [vRes, wRes, lRes, aRes] = await Promise.all([
                fetch(`${apiUrl}/api/civilian/characters/${charId}/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/civilian/characters/${charId}/weapons`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/civilian/characters/${charId}/licenses`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/civilian/licenses`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (vRes.ok) setCharVehicles(await vRes.json());
            if (wRes.ok) setCharWeapons(await wRes.json());
            if (lRes.ok) setCharLicenses(await lRes.json());
            if (aRes.ok) setAvailableLicenses(await aRes.json());
        } catch (err) {
            console.error("Failed to fetch civilian data", err);
        }
    };

    const fetchCharacters = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setIsLoading(false);
                return;
            }
            
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/characters`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setCharacters(data);
            }
        } catch (err) {
            console.error("Failed to load characters", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;
            
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/departments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setDepartments(data);
            }
        } catch (err) {
            console.error("Failed to load departments", err);
        }
    };

    useEffect(() => {
        fetchCharacters();
        fetchDepartments();
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchCharacters();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/characters/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast({ title: "Character created", description: `${formData.firstName} ${formData.lastName}`, variant: "success" });
                setShowCreateModal(false);
                setFormData({
                    firstName: '', lastName: '', middleName: '', nickname: '',
                    birthDate: '', gender: '', height: '', weight: '', description: '', photoUrl: ''
                });
                fetchCharacters();
            }
        } catch (err) {
            console.error("Failed to create character", err);
            toast({ title: "Error", description: "Failed to create character", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCall911Submit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/calls911/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(callForm)
            });

            if (res.ok) {
                toast({ title: "Call placed", description: "911 call has been placed successfully", variant: "success" });
                setShowCallModal(false);
                setCallForm({ callerName: '', location: '', description: '', phoneNumber: '' });
            }
        } catch (err) {
            console.error("Failed to place 911 call", err);
            toast({ title: "Error", description: "Failed to place 911 call", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const viewCharacter = async (char: Character) => {
        setSelectedCharacter(char);
        setShowViewModal(true);
        await fetchCivilianData(char.id);
    };

    const handleVehicleSubmit = async () => {
        if (!selectedCharacter || !vehicleForm.plate || !vehicleForm.model) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/civilian/vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...vehicleForm, characterId: selectedCharacter.id })
            });
            if (res.ok) {
                toast({ title: "Vehicle Registered", description: `Plate: ${vehicleForm.plate}`, variant: "success" });
                setShowVehicleModal(false);
                setVehicleForm({ plate: '', model: '', color: '', imageUrl: '' });
                fetchCivilianData(selectedCharacter.id);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to register vehicle", variant: "destructive" });
        } finally { setIsSubmitting(false); }
    };

    const handleWeaponSubmit = async () => {
        if (!selectedCharacter || !weaponForm.serial || !weaponForm.model) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/civilian/weapons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...weaponForm, characterId: selectedCharacter.id })
            });
            if (res.ok) {
                toast({ title: "Weapon Registered", description: `Serial: ${weaponForm.serial}`, variant: "success" });
                setShowWeaponModal(false);
                setWeaponForm({ serial: '', model: '' });
                fetchCivilianData(selectedCharacter.id);
            }
        } catch (err) {
            toast({ title: "Error", description: "Failed to register weapon", variant: "destructive" });
        } finally { setIsSubmitting(false); }
    };

    const deleteVehicle = async (id: number) => {
        if (!confirm("Are you sure you want to unregister this vehicle?")) return;
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/civilian/vehicles/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && selectedCharacter) fetchCivilianData(selectedCharacter.id);
        } catch (err) { console.error(err); }
    };

    const deleteWeapon = async (id: number) => {
        if (!confirm("Are you sure you want to unregister this weapon?")) return;
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/civilian/weapons/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok && selectedCharacter) fetchCivilianData(selectedCharacter.id);
        } catch (err) { console.error(err); }
    };

    const toggleVehicleStatus = async (id: number, currentStatus: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const newStatus = currentStatus === 'Valid' ? 'Inactive' : 'Valid';
            await fetch(`${apiUrl}/api/civilian/vehicles/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (selectedCharacter) fetchCivilianData(selectedCharacter.id);
        } catch (err) { console.error(err); }
    };

    const toggleWeaponStatus = async (id: number, currentStatus: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const newStatus = currentStatus === 'Valid' ? 'Inactive' : 'Valid';
            await fetch(`${apiUrl}/api/civilian/weapons/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (selectedCharacter) fetchCivilianData(selectedCharacter.id);
        } catch (err) { console.error(err); }
    };

    const handleLicenseAdd = async (licenseId: number) => {
        if (!selectedCharacter) return;
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/civilian/characters/${selectedCharacter.id}/licenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ characterId: selectedCharacter.id, licenseId })
            });
            if (res.ok) fetchCivilianData(selectedCharacter.id);
        } catch (err) { console.error(err); }
    };

    const handleLicenseRemove = async (licenseId: number) => {
        if (!selectedCharacter) return;
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/civilian/characters/${selectedCharacter.id}/licenses/${licenseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchCivilianData(selectedCharacter.id);
        } catch (err) { console.error(err); }
    };

    const getStatusColor = (status?: string, isAlive?: boolean) => {
        if (!isAlive) return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
        switch (status?.toLowerCase()) {
            case 'active': return { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
            case 'suspended': return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
            case 'incarcerated': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
            case 'vacation': return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' };
            default: return { bg: 'bg-zinc-500/20', text: 'text-zinc-400', border: 'border-zinc-500/30' };
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('ru-RU');
    };

    const getImageUrl = (photoUrl?: string) => {
        if (!photoUrl) return null;
        if (photoUrl.startsWith('http')) return photoUrl;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return `${apiUrl}${photoUrl}`;
    };

    const openCreateModal = () => {
        setShowCreateModal(true);
        setStep(1);
        setFormData({
            firstName: '', lastName: '', middleName: '', nickname: '',
            birthDate: '', gender: '', height: '', weight: '', description: '', photoUrl: ''
        });
    };

    const openEditModal = (char: Character) => {
        setSelectedCharacter(char);
        setEditForm({
            firstName: char.firstName,
            lastName: char.lastName,
            middleName: char.middleName || '',
            nickname: char.nickname || '',
            birthDate: char.birthDate ? char.birthDate.split('T')[0] : '',
            gender: char.gender as 'male' | 'female' | 'other' | '',
            height: char.height?.toString() || '',
            weight: char.weight?.toString() || '',
            description: char.description || '',
            ssn: char.ssn || '',
        });
        setShowEditModal(true);
        setShowViewModal(false);
    };

    const handleEditSubmit = async () => {
        if (!selectedCharacter) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/characters/${selectedCharacter.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    firstName: editForm.firstName,
                    lastName: editForm.lastName,
                    middleName: editForm.middleName || null,
                    nickname: editForm.nickname || null,
                    birthDate: editForm.birthDate || null,
                    gender: editForm.gender || null,
                    height: editForm.height ? parseInt(editForm.height) : null,
                    weight: editForm.weight ? parseInt(editForm.weight) : null,
                    description: editForm.description || null,
                    ssn: editForm.ssn || null,
                })
            });

            if (res.ok) {
                toast({ title: "Character updated", description: `${editForm.firstName} ${editForm.lastName}`, variant: "success" });
                setShowEditModal(false);
                fetchCharacters();
            }
        } catch (err) {
            console.error("Failed to update character", err);
            toast({ title: "Error", description: "Failed to update character", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCharacter = async () => {
        if (!selectedCharacter) return;
        if (!confirm(`Are you sure you want to delete ${selectedCharacter.firstName} ${selectedCharacter.lastName}?`)) return;
        
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/characters/${selectedCharacter.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                toast({ title: "Character deleted", description: `${selectedCharacter.firstName} ${selectedCharacter.lastName}`, variant: "success" });
                setShowViewModal(false);
                fetchCharacters();
            }
        } catch (err) {
            console.error("Failed to delete character", err);
            toast({ title: "Error", description: "Failed to delete character", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openDepartmentModal = (char: Character) => {
        setSelectedCharacter(char);
        const activeMember = char.departmentMembers?.find(m => m.isActive);
        if (activeMember) {
            setDepartmentForm({
                departmentId: activeMember.departmentId.toString(),
                rankId: activeMember.rankId.toString(),
                badgeNumber: activeMember.badgeNumber || '',
                callSign: activeMember.callSign || '',
                division: activeMember.division || '',
            });
        } else {
            setDepartmentForm({
                departmentId: '',
                rankId: '',
                badgeNumber: '',
                callSign: '',
                division: '',
            });
        }
        setShowDepartmentModal(true);
        setShowViewModal(false);
    };

    const handleDepartmentSubmit = async () => {
        if (!selectedCharacter || !departmentForm.departmentId || !departmentForm.rankId) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            
            const res = await fetch(`${apiUrl}/api/departments/${departmentForm.departmentId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId: parseInt(selectedCharacter.id),
                    rankId: parseInt(departmentForm.rankId),
                    badgeNumber: departmentForm.badgeNumber || undefined,
                    callSign: departmentForm.callSign || undefined,
                    division: departmentForm.division || undefined,
                })
            });

            if (res.ok) {
                toast({ title: "Department assigned", description: "Character assigned to department", variant: "success" });
                setShowDepartmentModal(false);
                fetchCharacters();
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error || "Failed to assign department", variant: "destructive" });
            }
        } catch (err) {
            console.error("Failed to assign department", err);
            toast({ title: "Error", description: "Failed to assign department", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedDepartment = departments.find(d => d.id === parseInt(departmentForm.departmentId));

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            <div className="flex-1 overflow-auto p-4 md:p-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : characters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
                        <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                            <User className="w-10 h-10 text-zinc-600" />
                        </div>
                        <p className="text-lg font-medium text-zinc-300">No characters yet</p>
                        <p className="text-sm mt-1 text-zinc-500">Create your first character to get started</p>
                        <Button onClick={openCreateModal} className="mt-6 bg-blue-600 hover:bg-blue-500 px-6">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Character
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-zinc-100">My Characters</h2>
                                <p className="text-sm text-zinc-500 mt-1">{characters.length} character{characters.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={handleRefresh} className="bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800">
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                                <Button onClick={() => setShowCallModal(true)} className="bg-red-600 hover:bg-red-500">
                                    <Phone className="w-4 h-4 mr-2" />
                                    Call 911
                                </Button>
                                <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-500">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Character
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {characters.map((char) => {
                                const imgUrl = getImageUrl(char.photoUrl);
                                const isAlive = char.isAlive !== false;
                                const birthDate = char.birthDate ? new Date(char.birthDate) : null;
                                const age = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
                                return (
                                    <div 
                                        key={char.id} 
                                        className="relative bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-all cursor-pointer"
                                        onClick={() => viewCharacter(char)}
                                    >
                                        {/* Status strip */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isAlive ? 'bg-green-500' : 'bg-red-500'}`} />
                                        
                                        {/* Photo */}
                                        <div className="aspect-[3/4] bg-zinc-800 overflow-hidden">
                                            {imgUrl ? (
                                                <img src={imgUrl} alt={`${char.firstName} ${char.lastName}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                            {!isAlive && <div className="absolute inset-0 bg-red-950/40" />}
                                        </div>
                                        
                                        {/* Info */}
                                        <div className="p-2 space-y-1">
                                            <h3 className="font-semibold text-white text-sm truncate">{char.firstName} {char.lastName}</h3>
                                            {birthDate && (
                                                <p className="text-[10px] text-zinc-500">
                                                    {birthDate.toLocaleDateString('ru-RU')} {age ? `(${age}y)` : ''}
                                                </p>
                                            )}
                                            {char.job && <p className="text-[10px] text-zinc-400 truncate">{char.job.name}</p>}
                                            {char.description && <p className="text-[9px] text-zinc-500 truncate">{char.description}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            <CreateCharacterModal 
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                step={step}
                setStep={setStep}
                formData={formData}
                handleInputChange={handleInputChange}
                setFormData={setFormData}
                handleCreateSubmit={handleCreateSubmit}
                isSubmitting={isSubmitting}
            />

            {showCallModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-center p-5 border-b border-zinc-800">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-zinc-100">Call 911</h2>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowCallModal(false)} className="text-zinc-400 hover:text-zinc-100">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        
                        <div className="p-5 space-y-4">
                            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                <span className="text-sm text-red-400">Emergency calls are monitored by dispatchers</span>
                            </div>

                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Your Name *</Label>
                                <Input 
                                    value={callForm.callerName}
                                    onChange={(e) => setCallForm(prev => ({ ...prev, callerName: e.target.value }))}
                                    placeholder="Enter your name"
                                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                                />
                            </div>

                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Location *</Label>
                                <Input 
                                    value={callForm.location}
                                    onChange={(e) => setCallForm(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="Street address or description"
                                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                                />
                            </div>

                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Phone Number</Label>
                                <Input 
                                    value={callForm.phoneNumber}
                                    onChange={(e) => setCallForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                    placeholder="(555) 123-4567"
                                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                                />
                            </div>

                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Description *</Label>
                                <textarea 
                                    value={callForm.description}
                                    onChange={(e) => setCallForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    placeholder="Describe the emergency..."
                                    className="mt-1 w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between p-5 border-t border-zinc-800">
                            <Button variant="ghost" onClick={() => setShowCallModal(false)} className="text-zinc-400">
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleCall911Submit} 
                                disabled={isSubmitting || !callForm.callerName || !callForm.location || !callForm.description}
                                className="bg-red-600 hover:bg-red-500 px-6"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <Phone className="w-4 h-4 mr-2" />
                                Place Call
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <ViewCharacterModal 
                show={showViewModal}
                character={selectedCharacter}
                onClose={() => setShowViewModal(false)}
                getImageUrl={getImageUrl}
                getStatusColor={getStatusColor}
                formatDate={formatDate}
                charLicenses={charLicenses}
                charVehicles={charVehicles}
                charWeapons={charWeapons}
                toggleVehicleStatus={toggleVehicleStatus}
                toggleWeaponStatus={toggleWeaponStatus}
                deleteVehicle={deleteVehicle}
                deleteWeapon={deleteWeapon}
                openEditModal={openEditModal}
                openDepartmentModal={openDepartmentModal}
                handleDeleteCharacter={handleDeleteCharacter}
                setShowLicenseModal={setShowLicenseModal}
                setShowVehicleModal={setShowVehicleModal}
                setShowWeaponModal={setShowWeaponModal}
            />
        {showLicenseModal && selectedCharacter && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                <Card className="bg-zinc-900 border-zinc-800 w-full max-w-sm shadow-2xl">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold">Управление лицензиями</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowLicenseModal(false)}><X /></Button>
                    </div>
                    <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                        {availableLicenses.map(license => {
                            const hasLicense = charLicenses.some(cl => cl.licenseId === license.id);
                            return (
                                <div key={license.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">{license.name}</p>
                                        <p className="text-[10px] text-zinc-500">{license.type}</p>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant={hasLicense ? "destructive" : "default"}
                                        className={hasLicense ? "h-8 px-3" : "h-8 px-3 bg-blue-600 hover:bg-blue-500"}
                                        onClick={() => hasLicense ? handleLicenseRemove(license.id) : handleLicenseAdd(license.id)}
                                    >
                                        {hasLicense ? "Отозвать" : "Выдать"}
                                    </Button>
                                </div>
                            );
                        })}
                        {availableLicenses.length === 0 && (
                            <p className="text-center text-zinc-500 py-4">Доступных лицензий не найдено</p>
                        )}
                    </div>
                </Card>
            </div>
        )}

        {/* Vehicle Registration Modal */}
        {showVehicleModal && selectedCharacter && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                <Card className="bg-zinc-900 border-zinc-800 w-full max-w-sm shadow-2xl">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2">
                            <Car className="w-5 h-5 text-blue-500" />
                            Register Vehicle
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowVehicleModal(false)}><X /></Button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <Label className="text-xs text-zinc-500 uppercase">License Plate</Label>
                            <Input 
                                className="bg-zinc-800 border-zinc-700 font-mono uppercase" 
                                placeholder="88XYZ999"
                                value={vehicleForm.plate}
                                onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-500 uppercase">Model</Label>
                            <Input 
                                className="bg-zinc-800 border-zinc-700" 
                                placeholder="Vapid Stanier"
                                value={vehicleForm.model}
                                onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-500 uppercase">Color</Label>
                            <Input 
                                className="bg-zinc-800 border-zinc-700" 
                                placeholder="Black"
                                value={vehicleForm.color}
                                onChange={e => setVehicleForm({...vehicleForm, color: e.target.value})}
                            />
                        </div>
                        <ImageUpload 
                            label="Vehicle Photo"
                            currentValue={vehicleForm.imageUrl}
                            onUploadSuccess={(url) => setVehicleForm({...vehicleForm, imageUrl: url})}
                        />
                        <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={handleVehicleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                            Register Vehicle
                        </Button>
                    </div>
                </Card>
            </div>
        )}

        {/* Weapon Registration Modal */}
        {showWeaponModal && selectedCharacter && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
                <Card className="bg-zinc-900 border-zinc-800 w-full max-w-sm shadow-2xl">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-500" />
                            Register Weapon
                        </h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowWeaponModal(false)}><X /></Button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <Label className="text-xs text-zinc-500 uppercase">Model</Label>
                            <Input 
                                className="bg-zinc-800 border-zinc-700" 
                                placeholder="Combat Pistol"
                                value={weaponForm.model}
                                onChange={e => setWeaponForm({...weaponForm, model: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-zinc-500 uppercase">Serial Number</Label>
                            <Input 
                                className="bg-zinc-800 border-zinc-700 font-mono uppercase" 
                                placeholder="SN-XXXX-XXXX"
                                value={weaponForm.serial}
                                onChange={e => setWeaponForm({...weaponForm, serial: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={handleWeaponSubmit} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                            Register Weapon
                        </Button>
                    </div>
                </Card>
            </div>
        )}

        {showEditModal && selectedCharacter && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg shadow-2xl">
                    <div className="flex justify-between items-center p-5 border-b border-zinc-800">
                        <h2 className="text-xl font-bold text-zinc-100">Edit Character</h2>
                        <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-zinc-100">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">First Name *</Label>
                                <Input 
                                    value={editForm.firstName} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                    placeholder="John" 
                                    className="mt-1 bg-zinc-800/50 border-zinc-700" 
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">M.I.</Label>
                                <Input 
                                    value={editForm.middleName} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, middleName: e.target.value }))}
                                    placeholder="A." 
                                    className="mt-1 bg-zinc-800/50 border-zinc-700" 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Last Name *</Label>
                                <Input 
                                    value={editForm.lastName} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                    placeholder="Doe" 
                                    className="mt-1 bg-zinc-800/50 border-zinc-700" 
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Nickname</Label>
                                <Input 
                                    value={editForm.nickname} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                                    placeholder="Johnny" 
                                    className="mt-1 bg-zinc-800/50 border-zinc-700" 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Birth Date</Label>
                                <Input 
                                    type="date" 
                                    value={editForm.birthDate} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, birthDate: e.target.value }))}
                                    className="mt-1 bg-zinc-800/50 border-zinc-700" 
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Gender</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="mt-1 w-full justify-between bg-zinc-800/50 border-zinc-700">
                                            <span className={editForm.gender ? 'text-zinc-200' : 'text-zinc-500'}>
                                                {editForm.gender || 'Select...'}
                                            </span>
                                            <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                                        <DropdownMenuItem onClick={() => setEditForm(prev => ({ ...prev, gender: 'male' }))} className="text-zinc-200 focus:bg-zinc-700">Male</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setEditForm(prev => ({ ...prev, gender: 'female' }))} className="text-zinc-200 focus:bg-zinc-700">Female</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setEditForm(prev => ({ ...prev, gender: 'other' }))} className="text-zinc-200 focus:bg-zinc-700">Other</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Height (cm)</Label>
                                <Input 
                                    type="number" 
                                    value={editForm.height} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, height: e.target.value }))}
                                    placeholder="180" 
                                    className="mt-1 bg-zinc-800/50 border-zinc-700" 
                                />
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Weight (kg)</Label>
                                <Input 
                                    type="number" 
                                    value={editForm.weight} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                                    placeholder="80" 
                                    className="mt-1 bg-zinc-800/50 border-zinc-700" 
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase tracking-wide">Description</Label>
                            <textarea 
                                value={editForm.description} 
                                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                placeholder="Physical appearance, distinguishing marks, bio..."
                                className="mt-1 w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-600"
                            />
                        </div>
                        
                        <div>
                            <Label className="text-zinc-400 text-xs uppercase tracking-wide">SSN (Social Security Number)</Label>
                            <div className="flex gap-2 mt-1">
                                <Input 
                                    value={editForm.ssn} 
                                    onChange={(e) => setEditForm(prev => ({ ...prev, ssn: e.target.value }))}
                                    placeholder="XXX-XX-XXXX"
                                    className="bg-zinc-800/50 border-zinc-700"
                                />
                                <Button 
                                    type="button"
                                    variant="outline" 
                                    onClick={() => setEditForm(prev => ({ ...prev, ssn: generateSSN() }))}
                                    className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700"
                                >
                                    Generate
                                </Button>
                            </div>
                        </div>
                    </div>

                        <div className="flex justify-between p-5 border-t border-zinc-800">
                        <Button variant="ghost" onClick={() => setShowEditModal(false)} className="text-zinc-400">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleEditSubmit} 
                            disabled={isSubmitting || !editForm.firstName || !editForm.lastName}
                            className="bg-emerald-600 hover:bg-emerald-500 px-6"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </Card>
            </div>
        )}

        {showDepartmentModal && selectedCharacter && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg shadow-2xl">
                    <div className="flex justify-between items-center p-5 border-b border-zinc-800">
                        <h2 className="text-xl font-bold text-zinc-100">Assign Department</h2>
                        <Button variant="ghost" size="sm" onClick={() => setShowDepartmentModal(false)} className="text-zinc-400 hover:text-zinc-100">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    <div className="p-5 space-y-4">
                        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                            <p className="text-sm text-blue-400">
                                Assigning to: <span className="font-medium text-zinc-200">{selectedCharacter.firstName} {selectedCharacter.lastName}</span>
                            </p>
                        </div>

                        <div>
                            <Label className="text-zinc-400 text-xs uppercase tracking-wide">Department *</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="mt-1 w-full justify-between bg-zinc-800/50 border-zinc-700">
                                        <span className={departmentForm.departmentId ? 'text-zinc-200' : 'text-zinc-500'}>
                                            {departmentForm.departmentId 
                                                ? departments.find(d => d.id === parseInt(departmentForm.departmentId))?.name || 'Select...'
                                                : 'Select department...'}
                                        </span>
                                        <ChevronDown className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-800 border-zinc-700 max-h-60 overflow-y-auto">
                                    {departments.filter(d => d.isActive !== false).map(dept => (
                                        <DropdownMenuItem 
                                            key={dept.id} 
                                            onClick={() => setDepartmentForm(prev => ({ ...prev, departmentId: dept.id.toString(), rankId: '' }))}
                                            className="text-zinc-200 focus:bg-zinc-700"
                                        >
                                            {dept.name} ({dept.code})
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {departmentForm.departmentId && selectedDepartment && (
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Rank *</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="mt-1 w-full justify-between bg-zinc-800/50 border-zinc-700">
                                            <span className={departmentForm.rankId ? 'text-zinc-200' : 'text-zinc-500'}>
                                                {departmentForm.rankId 
                                                    ? selectedDepartment.ranks?.find(r => r.id === parseInt(departmentForm.rankId))?.name || 'Select...'
                                                    : 'Select rank...'}
                                            </span>
                                            <ChevronDown className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                                        {selectedDepartment.ranks?.map(rank => (
                                            <DropdownMenuItem 
                                                key={rank.id} 
                                                onClick={() => setDepartmentForm(prev => ({ ...prev, rankId: rank.id.toString() }))}
                                                className="text-zinc-200 focus:bg-zinc-700"
                                            >
                                                {rank.name} (Level {rank.level})
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}

                        <div>
                            <Label className="text-zinc-400 text-xs uppercase tracking-wide">Badge Number</Label>
                            <Input 
                                value={departmentForm.badgeNumber} 
                                onChange={(e) => setDepartmentForm(prev => ({ ...prev, badgeNumber: e.target.value }))}
                                placeholder="Auto-generated if empty"
                                className="mt-1 bg-zinc-800/50 border-zinc-700"
                            />
                        </div>

                        <div>
                            <Label className="text-zinc-400 text-xs uppercase tracking-wide">Call Sign</Label>
                            <Input 
                                value={departmentForm.callSign} 
                                onChange={(e) => setDepartmentForm(prev => ({ ...prev, callSign: e.target.value }))}
                                placeholder="Optional"
                                className="mt-1 bg-zinc-800/50 border-zinc-700"
                            />
                        </div>

                        <div>
                            <Label className="text-zinc-400 text-xs uppercase tracking-wide">Division</Label>
                            <Input 
                                value={departmentForm.division} 
                                onChange={(e) => setDepartmentForm(prev => ({ ...prev, division: e.target.value }))}
                                placeholder="Optional"
                                className="mt-1 bg-zinc-800/50 border-zinc-700"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between p-5 border-t border-zinc-800">
                        <Button variant="ghost" onClick={() => setShowDepartmentModal(false)} className="text-zinc-400">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleDepartmentSubmit} 
                            disabled={isSubmitting || !departmentForm.departmentId || !departmentForm.rankId}
                            className="bg-blue-600 hover:bg-blue-500 px-6"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Assign to Department
                        </Button>
                    </div>
                </Card>
            </div>
        )}
    </div>
);
}
