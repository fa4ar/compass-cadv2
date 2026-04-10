"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/utils";

type UISettings = {
    background: string;
    card: string;
    accent: string;
    primary: string;
    borderOpacity: number;
    grid: boolean;
    scanlines: boolean;
};

type UIProfileKey = "default" | "citizen" | "police" | "dispatcher" | "admin" | "map";

type UIProfile = {
    enabled: boolean;
    settings: UISettings;
};

type UIProfileMap = Partial<Record<UIProfileKey, UIProfile>>;

type UISettingsContextValue = {
    settings: UISettings;
    setSettings: (next: Partial<UISettings>) => void;
    enabled: boolean;
    setEnabled: (next: boolean) => void;
    reset: () => void;
    profileKey: UIProfileKey;
};

const STORAGE_KEY = "ui-settings-profiles-v2";
const LEGACY_SETTINGS_KEY = "ui-settings";
const LEGACY_ENABLED_KEY = "ui-settings-enabled";

const FALLBACK_SETTINGS: UISettings = {
    background: "#09090b",
    card: "#111113",
    accent: "#27272a",
    primary: "#3b82f6",
    borderOpacity: 0.18,
    grid: true,
    scanlines: false,
};

const UISettingsContext = createContext<UISettingsContextValue | undefined>(undefined);

function clamp(num: number, min: number, max: number) {
    return Math.min(Math.max(num, min), max);
}

function rgbToHex(r: number, g: number, b: number) {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeColor(input: string, fallback: string) {
    const value = input.trim();
    if (!value) return fallback;
    if (value.startsWith("#")) return value;
    const match = value.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);
    if (match) {
        const r = clamp(parseInt(match[1], 10), 0, 255);
        const g = clamp(parseInt(match[2], 10), 0, 255);
        const b = clamp(parseInt(match[3], 10), 0, 255);
        return rgbToHex(r, g, b);
    }
    return fallback;
}

function parseOpacity(input: string, fallback: number) {
    const value = input.trim();
    const match = value.match(/rgba?\(\d+,\s*\d+,\s*\d+,\s*([0-9.]+)\s*\)/i);
    if (match) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed)) return clamp(parsed, 0.05, 0.5);
    }
    return fallback;
}

function getProfileKey(pathname: string): UIProfileKey {
    if (pathname.startsWith("/police")) return "police";
    if (pathname.startsWith("/dispatcher")) return "dispatcher";
    if (pathname.startsWith("/citizen")) return "citizen";
    if (pathname.startsWith("/admin")) return "admin";
    if (pathname.startsWith("/map")) return "map";
    return "default";
}

function sanitizeProfile(input: any, fallback: UISettings): UIProfileMap {
    if (!input || typeof input !== "object") return {};
    const result: UIProfileMap = {};
    Object.entries(input as Record<string, any>).forEach(([key, value]) => {
        if (typeof value !== "object" || value === null) return;
        const settings = value.settings || value;
        result[key as UIProfileKey] = {
            enabled: Boolean(value.enabled),
            settings: {
                background: normalizeColor(settings.background || "", fallback.background),
                card: normalizeColor(settings.card || "", fallback.card),
                accent: normalizeColor(settings.accent || "", fallback.accent),
                primary: normalizeColor(settings.primary || "", fallback.primary),
                borderOpacity: clamp(Number(settings.borderOpacity ?? fallback.borderOpacity), 0.05, 0.5),
                grid: settings.grid ?? fallback.grid,
                scanlines: settings.scanlines ?? fallback.scanlines,
            },
        };
    });
    return result;
}

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const pathname = usePathname();
    const profileKey = getProfileKey(pathname || "/");
    const [baseSettings, setBaseSettings] = useState<UISettings>(FALLBACK_SETTINGS);
    const [profiles, setProfiles] = useState<UIProfileMap>({});
    const [hydrated, setHydrated] = useState(false);
    const saveTimer = useRef<number | null>(null);

    useEffect(() => {
        const root = document.documentElement;
        const styles = getComputedStyle(root);
        const computedBase: UISettings = {
            background: normalizeColor(styles.getPropertyValue("--background"), FALLBACK_SETTINGS.background),
            card: normalizeColor(styles.getPropertyValue("--card"), FALLBACK_SETTINGS.card),
            accent: normalizeColor(styles.getPropertyValue("--accent"), FALLBACK_SETTINGS.accent),
            primary: normalizeColor(styles.getPropertyValue("--primary"), FALLBACK_SETTINGS.primary),
            borderOpacity: parseOpacity(styles.getPropertyValue("--border"), FALLBACK_SETTINGS.borderOpacity),
            grid: FALLBACK_SETTINGS.grid,
            scanlines: FALLBACK_SETTINGS.scanlines,
        };
        setBaseSettings(computedBase);

        let nextProfiles: UIProfileMap = {};
        const legacySettings = localStorage.getItem(LEGACY_SETTINGS_KEY);
        const legacyEnabled = localStorage.getItem(LEGACY_ENABLED_KEY) === "true";
        if (legacySettings) {
            try {
                const parsed = JSON.parse(legacySettings);
                nextProfiles = {
                    default: {
                        enabled: legacyEnabled,
                        settings: {
                            ...computedBase,
                            ...parsed,
                        },
                    },
                };
            } catch {
                nextProfiles = {};
            }
        }

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                nextProfiles = { ...nextProfiles, ...sanitizeProfile(parsed, computedBase) };
            } catch {
                nextProfiles = { ...nextProfiles };
            }
        }

        setProfiles(nextProfiles);
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        if (isAuthenticated && user?.uiProfiles) {
            const parsed = sanitizeProfile(user.uiProfiles, baseSettings);
            setProfiles(parsed);
        }
    }, [baseSettings, hydrated, isAuthenticated, user?.uiProfiles]);

    const activeProfile = profiles[profileKey] ?? profiles.default ?? {
        enabled: false,
        settings: baseSettings,
    };

    useEffect(() => {
        if (!hydrated) return;
        const root = document.documentElement;

        if (!activeProfile.enabled) {
            root.style.removeProperty("--background");
            root.style.removeProperty("--card");
            root.style.removeProperty("--accent");
            root.style.removeProperty("--primary");
            root.style.removeProperty("--ring");
            root.style.removeProperty("--border");
            root.style.removeProperty("--input");
            root.classList.remove("ui-grid", "ui-scanlines");
            return;
        }

        root.style.setProperty("--background", activeProfile.settings.background);
        root.style.setProperty("--card", activeProfile.settings.card);
        root.style.setProperty("--accent", activeProfile.settings.accent);
        root.style.setProperty("--primary", activeProfile.settings.primary);
        root.style.setProperty("--ring", activeProfile.settings.primary);
        root.style.setProperty("--border", `rgba(255, 255, 255, ${activeProfile.settings.borderOpacity})`);
        root.style.setProperty("--input", `rgba(255, 255, 255, ${clamp(activeProfile.settings.borderOpacity + 0.06, 0.08, 0.45)})`);
        root.classList.toggle("ui-grid", activeProfile.settings.grid);
        root.classList.toggle("ui-scanlines", activeProfile.settings.scanlines);
    }, [activeProfile, hydrated]);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
        localStorage.removeItem(LEGACY_SETTINGS_KEY);
        localStorage.removeItem(LEGACY_ENABLED_KEY);

        if (!isAuthenticated) return;
        if (saveTimer.current) window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(async () => {
            try {
                const token = localStorage.getItem("accessToken");
                if (!token) return;
                const apiUrl = getApiUrl();
                await fetch(`${apiUrl}/api/users/profile`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ uiProfiles: profiles }),
                });
            } catch (err) {
                console.error("Failed to save UI profiles:", err);
            }
        }, 700);
    }, [hydrated, isAuthenticated, profiles]);

    const setSettings = (next: Partial<UISettings>) => {
        setProfiles((prev) => ({
            ...prev,
            [profileKey]: {
                enabled: true,
                settings: { ...activeProfile.settings, ...next },
            },
        }));
    };

    const setEnabled = (next: boolean) => {
        setProfiles((prev) => ({
            ...prev,
            [profileKey]: {
                enabled: next,
                settings: activeProfile.settings,
            },
        }));
    };

    const reset = () => {
        setProfiles((prev) => {
            const copy = { ...prev };
            delete copy[profileKey];
            return copy;
        });
    };

    const value = useMemo(
        () => ({
            settings: activeProfile.settings,
            setSettings,
            enabled: activeProfile.enabled,
            setEnabled,
            reset,
            profileKey,
        }),
        [activeProfile, profileKey, setSettings, setEnabled, reset]
    );

    return <UISettingsContext.Provider value={value}>{children}</UISettingsContext.Provider>;
}

export function useUISettings() {
    const context = useContext(UISettingsContext);
    if (!context) {
        throw new Error("useUISettings must be used within a UISettingsProvider");
    }
    return context;
}
