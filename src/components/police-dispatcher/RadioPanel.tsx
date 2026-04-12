// components/police-dispatcher/RadioPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Radio, Users, Volume2, VolumeX, Signal, Mic, MicOff, Settings, Plus, Trash2, Ear, EarOff, AlertTriangle, Phone } from 'lucide-react';

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
}

const DEFAULT_CHANNELS: ChannelConfig[] = [
    { id: '1', name: 'Полиция 1', frequency: '100.0', color: 'blue' },
    { id: '2', name: 'Полиция 2', frequency: '101.0', color: 'blue' },
    { id: '3', name: 'EMS', frequency: '102.0', color: 'green' },
    { id: '4', name: 'Пожарные', frequency: '103.0', color: 'red' },
    { id: '5', name: 'Диспетчер', frequency: '104.0', color: 'purple' },
];

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
    } = useRadio();

    const [isTalking, setIsTalking] = useState(false);
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    const [showChannelConfig, setShowChannelConfig] = useState(false);
    const [customChannels, setCustomChannels] = useState<ChannelConfig[]>(DEFAULT_CHANNELS);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelFreq, setNewChannelFreq] = useState('');
    const [isPTTPressed, setIsPTTPressed] = useState(false);

    // Обработка PTT (Push-to-Talk)
    const handlePTTDown = () => {
        setIsPTTPressed(true);
        startRecording();
    };

    const handlePTTUp = () => {
        setIsPTTPressed(false);
        stopRecording();
    };

    // Переключение канала
    const handleChannelSelect = (channelFrequency: string) => {
        setSpeakerChannel(channelFrequency);
        toast({ title: 'Канал изменен', description: `Переключено на канал ${channelFrequency}` });
    };

    // Добавление канала в прослушиваемые
    const handleAddListening = (channelId: string) => {
        if (listeningChannels.includes(channelId)) {
            removeListeningChannel(channelId);
            toast({ title: 'Прослушивание остановлено', description: `Канал ${channelId} удален из прослушиваемых` });
        } else {
            addListeningChannel(channelId);
            toast({ title: 'Прослушивание добавлено', description: `Канал ${channelId} добавлен в прослушиваемые` });
        }
    };

    // Воспроизведение тона
    const handlePlayTone = (toneType: string) => {
        playTone(toneType);
        toast({ title: 'Тон воспроизведен', description: toneType });
    };

    // Добавление нового канала
    const handleAddChannel = () => {
        if (!newChannelName || !newChannelFreq) {
            toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
            return;
        }
        const newChannel: ChannelConfig = {
            id: String(customChannels.length + 1),
            name: newChannelName,
            frequency: newChannelFreq,
        };
        setCustomChannels([...customChannels, newChannel]);
        setNewChannelName('');
        setNewChannelFreq('');
        toast({ title: 'Канал добавлен', description: `${newChannelName} (${newChannelFreq})` });
    };

    // Удаление канала
    const handleRemoveChannel = (channelId: string) => {
        setCustomChannels(customChannels.filter(ch => ch.id !== channelId));
        toast({ title: 'Канал удален', description: `Канал ${channelId} удален` });
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

    if (!isConnected) {
        return (
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3 text-zinc-500">
                        <Signal className="w-5 h-5" />
                        <span className="text-sm">Нет подключения к радио серверу</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-zinc-900/50 border-zinc-800 flex flex-col">
            <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-sm font-bold text-zinc-100 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-blue-500" />
                        Радио Консоль
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
                                {customChannels.find(ch => ch.id === currentChannel)?.name || 'Не выбран'}
                            </span>
                        </div>
                        <span className="text-xs text-zinc-500 font-mono">
                            {customChannels.find(ch => ch.id === currentChannel)?.frequency || '--.-'} MHz
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
                    
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {customChannels.map((channel) => {
                            const isActive = channel.id === currentChannel;
                            const isListening = listeningChannels.includes(channel.id);
                            const participants = channels.find(ch => ch.id === channel.id)?.participants || 0;

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
                                                <div className="text-xs text-zinc-500 font-mono">
                                                    {channel.frequency} MHz
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
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Говорящие пользователи */}
                {talkingUsers.length > 0 && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                            Говорят
                        </span>
                        <div className="space-y-1">
                            {talkingUsers.filter(u => u.isTalking).map((user) => (
                                <div key={user.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-zinc-300">{user.callsign || user.name}</span>
                                    {user.channel && (
                                        <Badge variant="outline" className="text-xs bg-zinc-700 border-zinc-600">
                                            {user.channel}
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Тоны */}
                <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                        Тоны
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handlePlayTone('alert')}
                        >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Тревога
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handlePlayTone('dispatch')}
                        >
                            <Radio className="w-3 h-3 mr-1" />
                            Диспетчер
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

                        <div className="space-y-1">
                            {customChannels.map((channel) => (
                                <div
                                    key={channel.id}
                                    className="flex items-center justify-between p-2 rounded bg-zinc-900/50"
                                >
                                    <div className="text-sm text-zinc-300">
                                        {channel.name} ({channel.frequency})
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
