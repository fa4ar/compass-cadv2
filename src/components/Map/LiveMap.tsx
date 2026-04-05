"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, ZoomControl, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '@/context/SocketContext';
import { Shield, Siren, User, Flame, Wrench, Crosshair, Car, MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

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
const createCustomIcon = (type: string, color: string, heading: number, inVehicle?: boolean) => {
    let iconContent;
    if (inVehicle) {
        iconContent = <Car className="w-full h-full p-1" style={{ color }} />;
    } else {
        switch (type) {
            case 'police': iconContent = <Shield className="w-full h-full p-1" style={{ color }} />; break;
            case 'ems': iconContent = <Siren className="w-full h-full p-1" style={{ color }} />; break;
            case 'fire': iconContent = <Flame className="w-full h-full p-1" style={{ color }} />; break;
            case 'dot': iconContent = <Wrench className="w-full h-full p-1" style={{ color }} />; break;
            default: iconContent = <User className="w-full h-full p-1" style={{ color }} />; break;
        }
    }

    return L.divIcon({
        html: renderToStaticMarkup(
            <div className="relative w-[26px] h-[26px] transition-all duration-500 transform-gpu" style={{ transform: `rotate(${heading}deg)` }}>
                <div className="absolute inset-0 bg-zinc-950/90 rounded-full border border-zinc-100/20 shadow-lg flex items-center justify-center overflow-hidden" 
                     style={{ borderColor: color, boxShadow: `0 0 10px ${color}44, inset 0 0 4px ${color}22` }}>
                    <div className="w-full h-full relative flex items-center justify-center p-1">{iconContent}</div>
                </div>
                <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ backgroundColor: color }}></div>
            </div>
        ),
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
    });
};

interface Blip {
    identifier: string; x: number; y: number; z: number; heading: number;
    type: string; label: string; color: string; location?: string;
    status?: string; department?: string; inVehicle?: boolean;
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

export default function LiveMap() {
    const { socket } = useSocket();
    const [blips, setBlips] = useState<Blip[]>([]);
    const [isMounted, setIsMounted] = useState(false);
    const [lastClickedCoord, setLastClickedCoord] = useState<{ lat: number, lng: number } | null>(null);
    
    useEffect(() => {
        setIsMounted(true);
        const fetchInitialBlips = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fivem/active-units`);
                const data = await res.json();
                if (data && data.units) setBlips(data.units);
            } catch (error) { console.error("Initial blips fetch error:", error); }
        };
        fetchInitialBlips();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handler = (data: Blip[]) => setBlips(data);
        socket.on('blips_updated', handler);
        return () => { socket.off('blips_updated', handler); };
    }, [socket]);

    // ТУТ ПРОИСХОДИТ ПЕРЕСЧЕТ С УЧЕТОМ МАСШТАБА
    const convertToLatLng = useCallback((x: number, y: number): L.LatLngTuple => {
        const lat = (y * CALIBRATION.SCALE_Y) + CALIBRATION.OFFSET_Y;
        const lng = (x * CALIBRATION.SCALE_X) + CALIBRATION.OFFSET_X;
        return [lat, lng];
    }, []);

    if (!isMounted) return <div className="w-full h-full bg-[#050505]" />;

    return (
        <div className="w-full h-full bg-[#030303] overflow-hidden rounded-xl border border-zinc-800 relative shadow-2xl">
            <MapContainer
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
