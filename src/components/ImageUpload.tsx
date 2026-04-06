"use client";

import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface ImageUploadProps {
    onUploadSuccess: (url: string) => void;
    currentValue?: string;
    label?: string;
    required?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
    onUploadSuccess, 
    currentValue, 
    label = "Загрузить фото",
    required = false
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    const getFullImageUrl = (path: string) => {
        if (!path) return undefined;
        if (path.startsWith('http')) return path;
        return `${apiUrl}${path}`;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Валидация
        if (!file.type.startsWith('image/')) {
            toast({ title: "Ошибка", description: "Пожалуйста, выберите изображение", variant: "destructive" });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        try {
            const res = await fetch(`${apiUrl}/api/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            onUploadSuccess(data.url);
            setPreview(data.url ? getFullImageUrl(data.url) : undefined);
            toast({ title: "Успех", description: "Изображение загружено", variant: "success" });
        } catch (error) {
            console.error("Upload error:", error);
            toast({ title: "Ошибка", description: "Не удалось загрузить файл", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                {(currentValue || preview) && (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation();
                            setPreview(undefined); 
                            onUploadSuccess(''); 
                        }}
                        className="text-red-500 text-[10px] hover:underline flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> Удалить
                    </button>
                )}
            </div>

            <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`relative h-40 w-full rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden
                    ${currentValue || preview ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-800 bg-zinc-900/30 hover:border-blue-500/50 hover:bg-blue-500/5'}
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {(currentValue || preview) ? (
                    <>
                        <img 
                            src={preview || getFullImageUrl(currentValue!)!} 
                            className="w-full h-full object-cover" 
                            alt="Preview" 
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold flex items-center gap-2">
                                <Upload className="w-4 h-4" /> Изменить фото
                            </span>
                        </div>
                        <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow-lg">
                            <CheckCircle className="w-3 h-3" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3 rounded-full bg-zinc-800 mb-2">
                            {isUploading ? <Loader2 className="w-6 h-6 text-blue-500 animate-spin" /> : <Camera className="w-6 h-6 text-zinc-500" />}
                        </div>
                        <p className="text-xs text-zinc-500">{isUploading ? "Загрузка..." : "Нажмите для выбора файла"}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">JPG, PNG, WEBP до 10MB</p>
                    </>
                )}
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
            />
        </div>
    );
};
