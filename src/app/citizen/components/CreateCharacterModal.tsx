import React from 'react';
import { User, X, Loader2, ChevronDown, Camera, CheckCircle, Plus } from 'lucide-react';
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
import { ImageUpload } from '@/components/ImageUpload';

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

    const step1Valid = formData.firstName && formData.lastName && formData.birthDate && formData.gender;
    const step2Valid = !!formData.photoUrl;

    const stepLabels = ['Personal Info', 'Character Photo', 'Final Review'];

    const getFullImageUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        return `${apiUrl}${path}`;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <Card className="bg-zinc-900 border-zinc-800 w-full max-w-lg shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                             Create Citizen
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">{stepLabels[step - 1]}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-500 hover:text-zinc-100 -mt-2 -mr-2">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step progress */}
                    <div className="flex gap-2 items-center px-2">
                        {[1, 2, 3].map((s) => (
                            <React.Fragment key={s}>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300
                                    ${step > s ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : step === s ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' : 'bg-zinc-800 text-zinc-600'}`}>
                                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                                </div>
                                {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${step > s ? 'bg-blue-600' : 'bg-zinc-800'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step 1: Personal info */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">First Name *</Label>
                                    <Input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="John" className="mt-1 bg-zinc-800/40 border-zinc-700/50 h-10" />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">M.I.</Label>
                                    <Input name="middleName" value={formData.middleName} onChange={handleInputChange} placeholder="A." className="mt-1 bg-zinc-800/40 border-zinc-700/50 h-10" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Last Name *</Label>
                                    <Input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Doe" className="mt-1 bg-zinc-800/40 border-zinc-700/50 h-10" />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Nickname</Label>
                                    <Input name="nickname" value={formData.nickname} onChange={handleInputChange} placeholder="Johnny" className="mt-1 bg-zinc-800/40 border-zinc-700/50 h-10" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Birth Date *</Label>
                                    <Input name="birthDate" type="date" value={formData.birthDate} onChange={handleInputChange} className="mt-1 bg-zinc-800/40 border-zinc-700 style-zinc-900 invert h-10" />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Gender *</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="mt-1 w-full justify-between bg-zinc-800/40 border-zinc-700/50 h-10 hover:bg-zinc-800 hover:text-white">
                                                <span className={formData.gender ? 'text-zinc-200' : 'text-zinc-500'}>
                                                    {formData.gender ? (formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1)) : 'Select...'}
                                                </span>
                                                <ChevronDown className="w-4 h-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-zinc-900 border-zinc-800 min-w-[200px] shadow-xl">
                                            <DropdownMenuItem onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'male' }))} className="text-zinc-300 focus:bg-blue-600 focus:text-white p-2.5">Male</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'female' }))} className="text-zinc-300 focus:bg-blue-600 focus:text-white p-2.5">Female</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setFormData((prev: any) => ({ ...prev, gender: 'other' }))} className="text-zinc-300 focus:bg-blue-600 focus:text-white p-2.5">Other</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Height (cm)</Label>
                                    <Input name="height" type="number" value={formData.height} onChange={handleInputChange} placeholder="180" className="mt-1 bg-zinc-800/40 border-zinc-700/50 h-10" />
                                </div>
                                <div>
                                    <Label className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Weight (kg)</Label>
                                    <Input name="weight" type="number" value={formData.weight} onChange={handleInputChange} placeholder="80" className="mt-1 bg-zinc-800/40 border-zinc-700/50 h-10" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: MANDATORY FILE UPLOAD */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                    <Camera className="w-4 h-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-blue-400 uppercase tracking-tight">Identity Verification Required</p>
                                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                        Please upload a high-quality photograph of your character. This image will be used for your ID card and official police records.
                                    </p>
                                </div>
                            </div>

                            <ImageUpload 
                                label="Photo Identification"
                                required={true}
                                currentValue={formData.photoUrl}
                                onUploadSuccess={(url) => setFormData((prev: any) => ({ ...prev, photoUrl: url }))}
                            />
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-zinc-800/30 rounded-2xl p-5 border border-zinc-800 flex gap-6 items-center">
                                {formData.photoUrl ? (
                                    <img 
                                        src={getFullImageUrl(formData.photoUrl)!} 
                                        alt="preview" 
                                        className="w-24 h-32 object-cover rounded-xl border border-zinc-700 shadow-2xl" 
                                    />
                                ) : (
                                    <div className="w-24 h-32 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-dashed border-zinc-700">
                                        <User className="w-10 h-10 text-zinc-600" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-bold uppercase tracking-wider border border-blue-500/20">Citizen Preview</span>
                                    </div>
                                    <p className="text-2xl font-bold text-zinc-100 leading-tight truncate">{formData.firstName} {formData.lastName}</p>
                                    {formData.nickname && <p className="text-blue-400 text-sm italic font-medium mt-0.5">"{formData.nickname}"</p>}
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
                                        <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded capitalize">{formData.gender || 'Unknown'}</span>
                                        <span className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">{formData.birthDate || 'No DOB'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-800/20 border border-zinc-800 rounded-xl p-3">
                                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-wider">Height</p>
                                    <p className="text-sm text-zinc-200">{formData.height ? `${formData.height} cm` : 'Not specified'}</p>
                                </div>
                                <div className="bg-zinc-800/20 border border-zinc-800 rounded-xl p-3">
                                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-wider">Weight</p>
                                    <p className="text-sm text-zinc-200">{formData.weight ? `${formData.weight} kg` : 'Not specified'}</p>
                                </div>
                            </div>
                            
                            {formData.description && (
                                <div className="bg-zinc-800/20 border border-zinc-800 rounded-xl p-3">
                                    <p className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-wider">Physical Description</p>
                                    <p className="text-xs text-zinc-300 leading-relaxed italic line-clamp-3">"{formData.description}"</p>
                                </div>
                            )}

                            <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                </div>
                                <p className="text-xs text-zinc-400">Everything looks correct. You can now finalize your registration.</p>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between pt-4 border-t border-zinc-800/80">
                        <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="text-zinc-500 hover:text-white hover:bg-zinc-800 px-6">
                            {step === 1 ? 'Cancel' : 'Back'}
                        </Button>
                        {step < 3 ? (
                            <Button
                                onClick={() => setStep(step + 1)}
                                disabled={step === 1 ? !step1Valid : step === 2 ? !step2Valid : false}
                                className="bg-blue-600 hover:bg-blue-500 px-8 font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50"
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button onClick={handleCreateSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 px-8 font-bold shadow-lg shadow-emerald-600/20">
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                Register Character
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};
