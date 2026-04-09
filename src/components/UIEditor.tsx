"use client";

import React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUISettings } from "@/context/UISettingsContext";

type UIEditorProps = {
    open: boolean;
    onClose: () => void;
};

export default function UIEditor({ open, onClose }: UIEditorProps) {
    const { settings, setSettings, enabled, setEnabled, reset, profileKey } = useUISettings();

    const profileLabelMap: Record<string, string> = {
        default: "Глобальный",
        citizen: "Citizen",
        police: "Police",
        dispatcher: "Dispatcher",
        admin: "Admin",
        map: "Map",
    };

    if (!open) return null;

    const handleColorChange = (key: "background" | "card" | "accent" | "primary") => (e: React.ChangeEvent<HTMLInputElement>) => {
        setEnabled(true);
        setSettings({ [key]: e.target.value });
    };

    const handleBorderOpacity = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEnabled(true);
        setSettings({ borderOpacity: Number(e.target.value) });
    };

    const toggleFlag = (key: "grid" | "scanlines") => (e: React.ChangeEvent<HTMLInputElement>) => {
        setEnabled(true);
        setSettings({ [key]: e.target.checked });
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-2xl bg-zinc-950 border-2 border-zinc-800 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                            <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-[0.18em] text-zinc-100">UI Editor</h2>
                            <p className="text-[11px] uppercase text-zinc-500 tracking-[0.2em]">Профиль: {profileLabelMap[profileKey] || "Custom"}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-5">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-300">Кастомный UI</p>
                                <p className="text-[10px] text-zinc-500">Применяется только в этом браузере</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                                className="h-4 w-4 accent-blue-500"
                            />
                        </div>

                        <div className="space-y-3 border border-zinc-800 bg-zinc-900/60 p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-widest text-zinc-400">Background</span>
                                <input type="color" value={settings.background} onChange={handleColorChange("background")} className="h-7 w-12 border border-zinc-700 bg-transparent" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-widest text-zinc-400">Card</span>
                                <input type="color" value={settings.card} onChange={handleColorChange("card")} className="h-7 w-12 border border-zinc-700 bg-transparent" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-widest text-zinc-400">Accent</span>
                                <input type="color" value={settings.accent} onChange={handleColorChange("accent")} className="h-7 w-12 border border-zinc-700 bg-transparent" />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-widest text-zinc-400">Primary</span>
                                <input type="color" value={settings.primary} onChange={handleColorChange("primary")} className="h-7 w-12 border border-zinc-700 bg-transparent" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2 border border-zinc-800 bg-zinc-900/60 p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase tracking-widest text-zinc-400">Border Strength</span>
                                <span className="text-[11px] text-zinc-500">{settings.borderOpacity.toFixed(2)}</span>
                            </div>
                            <input
                                type="range"
                                min="0.08"
                                max="0.4"
                                step="0.01"
                                value={settings.borderOpacity}
                                onChange={handleBorderOpacity}
                                className="w-full accent-blue-500"
                            />
                        </div>

                        <div className="space-y-3 border border-zinc-800 bg-zinc-900/60 p-3">
                            <label className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-400">
                                Grid Overlay
                                <input type="checkbox" checked={settings.grid} onChange={toggleFlag("grid")} className="h-4 w-4 accent-blue-500" />
                            </label>
                            <label className="flex items-center justify-between text-xs uppercase tracking-widest text-zinc-400">
                                Scanlines
                                <input type="checkbox" checked={settings.scanlines} onChange={toggleFlag("scanlines")} className="h-4 w-4 accent-blue-500" />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 border-t border-zinc-800 pt-4">
                    <Button variant="outline" onClick={reset} className="border-zinc-700 text-zinc-400 hover:text-white">
                        Сбросить к теме
                    </Button>
                    <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">
                        Закрыть
                    </Button>
                </div>
            </div>
        </div>
    );
}
