"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark' | 'custom-slate' | 'custom-zinc' | 'custom-rose';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [theme, setThemeState] = useState<Theme>('dark');
    const saveTimerRef = useRef<number | null>(null);

    // 1. Initial load from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('app-theme') as Theme;
        if (savedTheme) {
            setThemeState(savedTheme);
        }
    }, []);

    // 2. Load from user profile when authenticated
    useEffect(() => {
        if (isAuthenticated && user?.theme) {
            setThemeState(user.theme as Theme);
        }
    }, [isAuthenticated, user?.theme]);

    // 3. Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;
        
        // Remove old theme classes
        root.classList.remove('light', 'dark', 'custom-slate', 'custom-zinc', 'custom-rose');
        
        // Add new theme class
        root.classList.add(theme);
        
        // Persist to localStorage
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);

        // If logged in, save to backend with debounce
        if (isAuthenticated) {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
            }

            saveTimerRef.current = window.setTimeout(async () => {
                try {
                    const token = localStorage.getItem('accessToken');
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

                    await fetch(`${apiUrl}/api/users/profile`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ theme: newTheme })
                    });
                } catch (err) {
                    console.error('Failed to save theme to profile:', err);
                }
            }, 500); // 500ms debounce
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
