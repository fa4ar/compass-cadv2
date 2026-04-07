"use client";

import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, Shield, AlertTriangle, Plus, X, Check, Clock, FileWarning, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getApiUrl } from '@/lib/utils';

interface Fine {
    id: number;
    amount: number;
    reason: string;
    offenseCode?: string;
    description?: string;
    status: string;
    isSelfIssued: boolean;
    issuedAt: string;
    paidAt?: string;
    paymentDue?: string;
    character?: {
        firstName: string;
        lastName: string;
    };
}

interface Warrant {
    id: number;
    type: string;
    title: string;
    description: string;
    justification: string;
    status: string;
    issuedAt: string;
    expiresAt?: string;
    executedAt?: string;
    issuerName?: string;
    character?: {
        firstName: string;
        lastName: string;
    };
}

interface RoleplayTag {
    id: number;
    tagKey: string;
    label: string;
    description?: string;
    color: string;
    isActive: boolean;
    expiresAt?: string;
    createdAt: string;
}

interface TagDefinition {
    key: string;
    label: string;
    description?: string;
    color: string;
    icon?: string;
    category: string;
    canBeSelfApplied: boolean;
}

function SimpleModal({ 
    open, 
    onClose, 
    title, 
    children,
    footer 
}: { 
    open: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    if (!open) return null;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-md p-6 shadow-2xl z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-zinc-100">{title}</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {children}
                {footer && <div className="flex justify-end gap-2 mt-6">{footer}</div>}
            </div>
        </div>
    );
}

export function DocumentsPanel({ characterId }: { characterId: number }) {
    const [fines, setFines] = useState<Fine[]>([]);
    const [warrants, setWarrants] = useState<Warrant[]>([]);
    const [tags, setTags] = useState<RoleplayTag[]>([]);
    const [tagDefinitions, setTagDefinitions] = useState<TagDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'fines' | 'warrants' | 'tags'>('fines');
    
    const [showCreateFine, setShowCreateFine] = useState(false);
    const [fineForm, setFineForm] = useState({
        amount: '',
        reason: '',
        offenseCode: '',
        description: '',
        paymentDue: '',
        context: 'roleplay'
    });
    
    const [showCreateTag, setShowCreateTag] = useState(false);
    const [tagForm, setTagForm] = useState({
        tagKey: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, [characterId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = getApiUrl();
            
            const [finesRes, warrantsRes, tagsRes, defsRes] = await Promise.all([
                fetch(`${apiUrl}/api/roleplay/fines/character/${characterId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/roleplay/warrants/character/${characterId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/roleplay/tags/character/${characterId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/roleplay/tags/definitions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);
            
            if (finesRes.ok) setFines(await finesRes.json());
            if (warrantsRes.ok) setWarrants(await warrantsRes.json());
            if (tagsRes.ok) setTags(await tagsRes.json());
            if (defsRes.ok) setTagDefinitions(await defsRes.json());
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFine = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = getApiUrl();
            
            const res = await fetch(`${apiUrl}/api/roleplay/self/fines`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId,
                    ...fineForm,
                    amount: parseFloat(fineForm.amount)
                })
            });
            
            if (res.ok) {
                setShowCreateFine(false);
                setFineForm({ amount: '', reason: '', offenseCode: '', description: '', paymentDue: '', context: 'roleplay' });
                fetchData();
            }
        } catch (err) {
            console.error('Error creating fine:', err);
        }
    };

    const handlePayFine = async (fineId: number) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = getApiUrl();
            
            const res = await fetch(`${apiUrl}/api/roleplay/fines/${fineId}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ method: 'cash' })
            });
            
            if (res.ok) fetchData();
        } catch (err) {
            console.error('Error paying fine:', err);
        }
    };

    const handleCreateTag = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = getApiUrl();
            
            const definition = tagDefinitions.find(d => d.key === tagForm.tagKey);
            
            const res = await fetch(`${apiUrl}/api/roleplay/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    characterId,
                    tagKey: tagForm.tagKey,
                    label: definition?.label,
                    description: tagForm.reason
                })
            });
            
            if (res.ok) {
                setShowCreateTag(false);
                setTagForm({ tagKey: '', reason: '' });
                fetchData();
            }
        } catch (err) {
            console.error('Error creating tag:', err);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'unpaid': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'cancelled': return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
            case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'executed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
        }
    };

    const selfAppliedTags = tagDefinitions.filter(t => t.canBeSelfApplied);

    return (
        <div className="space-y-4">
            <div className="flex gap-2 border-b border-zinc-800 pb-2">
                <button
                    onClick={() => setActiveTab('fines')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                        activeTab === 'fines' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <DollarSign className="w-4 h-4" />
                    Штрафы
                    {fines.filter(f => f.status === 'unpaid').length > 0 && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                            {fines.filter(f => f.status === 'unpaid').length}
                        </Badge>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('warrants')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                        activeTab === 'warrants' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <FileWarning className="w-4 h-4" />
                    Ордера
                    {warrants.filter(w => w.status === 'active').length > 0 && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                            {warrants.filter(w => w.status === 'active').length}
                        </Badge>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('tags')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                        activeTab === 'tags' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Shield className="w-4 h-4" />
                    Метки
                    {tags.filter(t => t.isActive).length > 0 && (
                        <span className="ml-1 text-xs text-zinc-400">({tags.filter(t => t.isActive).length})</span>
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {activeTab === 'fines' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-zinc-100">Штрафы и документы</h3>
                                <Button onClick={() => setShowCreateFine(true)} className="bg-blue-600 hover:bg-blue-500" size="sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Создать штраф
                                </Button>
                            </div>
                            
                            {fines.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Нет штрафов</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {fines.map(fine => (
                                        <div key={fine.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-zinc-100">{fine.reason}</span>
                                                    <Badge className={`border ${getStatusColor(fine.status)}`}>
                                                        {fine.status === 'unpaid' ? 'Не оплачен' : 
                                                         fine.status === 'paid' ? 'Оплачен' : 
                                                         fine.status === 'cancelled' ? 'Отменен' : fine.status}
                                                    </Badge>
                                                    {fine.isSelfIssued && (
                                                        <Badge variant="outline" className="text-xs">Ролевой</Badge>
                                                    )}
                                                </div>
                                                <div className="text-sm text-zinc-400">
                                                    ${fine.amount.toLocaleString()} • {new Date(fine.issuedAt).toLocaleDateString('ru-RU')}
                                                    {fine.offenseCode && <span className="ml-2">• {fine.offenseCode}</span>}
                                                </div>
                                            </div>
                                            {fine.status === 'unpaid' && (
                                                <Button onClick={() => handlePayFine(fine.id)} variant="outline" size="sm" className="ml-4">
                                                    <DollarSign className="w-4 h-4 mr-1" />
                                                    Оплатить
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'warrants' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-zinc-100">Ордера</h3>
                            
                            {warrants.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Нет активных ордеров</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {warrants.map(warrant => (
                                        <div key={warrant.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-zinc-100">{warrant.title}</span>
                                                    <Badge className={`border ${getStatusColor(warrant.status)}`}>
                                                        {warrant.status === 'active' ? 'Активен' :
                                                         warrant.status === 'executed' ? 'Исполнен' : warrant.status}
                                                    </Badge>
                                                </div>
                                                <Badge variant="outline">{warrant.type}</Badge>
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-2">{warrant.description}</p>
                                            <div className="text-xs text-zinc-500">
                                                Выдан: {new Date(warrant.issuedAt).toLocaleDateString('ru-RU')}
                                                {warrant.expiresAt && ` • Истекает: ${new Date(warrant.expiresAt).toLocaleDateString('ru-RU')}`}
                                                {warrant.issuerName && ` • ${warrant.issuerName}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'tags' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-zinc-100">Метки и статусы</h3>
                                {selfAppliedTags.length > 0 && (
                                    <Button onClick={() => setShowCreateTag(true)} className="bg-blue-600 hover:bg-blue-500" size="sm">
                                        <Plus className="w-4 h-4 mr-1" />
                                        Добавить метку
                                    </Button>
                                )}
                            </div>
                            
                            {tags.filter(t => t.isActive).length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Нет активных меток</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {tags.filter(t => t.isActive).map(tag => (
                                        <div 
                                            key={tag.id}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                                            style={{ 
                                                backgroundColor: `${tag.color}20`,
                                                borderColor: `${tag.color}40`,
                                                color: tag.color
                                            }}
                                        >
                                            <span className="text-sm font-medium">{tag.label}</span>
                                            {tag.expiresAt && <Clock className="w-3 h-3" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <SimpleModal
                open={showCreateFine}
                onClose={() => setShowCreateFine(false)}
                title="Создать штраф (для себя)"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowCreateFine(false)}>Отмена</Button>
                        <Button onClick={handleCreateFine} className="bg-blue-600">Создать</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-zinc-400">Сумма ($)</Label>
                        <Input 
                            type="number"
                            value={fineForm.amount}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFineForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="100"
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Причина</Label>
                        <Input 
                            value={fineForm.reason}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFineForm(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Нарушение ПДД"
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Код нарушения</Label>
                        <Input 
                            value={fineForm.offenseCode}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFineForm(prev => ({ ...prev, offenseCode: e.target.value }))}
                            placeholder="VC 12345"
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Описание</Label>
                        <textarea 
                            value={fineForm.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFineForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Детали нарушения..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 min-h-[80px]"
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Срок оплаты</Label>
                        <Input 
                            type="date"
                            value={fineForm.paymentDue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFineForm(prev => ({ ...prev, paymentDue: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>
                </div>
            </SimpleModal>

            <SimpleModal
                open={showCreateTag}
                onClose={() => setShowCreateTag(false)}
                title="Добавить метку"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowCreateTag(false)}>Отмена</Button>
                        <Button onClick={handleCreateTag} className="bg-blue-600">Добавить</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <Label className="text-zinc-400">Метка</Label>
                        <select 
                            value={tagForm.tagKey}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTagForm(prev => ({ ...prev, tagKey: e.target.value }))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100"
                        >
                            <option value="">Выберите метку</option>
                            {selfAppliedTags.map(tag => (
                                <option key={tag.key} value={tag.key}>
                                    {tag.label} - {tag.description}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-zinc-400">Причина / Описание</Label>
                        <textarea 
                            value={tagForm.reason}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTagForm(prev => ({ ...prev, reason: e.target.value }))}
                            placeholder="Укажите причину..."
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-zinc-100 min-h-[80px]"
                        />
                    </div>
                </div>
            </SimpleModal>
        </div>
    );
}