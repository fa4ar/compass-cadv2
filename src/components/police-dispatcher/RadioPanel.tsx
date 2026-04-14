// components/police-dispatcher/RadioPanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Radio, Users, Volume2, VolumeX, Signal, Mic, MicOff, Settings, Plus, Trash2, Ear, EarOff, AlertTriangle, Phone, User, MoreVertical, ChevronUp, ChevronDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRadio } from '@/context/RadioContext';
import { toast } from '@/hooks/use-toast';

interface RadioUser {
    id: string;
    name: string;
    callsign: string;
    isTalking: boolean;
    channel?: string;
}

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
function ChannelUsers({ frequency, onDragStart, onDragEnd, onUserAlert }: { frequency: string; onDragStart: (user: RadioUser) => void; onDragEnd: () => void; onUserAlert: (user: RadioUser) => void }) {
    const { channelUsers, channels } = useRadio();

    // Получаем информацию о канале из channelState
    const channelInfo = channels.find(ch => ch.frequency === frequency);

    // Фильтруем пользователей на этом канале
    const usersOnChannel = channelUsers.filter(u => u.channel === frequency);

    const speakers = usersOnChannel.filter(u => u.isTalking);
    const listeners = usersOnChannel.filter(u => !u.isTalking);

    if (usersOnChannel.length === 0) {
        return null;
    }

    const handleDragStart = (user: RadioUser) => {
        onDragStart(user);
    };

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
                            <div 
                                key={user.id} 
                                className="flex items-center justify-between gap-2 text-sm bg-green-950/20 px-2 py-1 rounded cursor-grab active:cursor-grabbing hover:bg-green-950/30 transition-colors animate-pulse border border-green-500/30"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', JSON.stringify(user));
                                    handleDragStart(user);
                                }}
                                onDragEnd={() => {
                                    onDragEnd();
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                                    <span className="text-zinc-300 font-mono font-bold">{user.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 hover:bg-green-900/50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUserAlert(user);
                                    }}
                                >
                                    <MoreVertical className="w-3 h-3" />
                                </Button>
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
                            <div 
                                key={user.id} 
                                className="flex items-center justify-between gap-2 text-sm bg-zinc-800/30 px-2 py-1 rounded cursor-grab active:cursor-grabbing hover:bg-zinc-700/50 transition-colors"
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', JSON.stringify(user));
                                    handleDragStart(user);
                                }}
                                onDragEnd={() => {
                                    onDragEnd();
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-zinc-500 rounded-full" />
                                    <span className="text-zinc-400 font-mono font-bold">{user.name}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 hover:bg-zinc-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUserAlert(user);
                                    }}
                                >
                                    <MoreVertical className="w-3 h-3" />
                                </Button>
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
        activeDispatchers,
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
        sendCode100,
        clearChannelAlert,
        setChannelAlert,
    } = useRadio();

    const [isTalking, setIsTalking] = useState(false);
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    const [showChannelConfig, setShowChannelConfig] = useState(false);
    const [customChannels, setCustomChannels] = useState<ChannelConfig[]>(DEFAULT_CHANNELS);
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelFreq, setNewChannelFreq] = useState('');
    const [isPTTPressed, setIsPTTPressed] = useState(false);
    const [selectedZone, setSelectedZone] = useState<string>('all');
    const [selectedOneshotTone, setSelectedOneshotTone] = useState('BEEP');
    const [broadcastTone, setBroadcastTone] = useState('ALERT_B');
    const [broadcastType, setBroadcastType] = useState('General Alert');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [callsign, setCallsign] = useState('');
    const [localSelectedChannel, setLocalSelectedChannel] = useState<string>('');
    const [draggedUser, setDraggedUser] = useState<RadioUser | null>(null);
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [broadcastChannel, setBroadcastChannel] = useState<string>('');
    const [showUserAlertModal, setShowUserAlertModal] = useState(false);
    const [alertUser, setAlertUser] = useState<RadioUser | null>(null);
    const [alertMessage, setAlertMessage] = useState('');
    const [channelMenuOpen, setChannelMenuOpen] = useState<string | null>(null);
    const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);
    const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

    // Загружаем позывной из localStorage
    useEffect(() => {
        const savedCallsign = localStorage.getItem('dispatcherCallSign');
        if (savedCallsign) {
            setCallsign(savedCallsign);
        }
    }, []);

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
        if (isDragging) return;
        setLocalSelectedChannel(channelFrequency);
        setSpeakerChannel(channelFrequency, callsign);
    };

    // Синхронизируем локальное состояние с currentChannel из RadioContext
    useEffect(() => {
        if (currentChannel) {
            setLocalSelectedChannel(currentChannel);
        }
    }, [currentChannel]);

    // Добавление канала в прослушиваемые
    const handleAddListening = (channelId: string) => {
        const channel = customChannels.find(ch => ch.id === channelId);
        const freq = channel?.frequency || channelId;
        
        if (listeningChannels.includes(freq)) {
            removeListeningChannel(freq);
        } else {
            addListeningChannel(freq);
        }
    };

    // Воспроизведение тона
    const handlePlayTone = (toneType: string) => {
        playTone(toneType);
        toast({ title: 'Тон воспроизведен', description: toneType });
    };

    // 🚨 КОД 100 - ТРЕВОГА (исправлено: ALERT_A)
    const handleCode100 = async () => {
        const frequency = broadcastChannel || currentChannel;
        if (!frequency) {
            toast({
                title: 'Ошибка',
                description: 'Сначала выберите канал',
                variant: 'destructive'
            });
            return;
        }
        
        // Оптимистичное обновление локального статуса
        setChannelAlert(parseFloat(frequency), 'CODE_100');

        playTone('ALERT_A');

        if (dispatchSessionId) {
            fetch('/radio/dispatch/alert/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer changeme',
                    'X-Session-Id': dispatchSessionId
                },
                body: JSON.stringify({
                    frequency: frequency,
                    alertType: 'SIGNAL 100',
                    alertConfig: {
                        name: 'CODE 100',
                        color: '#f5e504',
                        isPersistent: true,
                        tone: 'ALERT_A'
                    }
                })
            }).catch(err => {
                console.error('Failed to trigger CODE 100:', err);
                toast({
                    title: 'Ошибка',
                    description: 'Не удалось отправить CODE 100',
                    variant: 'destructive'
                });
                // Откатываем статус при ошибке
                clearChannelAlert(parseFloat(frequency));
            });
        }

        toast({
            title: '🚨 CODE 100',
            description: `Оповещение отправлено на канал ${frequency} MHz`,
            variant: 'default'
        });

        // Отправляем сигнал через сокет
        sendCode100(parseFloat(frequency));
    };

    // CODE 3
    const handleCode3 = () => {
        const frequency = broadcastChannel || currentChannel;
        if (!frequency) {
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
                    'Authorization': 'Bearer changeme',
                    'X-Session-Id': dispatchSessionId
                },
                body: JSON.stringify({
                    frequency: frequency,
                    alertType: 'CODE 3',
                    alertConfig: {
                        name: 'CODE 3',
                        color: '#0066ff',
                        isPersistent: true,
                        tone: 'ALERT_B'
                    }
                })
            }).catch(err => console.error('Failed to trigger alert:', err));
        }
        
        toast({ 
            title: '⚠️ CODE 3', 
            description: `Оповещение отправлено на канал ${frequency} MHz`,
            variant: 'default'
        });
    };

    // Oneshot tones (beeps/bops)
    const handleOneshotTone = () => {
        if (!currentChannel) {
            toast({ 
                title: 'Ошибка', 
                description: 'Сначала выберите канал',
                variant: 'destructive' 
            });
            return;
        }

        if (dispatchSessionId) {
            fetch('/radio/dispatch/alert/oneshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Id': dispatchSessionId
                },
                body: JSON.stringify({
                    frequency: currentChannel,
                    alertConfig: {
                        name: selectedOneshotTone,
                        color: '#ffffff',
                        isPersistent: false,
                        tone: selectedOneshotTone
                    }
                })
            }).then(res => res.json())
              .then(data => {
                  if (data.success) {
                      toast({
                          title: 'Тон отправлен',
                          description: `${selectedOneshotTone} на канале ${currentChannel} MHz`
                      });
                  }
              })
              .catch(err => console.error('Failed to send oneshot tone:', err));
        }
    };

    // Broadcast alert
    const handleBroadcastAlert = () => {
        console.log('handleBroadcastAlert called:', { broadcastChannel, currentChannel, broadcastMessage, broadcastType, broadcastTone, dispatchSessionId });
        
        if (!broadcastChannel && !currentChannel) {
            toast({ 
                title: 'Ошибка', 
                description: 'Сначала выберите канал',
                variant: 'destructive' 
            });
            return;
        }

        if (!broadcastMessage.trim()) {
            toast({ 
                title: 'Ошибка', 
                description: 'Введите сообщение',
                variant: 'destructive' 
            });
            return;
        }

        const frequency = broadcastChannel || currentChannel;
        console.log('Using frequency:', frequency);

        if (dispatchSessionId) {
            const payload = {
                frequency: frequency,
                alertType: broadcastType,
                alertConfig: {
                    name: broadcastMessage,
                    color: '#126300',
                    isPersistent: false,
                    tone: broadcastTone
                }
            };
            console.log('Broadcast payload:', payload);
            
            fetch('/radio/dispatch/alert/trigger', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer changeme',
                    'X-Session-Id': dispatchSessionId
                },
                body: JSON.stringify(payload)
            }).then(res => {
                console.log('Broadcast response status:', res.status);
                return res.json();
            })
              .then(data => {
                  console.log('Broadcast response data:', data);
                  if (data.success) {
                      toast({
                          title: 'Broadcast отправлен',
                          description: `${broadcastType} на канале ${frequency} MHz`
                      });
                      setBroadcastMessage('');
                      setShowBroadcastModal(false);
                      setBroadcastChannel('');
                      
                      // Проигрываем тон локально для диспетчера
                      console.log('Broadcast: Playing tone locally for dispatcher:', broadcastTone, '(monitoring channel', frequency, ')');
                      playTone(broadcastTone);
                  } else {
                      toast({
                          title: 'Ошибка',
                          description: data.error || 'Не удалось отправить broadcast',
                          variant: 'destructive'
                      });
                  }
              })
              .catch(err => console.error('Failed to send broadcast:', err));
        } else {
            console.error('No dispatchSessionId');
        }
    };

    const openBroadcastModal = (frequency: string) => {
        setBroadcastChannel(frequency);
        setShowBroadcastModal(true);
    };

    // Send user alert
    const handleSendUserAlert = async () => {
        if (!alertUser) return;

        if (!alertMessage.trim()) {
            toast({ 
                title: 'Ошибка', 
                description: 'Введите сообщение',
                variant: 'destructive' 
            });
            return;
        }

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };
            
            if (dispatchSessionId) {
                headers['X-Session-Id'] = dispatchSessionId;
            }

            const response = await fetch('/api/dispatch/user/alert', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: parseInt(alertUser.id),
                    message: alertMessage,
                    frequency: alertUser.channel
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                toast({
                    title: 'Алерт отправлен',
                    description: `Сообщение отправлено ${alertUser.name}`
                });
                setAlertMessage('');
                setShowUserAlertModal(false);
                setAlertUser(null);
            } else {
                throw new Error(data.error || 'Не удалось отправить алерт');
            }
        } catch (error: any) {
            console.error('Failed to send user alert:', error);
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отправить алерт',
                variant: 'destructive'
            });
        }
    };

    const openUserAlertModal = (user: RadioUser) => {
        setAlertUser(user);
        setShowUserAlertModal(true);
    };

    const toggleChannelExpand = (channelId: string) => {
        setExpandedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
            }
            return newSet;
        });
    };

    // Clear alert
    const handleClearAlert = () => {
        const frequency = broadcastChannel || currentChannel;
        if (!frequency) {
            toast({ 
                title: 'Ошибка', 
                description: 'Сначала выберите канал',
                variant: 'destructive' 
            });
            return;
        }

        // Очищаем локальный статус алерта
        clearChannelAlert(parseFloat(frequency));

        if (dispatchSessionId) {
            fetch('/radio/dispatch/alert/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer changeme',
                    'X-Session-Id': dispatchSessionId
                },
                body: JSON.stringify({
                    frequency: frequency
                })
            }).then(res => res.json())
              .then(data => {
                  if (data.success) {
                      toast({
                          title: 'Алерт очищен',
                          description: `Код очищен на канале ${frequency} MHz`
                      });
                  }
              })
              .catch(err => console.error('Failed to clear alert:', err));
        }
    };

    // DND handlers
    const handleDragStart = (user: RadioUser) => {
        setDraggedUser(user);
        setIsDragging(true);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedUser(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (isDragging) {
            const frequency = e.currentTarget.getAttribute('data-frequency');
            if (frequency) {
                setHoveredChannel(frequency);
            }
        }
    };

    const handleDragLeave = () => {
        setHoveredChannel(null);
    };

    const handleDrop = async (e: React.DragEvent, targetFrequency: string) => {
        e.preventDefault();
        setHoveredChannel(null);
        
        if (!draggedUser) return;
        
        if (draggedUser.channel === targetFrequency) {
            setDraggedUser(null);
            setIsDragging(false);
            return;
        }

        if (!dispatchSessionId) {
            toast({ 
                title: 'Ошибка', 
                description: 'Не авторизован как диспетчер',
                variant: 'destructive' 
            });
            setDraggedUser(null);
            setIsDragging(false);
            return;
        }

        try {
            const response = await fetch('/radio/dispatch/switchChannel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer changeme',
                    'X-Session-Id': dispatchSessionId
                },
                body: JSON.stringify({
                    serverId: parseInt(draggedUser.id),
                    frequency: targetFrequency,
                    oldFrequency: draggedUser.channel
                })
            });

            const data = await response.json();
            if (data.success) {
                toast({
                    title: 'Пользователь перемещен',
                    description: `${draggedUser.name} перемещен на канал ${targetFrequency} MHz`
                });
                // Добавляем канал в прослушиваемые чтобы видеть пользователя
                if (!listeningChannels.includes(targetFrequency)) {
                    addListeningChannel(targetFrequency);
                }
            } else {
                toast({
                    title: 'Ошибка',
                    description: data.error || 'Не удалось переместить пользователя',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Failed to switch channel:', error);
            toast({
                title: 'Ошибка',
                description: 'Не удалось соединиться с сервером',
                variant: 'destructive'
            });
        }

        setDraggedUser(null);
        setIsDragging(false);
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
                {/* Активные диспетчеры */}
                {activeDispatchers.length > 0 && (
                    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3 h-3 text-zinc-400" />
                            <span className="text-xs font-semibold text-zinc-400">
                                Активные диспетчеры ({activeDispatchers.length})
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {activeDispatchers.map(dispatcher => (
                                <Badge 
                                    key={dispatcher.userId}
                                    variant="outline" 
                                    className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs"
                                >
                                    {dispatcher.callSign}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

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
                                    className="w-full"
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
                                    className="w-full"
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
                            const isActive = channel.frequency === localSelectedChannel;
                            const isListening = listeningChannels.includes(channel.frequency);
                            const participants = channels.find(ch => ch.frequency === channel.frequency)?.participants || 0;
                            const channelInfo = channels.find(ch => ch.frequency === channel.frequency);
                            const hasPanic = channelInfo?.panic || false;
                            const alertStatus = channelInfo?.alert;

                            // Определяем цвет и текст для бейджа алерта
                            const getAlertBadge = () => {
                                if (alertStatus === 'CODE_100') {
                                    return <Badge className="bg-yellow-500 text-black text-xs font-bold border-yellow-600">CODE 100</Badge>;
                                }
                                if (alertStatus === 'CODE_3') {
                                    return <Badge className="bg-blue-500 text-white text-xs font-bold border-blue-600">CODE 3</Badge>;
                                }
                                if (alertStatus === 'CODE_5') {
                                    return <Badge className="bg-orange-500 text-white text-xs font-bold border-orange-600">CODE 5</Badge>;
                                }
                                return null;
                            };

                            return (
                                <div
                                    key={channel.id}
                                    data-frequency={channel.frequency}
                                    className={`
                                        p-2 rounded-lg border transition-all duration-200 cursor-pointer
                                        ${isActive 
                                            ? 'bg-blue-950/20 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                            : 'bg-zinc-800/30 border-zinc-700 hover:border-zinc-600'}
                                        ${hasPanic ? 'border-red-500 bg-red-950/20' : ''}
                                        ${alertStatus === 'CODE_100' ? 'border-yellow-500 bg-yellow-950/20' : ''}
                                        ${alertStatus === 'CODE_3' ? 'border-blue-500 bg-blue-950/20' : ''}
                                        ${alertStatus === 'CODE_5' ? 'border-orange-500 bg-orange-950/20' : ''}
                                        ${draggedUser ? 'border-dashed border-blue-400/50 hover:border-blue-400' : ''}
                                        ${hoveredChannel === channel.frequency && isDragging ? 'bg-green-950/30 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''}
                                    `}
                                    onClick={() => handleChannelSelect(channel.frequency)}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, channel.frequency)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1" onClick={() => handleChannelSelect(channel.frequency)}>
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
                                                    {channel.type === 'trunked' && (
                                                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-purple-950/30 border-purple-500/30 text-purple-400">
                                                            TRUNKED
                                                        </Badge>
                                                    )}
                                                    {getAlertBadge()}
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
                                                    h-6 w-6 p-0 hover:bg-zinc-700
                                                    ${isListening ? 'text-green-500' : 'text-zinc-600'}
                                                `}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddListening(channel.id);
                                                }}
                                            >
                                                {isListening ? <Ear className="w-3 h-3" /> : <EarOff className="w-3 h-3" />}
                                            </Button>
                                            
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-zinc-700 text-zinc-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleChannelExpand(channel.id);
                                                }}
                                            >
                                                {expandedChannels.has(channel.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </Button>
                                            
                                            <div className="relative">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 hover:bg-zinc-700 text-zinc-500 z-10"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        console.log('Clicked menu button, channel.id:', channel.id, 'current channelMenuOpen:', channelMenuOpen);
                                                        setChannelMenuOpen(channelMenuOpen === channel.id ? null : channel.id);
                                                    }}
                                                >
                                                    <MoreVertical className="w-3 h-3" />
                                                </Button>
                                                {channelMenuOpen === channel.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 min-w-[150px]">
                                                        <div className="p-1 space-y-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full h-8 text-xs justify-start hover:bg-zinc-700 text-left"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setChannelMenuOpen(null);
                                                                    openBroadcastModal(channel.frequency);
                                                                }}
                                                            >
                                                                📢 Broadcast
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full h-8 text-xs justify-start hover:bg-zinc-700 text-left text-red-400"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setChannelMenuOpen(null);
                                                                    setBroadcastChannel(channel.frequency);
                                                                    handleCode100();
                                                                }}
                                                            >
                                                                🚨 КОД 100
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full h-8 text-xs justify-start hover:bg-zinc-700 text-left text-blue-400"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setChannelMenuOpen(null);
                                                                    setBroadcastChannel(channel.frequency);
                                                                    handleCode3();
                                                                }}
                                                            >
                                                                📞 CODE 3
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="w-full h-8 text-xs justify-start hover:bg-zinc-700 text-left text-green-400"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setChannelMenuOpen(null);
                                                                    setBroadcastChannel(channel.frequency);
                                                                    handleClearAlert();
                                                                }}
                                                            >
                                                                ✅ ОЧИСТИТЬ КОД
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Отображение пользователей на канале при раскрытии */}
                                    {expandedChannels.has(channel.id) && (
                                        <ChannelUsers frequency={channel.frequency} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onUserAlert={openUserAlertModal} />
                                    )}
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
                                    <span className="text-zinc-300 font-mono font-bold">{user.name}</span>
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

                {/* Broadcast Modal */}
                {showBroadcastModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-zinc-200 mb-4">Broadcast Alert</h3>
                            <div className="space-y-4">
                                {broadcastChannel && (
                                    <div className="text-sm text-zinc-400 mb-2">
                                        Канал: <span className="text-zinc-200 font-mono">{broadcastChannel} MHz</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={broadcastTone}
                                        onChange={(e) => setBroadcastTone(e.target.value)}
                                        className="h-8 text-xs bg-zinc-800 border-zinc-700 rounded px-2"
                                    >
                                        <option value="ALERT_A">ALERT_A</option>
                                        <option value="ALERT_B">ALERT_B</option>
                                        <option value="PANIC">PANIC</option>
                                        <option value="BEEP">BEEP</option>
                                        <option value="CHIRP">CHIRP</option>
                                    </select>
                                    <select
                                        value={broadcastType}
                                        onChange={(e) => setBroadcastType(e.target.value)}
                                        className="h-8 text-xs bg-zinc-800 border-zinc-700 rounded px-2"
                                    >
                                        <option value="General Alert">General Alert</option>
                                        <option value="Information">Information</option>
                                        <option value="Priority">Priority</option>
                                        <option value="Emergency">Emergency</option>
                                    </select>
                                </div>
                                <Input
                                    placeholder="Введите сообщение..."
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    className="h-8 text-sm bg-zinc-800 border-zinc-700"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                                        onClick={() => {
                                            setShowBroadcastModal(false);
                                            setBroadcastChannel('');
                                        }}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8 text-xs border-green-600 text-green-500 hover:bg-green-950/20"
                                        onClick={handleBroadcastAlert}
                                    >
                                        Отправить
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* User Alert Modal */}
                {showUserAlertModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-zinc-200 mb-4">Send Alert to Unit</h3>
                            <div className="space-y-4">
                                {alertUser && (
                                    <div className="text-sm text-zinc-400 mb-2">
                                        Юнит: <span className="text-zinc-200 font-mono font-bold">{alertUser.name}</span>
                                    </div>
                                )}
                                <Input
                                    placeholder="Введите сообщение..."
                                    value={alertMessage}
                                    onChange={(e) => setAlertMessage(e.target.value)}
                                    className="h-8 text-sm bg-zinc-800 border-zinc-700"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
                                        onClick={() => {
                                            setShowUserAlertModal(false);
                                            setAlertUser(null);
                                            setAlertMessage('');
                                        }}
                                    >
                                        Отмена
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-8 text-xs border-purple-600 text-purple-500 hover:bg-purple-950/20"
                                        onClick={handleSendUserAlert}
                                    >
                                        Отправить
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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