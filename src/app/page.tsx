"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
    IdCard, 
    Shield, 
    Radio, 
    Heart, 
    Settings, 
    Loader2, 
    ArrowRight,
    Compass,
    Activity,
    LogOut,
    Lock,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Lock, LogOut, Loader2, IdCard, Shield, Radio, Compass, Heart, Settings, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const ROLE_PAGES = [
    { 
        key: 'civilian', 
        label: 'Civilian Portal', 
        desc: 'Manage your characters, licenses, and vehicles.',
        path: '/citizen', 
        icon: IdCard, 
        color: 'from-blue-600 to-blue-700',
        borderColor: 'border-blue-500/20',
        requiredRoles: ['citizen'] 
    },
    { 
        key: 'officer', 
        label: 'Police Portal', 
        desc: 'Access NCIC, BOLO, and unit management.',
        path: '/police', 
        icon: Shield, 
        color: 'from-zinc-100 to-zinc-300',
        textColor: 'text-zinc-900',
        borderColor: 'border-white/20',
        requiredRoles: ['police'] 
    },
    { 
        key: 'dispatcher', 
        label: 'Dispatch Center', 
        desc: 'Monitor calls and manage tactical assets.',
        path: '/dispatcher', 
        icon: Radio, 
        color: 'from-red-600 to-red-700',
        borderColor: 'border-red-500/20',
        requiredRoles: ['dispatcher'] 
    },
    { 
        key: 'map', 
        label: 'Live Map', 
        desc: 'Real-time tactical unit tracking system.',
        path: '/map', 
        icon: Compass, 
        color: 'from-emerald-600 to-emerald-700',
        borderColor: 'border-emerald-500/20',
        requiredRoles: ['police', 'dispatcher'] 
    },
    { 
        key: 'ems', 
        label: 'EMS / Fire', 
        desc: 'First responder and medical records.',
        path: '/ems', 
        icon: Heart, 
        color: 'from-amber-600 to-amber-700',
        borderColor: 'border-amber-500/20',
        disabled: true 
    },
];

export default function SelectorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
            <SelectorPageContent />
        </Suspense>
    );
}

function SelectorPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isBanned = searchParams.get('banned') === 'true';
    const banReason = searchParams.get('reason');
    const { user, hasRole, isAuthenticated, isLoading, logout } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated && mounted && !isBanned) {
            router.push('/auth/login');
        }
    }, [isLoading, isAuthenticated, mounted, router, isBanned]);

    if (isLoading || !mounted) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (isBanned) {
        return (
            <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-red-500/30 items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full"
                >
                    <Card className="bg-zinc-900/50 border-red-500/20 backdrop-blur-xl p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                            <Lock className="w-10 h-10 text-red-500" />
                        </div>
                        
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase">Access Revoked</h1>
                            <p className="text-zinc-500 text-sm font-medium">
                                Your account has been permanently suspended from the Compass CAD network.
                            </p>
                        </div>

                        <div className="bg-black/40 rounded-xl p-4 border border-zinc-800/50 text-left space-y-1">
                            <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">Reason for Ban</span>
                            <p className="text-zinc-300 text-sm font-medium italic">
                                "{banReason || 'No specific reason provided by administration.'}"
                            </p>
                        </div>

                        <div className="pt-4 space-y-3">
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                                If you believe this is an error, contact support.
                            </p>
                            <Button 
                                variant="outline" 
                                onClick={logout}
                                className="w-full border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                            >
                                <LogOut className="w-4 h-4 mr-2" /> Sign Out from Account
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (!user) return null;

    const isAdmin = hasRole(['admin', 'Admin']);

    return (
        <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 blur-[120px] rounded-full animate-pulse delay-1000" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
                <div className="max-w-6xl w-full">
                    
                    {/* Header Section */}
                    <div className="text-center mb-16 space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm"
                        >
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500">System Authorized</span>
                        </motion.div>
                        
                        <motion.h1 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl sm:text-6xl font-black tracking-tight"
                        >
                            Select <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Department</span>
                        </motion.h1>
                        
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-zinc-500 text-sm sm:text-base max-w-lg mx-auto font-medium"
                        >
                            Welcome back, {user.username}. Quick access to operational ports based on your security clearance.
                        </motion.p>
                    </div>

                    {/* Portal Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ROLE_PAGES.map((portal, idx) => {
                            const hasAccess = portal.requiredRoles ? hasRole(portal.requiredRoles) : !portal.disabled;
                            const isLocked = !hasAccess || portal.disabled;
                            const Icon = portal.icon;

                            return (
                                <motion.div
                                    key={portal.key}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + (idx * 0.05) }}
                                >
                                    <Card 
                                        className={`group relative overflow-hidden h-full border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm transition-all duration-300 
                                            ${isLocked ? 'grayscale opacity-60' : 'hover:border-zinc-700/50 hover:bg-zinc-900/50 hover:translate-y-[-4px] cursor-pointer'}`}
                                        onClick={() => !isLocked && router.push(portal.path)}
                                    >
                                        <CardContent className="p-8">
                                            {/* Glow Effect */}
                                            {!isLocked && (
                                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${portal.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity animate-pulse`} />
                                            )}

                                            <div className="relative z-10 flex flex-col h-full">
                                                <div className={`w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden flex items-center justify-center mb-6 transition-all duration-500 
                                                    ${!isLocked ? 'group-hover:scale-110 group-hover:bg-zinc-700' : ''}`}
                                                >
                                                    <div className={`w-full h-full bg-gradient-to-br ${portal.color} opacity-80 flex items-center justify-center`}>
                                                        <Icon className={`w-7 h-7 ${portal.textColor || 'text-white'}`} />
                                                    </div>
                                                </div>

                                                <div className="mb-8">
                                                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                                        {portal.label}
                                                        {isLocked && <Lock className="w-3.5 h-3.5 text-zinc-600" />}
                                                    </h3>
                                                    <p className="text-zinc-500 text-xs leading-relaxed font-medium">
                                                        {portal.desc}
                                                    </p>
                                                </div>

                                                <div className="mt-auto flex items-center justify-between">
                                                    {isLocked ? (
                                                        <span className="text-[10px] font-black uppercase text-zinc-700 tracking-wider">Access Denied</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                                            Enter Portal <ArrowRight className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}

                        {/* Admin Entry if applicable */}
                        {isAdmin && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <Card 
                                    className="group relative overflow-hidden h-full border-red-900/20 bg-red-950/5 backdrop-blur-sm transition-all duration-300 hover:border-red-900/40 hover:bg-red-950/10 hover:translate-y-[-4px] cursor-pointer"
                                    onClick={() => router.push('/admin')}
                                >
                                    <CardContent className="p-8">
                                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden flex items-center justify-center mb-6">
                                            <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-800 opacity-80 flex items-center justify-center">
                                                <Settings className="w-7 h-7 text-white" />
                                            </div>
                                        </div>
                                        <div className="mb-8">
                                            <h3 className="text-xl font-bold text-white mb-2">Admin Panel</h3>
                                            <p className="text-zinc-500 text-xs leading-relaxed font-medium">Manage users, roles, and system departments.</p>
                                        </div>
                                        <div className="mt-auto flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                                                Control Center <ArrowRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>

                    {/* Quick Stats or Footer Actions */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-zinc-800 pt-8"
                    >
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">Logged as</span>
                                <span className="text-sm font-bold text-zinc-300">{user.email}</span>
                            </div>
                            <div className="w-px h-8 bg-zinc-800 hidden sm:block" />
                            <div className="flex items-center gap-3">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => router.push('/profile')}
                                    className="text-xs text-zinc-500 hover:text-white"
                                >
                                    <User className="w-3.5 h-3.5 mr-2" /> Profile Settings
                                </Button>
                            </div>
                        </div>

                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={logout}
                            className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out from System
                        </Button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}