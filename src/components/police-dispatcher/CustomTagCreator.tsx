import React, { useState } from 'react';
import { X, Loader2, Palette, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomTagCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onTagCreated?: (tag: any) => void;
    characterId: string;
    existingCustomTagsCount: number;
    maxCustomTags?: number;
}

const colorOptions = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
    '#64748b', // slate
];

export const CustomTagCreator: React.FC<CustomTagCreatorProps> = ({
    isOpen,
    onClose,
    onTagCreated,
    characterId,
    existingCustomTagsCount,
    maxCustomTags = 5
}) => {
    const [tagName, setTagName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#3b82f6');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!tagName) {
            setError('Введите название тега');
            return;
        }

        if (tagName.length < 3) {
            setError('Название должно содержать минимум 3 символа');
            return;
        }

        if (existingCustomTagsCount >= maxCustomTags) {
            setError(`Максимум кастомных тегов: ${maxCustomTags}`);
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
                    tagType: 'custom',
                    tagName,
                    color: selectedColor,
                    isCustom: true
                })
            });

            if (res.ok) {
                const newTag = await res.json();
                onTagCreated?.(newTag);
                onClose();
                setTagName('');
                setSelectedColor('#3b82f6');
            } else {
                const data = await res.json();
                setError(data.error || 'Не удалось создать тег');
            }
        } catch (err) {
            console.error('Failed to create custom tag', err);
            setError('Ошибка при создании тега');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
            <Card className="w-full max-w-md bg-zinc-950 border-zinc-800">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-purple-500" />
                            Создать кастомный тег
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    {existingCustomTagsCount >= maxCustomTags && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <p className="text-sm text-amber-400">
                                Максимум кастомных тегов: {maxCustomTags} (использовано: {existingCustomTagsCount})
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Название тега</Label>
                            <Input
                                placeholder="Например: 'Подозрительный'"
                                value={tagName}
                                onChange={(e) => setTagName(e.target.value)}
                                className="bg-zinc-900 border-zinc-800"
                                minLength={3}
                                maxLength={50}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Цвет</Label>
                            <div className="grid grid-cols-9 gap-2">
                                {colorOptions.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                            selectedColor === color 
                                                ? 'border-white scale-110' 
                                                : 'border-zinc-700 hover:border-zinc-500'
                                        }`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {selectedColor === color && (
                                            <Check className="w-4 h-4 mx-auto text-white" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-zinc-500">Предпросмотр</Label>
                            <div className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                <div 
                                    className="w-3 h-3 rounded-full shrink-0" 
                                    style={{ backgroundColor: selectedColor }}
                                />
                                <span className="text-sm font-medium text-zinc-200">
                                    {tagName || 'Название тега'}
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-purple-600 hover:bg-purple-500"
                            disabled={isSubmitting || !tagName || existingCustomTagsCount >= maxCustomTags}
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Palette className="w-4 h-4 mr-2" />}
                            Создать тег
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};
