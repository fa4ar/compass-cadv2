"use client";

import React from 'react';
import { User, X, Loader2, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CreateCharacterModalProps {
    show: boolean;
    onClose: () => void;
    step: number;
    setStep: (step: number) => void;
    formData: any;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    setFormData: any;
    handleCreateSubmit: () => void;
    isSubmitting: boolean;
}

export const CreateCharacterModal: React.FC<CreateCharacterModalProps> = ({
    show,
    onClose,
    step,
    setStep,
    formData,
    handleInputChange,
    setFormData,
    handleCreateSubmit,
    isSubmitting
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-zinc-100">Create New Character</h2>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                
                <div className="p-5 space-y-5">
                    <div className="flex gap-2">
                        {[1, 2, 3].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStep(s)}
                                className={`h-1.5 flex-1 rounded-full transition-all ${step === s ? 'bg-blue-500' : step > s ? 'bg-blue-500/50' : 'bg-zinc-700'}`}
                            />
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">First Name *</Label>
                                    <Input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" className="mt-1 bg-zinc-800/50 border-zinc-700" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">M.I.</Label>
                                    <Input name="middleName" value={formData.middleName} onChange={handleInputChange} placeholder="A." className="mt-1 bg-zinc-800/50 border-zinc-700" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">Last Name *</Label>
                                    <Input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" className="mt-1 bg-zinc-800/50 border-zinc-700" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">Nickname</Label>
                                    <Input name="nickname" value={formData.nickname} onChange={handleInputChange} placeholder="Johnny" className="mt-1 bg-zinc-800/50 border-zinc-700" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">Birth Date *</Label>
                                    <Input name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} className="mt-1 bg-zinc-800/50 border-zinc-700" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">Gender *</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="mt-1 w-full justify-between bg-zinc-800/50 border-zinc-700">
                                                <span className={formData.gender ? 'text-zinc-200' : 'text-zinc-500'}>
                                                    {formData.gender || 'Select...'}
                                                </span>
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                                            <DropdownMenuItem onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'male' }))} className="text-zinc-200 focus:bg-zinc-700">Male</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'female' }))} className="text-zinc-200 focus:bg-zinc-700">Female</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'other' }))} className="text-zinc-200 focus:bg-zinc-700">Other</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">Height (cm)</Label>
                                    <Input name="height" type="number" value={formData.height} onChange={handleInputChange} placeholder="180" className="mt-1 bg-zinc-800/50 border-zinc-700" />
                                </div>
                                <div>
                                    <Label className="text-zinc-400 text-xs uppercase tracking-wide">Weight (kg)</Label>
                                    <Input name="weight" type="number" value={formData.weight} onChange={handleInputChange} placeholder="80" className="mt-1 bg-zinc-800/50 border-zinc-700" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-zinc-400 text-xs uppercase tracking-wide">Description</Label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} rows={4} placeholder="Physical appearance, distinguishing marks, bio..." className="mt-1 w-full bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-zinc-200 placeholder:text-zinc-600" />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 py-4 text-center">
                            <div className="w-24 h-24 mx-auto rounded-full bg-zinc-800 flex items-center justify-center">
                                <User className="w-12 h-12 text-zinc-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-zinc-100">{formData.firstName} {formData.lastName}</p>
                                {formData.nickname && <p className="text-blue-400">"{formData.nickname}"</p>}
                            </div>
                            <div className="flex justify-center gap-4 text-sm text-zinc-400">
                                <span>{formData.gender}</span>
                                <span>•</span>
                                <span>{formData.birthDate || 'No birth date'}</span>
                            </div>
                            <p className="text-zinc-500 text-sm">Ready to create this character?</p>
                        </div>
                    )}

                    <div className="flex justify-between pt-4 border-t border-zinc-800">
                        <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="text-zinc-400">
                            {step === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        {step < 3 ? (
                            <Button onClick={() => setStep(step + 1)} className="bg-blue-600 hover:bg-blue-500 px-6">Continue</Button>
                        ) : (
                            <Button onClick={handleCreateSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 px-6">
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create Character
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};
