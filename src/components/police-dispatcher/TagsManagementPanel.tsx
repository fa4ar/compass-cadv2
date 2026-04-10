import React, { useState, useEffect } from 'react';
import { Tag, X, Plus, AlertCircle, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export type PredefinedTagType = 'gang_member' | 'parole' | 'witness' | 'dangerous' | 'ci' | 'probation' | 'weapons_restriction';

interface CharacterTag {
    id: number;
    tagType: string;
    tagName: string;
    tagValue?: string;
    color: string;
    isCustom: boolean;
    expiresAt?: string;
    isExpiring?: boolean;
    createdBy?: string;
}

interface RateLimitStatus {
    tagsCreated: {
        count: number;
        limit: number;
        windowEndsAt: string;
    };
}

interface TagsManagementPanelProps {
    characterId: string;
    tags: CharacterTag[];
    onTagsChange?: (tags: CharacterTag[]) => void;
    currentCharacterId?: string;
    maxCustomTags?: number;
}

const predefinedTags: Array<{ type: PredefinedTagType; label: string; color: string; requiresValue?: boolean; valueLabel?: string }> = [
    { type: 'gang_member', label: 'Член банды', color: '#ef4444', requiresValue: true, valueLabel: 'Название банды' },
    { type: 'parole', label: 'УДО', color: '#f59e0b', requiresValue: true, valueLabel: 'Дата окончания / № дела' },
    { type: 'witness', label: 'Свидетель', color: '#3b82f6', requiresValue: true, valueLabel: 'Ссылка на дело' },
    { type: 'dangerous', label: 'Опасен', color: '#dc2626', requiresValue: false },
    { type: 'ci', label: 'Сотрудничает с полицией', color: '#8b5cf6', requiresValue: false },
    { type: 'probation', label: 'Условный срок', color: '#f97316', requiresValue: true, valueLabel: 'Дата окончания' },
    { type: 'weapons_restriction', label: 'Ограничение на оружие', color: '#64748b', requiresValue: false },
];

export const TagsManagementPanel: React.FC<TagsManagementPanelProps> = ({
    characterId,
    tags,
    onTagsChange,
    currentCharacterId,
    maxCustomTags = 5
}) => {
    const [showAddPredefined, setShowAddPredefined] = useState(false);
    const [selectedPredefinedTag, setSelectedPredefinedTag] = useState<PredefinedTagType | null>(null);
    const [tagValue, setTagValue] = useState('');
    const [showCustomCreator, setShowCustomCreator] = useState(false);
    const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (characterId) {
            fetchRateLimit();
        }
    }, [characterId]);

    const fetchRateLimit = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const res = await fetch(`${apiUrl}/api/rate-limit/check`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRateLimit(data);
            }
        } catch (err) {
            console.error('Failed to fetch rate limit', err);
        }
    };

    const handleAddPredefinedTag = async () => {
        if (!selectedPredefinedTag) return;

        const tagConfig = predefinedTags.find(t => t.type === selectedPredefinedTag);
        if (!tagConfig) return;

        if (tagConfig.requiresValue && !tagValue) {
            setError(`Необходимо указать: ${tagConfig.valueLabel}`);
            return;
        }

        if (rateLimit && rateLimit.tagsCreated.count >= rateLimit.tagsCreated.limit) {
            setError(`Лимит тегов исчерпан. Попробуйте снова через ${new Date(rateLimit.tagsCreated.windowEndsAt).toLocaleTimeString()}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/characters/${characterId}/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    tagType: selectedPredefinedTag,
                    tagName: tagConfig.label,
                    tagValue: tagConfig.requiresValue ? tagValue : undefined,
                    color: tagConfig.color,
                    isCustom: false
                })
            });

            if (res.ok) {
                const newTag = await res.json();
                onTagsChange?.([...tags, newTag]);
                setSelectedPredefinedTag(null);
                setTagValue('');
                setShowAddPredefined(false);
                fetchRateLimit();
            } else {
                const data = await res.json();
                setError(data.error || 'Не удалось добавить тег');
            }
        } catch (err) {
            console.error('Failed to add tag', err);
            setError('Ошибка при добавлении тега');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTag = async (tagId: number) => {
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

            const res = await fetch(`${apiUrl}/api/characters/${characterId}/tags/${tagId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                onTagsChange?.(tags.filter(t => t.id !== tagId));
            } else {
                const data = await res.json();
                setError(data.error || 'Не удалось удалить тег');
            }
        } catch (err) {
            console.error('Failed to delete tag', err);
            setError('Ошибка при удалении тега');
        }
    };

    const customTagCount = tags.filter(t => t.isCustom).length;
    const remainingTags = rateLimit ? rateLimit.tagsCreated.limit - rateLimit.tagsCreated.count : 10;

    const isExpiringSoon = (expiresAt?: string) => {
        if (!expiresAt) return false;
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
    };

    const isExpired = (expiresAt?: string) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-400" />
                    Теги персонажа
                </h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddPredefined(!showAddPredefined)}
                        className="h-7 text-xs bg-zinc-800 border-zinc-700"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Предопределенный
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCustomCreator(!showCustomCreator)}
                        className="h-7 text-xs bg-zinc-800 border-zinc-700"
                        disabled={customTagCount >= maxCustomTags}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Кастомный
                    </Button>
                </div>
            </div>

            {rateLimit && (
                <div className={`p-2 rounded-lg border ${remainingTags === 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                    <div className="flex items-center gap-2 text-xs">
                        <AlertCircle className={`w-3 h-3 ${remainingTags === 0 ? 'text-red-400' : 'text-blue-400'}`} />
                        <span className={remainingTags === 0 ? 'text-red-400' : 'text-blue-400'}>
                            {remainingTags === 0 
                                ? 'Лимит тегов исчерпан' 
                                : `Осталось тегов: ${remainingTags} из ${rateLimit.tagsCreated.limit} (за час)`
                            }
                        </span>
                    </div>
                </div>
            )}

            {/* Add Predefined Tag */}
            {showAddPredefined && (
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-3">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-zinc-500">Выберите тег</Label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800 h-8">
                                    {selectedPredefinedTag 
                                        ? predefinedTags.find(t => t.type === selectedPredefinedTag)?.label
                                        : 'Выберите тег'
                                    }
                                    <ChevronDown className="w-3 h-3 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-zinc-800 w-full">
                                {predefinedTags.map((tag) => (
                                    <DropdownMenuItem 
                                        key={tag.type} 
                                        onClick={() => setSelectedPredefinedTag(tag.type)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className="w-3 h-3 rounded-full" 
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            {tag.label}
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {selectedPredefinedTag && predefinedTags.find(t => t.type === selectedPredefinedTag)?.requiresValue && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">
                                {predefinedTags.find(t => t.type === selectedPredefinedTag)?.valueLabel}
                            </Label>
                            <Input
                                placeholder="Введите значение..."
                                value={tagValue}
                                onChange={(e) => setTagValue(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 h-8"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button
                            onClick={handleAddPredefinedTag}
                            disabled={!selectedPredefinedTag || isSubmitting || remainingTags === 0}
                            className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-500"
                        >
                            {isSubmitting ? 'Добавление...' : 'Добавить'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddPredefined(false);
                                setSelectedPredefinedTag(null);
                                setTagValue('');
                                setError('');
                            }}
                            className="flex-1 h-8 text-xs bg-zinc-800 border-zinc-700"
                        >
                            Отмена
                        </Button>
                    </div>
                </div>
            )}

            {/* Custom Tags Count Indicator */}
            {customTagCount >= maxCustomTags && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-center gap-2 text-xs">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-400">
                            Максимум кастомных тегов: {maxCustomTags}
                        </span>
                    </div>
                </div>
            )}

            {/* Tags List */}
            {tags.length === 0 ? (
                <div className="text-center py-4 text-zinc-600 italic text-xs">
                    Нет тегов
                </div>
            ) : (
                <div className="space-y-2">
                    {tags.map((tag) => (
                        <div
                            key={tag.id}
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                                isExpired(tag.expiresAt) 
                                    ? 'bg-zinc-900/30 border-zinc-800 opacity-50' 
                                    : isExpiringSoon(tag.expiresAt)
                                        ? 'bg-yellow-500/10 border-yellow-500/30'
                                        : 'bg-zinc-900/50 border-zinc-800'
                            } ${tag.tagType === 'dangerous' ? 'animate-pulse' : ''}`}
                        >
                            <div className="flex items-center gap-2 flex-1">
                                <div 
                                    className="w-3 h-3 rounded-full shrink-0" 
                                    style={{ backgroundColor: tag.color }}
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-zinc-200">
                                            {tag.tagName}
                                        </span>
                                        {tag.tagType === 'ci' && (
                                            <Shield className="w-3 h-3 text-purple-400" />
                                        )}
                                        {tag.tagType === 'dangerous' && (
                                            <AlertCircle className="w-3 h-3 text-red-400" />
                                        )}
                                    </div>
                                    {tag.tagValue && (
                                        <p className="text-xs text-zinc-500">
                                            {tag.tagValue}
                                        </p>
                                    )}
                                    {tag.expiresAt && (
                                        <div className="flex items-center gap-1 text-xs">
                                            <Clock className="w-3 h-3 text-zinc-500" />
                                            <span className={
                                                isExpired(tag.expiresAt) 
                                                    ? 'text-red-400' 
                                                    : isExpiringSoon(tag.expiresAt)
                                                        ? 'text-yellow-400'
                                                        : 'text-zinc-500'
                                            }>
                                                {isExpired(tag.expiresAt) 
                                                    ? 'Истек' 
                                                    : new Date(tag.expiresAt).toLocaleDateString()
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTag(tag.id)}
                                className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
