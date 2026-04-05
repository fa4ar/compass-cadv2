"use client";

import React from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import dynamic from 'next/dynamic';
const LiveMap = dynamic(() => import('@/components/Map/LiveMap'), { 
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[#050505] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Initializing Tactical Map...</span>
            </div>
        </div>
    )
});
import { Map as MapIcon, Layers, Radio, Users } from 'lucide-react';

export default function MapPage() {
    return (
        <ProtectedRoute allowedRoles={['police', 'dispatcher', 'admin']}>
            <div className="fixed top-14 inset-x-0 bottom-9 bg-zinc-950 flex flex-col overflow-hidden">
                {/* Заголовок карты */}
                <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/10 rounded-lg">
                            <MapIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <h1 className="text-sm font-black text-zinc-100 uppercase tracking-widest">
                            Live Tactical Map
                        </h1>
                        <span className="px-2 py-0.5 bg-zinc-800 text-[10px] text-zinc-400 rounded uppercase font-bold">
                            Real-time Node
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>GPS FEED ACTIVE</span>
                        </div>
                        <div className="h-4 w-px bg-zinc-800" />
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            <span>SATELLITE VIEW</span>
                        </div>
                    </div>
                </div>

                {/* Основная карта */}
                <div className="flex-1 relative">
                    <LiveMap />
                </div>
            </div>
        </ProtectedRoute>
    );
}
