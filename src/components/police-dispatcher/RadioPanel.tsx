// components/police-dispatcher/RadioPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Radio, Users, Volume2, VolumeX, Signal, Mic, MicOff, Settings, Plus, Trash2, Ear, EarOff, AlertTriangle, Phone, User } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRadio } from '@/context/RadioContext';
import { toast } from '@/hooks/use-toast';

interface ChannelConfig {
    id: string;
    name: string;
    frequency: string;
    color?: string;
    type?: 'conventional' | 'trunked';
    zone?: string;
}

const DEFAULT_CHANNELS: ChannelConfig[] = [
    // RiverSide County
    { id: 'rs-1', name: 'DISP', frequency: '154.755', type: 'conventional', zone: 'RiverSide County', color: 'blue' },
    { id: 'rs-2', name: 'C2C', frequency: '856.1125', type: 'trunked', zone: 'RiverSide County', color: 'blue' },
    { id: 'rs-3', name: '10-1', frequency: '154.785', type: 'conventional', zone: 'RiverSide County', color: 'red' },
    { id: 'rs-4', name: 'OPS-1', frequency: '154.815', type: 'conventional', zone: 'RiverSide County', color: 'purple' },
    // Los Santos
    { id: 'ls-1', name: 'DISP', frequency: '460.250', type: 'conventional', zone: 'Los Santos', color: 'blue' },
    { id: 'ls-2', name: 'C2C', frequency: '460.325', type: 'trunked', zone: 'Los Santos', color: 'blue' },
    { id: 'ls-3', name: '10-1', frequency: '460.275', type: 'conventional', zone: 'Los Santos', color: 'red' },
    { id: 'ls-4', name: 'OPS-1', frequency: '462.450', type: 'conventional', zone: 'Los Santos', color: 'purple' },
    // Blaine County
    { id: 'bc-1', name: 'DISP', frequency: '155.070', type: 'conventional', zone: 'Blaine County', color: 'blue' },
    { id: 'bc-2', name: 'C2C', frequency: '155.220', type: 'trunked', zone: 'Blaine County', color: 'blue' },
    { id: 'bc-3', name: '10-1', frequency: '155.100', type: 'conventional', zone: 'Blaine County', color: 'red' },
    { id: 'bc-4', name: 'OPS-1', frequency: '157.350', type: 'conventional', zone: 'Blaine County', color: 'purple' },
];

// Компонент для отображения пользователей на канале
function ChannelUsers({ frequency }: { frequency: string }) {
    const { talkingUsers, channels } = useRadio();

    // Получаем информацию о канале из channelState
    const channelInfo = channels.find(ch => ch.frequency === frequency);

    // Фильтруем пользователей на этом канале
    const usersOnChannel = talkingUsers.filter(u => u.channel === frequency);

    const speakers = usersOnChannel.filter(u => u.isTalking);
    const listeners = usersOnChannel.filter(u => !u.isTalking);

    if (usersOnChannel.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 pt-2 border-t border-zinc-700">
            <div className="text-xs text-zinc-500 mb-1">
                Пользователи на канале ({channelInfo?.participants || 0})
            </div>
            
            {speakers.length > 0 && (
                <div className="mb-2">
                    <div className="text-xs font-semibold text-green-400 mb-1 flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        Говорят ({speakers.length})
                    </div>
                    <div className="space-y-1">
                        {speakers.map(user => (
                            <div key={user.id} className="flex items-center gap-2 text-sm bg-green-950/20 px-2 py-1 rounded">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-zinc-300 font-mono font-bold">{user.callsign || user.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {listeners.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Слушают ({listeners.length})
                    </div>
                    <div className="space-y-1">
                        {listeners.map(user => (
                            <div key={user.id} className="flex items-center gap-2 text-sm bg-zinc-800/30 px-2 py-1 rounded">
                                <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                                <span className="text-zinc-400 font-mono font-bold">{user.callsign || user.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function RadioPanel() {
    const {
        isConnected,
        currentChannel,
        listeningChannels,
        talkingUsers,
        channels,
        volume,
        toneVolume,
        microphoneEnabled,
        isRecording,
        dispatchSessionId,
        connect,
        disconnect,
        enableMicrophone,
        disableMicrophone,
        startRecording,
        stopRecording,
        authenticateDispatch,
        setSpeakerChannel,
        addListeningChannel,
        removeListeningChannel,
        listenToUser,
        stopListeningToUser,
        setTalking,
        setVolume,
        setToneVolume,
        playTone,
        setDispatchSession,
        emitServerTone,
    } = useRadio();

    const [isTalking, setIsTalking] = useState(false);
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    const [showChannelConfig, setShowChannelConfig] = useState(false);
    const [customChannels, setCustomChannels] = useState<ChannelConfig[]>(DEFAULT_CHANNELS);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelFreq, setNewChannelFreq] = useState('');
    const [isPTTPressed, setIsPTTPressed] = useState(false);
    const [selectedZone, setSelectedZone] = useState<string>('all');

    // Получаем список уникальных зон
    const zones = Array.from(new Set(customChannels.map(ch => ch.zone).filter(Boolean))) as string[];
    const allZones = ['all', ...zones];

    // Обработка PTT (Push-to-Talk)
    const handlePTTDown = () => {
        if (!currentChannel) {
            toast({ 
                title: 'Ошибка', 
                description: 'Сначала выберите канал для передачи',
                variant: 'destructive' 
            });
            return;
        }
        
        setIsPTTPressed(true);
        setTalking(true);
        startRecording();
    };

    const handlePTTUp = () => {
        setIsPTTPressed(false);
        setTalking(false);
        stopRecording();
    };

    // Поддержка клавиши T для PTT
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 't' || e.key === 'T' || e.key === 'т' || e.key === 'Т') {
                if (!isPTTPressed && microphoneEnabled) {
                    e.preventDefault();
                    handlePTTDown();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 't' || e.key === 'T' || e.key === 'т' || e.key === 'Т') {
                if (isPTTPressed) {
                    e.preventDefault();
                    handlePTTUp();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isPTTPressed, microphoneEnabled, handlePTTDown, handlePTTUp]);

    // Переключение канала
    const handleChannelSelect = (channelFrequency: string) => {
        setSpeakerChannel(channelFrequency);
        toast({ title: 'Канал изменен', description: `Переключено на канал ${channelFrequency} MHz` });
    };

    // Добавление канала в прослушиваемые
    const handleAddListening = (channelId: string) => {
        const channel = customChannels.find(ch => ch.id === channelId);
        const freq = channel?.frequency || channelId;
        
        if (listeningChannels.includes(freq)) {
            removeListeningChannel(freq);
            toast({ title: 'Прослушивание остановлено', description: `Канал ${freq} MHz удален из прослушиваемых` });
        } else {
            addListeningChannel(freq);
            toast({ title: 'Прослушивание добавлено', description: `Канал ${freq} MHz добавлен в прослушиваемые` });
        }
    };

    // Воспроизведение тона
    const handlePlayTone = (toneType: string) => {
        playTone(toneType);
        toast({ title: 'Тон воспроизведен', description: toneType });
    };

    // 🚨 КОД 100 - ТРЕВОГА (исправлено: ALERT_A)
    const handleCode100 = () => {
        if (!currentChannel) {
            toast({ 
                title: 'Ошибка', 
                description: 'Сначала выберите канал',
                variant: 'destructive' 
            });
            return;
        }
        
        // Воспроизводим тон ALERT_A локально в CAD
        playTone('ALERT_A');
        
        // Отправляем serverTone на сервер для игроков через socket
        if (isConnected) {
            emitServerTone(parseFloat(currentChannel), 'ALERT_A');
            console.log('[RadioPanel] Code 100 sent to server for channel', currentChannel);
        }
        
        toast({ 
            title: '🚨 КОД 100 - ТРЕВОГА 🚨', 
            description: `SIGNAL 100 отправлен на канал ${currentChannel} MHz`,
            variant: 'destructive'
        });
    };

    // Код 10-1 (SIGNAL 3)
    const handleCode101 = () => {
        if (!currentChannel) {
            toast({ 
                title: 'Ошибка', 
                description: 'Сначала выберите канал',
                variant: 'destructive' 
            });
            return;
        }
        
        playTone('ALERT_B');
        
        if (dispatchSessionId) {
            fetch('/radio/dispatch/alert/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': dispatchSessionId
                },
                body: JSON.stringify({
                    frequency: currentChannel,
                    alertType: 'SIGNAL 3',
                    alertConfig: {
                        name: 'SIGNAL 3',
                        color: '#0049d1',
                        isPersistent: true,
                        tone: 'ALERT_B'
                    }
                })
            }).catch(err => console.error('Failed to trigger alert:', err));
        }
        
        toast({ 
            title: '⚠️ КОД 10-1 (SIGNAL 3)', 
            description: `Оповещение отправлено на канал ${currentChannel} MHz`,
            variant: 'default'
        });
    };

    // Добавление нового канала
    const handleAddChannel = () => {
        if (!newChannelName || !newChannelFreq) {
            toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
            return;
        }
        const newChannel: ChannelConfig = {
            id: `custom-${Date.now()}`,
            name: newChannelName,
            frequency: newChannelFreq,
        };
        setCustomChannels([...customChannels, newChannel]);
        setNewChannelName('');
        setNewChannelFreq('');
        toast({ title: 'Канал добавлен', description: `${newChannelName} (${newChannelFreq} MHz)` });
    };

    // Удаление канала
    const handleRemoveChannel = (channelId: string) => {
        setCustomChannels(customChannels.filter(ch => ch.id !== channelId));
        toast({ title: 'Канал удален', description: `Канал удален` });
    };

    // Активация диспетчерской сессии
    const handleDispatchToggle = async () => {
        try {
            await authenticateDispatch('DISPATCH');
            toast({ title: 'Диспетчерская сессия', description: 'Активирована диспетчерская сессия' });
        } catch (error) {
            toast({ 
                title: 'Ошибка аутентификации', 
                description: 'Не удалось активировать диспетчерскую сессию',
                variant: 'destructive' 
            });
        }
    };

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 flex flex-col">
            <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-sm font-bold text-zinc-100 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Radio className={`w-4 h-4 ${isConnected ? 'text-blue-500' : 'text-red-500'}`} />
                        Радио Консоль
                        {!isConnected && (
                            <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/30">
                                Отключено
                            </Badge>
                        )}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setShowVolumeControl(!showVolumeControl)}
                        >
                            <Volume2 className="w-4 h-4 text-zinc-400" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setShowChannelConfig(!showChannelConfig)}
                        >
                            <Settings className="w-4 h-4 text-zinc-400" />
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-3 p-3 overflow-hidden">
                {/* Текущий канал */}
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500 text-white text-xs font-bold">
                                ТЕКУЩИЙ
                            </Badge>
                            <span className="text-sm font-semibold text-zinc-200">
                                {customChannels.find(ch => ch.frequency === currentChannel)?.name || 'Не выбран'}
                            </span>
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">
                            {currentChannel || '--.-'} MHz
                        </span>
                    </div>
                    
                    {/* Кнопка микрофона */}
                    <Button
                        onClick={async () => {
                            if (microphoneEnabled) {
                                disableMicrophone();
                                toast({ title: 'Микрофон отключен' });
                            } else {
                                try {
                                    await enableMicrophone();
                                    toast({ title: 'Микрофон включен' });
                                } catch (error) {
                                    toast({ 
                                        title: 'Ошибка доступа к микрофону', 
                                        description: 'Проверьте разрешения браузера',
                                        variant: 'destructive' 
                                    });
                                }
                            }
                        }}
                        className={`
                            w-full h-10 font-bold transition-all duration-150 mb-2
                            ${microphoneEnabled 
                                ? 'bg-green-500 hover:bg-green-600' 
                                : 'bg-zinc-700 hover:bg-zinc-600'}
                        `}
                    >
                        {microphoneEnabled ? (
                            <>
                                <Mic className="w-4 h-4 mr-2" />
                                МИКРОФОН ВКЛЮЧЕН
                            </>
                        ) : (
                            <>
                                <MicOff className="w-4 h-4 mr-2" />
                                МИКРОФОН ОТКЛЮЧЕН
                            </>
                        )}
                    </Button>

                    {/* PTT Кнопка */}
                    <Button
                        onMouseDown={handlePTTDown}
                        onMouseUp={handlePTTUp}
                        onMouseLeave={handlePTTUp}
                        onTouchStart={handlePTTDown}
                        onTouchEnd={handlePTTUp}
                        disabled={!microphoneEnabled}
                        className={`
                            w-full h-12 font-bold transition-all duration-150
                            ${isPTTPressed 
                                ? 'bg-red-500 scale-95 shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                                : microphoneEnabled 
                                    ? 'bg-zinc-700 hover:bg-zinc-600' 
                                    : 'bg-zinc-800 opacity-50 cursor-not-allowed'}
                        `}
                    >
                        {isPTTPressed ? (
                            <>
                                <MicOff className="w-5 h-5 mr-2" />
                                ПЕРЕДАЧА...
                            </>
                        ) : (
                            <>
                                <Mic className="w-5 h-5 mr-2" />
                                {microphoneEnabled ? 'НАЖМИТЕ ДЛЯ ПЕРЕДАЧИ' : 'ВКЛЮЧИТЕ МИКРОФОН'}
                            </>
                        )}
                    </Button>
                </div>

                {/* Управление громкостью */}
                {showVolumeControl && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <div className="space-y-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label className="text-xs text-zinc-400">Громкость голоса</Label>
                                    <span className="text-xs text-zinc-500">{volume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <Label className="text-xs text-zinc-400">Громкость тонов</Label>
                                    <span className="text-xs text-zinc-500">{toneVolume}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={toneVolume}
                                    onChange={(e) => setToneVolume(Number(e.target.value))}
                                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Список каналов */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Каналы
                        </span>
                        <div className="flex gap-2">
                            {/* Селектор зон */}
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="h-6 px-2 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300 focus:outline-none focus:border-zinc-600"
                            >
                                <option value="all">Все зоны</option>
                                {zones.map(zone => (
                                    <option key={zone} value={zone}>{zone}</option>
                                ))}
                            </select>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={handleDispatchToggle}
                            >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Диспетчер
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {customChannels
                            .filter(channel => selectedZone === 'all' || channel.zone === selectedZone)
                            .map((channel) => {
                            const isActive = channel.frequency === currentChannel;
                            const isListening = listeningChannels.includes(channel.frequency);
                            const participants = channels.find(ch => ch.frequency === channel.frequency)?.participants || 0;

                            return (
                                <div
                                    key={channel.id}
                                    className={`
                                        p-2 rounded-lg border transition-all duration-200 cursor-pointer
                                        ${isActive 
                                            ? 'bg-blue-950/20 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                            : 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-600'}
                                    `}
                                    onClick={() => handleChannelSelect(channel.frequency)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`
                                                w-2 h-2 rounded-full
                                                ${isActive ? 'bg-blue-500' : 'bg-zinc-600'}
                                            `} />
                                            <div>
                                                <div className="text-sm font-semibold text-zinc-200">
                                                    {channel.name}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-zinc-500 font-mono">
                                                        {channel.frequency} MHz
                                                    </span>
                                                    {channel.type && (
                                                        <Badge variant="outline" className="text-xs bg-zinc-900 border-zinc-700 text-zinc-400">
                                                            {channel.type === 'trunked' ? ' Trunked' : ' Conv'}
                                                        </Badge>
                                                    )}
                                                    {channel.zone && selectedZone === 'all' && (
                                                        <Badge variant="outline" className="text-xs bg-zinc-900 border-zinc-700 text-zinc-500">
                                                            {channel.zone}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-zinc-500">
                                                <Users className="w-3 h-3" />
                                                <span className="text-xs">{participants}</span>
                                            </div>
                                            
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={`
                                                    h-6 w-6 p-0
                                                    ${isListening ? 'text-green-500' : 'text-zinc-600'}
                                                `}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddListening(channel.id);
                                                }}
                                            >
                                                {isListening ? <Ear className="w-3 h-3" /> : <EarOff className="w-3 h-3" />}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Отображение пользователей на канале */}
                                    <ChannelUsers frequency={channel.frequency} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Говорящие пользователи */}
                {talkingUsers.filter(u => u.isTalking).length > 0 && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                            Говорят
                        </span>
                        <div className="space-y-1">
                            {talkingUsers.filter(u => u.isTalking).map((user) => (
                                <div key={user.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-zinc-300 font-mono font-bold">{user.callsign || user.name}</span>
                                    {user.channel && (
                                        <Badge variant="outline" className="text-xs bg-zinc-700 border-zinc-600">
                                            {user.channel} MHz
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Тоны и экстренные кнопки */}
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                        Экстренные кнопки
                    </span>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {/* 🚨 КОД 100 - ТРЕВОГА (ALERT_A) */}
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-10 text-sm font-bold bg-red-600 hover:bg-red-500"
                            onClick={handleCode100}
                        >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            КОД 100
                        </Button>
                        
                        {/* КОД 10-1 (ALERT_B) */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 text-sm border-yellow-600 text-yellow-500 hover:bg-yellow-950/20"
                            onClick={handleCode101}
                        >
                            <Phone className="w-4 h-4 mr-1" />
                            КОД 10-1
                        </Button>
                    </div>
                    
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                        Тоны
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handlePlayTone('BEEP')}
                        >
                            BEEP
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handlePlayTone('BOOP')}
                        >
                            BOOP
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handlePlayTone('CHIRP')}
                        >
                            CHIRP
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handlePlayTone('ALERT_C')}
                        >
                            ALERT C
                        </Button>
                    </div>
                </div>

                {/* Конфигурация каналов */}
                {showChannelConfig && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                            Настройка каналов
                        </span>
                        
                        <div className="space-y-2 mb-3">
                            <Input
                                placeholder="Название канала"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                className="h-8 text-sm bg-zinc-900 border-zinc-700"
                            />
                            <Input
                                placeholder="Частота (MHz)"
                                value={newChannelFreq}
                                onChange={(e) => setNewChannelFreq(e.target.value)}
                                className="h-8 text-sm bg-zinc-900 border-zinc-700"
                            />
                            <Button
                                size="sm"
                                className="w-full h-8 bg-blue-600 hover:bg-blue-500"
                                onClick={handleAddChannel}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Добавить канал
                            </Button>
                        </div>

                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {customChannels.map((channel) => (
                                <div
                                    key={channel.id}
                                    className="flex items-center justify-between p-2 rounded bg-zinc-900/50"
                                >
                                    <div className="text-sm text-zinc-300">
                                        {channel.name} ({channel.frequency} MHz)
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-400"
                                        onClick={() => handleRemoveChannel(channel.id)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}