"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import {
  User,
  RefreshCw,
  Plus,
  X,
  Loader2,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  Phone,
  FileText,
  AlertTriangle,
  Car,
  Shield,
  BadgeCheck,
  Flame,
  Heart,
} from "lucide-react";
import { CreateCharacterModal } from "./components/CreateCharacterModal";
import { ViewCharacterModal } from "./components/ViewCharacterModal";
import { ViewVehicleModal } from "./components/ViewVehicleModal";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { getApiUrl, fetchWithTimeout } from "@/lib/utils";

interface Vehicle {
  id: number;
  plate: string;
  model: string;
  color: string;
  status: string;
  imageUrl?: string;
  insurance?: string;
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
  const {
    user,
    isAuthenticated,
    isBanned: isUserBanned,
    isLoading: authLoading,
  } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Tanstack Query для characters
  const { data: characters = [], isLoading: charactersLoading, refetch: refetchCharacters } = useQuery({
    queryKey: ['characters'],
    queryFn: async () => {
      const res = await api.get('/api/characters');
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: false,
  });

  // Tanstack Query для departments
  const { data: departments = [], isLoading: departmentsLoading, refetch: refetchDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/api/departments');
      return Array.isArray(res.data) ? res.data : [];
    },
    refetchInterval: false,
  });

  const isLoading = charactersLoading || departmentsLoading;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null,
  );
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showViewVehicleModal, setShowViewVehicleModal] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [callForm, setCallForm] = useState({
    callerName: "",
    location: "",
    description: "",
    phoneNumber: "",
    callType: "police", // police, fire, ems
  });

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    nickname: "",
    birthDate: "",
    gender: "" as "male" | "female" | "other" | "",
    height: "",
    weight: "",
    description: "",
    photoUrl: "", // Теперь будет обязательным
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    nickname: "",
    birthDate: "",
    gender: "" as "male" | "female" | "other" | "",
    height: "",
    weight: "",
    description: "",
    ssn: "",
  });

  const generateSSN = () => {
    const area = Math.floor(Math.random() * 899) + 100;
    const group = Math.floor(Math.random() * 99)
      .toString()
      .padStart(2, "0");
    const serial = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0");
    return `${area}-${group}-${serial}`;
  };

  const [departmentForm, setDepartmentForm] = useState({
    departmentId: "",
    rankId: "",
    badgeNumber: "",
    callSign: "",
    division: "",
  });

  const [charVehicles, setCharVehicles] = useState<Vehicle[]>([]);
  const [charWeapons, setCharWeapons] = useState<Weapon[]>([]);
  const [charLicenses, setCharLicenses] = useState<any[]>([]);
  const [charFines, setCharFines] = useState<any[]>([]);
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showWeaponModal, setShowWeaponModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    plate: "",
    model: "",
    color: "",
    imageUrl: "",
  });
  const [weaponForm, setWeaponForm] = useState({ serial: "", model: "" });

  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    const apiUrl = getApiUrl();
    return `${apiUrl}${url}`;
  };

  const fetchCivilianData = async (charId: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const apiUrl = getApiUrl();

      const [vRes, wRes, lRes, aRes, fRes] = await Promise.allSettled([
        fetchWithTimeout(
          `${apiUrl}/api/civilian/characters/${charId}/vehicles`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 },
        ),
        fetchWithTimeout(
          `${apiUrl}/api/civilian/characters/${charId}/weapons`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 },
        ),
        fetchWithTimeout(
          `${apiUrl}/api/civilian/characters/${charId}/licenses`,
          { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 },
        ),
        fetchWithTimeout(`${apiUrl}/api/civilian/licenses`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }),
        fetchWithTimeout(`${apiUrl}/api/fines/character/${charId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        }),
      ]);

      if (vRes.status === "fulfilled" && vRes.value.ok)
        setCharVehicles(await vRes.value.json());
      if (wRes.status === "fulfilled" && wRes.value.ok)
        setCharWeapons(await wRes.value.json());
      if (lRes.status === "fulfilled" && lRes.value.ok)
        setCharLicenses(await lRes.value.json());
      if (aRes.status === "fulfilled" && aRes.value.ok)
        setAvailableLicenses(await aRes.value.json());
      if (fRes.status === "fulfilled" && fRes.value.ok)
        setCharFines(await fRes.value.json());
    } catch (err) {
      console.error("Failed to fetch civilian data", err);
    }
  };


  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    
    if (!token && !authLoading) {
      router.replace("/auth/login");
      return;
    }

    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (user?.isBanned) {
      router.replace("/banned");
      return;
    }

    refetchCharacters();
    refetchDepartments();
  }, [authLoading, isAuthenticated, user?.isBanned]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refetchCharacters();
    refetchDepartments();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/api/characters/create', formData);

      if (res.status === 201) {
        toast({
          title: "Персонаж создан",
          description: `${formData.firstName} ${formData.lastName}`,
          variant: "success",
        });
        setShowCreateModal(false);
        setFormData({
          firstName: "",
          lastName: "",
          middleName: "",
          nickname: "",
          birthDate: "",
          gender: "",
          height: "",
          weight: "",
          description: "",
          photoUrl: "",
        });
        refetchCharacters();
      } else if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else {
        toast({
          title: "Ошибка",
          description: res.data?.error || "Не удалось создать персонажа",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Failed to create character", err);
      toast({
        title: "Ошибка",
        description: "Не удалось создать персонажа",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/api/calls911/create', callForm);

      if (res.status === 201) {
        toast({
          title: "Вызов отправлен",
          description: "Вызов 911 успешно размещен",
          variant: "success",
        });
        setShowCallModal(false);
        setCallForm({
          callerName: "",
          location: "",
          description: "",
          phoneNumber: "",
          callType: "police",
        });
      } else if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else {
        toast({
          title: "Ошибка",
          description: res.data?.error || "Не удалось отправить вызов 911",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to place 911 call", err);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить вызов 911",
        variant: "destructive",
      });
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
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/civilian/vehicles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...vehicleForm,
          characterId: selectedCharacter.id,
        }),
      });
      if (res.ok) {
        toast({
          title: "Транспорт зарегистрирован",
          description: `Номер: ${vehicleForm.plate}`,
          variant: "success",
        });
        setShowVehicleModal(false);
        setVehicleForm({ plate: "", model: "", color: "", imageUrl: "" });
        fetchCivilianData(selectedCharacter.id);
      } else if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      }
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось зарегистрировать транспорт",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWeaponSubmit = async () => {
    if (!selectedCharacter || !weaponForm.serial || !weaponForm.model) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/civilian/weapons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...weaponForm,
          characterId: selectedCharacter.id,
        }),
      });
      if (res.ok) {
        toast({
          title: "Оружие зарегистрировано",
          description: `Серия: ${weaponForm.serial}`,
          variant: "success",
        });
        setShowWeaponModal(false);
        setWeaponForm({ serial: "", model: "" });
        fetchCivilianData(selectedCharacter.id);
      } else if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      }
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось зарегистрировать оружие",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteVehicle = async (id: number) => {
    if (!confirm("Вы уверены, что хотите снять этот транспорт с регистрации?"))
      return;
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/civilian/vehicles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else if (res.ok && selectedCharacter) {
        fetchCivilianData(selectedCharacter.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteWeapon = async (id: number) => {
    if (!confirm("Вы уверены, что хотите снять это оружие с регистрации?"))
      return;
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/civilian/weapons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else if (res.ok && selectedCharacter) {
        fetchCivilianData(selectedCharacter.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleVehicleStatus = async (id: number, currentStatus: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const newStatus = currentStatus === "Valid" ? "Inactive" : "Valid";
      const res = await fetch(`${apiUrl}/api/civilian/vehicles/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else if (selectedCharacter) {
        fetchCivilianData(selectedCharacter.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWeaponStatus = async (id: number, currentStatus: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const newStatus = currentStatus === "Valid" ? "Inactive" : "Valid";
      const res = await fetch(`${apiUrl}/api/civilian/weapons/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else if (selectedCharacter) {
        fetchCivilianData(selectedCharacter.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLicenseAdd = async (licenseId: number) => {
    if (!selectedCharacter) return;
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const res = await fetch(
        `${apiUrl}/api/civilian/characters/${selectedCharacter.id}/licenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            characterId: selectedCharacter.id,
            licenseId,
          }),
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else if (res.ok) {
        fetchCivilianData(selectedCharacter.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLicenseRemove = async (licenseId: number) => {
    if (!selectedCharacter) return;
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      const apiUrl = getApiUrl();
      const res = await fetch(
        `${apiUrl}/api/civilian/characters/${selectedCharacter.id}/licenses/${licenseId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else if (res.ok) {
        fetchCivilianData(selectedCharacter.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status?: string, isAlive?: boolean) => {
    if (!isAlive)
      return {
        bg: "bg-red-500/20",
        text: "text-red-400",
        border: "border-red-500/30",
      };
    switch (status?.toLowerCase()) {
      case "active":
        return {
          bg: "bg-emerald-500/20",
          text: "text-emerald-400",
          border: "border-emerald-500/30",
        };
      case "suspended":
        return {
          bg: "bg-amber-500/20",
          text: "text-amber-400",
          border: "border-amber-500/30",
        };
      case "incarcerated":
        return {
          bg: "bg-orange-500/20",
          text: "text-orange-400",
          border: "border-orange-500/30",
        };
      case "vacation":
        return {
          bg: "bg-cyan-500/20",
          text: "text-cyan-400",
          border: "border-cyan-500/30",
        };
      default:
        return {
          bg: "bg-zinc-500/20",
          text: "text-zinc-400",
          border: "border-zinc-500/30",
        };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ru-RU");
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setStep(1);
    setFormData({
      firstName: "",
      lastName: "",
      middleName: "",
      nickname: "",
      birthDate: "",
      gender: "",
      height: "",
      weight: "",
      description: "",
      photoUrl: "",
    });
  };

  const openEditModal = (char: Character) => {
    setSelectedCharacter(char);
    setEditForm({
      firstName: char.firstName,
      lastName: char.lastName,
      middleName: char.middleName || "",
      nickname: char.nickname || "",
      birthDate: char.birthDate ? char.birthDate.split("T")[0] : "",
      gender: char.gender as "male" | "female" | "other" | "",
      height: char.height?.toString() || "",
      weight: char.weight?.toString() || "",
      description: char.description || "",
      ssn: char.ssn || "",
    });
    setShowEditModal(true);
    setShowViewModal(false);
  };

  const handleEditSubmit = async () => {
    if (!selectedCharacter) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      const apiUrl = getApiUrl();

      const res = await fetch(
        `${apiUrl}/api/characters/${selectedCharacter.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
          }),
        },
      );

      if (res.ok) {
        toast({
          title: "Персонаж обновлен",
          description: `${editForm.firstName} ${editForm.lastName}`,
          variant: "success",
        });
        setShowEditModal(false);
        refetchCharacters();
      } else if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      }
    } catch (err) {
      console.error("Failed to update character", err);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить персонажа",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCharacter = async () => {
    if (!selectedCharacter) return;
    if (
      !confirm(
        `Вы уверены, что хотите удалить ${selectedCharacter.firstName} ${selectedCharacter.lastName}?`,
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      const apiUrl = getApiUrl();

      const res = await fetch(
        `${apiUrl}/api/characters/${selectedCharacter.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.ok) {
        toast({
          title: "Персонаж удален",
          description: `${selectedCharacter.firstName} ${selectedCharacter.lastName}`,
          variant: "success",
        });
        setShowViewModal(false);
        refetchCharacters();
      } else if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      }
    } catch (err) {
      console.error("Failed to delete character", err);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить персонажа",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDepartmentModal = (char: Character) => {
    setSelectedCharacter(char);
    const activeMember = char.departmentMembers?.find((m) => m.isActive);
    if (activeMember) {
      setDepartmentForm({
        departmentId: activeMember.departmentId.toString(),
        rankId: activeMember.rankId.toString(),
        badgeNumber: activeMember.badgeNumber || "",
        callSign: activeMember.callSign || "",
        division: activeMember.division || "",
      });
    } else {
      setDepartmentForm({
        departmentId: "",
        rankId: "",
        badgeNumber: "",
        callSign: "",
        division: "",
      });
    }
    setShowDepartmentModal(true);
    setShowViewModal(false);
  };

  const handleDepartmentSubmit = async () => {
    if (
      !selectedCharacter ||
      !departmentForm.departmentId ||
      !departmentForm.rankId
    )
      return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      const apiUrl = getApiUrl();

      const res = await fetch(
        `${apiUrl}/api/departments/${departmentForm.departmentId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            characterId: parseInt(selectedCharacter.id),
            rankId: parseInt(departmentForm.rankId),
            badgeNumber: departmentForm.badgeNumber || undefined,
            callSign: departmentForm.callSign || undefined,
            division: departmentForm.division || undefined,
          }),
        },
      );

      if (res.ok) {
        toast({
          title: "Департамент назначен",
          description: "Персонаж назначен в департамент",
          variant: "success",
        });
        setShowDepartmentModal(false);
        refetchCharacters();
      } else if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/auth/login");
      } else {
        const data = await res.json();
        toast({
          title: "Ошибка",
          description: data.error || "Не удалось назначить департамент",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to assign department", err);
      toast({
        title: "Ошибка",
        description: "Не удалось назначить департамент",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDepartment = departments.find(
    (d) => d.id === parseInt(departmentForm.departmentId),
  );

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {authLoading || isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <div className="w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-lg font-medium text-zinc-300">Ошибка загрузки</p>
            <p className="text-sm mt-1 text-zinc-500">{error}</p>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  refetchCharacters();
                }}
                className="bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
              <Button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-500 px-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать персонажа
              </Button>
            </div>
          </div>
        ) : characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-zinc-600" />
            </div>
            <p className="text-lg font-medium text-zinc-300">Нет персонажей</p>
            <p className="text-sm mt-1 text-zinc-500">
              Создайте своего первого персонажа, чтобы начать
            </p>
            <Button
              onClick={openCreateModal}
              className="mt-6 bg-blue-600 hover:bg-blue-500 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать персонажа
            </Button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100">
                  Мои персонажи
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {characters.length} персонаж
                  {characters.length % 10 === 1 &&
                  characters.length % 100 !== 11
                    ? ""
                    : characters.length % 10 >= 2 &&
                        characters.length % 10 <= 4 &&
                        (characters.length % 100 < 10 ||
                          characters.length % 100 >= 20)
                      ? "а"
                      : "ей"}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  className="bg-zinc-900/50 border-zinc-700 hover:bg-zinc-800"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  Обновить
                </Button>
                <Button
                  onClick={() => setShowCallModal(true)}
                  className="bg-red-600 hover:bg-red-500"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Вызвать 911
                </Button>
                <Button
                  onClick={openCreateModal}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Новый персонаж
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {characters.map((char) => {
                const imgUrl = getImageUrl(char.photoUrl);
                const isAlive = char.isAlive !== false;
                const birthDate = char.birthDate
                  ? new Date(char.birthDate)
                  : null;
                const age = birthDate
                  ? Math.floor(
                      (Date.now() - birthDate.getTime()) /
                        (365.25 * 24 * 60 * 60 * 1000),
                    )
                  : null;
                const isCop = char.departmentMembers?.some(
                  (m) =>
                    m.isActive &&
                    ["police", "sheriff", "trooper"].includes(
                      m.department?.type || "",
                    ),
                );

                return (
                  <div
                    key={char.id}
                    className="group relative bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800/50 hover:border-zinc-700/50 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer h-[120px] flex items-center"
                    onClick={() => viewCharacter(char)}
                  >
                    {/* Status strip */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${isAlive ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]"}`}
                    />

                    <div className="flex items-center w-full px-4 gap-4">
                      {/* Photo Square */}
                      <div className="w-24 h-24 shrink-0 bg-zinc-800/50 rounded-lg overflow-hidden border border-zinc-700/30 relative">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={`${char.firstName} ${char.lastName}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-10 h-10 text-zinc-600" />
                          </div>
                        )}
                        {!isAlive && (
                          <div className="absolute inset-0 bg-rose-950/20 backdrop-grayscale-[0.5]" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-zinc-100 text-base truncate leading-tight">
                            {char.firstName} {char.lastName}
                            {char.nickname && (
                              <span className="text-zinc-500 font-medium ml-1.5 text-sm">
                                ({char.nickname})
                              </span>
                            )}
                          </h3>
                          {isCop && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] px-1.5 py-0 h-5 whitespace-nowrap">
                              <Shield className="w-3 h-3 mr-1" />
                              Officer
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                          {birthDate && (
                            <span className="flex items-center gap-1.5">
                              <span className="text-zinc-500 font-medium">
                                {birthDate.toLocaleDateString("ru-RU")}
                              </span>
                              <span className="text-zinc-700 text-[10px]">
                                |
                              </span>
                              <span className="font-medium text-zinc-300">
                                {age} лет
                              </span>
                            </span>
                          )}
                        </div>

                        {char.job && (
                          <div className="text-[11px] font-semibold text-blue-400/80 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                            {char.job.name}
                          </div>
                        )}

                        {char.description && (
                          <p className="text-[11px] text-zinc-500 line-clamp-2 italic leading-tight mt-0.5 max-w-[90%]">
                            {char.description}
                          </p>
                        )}
                      </div>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCallModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-400">
                  Emergency calls are monitored by dispatchers
                </span>
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Your Name *
                </Label>
                <Input
                  value={callForm.callerName}
                  onChange={(e) =>
                    setCallForm((prev) => ({
                      ...prev,
                      callerName: e.target.value,
                    }))
                  }
                  placeholder="Enter your name"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Location *
                </Label>
                <Input
                  value={callForm.location}
                  onChange={(e) =>
                    setCallForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Street address or description"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Phone Number
                </Label>
                <Input
                  value={callForm.phoneNumber}
                  onChange={(e) =>
                    setCallForm((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Response Type
                </Label>
                <div className="mt-2 flex gap-1 p-1 bg-zinc-800/50 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setCallForm(prev => ({ ...prev, callType: 'police' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      callForm.callType === 'police'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    Police
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallForm(prev => ({ ...prev, callType: 'fire' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      callForm.callType === 'fire'
                        ? 'bg-orange-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    Fire
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallForm(prev => ({ ...prev, callType: 'ems' }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      callForm.callType === 'ems'
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    EMS
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Description *
                </Label>
                <textarea
                  value={callForm.description}
                  onChange={(e) =>
                    setCallForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Describe the emergency..."
                  className="mt-1 w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="flex justify-between p-5 border-t border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => setShowCallModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 px-6"
              >
                Отмена
              </Button>
              <Button
                onClick={handleCallSubmit}
                className="bg-red-600 hover:bg-red-500 px-6"
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
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
        charFines={charFines}
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
        onViewVehicle={(v) => {
          setSelectedVehicle(v);
          setShowViewVehicleModal(true);
        }}
      />

      <ViewVehicleModal
        show={showViewVehicleModal}
        onClose={() => setShowViewVehicleModal(false)}
        vehicle={selectedVehicle}
        getImageUrl={getImageUrl}
        toggleVehicleStatus={toggleVehicleStatus}
        deleteVehicle={deleteVehicle}
      />
      {showLicenseModal && selectedCharacter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <Card className="bg-zinc-950 border-zinc-800 w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                  <BadgeCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    License Management
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
                    Apply for permits and licenses
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLicenseModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {availableLicenses.map((license) => {
                const hasLicense = charLicenses.some(
                  (cl) => cl.licenseId === license.id,
                );
                return (
                  <div
                    key={license.id}
                    className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:border-zinc-700/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base font-bold text-zinc-100">
                            {license.name}
                          </p>
                          {hasLicense && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] px-1.5 py-0 h-4">
                              ACTIVE
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-3">
                          {license.description}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                          <span className="text-zinc-400">
                            Type:{" "}
                            <span className="text-zinc-200">
                              {license.type}
                            </span>
                          </span>
                          <span className="text-zinc-400">
                            Price:{" "}
                            <span className="text-blue-400">
                              ${license.price}
                            </span>
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={hasLicense ? "destructive" : "default"}
                        className={
                          hasLicense
                            ? "bg-rose-600 hover:bg-rose-500 h-8 px-4"
                            : "bg-blue-600 hover:bg-blue-500 h-8 px-4 shadow-lg shadow-blue-900/20"
                        }
                        onClick={() =>
                          hasLicense
                            ? handleLicenseRemove(license.id)
                            : handleLicenseAdd(license.id)
                        }
                      >
                        {hasLicense ? "Revoke" : "Apply"}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {availableLicenses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                  <BadgeCheck className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm italic">
                    No licenses available at this time.
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-900 bg-zinc-900/20">
              <p className="text-[10px] text-zinc-600 uppercase font-bold text-center leading-relaxed">
                Note: All licenses are subject to verification by law
                enforcement. <br />
                Illegal use of documents is a punishable offense.
              </p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVehicleModal(false)}
              >
                <X />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-zinc-500 uppercase">
                  License Plate
                </Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 font-mono uppercase"
                  placeholder="88XYZ999"
                  value={vehicleForm.plate}
                  onChange={(e) =>
                    setVehicleForm({
                      ...vehicleForm,
                      plate: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase">Model</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="Vapid Stanier"
                  value={vehicleForm.model}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, model: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase">Color</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="Black"
                  value={vehicleForm.color}
                  onChange={(e) =>
                    setVehicleForm({ ...vehicleForm, color: e.target.value })
                  }
                />
              </div>
              <ImageUpload
                label="Vehicle Photo"
                currentValue={vehicleForm.imageUrl}
                onUploadSuccess={(url) =>
                  setVehicleForm({ ...vehicleForm, imageUrl: url })
                }
              />
              <Button
                className="w-full bg-blue-600 hover:bg-blue-500"
                onClick={handleVehicleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <Plus className="mr-2" />
                )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWeaponModal(false)}
              >
                <X />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs text-zinc-500 uppercase">Model</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700"
                  placeholder="Combat Pistol"
                  value={weaponForm.model}
                  onChange={(e) =>
                    setWeaponForm({ ...weaponForm, model: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-zinc-500 uppercase">
                  Serial Number
                </Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 font-mono uppercase"
                  placeholder="SN-XXXX-XXXX"
                  value={weaponForm.serial}
                  onChange={(e) =>
                    setWeaponForm({
                      ...weaponForm,
                      serial: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-500"
                onClick={handleWeaponSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  <Plus className="mr-2" />
                )}
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
              <h2 className="text-xl font-bold text-zinc-100">
                Edit Character
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    First Name *
                  </Label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    placeholder="John"
                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    M.I.
                  </Label>
                  <Input
                    value={editForm.middleName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        middleName: e.target.value,
                      }))
                    }
                    placeholder="A."
                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    Last Name *
                  </Label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    placeholder="Doe"
                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    Nickname
                  </Label>
                  <Input
                    value={editForm.nickname}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        nickname: e.target.value,
                      }))
                    }
                    placeholder="Johnny"
                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    Birth Date
                  </Label>
                  <Input
                    type="date"
                    value={editForm.birthDate}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        birthDate: e.target.value,
                      }))
                    }
                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    Gender
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="mt-1 w-full justify-between bg-zinc-800/50 border-zinc-700"
                      >
                        <span
                          className={
                            editForm.gender ? "text-zinc-200" : "text-zinc-500"
                          }
                        >
                          {editForm.gender || "Select..."}
                        </span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                      <DropdownMenuItem
                        onClick={() =>
                          setEditForm((prev) => ({ ...prev, gender: "male" }))
                        }
                        className="text-zinc-200 focus:bg-zinc-700"
                      >
                        Male
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditForm((prev) => ({ ...prev, gender: "female" }))
                        }
                        className="text-zinc-200 focus:bg-zinc-700"
                      >
                        Female
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditForm((prev) => ({ ...prev, gender: "other" }))
                        }
                        className="text-zinc-200 focus:bg-zinc-700"
                      >
                        Other
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    Height (cm)
                  </Label>
                  <Input
                    type="number"
                    value={editForm.height}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        height: e.target.value,
                      }))
                    }
                    placeholder="180"
                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
                <div>
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    Weight (kg)
                  </Label>
                  <Input
                    type="number"
                    value={editForm.weight}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        weight: e.target.value,
                      }))
                    }
                    placeholder="80"
                    className="mt-1 bg-zinc-800/50 border-zinc-700"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Description
                </Label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Physical appearance, distinguishing marks, bio..."
                  className="mt-1 w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  SSN (Social Security Number)
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={editForm.ssn}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, ssn: e.target.value }))
                    }
                    placeholder="XXX-XX-XXXX"
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setEditForm((prev) => ({ ...prev, ssn: generateSSN() }))
                    }
                    className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700"
                  >
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between p-5 border-t border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={
                  isSubmitting || !editForm.firstName || !editForm.lastName
                }
                className="bg-emerald-600 hover:bg-emerald-500 px-6"
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
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
              <h2 className="text-xl font-bold text-zinc-100">
                Assign Department
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDepartmentModal(false)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-400">
                  Assigning to:{" "}
                  <span className="font-medium text-zinc-200">
                    {selectedCharacter.firstName} {selectedCharacter.lastName}
                  </span>
                </p>
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Department *
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="mt-1 w-full justify-between bg-zinc-800/50 border-zinc-700"
                    >
                      <span
                        className={
                          departmentForm.departmentId
                            ? "text-zinc-200"
                            : "text-zinc-500"
                        }
                      >
                        {departmentForm.departmentId
                          ? departments.find(
                              (d) =>
                                d.id === parseInt(departmentForm.departmentId),
                            )?.name || "Select..."
                          : "Select department..."}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-800 border-zinc-700 max-h-60 overflow-y-auto">
                    {departments
                      .filter((d) => d.isActive !== false)
                      .map((dept) => (
                        <DropdownMenuItem
                          key={dept.id}
                          onClick={() =>
                            setDepartmentForm((prev) => ({
                              ...prev,
                              departmentId: dept.id.toString(),
                              rankId: "",
                            }))
                          }
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
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                    Rank *
                  </Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="mt-1 w-full justify-between bg-zinc-800/50 border-zinc-700"
                      >
                        <span
                          className={
                            departmentForm.rankId
                              ? "text-zinc-200"
                              : "text-zinc-500"
                          }
                        >
                          {departmentForm.rankId
                            ? selectedDepartment.ranks?.find(
                                (r) => r.id === parseInt(departmentForm.rankId),
                              )?.name || "Select..."
                            : "Select rank..."}
                        </span>
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                      {selectedDepartment.ranks?.map((rank) => (
                        <DropdownMenuItem
                          key={rank.id}
                          onClick={() =>
                            setDepartmentForm((prev) => ({
                              ...prev,
                              rankId: rank.id.toString(),
                            }))
                          }
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
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Badge Number
                </Label>
                <Input
                  value={departmentForm.badgeNumber}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      badgeNumber: e.target.value,
                    }))
                  }
                  placeholder="Auto-generated if empty"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Call Sign
                </Label>
                <Input
                  value={departmentForm.callSign}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      callSign: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                />
              </div>

              <div>
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Division
                </Label>
                <Input
                  value={departmentForm.division}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      division: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                  className="mt-1 bg-zinc-800/50 border-zinc-700"
                />
              </div>
            </div>

            <div className="flex justify-between p-5 border-t border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => setShowDepartmentModal(false)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDepartmentSubmit}
                disabled={
                  isSubmitting ||
                  !departmentForm.departmentId ||
                  !departmentForm.rankId
                }
                className="bg-blue-600 hover:bg-blue-500 px-6"
              >
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Assign to Department
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
