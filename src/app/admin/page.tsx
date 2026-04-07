'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
    Users, Shield, Building2, UserPlus, Ban, Settings, 
    Plus, X, Save, Trash2, User, ChevronRight, Star, Edit, UserCog, PhoneCall, FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { clearClientCaches, invalidateClientCache } from '@/lib/cache';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface User {
    id: number;
    username: string;
    email: string;
    discordId?: string;
    isBanned: boolean;
    banReason?: string;
    lastLogin?: string;
    createdAt: string;
}

interface Department {
    id: number;
    name: string;
    code: string;
    type: string;
    description?: string;
    motto?: string;
    isActive: boolean;
    _count?: { members: number; vehicles: number };
    ranks?: DepartmentRank[];
    members?: DepartmentMember[];
}

interface DepartmentRank {
    id: number;
    name: string;
    shortName?: string;
    level: number;
    isSupervisor: boolean;
    isChief: boolean;
    isCommand?: boolean;
    salary?: number;
    description?: string;
}

interface DepartmentMember {
    id: number;
    badgeNumber: string;
    callSign?: string;
    division?: string;
    isActive: boolean;
    joinedAt: string;
    character: {
        id: number;
        firstName: string;
        lastName: string;
        slug: string;
    };
    rank: DepartmentRank;
}

interface Character {
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string;
    nickname?: string;
    slug: string;
    birthDate: string;
    gender: string;
    height?: number;
    weight?: number;
    description?: string;
    status: string;
    isAlive: boolean;
    balance: number;
    bankBalance: number;
    user: {
        id: number;
        username: string;
    };
    departmentMembers: {
        department: {
            id: number;
            name: string;
        };
    }[];
}

interface ClosedCall911 {
    id: number;
    callerName: string;
    location: string;
    description: string;
    status: string;
    userUsername?: string;
    userDiscordId?: string;
    userAvatarUrl?: string;
    createdAt: string;
    updatedAt: string;
    caller?: {
        user?: {
            id: number;
            username: string;
            discordId?: string;
            avatarUrl?: string;
        };
    };
    notes?: {
        id: number;
        author: string;
        text: string;
        createdAt: string;
    }[];
}

type Tab = 'users' | 'departments' | 'characters' | 'closedCalls911' | 'settings';

const DEPARTMENT_TYPES = [
    { value: 'police', label: 'Police' },
    { value: 'ems', label: 'EMS' },
    { value: 'fire', label: 'Fire' },
    { value: 'dispatcher', label: 'Dispatcher' },
    { value: 'civilian', label: 'Civilian' },
];

const ADMIN_ACTIONS = {
    users: {
        ban: 'Забанить пользователя. Пользователь не сможет войти в систему.',
        unban: 'Разбанить пользователя. Пользователь восстановит доступ.',
    },
    departments: {
        create: 'Создать новый департамент. Укажите название, код и тип.',
        edit: 'Редактировать информацию о департаменте.',
        delete: 'Деактивировать департамент. Данные будут сохранены.',
    },
    ranks: {
        create: 'Создать новое звание в департаменте.',
        edit: 'Редактировать звание. Изменить название, уровень, зарплату.',
        delete: 'Удалить звание. Все члены с этим званием потеряют его.',
        supervisor: 'Супервайзер может управлять подчиненными и выдавать задачи.',
        chief: 'Глава департамента имеет максимальные полномочия.',
    },
    members: {
        add: 'Добавить персонажа в департамент. Назначить звание и номер бейджа.',
        edit: 'Изменить звание, номер бейджа или позывной участника.',
        remove: 'Удалить участника из департамента. Данные будут сохранены.',
    },
    characters: {
        edit: 'Редактировать персонажа. Изменить имя, фамилию, статус и другие данные.',
        delete: 'Удалить персонажа. Все данные будут удалены безвозвратно.',
        view: 'Просмотр детальной информации о персонаже.',
    }
};

export default function AdminPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [closedCalls911, setClosedCalls911] = useState<ClosedCall911[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [betaTestEnabled, setBetaTestEnabled] = useState(false);

    const [showUserModal, setShowUserModal] = useState(false);
    const [showDepartmentModal, setShowDepartmentModal] = useState(false);
    const [showRankModal, setShowRankModal] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showCharacterModal, setShowCharacterModal] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedMember, setSelectedMember] = useState<DepartmentMember | null>(null);
    const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
    const [selectedClosedCall911, setSelectedClosedCall911] = useState<ClosedCall911 | null>(null);

    const [userForm, setUserForm] = useState({ action: 'ban', reason: '' });
    const [departmentForm, setDepartmentForm] = useState({
        name: '', code: '', type: 'police', description: '', motto: ''
    });
    const [rankForm, setRankForm] = useState({
        name: '', shortName: '', level: 1, salary: 0, isSupervisor: false, isChief: false
    });
    const [memberForm, setMemberForm] = useState({
        characterId: '', rankId: '', badgeNumber: '', callSign: '', division: ''
    });
    const [characterForm, setCharacterForm] = useState({
        firstName: '', lastName: '', middleName: '', nickname: '', 
        birthDate: '', gender: 'male', height: '', weight: '',
        description: '', status: 'active', isAlive: true, balance: 0, bankBalance: 0
    });

    useEffect(() => {
        if (!authLoading && (!user || !user.roles?.includes('admin'))) {
            router.push('/unauthorized');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (user && user.roles?.includes('admin')) {
            fetchData();
            fetchBetaTestSettings();
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'closedCalls911') {
            fetchClosedCalls911();
        }
    }, [activeTab]);

    const fetchClosedCalls911 = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/calls911/closed`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setClosedCalls911(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch closed calls 911:', err);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const [usersRes, depsRes, charsRes] = await Promise.all([
                fetch(`${apiUrl}/api/users`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/departments?includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/characters/all`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (depsRes.ok) setDepartments(await depsRes.json());
            if (charsRes.ok) setCharacters(await charsRes.json());
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBetaTestSettings = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/settings/beta-test`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBetaTestEnabled(data.enabled);
            }
        } catch (err) {
            console.error('Failed to fetch beta test settings:', err);
        }
    };

    const handleBetaTestToggle = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/settings/beta-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ enabled: !betaTestEnabled })
            });

            if (res.ok) {
                const data = await res.json();
                setBetaTestEnabled(data.enabled);
                await invalidateClientCache(['/api/settings/beta-test']);
                toast({ 
                    title: data.enabled ? 'BETA TEST включен' : 'BETA TEST выключен', 
                    description: data.enabled 
                        ? 'Теперь доступ ограничен ролью из ENV' 
                        : 'Все страницы доступны всем авторизованным' 
                });
            }
        } catch (err) {
            toast({ title: 'Ошибка', description: 'Не удалось изменить настройку', variant: 'destructive' });
        }
    };

    const handleForceClearCache = async () => {
        setIsClearingCache(true);
        try {
            await clearClientCaches();
            toast({
                title: 'Кэш очищен',
                description: 'Клиентский кэш сброшен, страница будет обновлена.',
            });
            window.location.reload();
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось очистить клиентский кэш',
                variant: 'destructive',
            });
        } finally {
            setIsClearingCache(false);
        }
    };

    const fetchDepartmentDetails = async (deptId: number) => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/departments/${deptId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const dept = await res.json();
                setSelectedDepartment(dept);
            }
        } catch (err) {
            console.error('Failed to fetch department details:', err);
        }
    };

    const handleDeleteClosedCall911 = async (callId: number) => {
        if (!confirm('Вы уверены, что хотите удалить этот вызов 911? Это действие необратимо.')) {
            return;
        }

        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/calls911/${callId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast({ title: 'Успешно', description: 'Вызов 911 удален' });
                setSelectedClosedCall911(null);
                await invalidateClientCache([`${apiUrl}/api/calls911/closed`, `${apiUrl}/api/calls911/${callId}`]);
                fetchClosedCalls911();
            } else {
                toast({ title: 'Ошибка', description: 'Не удалось удалить вызов', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Ошибка', description: 'Не удалось удалить вызов', variant: 'destructive' });
        }
    };

    const handleUserAction = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token || !selectedUser) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/users/${selectedUser.id}/ban`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    ban: userForm.action === 'ban',
                    reason: userForm.reason 
                })
            });

            if (res.ok) {
                toast({ title: 'Success', description: `User ${userForm.action === 'ban' ? 'banned' : 'unbanned'} successfully` });
                setShowUserModal(false);
                await invalidateClientCache([`${apiUrl}/api/users`, `${apiUrl}/api/users/${selectedUser.id}/ban`]);
                fetchData();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
        }
    };

    const handleDepartmentCreate = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/departments`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(departmentForm)
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Department created successfully' });
                setShowDepartmentModal(false);
                setDepartmentForm({ name: '', code: '', type: 'police', description: '', motto: '' });
                await invalidateClientCache([`${apiUrl}/api/departments`, `${apiUrl}/api/departments?includeInactive=true`]);
                fetchData();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error || 'Failed to create department', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to create department', variant: 'destructive' });
        }
    };

    const handleRankCreate = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token || !selectedDepartment) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/departments/${selectedDepartment.id}/ranks`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rankForm)
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Rank created successfully' });
                setShowRankModal(false);
                setRankForm({ name: '', shortName: '', level: 1, salary: 0, isSupervisor: false, isChief: false });
                fetchDepartmentDetails(selectedDepartment.id);
                fetchData();
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to create rank', variant: 'destructive' });
        }
    };

    const handleMemberAdd = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token || !selectedDepartment) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/departments/${selectedDepartment.id}/members`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    characterId: parseInt(memberForm.characterId),
                    rankId: parseInt(memberForm.rankId),
                    badgeNumber: memberForm.badgeNumber || undefined,
                    callSign: memberForm.callSign || undefined,
                    division: memberForm.division || undefined
                })
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Member added successfully' });
                setShowMemberModal(false);
                setMemberForm({ characterId: '', rankId: '', badgeNumber: '', callSign: '', division: '' });
                fetchDepartmentDetails(selectedDepartment.id);
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error || 'Failed to add member', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to add member', variant: 'destructive' });
        }
    };

    const handleMemberRemove = async (memberId: number) => {
        const token = localStorage.getItem('accessToken');
        if (!token || !selectedDepartment) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/departments/${selectedDepartment.id}/members/${memberId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Member removed successfully' });
                fetchDepartmentDetails(selectedDepartment.id);
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
        }
    };

    const openUserModal = (user: User) => {
        setSelectedUser(user);
        setUserForm({ action: user.isBanned ? 'unban' : 'ban', reason: '' });
        setShowUserModal(true);
    };

    const openDepartmentModal = (dept: Department) => {
        setSelectedDepartment(dept);
        fetchDepartmentDetails(dept.id);
    };

    const openMemberModal = (member?: DepartmentMember) => {
        setSelectedMember(member || null);
        if (member) {
            setMemberForm({
                characterId: member.character.id.toString(),
                rankId: member.rank.id.toString(),
                badgeNumber: member.badgeNumber,
                callSign: member.callSign || '',
                division: member.division || ''
            });
        } else {
            setMemberForm({ characterId: '', rankId: '', badgeNumber: '', callSign: '', division: '' });
        }
        setShowMemberModal(true);
    };

    const openCharacterModal = (character: Character, isNew = false) => {
        setSelectedCharacter(character);
        if (isNew) {
            setCharacterForm({
                firstName: '', lastName: '', middleName: '', nickname: '',
                birthDate: '1990-01-01', gender: 'male', height: '', weight: '',
                description: '', status: 'active', isAlive: true, balance: 1000, bankBalance: 0
            });
        } else {
            setCharacterForm({
                firstName: character.firstName,
                lastName: character.lastName,
                middleName: character.middleName || '',
                nickname: character.nickname || '',
                birthDate: character.birthDate ? character.birthDate.split('T')[0] : '1990-01-01',
                gender: character.gender,
                height: character.height?.toString() || '',
                weight: character.weight?.toString() || '',
                description: character.description || '',
                status: character.status,
                isAlive: character.isAlive,
                balance: character.balance,
                bankBalance: character.bankBalance
            });
        }
        setShowCharacterModal(true);
    };

    const handleCharacterSave = async () => {
        const token = localStorage.getItem('accessToken');
        if (!token || !selectedCharacter) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

        try {
            const res = await fetch(`${apiUrl}/api/characters/${selectedCharacter.id}/admin`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...characterForm,
                    height: characterForm.height ? parseInt(characterForm.height) : null,
                    weight: characterForm.weight ? parseInt(characterForm.weight) : null,
                })
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Character updated successfully' });
                setShowCharacterModal(false);
                fetchData();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.error || 'Failed to update character', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to update character', variant: 'destructive' });
        }
    };

    const availableCharacters = characters.filter(char => 
        !selectedDepartment?.members?.some(m => m.character.id === char.id && m.isActive)
    );

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="fixed inset-0 bg-background flex flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden flex flex-col p-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Shield className="w-8 h-8 text-red-500" />
                        <h1 className="text-2xl font-bold text-zinc-100">Admin Panel</h1>
                    </div>

                    <div className="flex gap-2 mb-4">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={activeTab === 'users' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('users')}
                                    className={activeTab === 'users' ? 'bg-blue-600' : ''}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Users
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Управление пользователями системы</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={activeTab === 'departments' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('departments')}
                                    className={activeTab === 'departments' ? 'bg-blue-600' : ''}
                                >
                                    <Building2 className="w-4 h-4 mr-2" />
                                    Departments
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Управление департаментами, званиями и участниками</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={activeTab === 'characters' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('characters')}
                                    className={activeTab === 'characters' ? 'bg-blue-600' : ''}
                                >
                                    <UserCog className="w-4 h-4 mr-2" />
                                    Characters
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Управление персонажами. Редактирование, создание, удаление.</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={activeTab === 'closedCalls911' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('closedCalls911')}
                                    className={activeTab === 'closedCalls911' ? 'bg-blue-600' : ''}
                                >
                                    <PhoneCall className="w-4 h-4 mr-2" />
                                    911 Архив
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Закрытые вызовы 911. Просмотр и удаление.</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={activeTab === 'settings' ? 'default' : 'outline'}
                                    onClick={() => setActiveTab('settings')}
                                    className={activeTab === 'settings' ? 'bg-blue-600' : ''}
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Настройки
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Настройки проекта и системы.</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {activeTab === 'users' && (
                        <Card className="flex-1 bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">All Users</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-800/30 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">ID</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Username</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Email</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Status</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Joined</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id} className="border-t border-zinc-800">
                                                <td className="px-3 py-2 text-zinc-500">{u.id}</td>
                                                <td className="px-3 py-2 text-zinc-200 font-medium">{u.username}</td>
                                                <td className="px-3 py-2 text-zinc-400">{u.email}</td>
                                                <td className="px-3 py-2">
                                                    {u.isBanned ? (
                                                        <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-xs">Banned</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-green-900/30 text-green-400 rounded text-xs">Active</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-zinc-500">
                                                    {new Date(u.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => openUserModal(u)}
                                                                className={u.isBanned ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}
                                                            >
                                                                {u.isBanned ? <UserPlus className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{u.isBanned ? ADMIN_ACTIONS.users.unban : ADMIN_ACTIONS.users.ban}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'departments' && (
                        <div className="flex-1 flex gap-4 overflow-hidden">
                            <Card className="w-72 bg-zinc-900/50 border-zinc-800">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg">Departments</CardTitle>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="sm" onClick={() => setShowDepartmentModal(true)} className="bg-green-600 hover:bg-green-500">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{ADMIN_ACTIONS.departments.create}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </CardHeader>
                                <CardContent className="overflow-auto">
                                    <div className="space-y-2">
                                        {departments.map((dept) => (
                                            <Tooltip key={dept.id}>
                                                <TooltipTrigger asChild>
                                                    <div 
                                                        className={`p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition-colors ${
                                                            selectedDepartment?.id === dept.id ? 'border-blue-500 bg-zinc-800' : ''
                                                        }`}
                                                        onClick={() => openDepartmentModal(dept)}
                                                    >
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-zinc-200">{dept.name}</span>
                                                            </div>
                                                            <div className="flex gap-2 mt-1 text-xs text-zinc-500">
                                                                <span>{dept.code}</span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{dept.description || `${dept.type} department`}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {selectedDepartment ? (
                                <div className="flex-1 flex gap-4 overflow-hidden">
                                    <Card className="flex-1 bg-zinc-900/50 border-zinc-800">
                                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                            <CardTitle className="text-lg">
                                                {selectedDepartment.name} - Members
                                            </CardTitle>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="sm" onClick={() => openMemberModal()} className="bg-green-600 hover:bg-green-500">
                                                        <UserPlus className="w-4 h-4 mr-1" />
                                                        Add
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{ADMIN_ACTIONS.members.add}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </CardHeader>
                                        <CardContent className="overflow-auto">
                                            <div className="space-y-2">
                                                {selectedDepartment.members?.filter(m => m.isActive).map((member) => (
                                                    <div key={member.id} className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-zinc-200">
                                                                        {member.character.firstName} {member.character.lastName}
                                                                    </span>
                                                                    <span className="text-xs text-zinc-500">#{member.badgeNumber}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                                                                        {member.rank.name}
                                                                    </span>
                                                                    {member.rank.isSupervisor && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded cursor-help">
                                                                                    SUP
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{ADMIN_ACTIONS.ranks.supervisor}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                    {member.rank.isChief && (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded cursor-help">
                                                                                    CHIEF
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{ADMIN_ACTIONS.ranks.chief}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    )}
                                                                </div>
                                                                {member.callSign && (
                                                                    <span className="text-xs text-zinc-500 mt-1 block">
                                                                        CallSign: {member.callSign}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm"
                                                                        onClick={() => handleMemberRemove(member.id)}
                                                                        className="text-red-400 hover:text-red-300"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{ADMIN_ACTIONS.members.remove}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!selectedDepartment.members || selectedDepartment.members.filter(m => m.isActive).length === 0) && (
                                                    <p className="text-zinc-500 text-sm text-center py-4">No members in this department</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="w-72 bg-zinc-900/50 border-zinc-800">
                                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                            <CardTitle className="text-lg">Ranks</CardTitle>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="sm" onClick={() => setShowRankModal(true)} className="bg-green-600 hover:bg-green-500">
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{ADMIN_ACTIONS.ranks.create}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </CardHeader>
                                        <CardContent className="overflow-auto">
                                            <div className="space-y-2">
                                                {selectedDepartment.ranks?.map((rank) => (
                                                    <div key={rank.id} className="p-2 bg-zinc-800/50 rounded border border-zinc-700">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Star className="w-3 h-3 text-zinc-400" />
                                                                <span className="text-zinc-200">{rank.name}</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {rank.isSupervisor && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-xs bg-yellow-900/30 text-yellow-400 px-1 rounded cursor-help">SUP</span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>{ADMIN_ACTIONS.ranks.supervisor}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                                {rank.isChief && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-xs bg-red-900/30 text-red-400 px-1 rounded cursor-help">CHIEF</span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>{ADMIN_ACTIONS.ranks.chief}</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-zinc-500 mt-1">
                                                            Level {rank.level} • ${rank.salary || 0}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!selectedDepartment.ranks || selectedDepartment.ranks.length === 0) && (
                                                    <p className="text-zinc-500 text-sm text-center py-4">No ranks defined</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-zinc-500">Select a department to view details</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'characters' && (
                        <Card className="flex-1 bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">All Characters</CardTitle>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-500">
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Создать нового персонажа</p>
                                    </TooltipContent>
                                </Tooltip>
                            </CardHeader>
                            <CardContent className="overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-zinc-800/30 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">ID</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Owner</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Status</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Balance</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {characters.map((char) => (
                                            <tr key={char.id} className="border-t border-zinc-800">
                                                <td className="px-3 py-2 text-zinc-500">{char.id}</td>
                                                <td className="px-3 py-2 text-zinc-200 font-medium">
                                                    {char.firstName} {char.lastName}
                                                </td>
                                                <td className="px-3 py-2 text-zinc-400">{char.user?.username || 'Unknown'}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                                        char.status === 'active' ? 'bg-green-900/30 text-green-400' :
                                                        char.status === 'deceased' ? 'bg-red-900/30 text-red-400' :
                                                        'bg-yellow-900/30 text-yellow-400'
                                                    }`}>
                                                        {char.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-zinc-400">
                                                    ${char.balance?.toLocaleString() || 0}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => openCharacterModal(char)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{ADMIN_ACTIONS.characters.edit}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'closedCalls911' && (
                        <Card className="flex-1 bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Архив 911 вызовов</CardTitle>
                                <span className="text-sm text-zinc-500">{closedCalls911.length} записей</span>
                            </CardHeader>
                            <CardContent className="overflow-auto">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-32 text-zinc-500">Загрузка...</div>
                                ) : closedCalls911.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
                                        <PhoneCall className="w-8 h-8 mb-2" />
                                        <p>Нет закрытых вызовов</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-zinc-800/30 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">ID</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Заявитель</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Локация</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Описание</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Пользователь</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Discord ID</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Дата</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {closedCalls911.map((call) => (
                                                <tr key={call.id} className="border-t border-zinc-800">
                                                    <td className="px-3 py-2 text-zinc-500">#{call.id}</td>
                                                    <td className="px-3 py-2 text-zinc-200 font-medium">{call.callerName}</td>
                                                    <td className="px-3 py-2 text-zinc-400">{call.location}</td>
                                                    <td className="px-3 py-2 text-zinc-300 max-w-[200px] truncate">{call.description}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            {call.caller?.user?.avatarUrl && (
                                                                <img 
                                                                    src={call.caller.user.avatarUrl} 
                                                                    alt="" 
                                                                    className="w-6 h-6 rounded-full"
                                                                />
                                                            )}
                                                            <span className="text-zinc-200">
                                                                {call.caller?.user?.username || call.userUsername || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-zinc-500 font-mono text-xs">
                                                        {call.caller?.user?.discordId || call.userDiscordId || '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-zinc-500 text-xs">
                                                        {new Date(call.createdAt).toLocaleString('ru-RU')}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    variant="outline" 
                                                                    size="sm"
                                                                    className="border-red-800 text-red-400 hover:bg-red-900/20"
                                                                    onClick={() => handleDeleteClosedCall911(call.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Удалить вызов</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'settings' && (
                        <Card className="flex-1 bg-zinc-900/50 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Настройки проекта</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-auto">
                                <div className="space-y-6">
                                    <div className="bg-zinc-800/40 p-4 rounded-lg border border-zinc-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FlaskConical className={`w-6 h-6 ${betaTestEnabled ? 'text-purple-400' : 'text-zinc-500'}`} />
                                                <div>
                                                    <h3 className="text-zinc-200 font-medium">BETA TEST режим</h3>
                                                    <p className="text-zinc-500 text-xs">Ограничить доступ к страницам ролью из ENV</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleBetaTestToggle}
                                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                                    betaTestEnabled ? 'bg-purple-600' : 'bg-zinc-700'
                                                }`}
                                            >
                                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                                    betaTestEnabled ? 'left-7' : 'left-1'
                                                }`} />
                                            </button>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-zinc-700">
                                            <p className="text-zinc-500 text-xs">
                                                Role ID из ENV: <span className="text-zinc-300 font-mono">{process.env.BETA_TEST_ROLE_ID || 'не настроен'}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-800/40 p-4 rounded-lg border border-zinc-700">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-zinc-200 font-medium">Принудительный сброс кэша</h3>
                                                <p className="text-zinc-500 text-xs">Очистить service worker и браузерный cache storage</p>
                                            </div>
                                            <Button
                                                onClick={handleForceClearCache}
                                                disabled={isClearingCache}
                                                variant="outline"
                                                className="border-zinc-600"
                                            >
                                                {isClearingCache ? 'Очистка...' : 'Сбросить кэш'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {showUserModal && selectedUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
                            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-100">
                                    {userForm.action === 'ban' ? 'Ban User' : 'Unban User'}
                                </h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowUserModal(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <Label className="text-zinc-400">User</Label>
                                    <p className="text-zinc-200">{selectedUser.username}</p>
                                </div>
                                {userForm.action === 'ban' && (
                                    <div>
                                        <Label className="text-zinc-400">Reason</Label>
                                        <Input 
                                            value={userForm.reason}
                                            onChange={(e) => setUserForm(prev => ({ ...prev, reason: e.target.value }))}
                                            placeholder="Enter ban reason..."
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                                <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
                                <Button 
                                    onClick={handleUserAction}
                                    className={userForm.action === 'ban' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}
                                >
                                    {userForm.action === 'ban' ? 'Ban' : 'Unban'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {showDepartmentModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
                            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-100">Create Department</h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowDepartmentModal(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <Label className="text-zinc-400">Name</Label>
                                    <Input 
                                        value={departmentForm.name}
                                        onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Police Department"
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Code</Label>
                                    <Input 
                                        value={departmentForm.code}
                                        onChange={(e) => setDepartmentForm(prev => ({ ...prev, code: e.target.value }))}
                                        placeholder="LSPD"
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Type</Label>
                                    <select 
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                                        value={departmentForm.type}
                                        onChange={(e) => setDepartmentForm(prev => ({ ...prev, type: e.target.value }))}
                                    >
                                        {DEPARTMENT_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Description</Label>
                                    <Input 
                                        value={departmentForm.description}
                                        onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Description..."
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Motto</Label>
                                    <Input 
                                        value={departmentForm.motto}
                                        onChange={(e) => setDepartmentForm(prev => ({ ...prev, motto: e.target.value }))}
                                        placeholder="To Protect and Serve"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                                <Button variant="outline" onClick={() => setShowDepartmentModal(false)}>Cancel</Button>
                                <Button onClick={handleDepartmentCreate} className="bg-green-600 hover:bg-green-500">
                                    <Save className="w-4 h-4 mr-2" />
                                    Create
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {showRankModal && selectedDepartment && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
                            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-100">Add Rank to {selectedDepartment.name}</h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowRankModal(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <Label className="text-zinc-400">Name</Label>
                                    <Input 
                                        value={rankForm.name}
                                        onChange={(e) => setRankForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Officer"
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Short Name</Label>
                                    <Input 
                                        value={rankForm.shortName}
                                        onChange={(e) => setRankForm(prev => ({ ...prev, shortName: e.target.value }))}
                                        placeholder="OFF"
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Level</Label>
                                    <Input 
                                        type="number"
                                        value={rankForm.level}
                                        onChange={(e) => setRankForm(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Salary</Label>
                                    <Input 
                                        type="number"
                                        value={rankForm.salary}
                                        onChange={(e) => setRankForm(prev => ({ ...prev, salary: parseFloat(e.target.value) }))}
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-zinc-300">
                                        <input 
                                            type="checkbox"
                                            checked={rankForm.isSupervisor}
                                            onChange={(e) => setRankForm(prev => ({ ...prev, isSupervisor: e.target.checked }))}
                                            className="rounded"
                                        />
                                        Supervisor
                                    </label>
                                    <label className="flex items-center gap-2 text-zinc-300">
                                        <input 
                                            type="checkbox"
                                            checked={rankForm.isChief}
                                            onChange={(e) => setRankForm(prev => ({ ...prev, isChief: e.target.checked }))}
                                            className="rounded"
                                        />
                                        Chief
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                                <Button variant="outline" onClick={() => setShowRankModal(false)}>Cancel</Button>
                                <Button onClick={handleRankCreate} className="bg-green-600 hover:bg-green-500">
                                    <Save className="w-4 h-4 mr-2" />
                                    Create
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {showMemberModal && selectedDepartment && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
                            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-100">Add Member to {selectedDepartment.name}</h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowMemberModal(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <Label className="text-zinc-400">Character</Label>
                                    <select 
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                                        value={memberForm.characterId}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, characterId: e.target.value }))}
                                    >
                                        <option value="">Select character...</option>
                                        {availableCharacters.map(char => (
                                            <option key={char.id} value={char.id}>
                                                {char.firstName} {char.lastName} ({char.user.username})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Rank</Label>
                                    <select 
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                                        value={memberForm.rankId}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, rankId: e.target.value }))}
                                    >
                                        <option value="">Select rank...</option>
                                        {selectedDepartment.ranks?.map(rank => (
                                            <option key={rank.id} value={rank.id}>
                                                {rank.name} (Level {rank.level})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Badge Number</Label>
                                    <Input 
                                        value={memberForm.badgeNumber}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, badgeNumber: e.target.value }))}
                                        placeholder="Auto-generated if empty"
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Call Sign</Label>
                                    <Input 
                                        value={memberForm.callSign}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, callSign: e.target.value }))}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <Label className="text-zinc-400">Division</Label>
                                    <Input 
                                        value={memberForm.division}
                                        onChange={(e) => setMemberForm(prev => ({ ...prev, division: e.target.value }))}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                                <Button variant="outline" onClick={() => setShowMemberModal(false)}>Cancel</Button>
                                <Button onClick={handleMemberAdd} className="bg-green-600 hover:bg-green-500" disabled={!memberForm.characterId || !memberForm.rankId}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Add Member
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {showCharacterModal && selectedCharacter && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-y-auto">
                        <Card className="bg-zinc-900 border-zinc-800 w-full max-w-2xl my-8">
                            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                                <h2 className="text-lg font-bold text-zinc-100">
                                    Edit Character: {selectedCharacter.firstName} {selectedCharacter.lastName}
                                </h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowCharacterModal(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-zinc-400">First Name</Label>
                                        <Input 
                                            value={characterForm.firstName}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, firstName: e.target.value }))}
                                            placeholder="First Name"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Last Name</Label>
                                        <Input 
                                            value={characterForm.lastName}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, lastName: e.target.value }))}
                                            placeholder="Last Name"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Middle Name</Label>
                                        <Input 
                                            value={characterForm.middleName}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, middleName: e.target.value }))}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Nickname</Label>
                                        <Input 
                                            value={characterForm.nickname}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, nickname: e.target.value }))}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Birth Date</Label>
                                        <Input 
                                            type="date"
                                            value={characterForm.birthDate}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, birthDate: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Gender</Label>
                                        <select 
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                                            value={characterForm.gender}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, gender: e.target.value }))}
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Height (cm)</Label>
                                        <Input 
                                            type="number"
                                            value={characterForm.height}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, height: e.target.value }))}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Weight (kg)</Label>
                                        <Input 
                                            type="number"
                                            value={characterForm.weight}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, weight: e.target.value }))}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Status</Label>
                                        <select 
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-zinc-200"
                                            value={characterForm.status}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, status: e.target.value }))}
                                        >
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="incarcerated">Incarcerated</option>
                                            <option value="deceased">Deceased</option>
                                            <option value="vacation">Vacation</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Balance</Label>
                                        <Input 
                                            type="number"
                                            value={characterForm.balance}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, balance: parseFloat(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-zinc-400">Bank Balance</Label>
                                        <Input 
                                            type="number"
                                            value={characterForm.bankBalance}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, bankBalance: parseFloat(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <input 
                                            type="checkbox"
                                            checked={characterForm.isAlive}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, isAlive: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <Label className="text-zinc-300">Is Alive</Label>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-zinc-400">Description</Label>
                                        <textarea 
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-zinc-200 min-h-[80px]"
                                            value={characterForm.description}
                                            onChange={(e) => setCharacterForm(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Character description..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
                                <Button variant="outline" onClick={() => setShowCharacterModal(false)}>Cancel</Button>
                                <Button onClick={handleCharacterSave} className="bg-green-600 hover:bg-green-500">
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
