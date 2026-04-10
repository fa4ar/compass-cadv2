"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, ZoomControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '@/context/SocketContext';
import { Shield, Siren, User, Flame, Wrench, Crosshair, Car, MapPin, Phone, AlertTriangle, Clock } from 'lucide-react';

// --- НАСТРОЙКИ КАЛИБРОВКИ И МАСШТАБА (Вычислено по замерам юзера) ---
const CALIBRATION = {
    SCALE_Y: 0.505,
    SCALE_X: 0.59,
    OFFSET_Y: -2217,
    OFFSET_X: -208
};

const STORAGE_KEY_CENTER = 'cad_map_center';
const STORAGE_KEY_ZOOM = 'cad_map_zoom';
const DEFAULT_CENTER: L.LatLngTuple = [-1110 * 0.505 - 2217, -78.9 * 0.59 - 208]; 
const DEFAULT_ZOOM = -2;
const SAVE_DEBOUNCE_MS = 500;

// --- ICONS ---
// Memoized icon cache to avoid recreating icons
const iconCache = new Map<string, L.DivIcon>();

// Photo cache to avoid reloading images
const photoCache = new Map<string, string>();

const createCustomIcon = (type: string, color: string, heading: number, inVehicle?: boolean): L.DivIcon => {
    const cacheKey = `${type}-${color}-${heading}-${inVehicle}`;
    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey)!;
    }

    let iconHtml: string;
    if (inVehicle) {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="p-1"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`;
    } else {
        const iconMap: Record<string, string> = {
            police: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="p-1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>`,
            ems: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="p-1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>`,
            fire: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="p-1"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.6-3.3.7-1.9 2.1-4.1 4.9-2.2z"/></svg>`,
            dot: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="p-1"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
            default: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="p-1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        };
        iconHtml = iconMap[type] || iconMap.default;
    }

    const html = `<div class="relative w-[26px] h-[26px] transition-all duration-500 transform-gpu" style="transform: rotate(${heading}deg)">
        <div class="absolute inset-0 bg-zinc-950/90 rounded-full border border-zinc-100/20 shadow-lg flex items-center justify-center overflow-hidden" style="border-color: ${color}; box-shadow: 0 0 10px ${color}44, inset 0 0 4px ${color}22">
            <div class="w-full h-full relative flex items-center justify-center p-1">${iconHtml}</div>
        </div>
        <div class="absolute inset-0 rounded-full animate-pulse opacity-20" style="background-color: ${color}"></div>
    </div>`;

    const icon = L.divIcon({
        html,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
    });

    iconCache.set(cacheKey, icon);
    return icon;
};

const createCallIcon = (priority: string, status: string): L.DivIcon => {
    const cacheKey = `call-${priority}-${status}`;
    if (iconCache.has(cacheKey)) {
        return iconCache.get(cacheKey)!;
    }

    const priorityColors = {
        low: '#22c55e',
        medium: '#f59e0b',
        high: '#ef4444',
        critical: '#dc2626'
    };
    const color = priorityColors[priority as keyof typeof priorityColors] || '#f59e0b';
    const isClosed = status === 'closed';

    const phoneIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="p-1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

    let animations = '';
    if (!isClosed) {
        animations = `<div class="absolute inset-0 rounded-full animate-ping opacity-30" style="background-color: ${color}"></div>
                   <div class="absolute inset-0 rounded-full animate-pulse opacity-40" style="background-color: ${color}"></div>`;
    }

    const html = `<div class="relative w-[32px] h-[32px] transition-all duration-500 transform-gpu">
        <div class="absolute inset-0 bg-zinc-950/90 rounded-full border-2 shadow-lg flex items-center justify-center overflow-hidden ${isClosed ? 'opacity-50' : ''}" style="border-color: ${color}; box-shadow: 0 0 15px ${color}66, inset 0 0 6px ${color}33">
            ${phoneIcon}
        </div>
        ${animations}
    </div>`;

    const icon = L.divIcon({
        html,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    iconCache.set(cacheKey, icon);
    return icon;
};

interface Blip {
    identifier: string; x: number; y: number; z: number; heading: number;
    type: string; label: string; color: string; location?: string;
    status?: string; department?: string; inVehicle?: boolean;
}

interface Call911 {
    id: number; type: string; location: string; description: string;
    priority: string; callerName: string; status: string;
    x: number; y: number; z: number; createdAt: number;
    source?: string;
}

// --- ФОН КАРТЫ (Фиксированная сетка) ---
function AtlasBackground() {
    const s = 2500;
    const tiles = [
        { url: '/map/minimap_sea_0_0.png', bounds: [[s, -s], [0, 0]] as L.LatLngBoundsLiteral },
        { url: '/map/minimap_sea_0_1.png', bounds: [[s, 0], [0, s]] as L.LatLngBoundsLiteral },
        { url: '/map/minimap_sea_1_0.png', bounds: [[0, -s], [-s, 0]] as L.LatLngBoundsLiteral },
        { url: '/map/minimap_sea_1_1.png', bounds: [[0, 0], [-s, s]] as L.LatLngBoundsLiteral },
        { url: '/map/minimap_sea_2_0.png', bounds: [[-s, -s], [-2 * s, 0]] as L.LatLngBoundsLiteral },
        { url: '/map/minimap_sea_2_1.png', bounds: [[-s, 0], [-2 * s, s]] as L.LatLngBoundsLiteral },
    ];
    return <>{tiles.map((tile, i) => (<ImageOverlay key={i} url={tile.url} bounds={tile.bounds} opacity={1} />))}</>;
}

function MapHelpers({ onCoordClick }: { onCoordClick: (lat: number, lng: number) => void }) {
    const map = useMapEvents({
        click: (e) => { onCoordClick(Math.round(e.latlng.lat), Math.round(e.latlng.lng)); }
    });
    return null;
}

interface LiveMapProps {
    selectedCall?: Call911 | null;
    onCallSelect?: (call: Call911 | null) => void;
    onCallsUpdate?: (calls: Call911[]) => void;
}

export default function LiveMap({ selectedCall, onCallSelect, onCallsUpdate }: LiveMapProps = {}) {
    const { socket } = useSocket();
    const [blips, setBlips] = useState<Blip[]>([]);
    const [calls, setCalls] = useState<Call911[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [lastClickedCoord, setLastClickedCoord] = useState<{ lat: number, lng: number } | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    
    useEffect(() => {
        setIsMounted(true);
        const fetchInitialData = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                const headers: Record<string, string> = {};
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
                
                const [blipsRes, callsRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fivem/active-units`),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/calls911/active`, { headers })
                ]);
                
                if (blipsRes.ok) {
                    const blipsData = await blipsRes.json();
                    if (blipsData && blipsData.units) setBlips(blipsData.units);
                } else {
                    console.error("Initial blips fetch error:", blipsRes.status);
                }
                
                if (callsRes.ok) {
                    const callsData = await callsRes.json();
                    if (callsData && callsData.calls) {
                        // Filter to only show calls from the game
                        const gameCalls = Array.isArray(callsData.calls) ? callsData.calls.filter((call: Call911) => !call.source || call.source === 'game') : [];
                        setCalls(gameCalls);
                    }
                } else {
                    console.error("Initial calls fetch error:", callsRes.status);
                }
            } catch (error) { console.error("Initial data fetch error:", error); }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const blipHandler = (data: Blip[]) => setBlips(data);
        const callHandler = (data: Call911[]) => {
            // Filter to only show calls from the game
            const gameCalls = Array.isArray(data) ? data.filter(call => !call.source || call.source === 'game') : [];
            setCalls(gameCalls);
            if (onCallsUpdate) onCallsUpdate(gameCalls);
        };
        socket.on('blips_updated', blipHandler);
        socket.on('calls_updated', callHandler);
        return () => {
            socket.off('blips_updated', blipHandler);
            socket.off('calls_updated', callHandler);
        };
    }, [socket, onCallsUpdate]);

    // ТУТ ПРОИСХОДИТ ПЕРЕСЧЕТ С УЧЕТОМ МАСШТАБА
    const convertToLatLng = useCallback((x: number, y: number): L.LatLngTuple => {
        const lat = (y * CALIBRATION.SCALE_Y) + CALIBRATION.OFFSET_Y;
        const lng = (x * CALIBRATION.SCALE_X) + CALIBRATION.OFFSET_X;
        return [lat, lng];
    }, []);

    // Pan to selected call
    useEffect(() => {
        if (selectedCall && mapRef.current) {
            const latLng = convertToLatLng(selectedCall.x, selectedCall.y);
            mapRef.current.setView(latLng, 1, { animate: true, duration: 0.5 });
        }
    }, [selectedCall, convertToLatLng]);

    if (!isMounted) return <div className="w-full h-full bg-[#050505]" />;

    return (
        <div className="w-full h-full bg-[#030303] overflow-hidden rounded-xl border border-zinc-800 relative shadow-2xl">
            <MapContainer
                ref={(map) => { if (map) mapRef.current = map; }}
                center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} 
                minZoom={-7} maxZoom={3} scrollWheelZoom={true}
                className="w-full h-full" style={{ background: '#030303' }}
                zoomControl={false} crs={L.CRS.Simple} preferCanvas={true}
            >
                <AtlasBackground />
                <MapHelpers onCoordClick={(lat, lng) => setLastClickedCoord({ lat, lng })} />
                <ZoomControl position="bottomright" />

                {blips.map((blip) => (
                    <Marker
                        key={blip.identifier}
                        position={convertToLatLng(blip.x, blip.y)}
                        icon={createCustomIcon(blip.type, blip.color, blip.heading, blip.inVehicle)}
                    >
                        <Popup className="cad-map-popup">
                            <div className="p-3 min-w-[210px] bg-zinc-950/20 text-zinc-100 rounded-lg border border-white/5">
                                <h3 className="font-black text-sm uppercase mb-2">{blip.label}</h3>
                                <div className="space-y-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-zinc-600 uppercase tracking-tighter">Duty Status</span>
                                        <span className="text-xs font-black text-emerald-400 uppercase tracking-tight italic">● {blip.status || 'Active'}</span>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 border-t border-zinc-800/50 pt-2">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black text-white uppercase" style={{ backgroundColor: blip.color }}>{blip.type}</span>
                                        <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-tight">{blip.department}</span>
                                        {(blip as any).subdivision && (
                                            <span className="text-[10px] font-bold text-blue-400 uppercase border border-blue-500/20 px-1 rounded">{(blip as any).subdivision}</span>
                                        )}
                                    </div>

                                    {((blip as any).vehicleModel || (blip as any).vehiclePlate) && (
                                        <div className="pt-2 mt-1 border-t border-zinc-800/50 flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                                                <Car className="w-3 h-3 text-zinc-500" />
                                                <span className="font-bold">{(blip as any).vehicleModel || 'Unknown Vehicle'}</span>
                                                {(blip as any).vehiclePlate && (
                                                    <span className="bg-zinc-800 px-1.5 rounded font-mono text-[9px] text-zinc-400">{(blip as any).vehiclePlate}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-1.5 mt-1 border-t border-zinc-800/50 flex items-center gap-1 text-[10px] text-zinc-400 italic">
                                        <MapPin className="w-3 h-3 text-zinc-600" /> {blip.location}
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {calls.map((call) => (
                    <Marker
                        key={`call-${call.id}`}
                        position={convertToLatLng(call.x, call.y)}
                        icon={createCallIcon(call.priority, call.status)}
                        eventHandlers={{
                            click: () => {
                                if (onCallSelect) onCallSelect(call);
                            }
                        }}
                    >
                        <Popup className="cad-map-popup">
                            <div className="p-4 min-w-[280px] bg-zinc-950/20 text-zinc-100 rounded-lg border border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-black text-sm uppercase flex items-center gap-2">
                                        <Phone className="w-4 h-4" />
                                        Вызов #{call.id}
                                    </h3>
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                        call.priority === 'critical' ? 'bg-red-600 text-white' :
                                        call.priority === 'high' ? 'bg-orange-600 text-white' :
                                        call.priority === 'medium' ? 'bg-amber-600 text-white' :
                                        'bg-green-600 text-white'
                                    }`}>
                                        {call.priority}
                                    </span>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-zinc-400 uppercase tracking-tighter">Тип вызова</p>
                                            <p className="text-sm font-bold text-zinc-200">{call.type}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-zinc-400 uppercase tracking-tighter">Локация</p>
                                            <p className="text-sm font-bold text-zinc-200">{call.location}</p>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                                        <p className="text-xs text-zinc-400 uppercase tracking-tighter mb-1">Описание</p>
                                        <p className="text-sm text-zinc-200 leading-relaxed">{call.description}</p>
                                    </div>

                                    <div className="flex items-center gap-4 pt-2 border-t border-zinc-800">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-zinc-500" />
                                            <span className="text-[10px] text-zinc-400">{call.callerName}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-zinc-500" />
                                            <span className="text-[10px] text-zinc-400">
                                                {new Date(call.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">Статус:</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            call.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                            call.status === 'active' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                            call.status === 'resolved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                                        }`}>
                                            {call.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {lastClickedCoord && (
                <div className="absolute bottom-20 right-4 z-[500] bg-blue-600 px-3 py-1.5 rounded-lg shadow-xl">
                    <div className="flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-white" />
                        <span className="text-[10px] font-black text-white uppercase">
                            CAD X: {lastClickedCoord.lng}, CAD Y: {lastClickedCoord.lat}
                        </span>
                        <button onClick={() => setLastClickedCoord(null)} className="ml-2 text-white/50">×</button>
                    </div>
                </div>
            )}
        </div>
    );
}
