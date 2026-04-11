"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Printer, Save, Trash2, AlertTriangle, User, Activity, Heart, Droplets } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Types
type BodyZone = 'head' | 'neck' | 'torso' | 'pelvis' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg';
type InjuryType = 'gunshot' | 'stab' | 'bruise' | 'fracture' | 'burn' | 'amputation' | 'laceration';
type Severity = 'light' | 'medium' | 'severe' | 'critical';
type TreatmentType = 'tourniquet' | 'bandage' | 'splint' | 'cpr_chest' | 'tamponade';
type AVPU = 'alert' | 'voice' | 'pain' | 'unresponsive';
type BloodType = '0_pos' | '0_neg' | 'A_pos' | 'A_neg' | 'B_pos' | 'B_neg' | 'AB_pos' | 'AB_neg';

interface Injury {
    id: string;
    zone: BodyZone;
    type: InjuryType;
    severity: Severity;
    description: string;
    bleeding: boolean;
    treatments: TreatmentType[];
    position: { x: number; y: number };
}

interface PatientData {
    name: string;
    age: number;
    gender: 'male' | 'female';
    bloodType: BloodType;
    allergies: string;
    bloodPressure: { systolic: number; diastolic: number };
    pulse: number;
    saturation: number;
    respiratoryRate: number;
    avpu: AVPU;
}

interface MedicalReport {
    id: string;
    patient: PatientData;
    injuries: Injury[];
    createdAt: Date;
    updatedAt: Date;
}

// Injury type labels and colors
const injuryTypeConfig: Record<InjuryType, { label: string; color: string }> = {
    gunshot: { label: 'Огнестрельное ранение', color: '#ef4444' },
    stab: { label: 'Ножевое ранение', color: '#f97316' },
    bruise: { label: 'Ушиб', color: '#3b82f6' },
    fracture: { label: 'Перелом', color: '#eab308' },
    burn: { label: 'Ожог', color: '#a855f7' },
    amputation: { label: 'Ампутация', color: '#000000' },
    laceration: { label: 'Колото-резаная рана', color: '#f97316' },
};

const severityConfig: Record<Severity, { label: string; color: string }> = {
    light: { label: 'Лёгкая', color: '#22c55e' },
    medium: { label: 'Средняя', color: '#eab308' },
    severe: { label: 'Тяжёлая', color: '#f97316' },
    critical: { label: 'Критическая', color: '#ef4444' },
};

const treatmentConfig: Record<TreatmentType, { label: string }> = {
    tourniquet: { label: 'Наложение жгута' },
    bandage: { label: 'Перевязка раны' },
    splint: { label: 'Иммобилизация шиной' },
    cpr_chest: { label: 'ИВЛ/НМС' },
    tamponade: { label: 'Тампонада' },
};

// Define which treatments are appropriate for each body zone
const zoneTreatmentRestrictions: Record<BodyZone, TreatmentType[]> = {
    head: ['bandage', 'cpr_chest'],
    neck: ['bandage', 'cpr_chest'],
    torso: ['bandage', 'cpr_chest', 'tamponade'],
    pelvis: ['bandage', 'cpr_chest'],
    left_arm: ['tourniquet', 'bandage', 'splint', 'cpr_chest'],
    right_arm: ['tourniquet', 'bandage', 'splint', 'cpr_chest'],
    left_leg: ['tourniquet', 'bandage', 'splint', 'cpr_chest'],
    right_leg: ['tourniquet', 'bandage', 'splint', 'cpr_chest'],
};

// Zone labels for display
const zoneLabels: Record<BodyZone, string> = {
    head: 'Голова',
    neck: 'Шея',
    torso: 'Торс',
    pelvis: 'Таз',
    left_arm: 'Левая рука',
    right_arm: 'Правая рука',
    left_leg: 'Левая нога',
    right_leg: 'Правая нога',
};

const avpuConfig: Record<AVPU, { label: string }> = {
    alert: { label: 'Alert (Ориентирован)' },
    voice: { label: 'Voice (Реагирует на голос)' },
    pain: { label: 'Pain (Реагирует на боль)' },
    unresponsive: { label: 'Unresponsive (Без сознания)' },
};

const bloodTypeConfig: Record<BloodType, { label: string }> = {
    '0_pos': { label: '0(I) Rh+' },
    '0_neg': { label: '0(I) Rh-' },
    'A_pos': { label: 'A(II) Rh+' },
    'A_neg': { label: 'A(II) Rh-' },
    'B_pos': { label: 'B(III) Rh+' },
    'B_neg': { label: 'B(III) Rh-' },
    'AB_pos': { label: 'AB(IV) Rh+' },
    'AB_neg': { label: 'AB(IV) Rh-' },
};

export default function MedicalReportPage() {
    const [view, setView] = useState<'front' | 'back'>('front');
    const [selectedZone, setSelectedZone] = useState<BodyZone | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [report, setReport] = useState<MedicalReport>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('medicalReport');
            return saved ? JSON.parse(saved) : {
                id: Date.now().toString(),
                patient: {
                    name: '',
                    age: 0,
                    gender: 'male',
                    bloodType: '0_pos',
                    allergies: '',
                    bloodPressure: { systolic: 120, diastolic: 80 },
                    pulse: 72,
                    saturation: 98,
                    respiratoryRate: 16,
                    avpu: 'alert',
                },
                injuries: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }
        return {
            id: Date.now().toString(),
            patient: {
                name: '',
                age: 0,
                gender: 'male',
                bloodType: '0_pos',
                allergies: '',
                bloodPressure: { systolic: 120, diastolic: 80 },
                pulse: 72,
                saturation: 98,
                respiratoryRate: 16,
                avpu: 'alert',
            },
            injuries: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    });

    const [newInjury, setNewInjury] = useState<Partial<Injury>>({
        type: 'bruise',
        severity: 'light',
        description: '',
        bleeding: false,
        treatments: [],
    });

    // Auto-save to localStorage
    useEffect(() => {
        localStorage.setItem('medicalReport', JSON.stringify(report));
    }, [report]);

    const handleZoneClick = (zone: BodyZone, event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        setSelectedZone(zone);
        setNewInjury({
            ...newInjury,
            zone,
            position: { x, y },
        });
        setIsModalOpen(true);
    };

    const handleAddInjury = () => {
        if (!newInjury.zone || !newInjury.type || !newInjury.description || newInjury.description.length < 50) {
            toast({
                title: 'Ошибка валидации',
                description: 'Заполните все обязательные поля. Описание должно содержать минимум 50 символов.',
                variant: 'destructive',
            });
            return;
        }

        const injury: Injury = {
            id: Date.now().toString(),
            zone: newInjury.zone!,
            type: newInjury.type!,
            severity: newInjury.severity!,
            description: newInjury.description,
            bleeding: newInjury.bleeding || false,
            treatments: newInjury.treatments || [],
            position: newInjury.position || { x: 0, y: 0 },
        };

        setReport({
            ...report,
            injuries: [...report.injuries, injury],
            updatedAt: new Date(),
        });

        setIsModalOpen(false);
        setSelectedZone(null);
        setNewInjury({
            type: 'bruise',
            severity: 'light',
            description: '',
            bleeding: false,
            treatments: [],
        });

        toast({
            title: 'Травма добавлена',
            description: 'Травма успешно зарегистрирована.',
        });
    };

    const handleRemoveInjury = (injuryId: string) => {
        setReport({
            ...report,
            injuries: report.injuries.filter(i => i.id !== injuryId),
            updatedAt: new Date(),
        });
        toast({
            title: 'Травма удалена',
            description: 'Травма успешно удалена из отчёта.',
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleNewReport = () => {
        if (confirm('Создать новый отчёт? Текущий отчёт будет очищен.')) {
            const newReport: MedicalReport = {
                id: Date.now().toString(),
                patient: {
                    name: '',
                    age: 0,
                    gender: 'male',
                    bloodType: '0_pos',
                    allergies: '',
                    bloodPressure: { systolic: 120, diastolic: 80 },
                    pulse: 72,
                    saturation: 98,
                    respiratoryRate: 16,
                    avpu: 'alert',
                },
                injuries: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            setReport(newReport);
            localStorage.setItem('medicalReport', JSON.stringify(newReport));
            toast({
                title: 'Новый отчёт',
                description: 'Создан новый пустой медицинский отчёт.',
            });
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Медицинский отчёт</h1>
                            <p className="text-zinc-400 mt-1">Система регистрации травм и состояния пациента</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleNewReport} variant="outline">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Новый отчёт
                            </Button>
                            <Button onClick={handlePrint}>
                                <Printer className="w-4 h-4 mr-2" />
                                Печать
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Anatomical Diagram */}
                        <Card className="bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Анатомическая схема</span>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={view === 'front' ? 'default' : 'outline'}
                                            onClick={() => setView('front')}
                                        >
                                            Спереди
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={view === 'back' ? 'default' : 'outline'}
                                            onClick={() => setView('back')}
                                        >
                                            Сзади
                                        </Button>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AnatomicalBody
                                    view={view}
                                    onZoneClick={handleZoneClick}
                                    injuries={report.injuries}
                                />
                            </CardContent>
                        </Card>

                        {/* Right Column: Patient Data and Injuries */}
                        <div className="space-y-6">
                            {/* Patient Data Form */}
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Данные пациента
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="name">ФИО пациента</Label>
                                            <Input
                                                id="name"
                                                value={report.patient.name}
                                                onChange={(e) => setReport({
                                                    ...report,
                                                    patient: { ...report.patient, name: e.target.value },
                                                    updatedAt: new Date(),
                                                })}
                                                placeholder="Введите ФИО"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="age">Возраст</Label>
                                            <Input
                                                id="age"
                                                type="number"
                                                value={report.patient.age || ''}
                                                onChange={(e) => setReport({
                                                    ...report,
                                                    patient: { ...report.patient, age: parseInt(e.target.value) || 0 },
                                                    updatedAt: new Date(),
                                                })}
                                                placeholder="Возраст"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="gender">Пол</Label>
                                            <Select
                                                value={report.patient.gender}
                                                onValueChange={(value: 'male' | 'female') => setReport({
                                                    ...report,
                                                    patient: { ...report.patient, gender: value },
                                                    updatedAt: new Date(),
                                                })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Мужской</SelectItem>
                                                    <SelectItem value="female">Женский</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="bloodType">Группа крови</Label>
                                            <Select
                                                value={report.patient.bloodType}
                                                onValueChange={(value: BloodType) => setReport({
                                                    ...report,
                                                    patient: { ...report.patient, bloodType: value },
                                                    updatedAt: new Date(),
                                                })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(bloodTypeConfig).map(([key, { label }]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="allergies" className="flex items-center gap-2">
                                            Аллергии
                                            {report.patient.allergies && (
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                            )}
                                        </Label>
                                        <Textarea
                                            id="allergies"
                                            value={report.patient.allergies}
                                            onChange={(e) => setReport({
                                                ...report,
                                                patient: { ...report.patient, allergies: e.target.value },
                                                updatedAt: new Date(),
                                            })}
                                            placeholder="Укажите аллергические реакции"
                                            rows={2}
                                        />
                                    </div>

                                    {/* Vital Signs */}
                                    <div className="border-t border-zinc-800 pt-4">
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            Витальные показатели
                                        </h4>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <Label htmlFor="bp_systolic">АД (систолическое)</Label>
                                                <Input
                                                    id="bp_systolic"
                                                    type="number"
                                                    value={report.patient.bloodPressure.systolic}
                                                    onChange={(e) => setReport({
                                                        ...report,
                                                        patient: {
                                                            ...report.patient,
                                                            bloodPressure: {
                                                                ...report.patient.bloodPressure,
                                                                systolic: parseInt(e.target.value) || 0,
                                                            },
                                                        },
                                                        updatedAt: new Date(),
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="bp_diastolic">АД (диастолическое)</Label>
                                                <Input
                                                    id="bp_diastolic"
                                                    type="number"
                                                    value={report.patient.bloodPressure.diastolic}
                                                    onChange={(e) => setReport({
                                                        ...report,
                                                        patient: {
                                                            ...report.patient,
                                                            bloodPressure: {
                                                                ...report.patient.bloodPressure,
                                                                diastolic: parseInt(e.target.value) || 0,
                                                            },
                                                        },
                                                        updatedAt: new Date(),
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="pulse">Пульс (уд/мин)</Label>
                                                <Input
                                                    id="pulse"
                                                    type="number"
                                                    value={report.patient.pulse}
                                                    onChange={(e) => setReport({
                                                        ...report,
                                                        patient: { ...report.patient, pulse: parseInt(e.target.value) || 0 },
                                                        updatedAt: new Date(),
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="saturation">Сатурация (%)</Label>
                                                <Input
                                                    id="saturation"
                                                    type="number"
                                                    value={report.patient.saturation}
                                                    onChange={(e) => setReport({
                                                        ...report,
                                                        patient: { ...report.patient, saturation: parseInt(e.target.value) || 0 },
                                                        updatedAt: new Date(),
                                                    })}
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="respiratory">ЧД (вдохов/мин)</Label>
                                                <Input
                                                    id="respiratory"
                                                    type="number"
                                                    value={report.patient.respiratoryRate}
                                                    onChange={(e) => setReport({
                                                        ...report,
                                                        patient: { ...report.patient, respiratoryRate: parseInt(e.target.value) || 0 },
                                                        updatedAt: new Date(),
                                                    })}
                                                />
                                            </div>
                                            <div className="col-span-2 md:col-span-3">
                                                <Label htmlFor="avpu">Уровень сознания (AVPU)</Label>
                                                <Select
                                                    value={report.patient.avpu}
                                                    onValueChange={(value: AVPU) => setReport({
                                                        ...report,
                                                        patient: { ...report.patient, avpu: value },
                                                        updatedAt: new Date(),
                                                    })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(avpuConfig).map(([key, { label }]) => (
                                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Injuries List */}
                            <Card className="bg-zinc-900 border-zinc-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Зарегистрированные травмы ({report.injuries.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {report.injuries.length === 0 ? (
                                        <p className="text-zinc-400 text-center py-8">
                                            Нет зарегистрированных травм. Кликните на анатомическую схему для добавления.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {report.injuries.map((injury) => (
                                                <div
                                                    key={injury.id}
                                                    className="p-4 bg-zinc-800 rounded-lg border-l-4"
                                                    style={{ borderColor: injuryTypeConfig[injury.type].color }}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-semibold">
                                                                    {injuryTypeConfig[injury.type].label}
                                                                </span>
                                                                <span
                                                                    className="text-xs px-2 py-1 rounded"
                                                                    style={{
                                                                        backgroundColor: severityConfig[injury.severity].color,
                                                                        color: 'white',
                                                                    }}
                                                                >
                                                                    {severityConfig[injury.severity].label}
                                                                </span>
                                                                {injury.bleeding && (
                                                                    <Droplets className="w-4 h-4 text-red-500" />
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-zinc-300">{injury.description}</p>
                                                            {injury.treatments.length > 0 && (
                                                                <div className="mt-2">
                                                                    <span className="text-xs text-zinc-400">Оказанная помощь: </span>
                                                                    <span className="text-xs">
                                                                        {injury.treatments.map(t => treatmentConfig[t].label).join(', ')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleRemoveInjury(injury.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Injury Registration Modal */}
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Регистрация травмы</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="injuryType">Тип повреждения</Label>
                                    <Select
                                        value={newInjury.type}
                                        onValueChange={(value: InjuryType) => setNewInjury({ ...newInjury, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(injuryTypeConfig).map(([key, { label, color }]) => (
                                                <SelectItem key={key} value={key}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        {label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="severity">Степень тяжести</Label>
                                    <Select
                                        value={newInjury.severity}
                                        onValueChange={(value: Severity) => setNewInjury({ ...newInjury, severity: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(severityConfig).map(([key, { label, color }]) => (
                                                <SelectItem key={key} value={key}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        {label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="description">Описание травмы (минимум 50 символов)</Label>
                                    <Textarea
                                        id="description"
                                        value={newInjury.description || ''}
                                        onChange={(e) => setNewInjury({ ...newInjury, description: e.target.value })}
                                        placeholder="Подробное описание травмы..."
                                        rows={4}
                                        className={(newInjury.description?.length || 0) < 50 && (newInjury.description?.length || 0) > 0 ? 'border-red-500' : ''}
                                    />
                                    {(newInjury.description?.length || 0) > 0 && (newInjury.description?.length || 0) < 50 && (
                                        <p className="text-xs text-red-500 mt-1">
                                            Минимум 50 символов (текущих: {newInjury.description?.length})
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>Признак кровотечения</Label>
                                    <div className="flex gap-4 mt-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="bleeding"
                                                checked={newInjury.bleeding === true}
                                                onChange={() => setNewInjury({ ...newInjury, bleeding: true })}
                                            />
                                            Да
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="bleeding"
                                                checked={newInjury.bleeding === false}
                                                onChange={() => setNewInjury({ ...newInjury, bleeding: false })}
                                            />
                                            Нет
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <Label>Оказанная медицинская помощь</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {Object.entries(treatmentConfig)
                                            .filter(([key]) => {
                                                if (!newInjury.zone) return true;
                                                return zoneTreatmentRestrictions[newInjury.zone]?.includes(key as TreatmentType);
                                            })
                                            .map(([key, { label }]) => (
                                                <label key={key} className="flex items-center gap-2 p-2 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={newInjury.treatments?.includes(key as TreatmentType)}
                                                        onChange={(e) => {
                                                            const treatments = newInjury.treatments || [];
                                                            if (e.target.checked) {
                                                                setNewInjury({ ...newInjury, treatments: [...treatments, key as TreatmentType] });
                                                            } else {
                                                                setNewInjury({ ...newInjury, treatments: treatments.filter(t => t !== key) });
                                                            }
                                                        }}
                                                    />
                                                    {label}
                                                </label>
                                            ))}
                                    </div>
                                    {newInjury.zone && (
                                        <p className="text-xs text-zinc-500 mt-2">
                                            Доступные методы помощи для зоны: {zoneLabels[newInjury.zone]}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 justify-end pt-4">
                                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                                        Отмена
                                    </Button>
                                    <Button onClick={handleAddInjury}>
                                        Добавить травму
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </ProtectedRoute>
    );
}

// Anatomical Body Component
function AnatomicalBody({
    view,
    onZoneClick,
    injuries,
}: {
    view: 'front' | 'back';
    onZoneClick: (zone: BodyZone, event: React.MouseEvent) => void;
    injuries: Injury[];
}) {
    const [hoveredZone, setHoveredZone] = useState<BodyZone | null>(null);

    const zones: Record<BodyZone, { path: string; label: string }> = {
        head: {
            path: view === 'front'
                ? 'M 200 25 C 235 25, 260 45, 260 80 C 260 115, 235 140, 200 140 C 165 140, 140 115, 140 80 C 140 45, 165 25, 200 25'
                : 'M 200 25 C 235 25, 260 45, 260 80 C 260 115, 235 140, 200 140 C 165 140, 140 115, 140 80 C 140 45, 165 25, 200 25',
            label: 'Голова',
        },
        neck: {
            path: 'M 175 140 C 175 140, 180 145, 180 155 L 180 165 C 180 165, 220 165, 220 165 L 220 155 C 220 145, 225 140, 225 140 C 225 140, 200 145, 175 140',
            label: 'Шея',
        },
        torso: {
            path: 'M 135 165 C 135 165, 125 180, 125 200 L 125 280 C 125 310, 140 330, 155 330 L 245 330 C 260 330, 275 310, 275 280 L 275 200 C 275 180, 265 165, 265 165 C 265 165, 240 160, 200 160 C 160 160, 135 165, 135 165',
            label: 'Торс',
        },
        pelvis: {
            path: 'M 140 330 C 140 330, 120 335, 115 360 L 110 400 C 110 415, 130 420, 145 420 L 255 420 C 270 420, 290 415, 290 400 L 285 360 C 280 335, 260 330, 260 330 C 260 330, 230 325, 200 325 C 170 325, 140 330, 140 330',
            label: 'Таз',
        },
        left_arm: {
            path: 'M 125 180 C 125 180, 95 185, 85 200 L 70 260 C 65 280, 75 295, 90 300 L 105 305 C 120 310, 135 305, 140 290 L 145 250 C 148 220, 145 190, 135 175 C 135 175, 130 180, 125 180',
            label: 'Левая рука',
        },
        right_arm: {
            path: 'M 275 180 C 275 180, 305 185, 315 200 L 330 260 C 335 280, 325 295, 310 300 L 295 305 C 280 310, 265 305, 260 290 L 255 250 C 252 220, 255 190, 265 175 C 265 175, 270 180, 275 180',
            label: 'Правая рука',
        },
        left_leg: {
            path: 'M 145 420 C 145 420, 125 425, 115 450 L 100 520 C 95 560, 110 590, 140 595 L 175 600 C 190 600, 195 585, 195 570 L 195 460 C 195 445, 185 430, 170 425 C 170 425, 155 420, 145 420',
            label: 'Левая нога',
        },
        right_leg: {
            path: 'M 255 420 C 255 420, 275 425, 285 450 L 300 520 C 305 560, 290 590, 260 595 L 225 600 C 210 600, 205 585, 205 570 L 205 460 C 205 445, 215 430, 230 425 C 230 425, 245 420, 255 420',
            label: 'Правая нога',
        },
    };

    return (
        <div className="relative w-full aspect-[3/5] max-h-[600px] mx-auto">
            <svg viewBox="0 0 400 650" className="w-full h-full">
                {/* Body outline */}
                <path
                    d="M 200 25 C 235 25, 260 45, 260 80 C 260 115, 235 140, 200 140 C 165 140, 140 115, 140 80 C 140 45, 165 25, 200 25 M 175 140 C 175 140, 180 145, 180 155 L 180 165 C 180 165, 220 165, 220 165 L 220 155 C 220 145, 225 140, 225 140 C 225 140, 200 145, 175 140 M 125 180 C 125 180, 95 185, 85 200 L 70 260 C 65 280, 75 295, 90 300 L 105 305 C 120 310, 135 305, 140 290 L 145 250 C 148 220, 145 190, 135 175 C 135 175, 130 180, 125 180 M 275 180 C 275 180, 305 185, 315 200 L 330 260 C 335 280, 325 295, 310 300 L 295 305 C 280 310, 265 305, 260 290 L 255 250 C 252 220, 255 190, 265 175 C 265 175, 270 180, 275 180 M 135 165 C 135 165, 125 180, 125 200 L 125 280 C 125 310, 140 330, 155 330 L 245 330 C 260 330, 275 310, 275 280 L 275 200 C 275 180, 265 165, 265 165 C 265 165, 240 160, 200 160 C 160 160, 135 165, 135 165 M 140 330 C 140 330, 120 335, 115 360 L 110 400 C 110 415, 130 420, 145 420 L 255 420 C 270 420, 290 415, 290 400 L 285 360 C 280 335, 260 330, 260 330 C 260 330, 230 325, 200 325 C 170 325, 140 330, 140 330 M 145 420 C 145 420, 125 425, 115 450 L 100 520 C 95 560, 110 590, 140 595 L 175 600 C 190 600, 195 585, 195 570 L 195 460 C 195 445, 185 430, 170 425 C 170 425, 155 420, 145 420 M 255 420 C 255 420, 275 425, 285 450 L 300 520 C 305 560, 290 590, 260 595 L 225 600 C 210 600, 205 585, 205 570 L 205 460 C 205 445, 215 430, 230 425 C 230 425, 245 420, 255 420"
                    fill="#1f2937"
                    stroke="#374151"
                    strokeWidth="2"
                />

                {/* Clickable zones */}
                {Object.entries(zones).map(([zone, { path, label }]) => {
                    const zoneInjuries = injuries.filter(i => i.zone === zone);
                    const isHovered = hoveredZone === zone;

                    return (
                        <g key={zone}>
                            <path
                                d={path}
                                fill={isHovered ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}
                                stroke={isHovered ? '#3b82f6' : 'transparent'}
                                strokeWidth={isHovered ? 2 : 0}
                                className="cursor-pointer transition-all duration-200"
                                onClick={(e) => onZoneClick(zone as BodyZone, e)}
                                onMouseEnter={() => setHoveredZone(zone as BodyZone)}
                                onMouseLeave={() => setHoveredZone(null)}
                            />
                            {isHovered && (
                                <text
                                    x={zone === 'head' ? 200 : zone.includes('left') ? 120 : zone.includes('right') ? 280 : 200}
                                    y={zone === 'head' ? 80 : zone === 'neck' ? 145 : zone === 'torso' ? 240 : zone === 'pelvis' ? 360 : zone.includes('arm') ? 240 : 500}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="12"
                                    className="pointer-events-none"
                                >
                                    {label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Injury markers */}
                {injuries.map((injury) => (
                    <circle
                        key={injury.id}
                        cx={injury.position.x}
                        cy={injury.position.y}
                        r="8"
                        fill={injuryTypeConfig[injury.type].color}
                        stroke="white"
                        strokeWidth="2"
                        className="cursor-pointer"
                        onClick={() => {/* Show injury details */}}
                    />
                ))}
            </svg>
        </div>
    );
}
