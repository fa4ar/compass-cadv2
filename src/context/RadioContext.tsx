// context/RadioContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Howl } from 'howler';
// @ts-ignore
const io = require('socket.io-client');

interface RadioChannel {
    id: string;
    name: string;
    frequency: string;
    participants: number;
    isActive: boolean;
}

interface RadioUser {
    id: string;
    name: string;
    callsign: string;
    isTalking: boolean;
    channel?: string;
}

interface RadioContextType {
    socket: any;
    isConnected: boolean;
    currentChannel: string | null;
    listeningChannels: string[];
    talkingUsers: RadioUser[];
    channels: RadioChannel[];
    volume: number;
    toneVolume: number;
    microphoneEnabled: boolean;
    isRecording: boolean;
    dispatchSessionId: string | null;
    connect: () => void;
    disconnect: () => void;
    enableMicrophone: () => Promise<void>;
    disableMicrophone: () => void;
    startRecording: () => void;
    stopRecording: () => void;
    authenticateDispatch: (callsign: string) => Promise<void>;
    setSpeakerChannel: (channelId: string) => void;
    addListeningChannel: (channelId: string) => void;
    removeListeningChannel: (channelId: string) => void;
    listenToUser: (serverId: number) => void;
    stopListeningToUser: (serverId: number) => void;
    setTalking: (isTalking: boolean) => void;
    setVolume: (volume: number) => void;
    setToneVolume: (volume: number) => void;
    playTone: (toneType: string) => void;
    setDispatchSession: (sessionId: string) => void;
    checkSubscription: () => void;
    emitServerTone: (frequency: number, tone: string) => void;
    sendCode100: (frequency: number) => void;
}

const RadioContext = createContext<RadioContextType | undefined>(undefined);

export function RadioProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [currentChannel, setCurrentChannel] = useState<string | null>(null);
    const [listeningChannels, setListeningChannels] = useState<string[]>([]);
    const [talkingUsers, setTalkingUsers] = useState<RadioUser[]>([]);
    const [channels, setChannels] = useState<RadioChannel[]>([]);
    const [volume, setVolumeState] = useState(100);
    const [toneVolume, setToneVolumeState] = useState(100);
    const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [dispatchSessionId, setDispatchSessionId] = useState<string | null>(null);
    
    const socketRef = useRef<any>(null);
    const cleanupRef = useRef<(() => void)[]>([]);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaRecorderRef = useRef<any>(null);
    const gunshotSoundRef = useRef<Howl | null>(null);

    const writeString = (view: DataView, offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }, []);

    const getRadioSocketUrl = useCallback(() => {
        const radioUrl = process.env.NEXT_PUBLIC_RADIO_SOCKET_URL;
        if (!radioUrl) {
            return '';
        }
        return radioUrl;
    }, []);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) {
            console.log('[RadioContext] Already connected');
            return;
        }

        const radioUrl = getRadioSocketUrl();
        console.log('[RadioContext] Connecting to radio server at:', radioUrl || '(relative path through proxy)');

        const socket = io(radioUrl, {
            autoConnect: true,
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            auth: {
                authToken: process.env.NEXT_PUBLIC_RADIO_AUTH_TOKEN || 'changeme',
                serverId: -1,
            },
        });

        socketRef.current = socket;

        const handleConnect = () => {
            console.log('✅ [RadioContext] Connected to radio server');
            console.log('🆔 [RadioContext] Socket ID:', socket.id);
            setIsConnected(true);
        };

        const handleDisconnect = (reason: string) => {
            console.log('❌ [RadioContext] Disconnected from radio server:', reason);
            setIsConnected(false);
            
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        };

        const handleConnectError = (error: any) => {
            console.error('⚠️ [RadioContext] Radio connection error:', error?.message);
            setIsConnected(false);
        };

        const handleReconnect = (attemptNumber: number) => {
            console.log(`🔄 [RadioContext] Reconnected to radio after ${attemptNumber} attempts`);
            setIsConnected(true);
        };

        const handleChannelState = (data: any) => {
            console.log('[RadioContext] Channel state updated:', data);
            
            // Пакетное обновление talkingUsers для реального времени
            setTalkingUsers(prev => {
                const freqStr = data.frequency?.toString();
                const usersOnChannel = data.speakers || [];
                const userIdsOnChannel = usersOnChannel.map((id: number) => id.toString());
                
                // Удаляем пользователей которые больше не на канале
                let updated = prev.filter(user => 
                    !freqStr || user.channel !== freqStr || userIdsOnChannel.includes(user.id)
                );
                
                // Обновляем или добавляем пользователей на канале
                if (data.speakers && data.speakers.length > 0) {
                    data.speakers.forEach((speakerId: number) => {
                        const speakerIdStr = speakerId.toString();
                        const existingUser = updated.find(u => u.id === speakerIdStr);
                        
                        if (existingUser) {
                            // Обновляем существующего пользователя
                            updated = updated.map(u => 
                                u.id === speakerIdStr 
                                    ? { ...u, 
                                        name: data.userCallsigns?.[speakerId] || u.name,
                                        callsign: data.userCallsigns?.[speakerId] || u.callsign,
                                        isTalking: data.activeTalkers?.includes(speakerId) || false,
                                        channel: freqStr
                                      }
                                    : u
                            );
                        } else {
                            // Добавляем нового пользователя с позывным из данных
                            updated = [...updated, {
                                id: speakerIdStr,
                                name: data.userCallsigns?.[speakerId] || `Player ${speakerId}`,
                                callsign: data.userCallsigns?.[speakerId] || '',
                                isTalking: data.activeTalkers?.includes(speakerId) || false,
                                channel: freqStr
                            }];
                        }
                    });
                }
                
                return updated;
            });
            
            // 🔥 Автоматически подписываемся на канал если есть говорящие
            if (data.frequency && data.speakers?.length > 0) {
                const freqStr = data.frequency.toString();
                if (!listeningChannels.includes(freqStr) && currentChannel !== freqStr) {
                    console.log(`[RadioContext] Auto-subscribing to ${freqStr} - has speakers`);
                    if (socketRef.current?.connected) {
                        socketRef.current.emit('addListeningChannel', parseFloat(freqStr));
                    }
                }
            }
            
            if (data.frequency) {
                setChannels(prev => {
                    const existingIndex = prev.findIndex(ch => ch.frequency === data.frequency.toString());
                    const channelData = {
                        id: data.frequency.toString(),
                        name: data.name || `Channel ${data.frequency}`,
                        frequency: data.frequency.toString(),
                        participants: (data.speakers?.length || 0) + (data.listeners?.length || 0),
                        isActive: currentChannel === data.frequency.toString()
                    };
                    
                    if (existingIndex >= 0) {
                        const updated = [...prev];
                        updated[existingIndex] = channelData;
                        return updated;
                    } else {
                        return [...prev, channelData];
                    }
                });
            }
        };

        const handleTalkingState = (data: any) => {
            console.log('[RadioContext] Talking state updated:', data);
            
            setTalkingUsers(prev => {
                const existingIndex = prev.findIndex(u => u.id === data.serverId?.toString());
                
                // 🔥 БЕРЕМ ПОЗЫВНОЙ ИЗ ДАННЫХ
                const callsign = data.callsign || data.name || 
                                (data.serverId < 0 ? `DISP-${Math.abs(data.serverId)}` : `Player ${data.serverId}`);
                
                const userData = {
                    id: data.serverId?.toString() || '',
                    name: callsign,
                    callsign: data.callsign || '',
                    isTalking: data.state,
                    channel: data.frequency?.toString()
                };
                
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = userData;
                    return updated;
                } else {
                    return [...prev, userData];
                }
            });
        };

        const handleSpeakerJoined = (data: any) => {
            console.log('[RadioContext] Speaker joined:', data);
            
            setTalkingUsers(prev => {
                if (prev.find(u => u.id === data.serverId?.toString())) return prev;
                
                // 🔥 БЕРЕМ ПОЗЫВНОЙ
                const callsign = data.callsign || data.name || 
                                (data.serverId < 0 ? `DISP-${Math.abs(data.serverId)}` : `Player ${data.serverId}`);
                
                return [...prev, {
                    id: data.serverId?.toString() || '',
                    name: callsign,
                    callsign: data.callsign || '',
                    isTalking: false,
                    channel: data.frequency?.toString()
                }];
            });
        };

        const handleSpeakerLeft = (data: any) => {
            console.log('[RadioContext] Speaker left:', data);
            setTalkingUsers(prev => prev.filter(u => u.id !== data.serverId?.toString()));
        };

        const handleListenerJoined = (data: any) => {
            console.log('[RadioContext] Listener joined:', data);
            setListeningChannels(prev => {
                const freqStr = data.frequency?.toString();
                if (!freqStr || prev.includes(freqStr)) return prev;
                return [...prev, freqStr];
            });
        };

        const handleListenerLeft = (data: any) => {
            console.log('[RadioContext] Listener left:', data);
            setListeningChannels(prev => prev.filter(ch => ch !== data.frequency?.toString()));
        };

        const handleChannelDeleted = (data: any) => {
            console.log('[RadioContext] Channel deleted:', data);
            setChannels(prev => prev.filter(ch => ch.frequency !== data.frequency?.toString()));
        };

        const handleServerTone = (data: any) => {
            console.log('[RadioContext] Server tone received:', data);
            
            if (data.tone) {
                playTone(data.tone);
                console.log('[RadioContext] Playing tone:', data.tone);
            }
        };

        // 🔥 ИСПРАВЛЕННЫЙ handleVoice с лучшей обработкой ошибок
        const handleVoice = (data: any) => {
            console.log('[RadioContext] 🎙️ Voice packet received:', {
                serverId: data.serverId,
                frequency: data.frequency,
                dataLength: data.data?.length,
                receiveType: data.receiveType,
                currentVolume: volume
            });
            
            // 🔥 Проверка: игнорируем ли мы свой голос (диспетчера)?
            if (data.serverId === -1) {
                console.log('[RadioContext] ⏭️ Ignoring own voice (dispatcher)');
                return;
            }
            
            if (!data.data || data.data.length === 0) {
                console.warn('[RadioContext] ⚠️ No audio data in voice packet');
                return;
            }
            
            try {
                const audioBase64 = data.data;
                const binaryString = atob(audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                console.log('[RadioContext] 📦 Audio decoded, size:', bytes.length, 'bytes');
                
                const blob = new Blob([bytes], { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                console.log('[RadioContext] 🔊 Creating Howl with volume:', volume / 100);
                
                const sound = new Howl({
                    src: [url],
                    format: ['webm', 'opus'],
                    volume: volume / 100,
                    preload: true,
                    html5: true,
                    onend: () => {
                        console.log('[RadioContext] ✅ Audio playback finished');
                        URL.revokeObjectURL(url);
                    },
                    onload: () => {
                        console.log('[RadioContext] ✅ Voice audio loaded successfully');
                    },
                    onloaderror: (id, error) => {
                        console.error('[RadioContext] ❌ Howl load error:', error);
                        URL.revokeObjectURL(url);
                    },
                    onplayerror: (id, error) => {
                        console.error('[RadioContext] ❌ Howl play error:', error);
                        // Retry once on play error
                        setTimeout(() => {
                            try {
                                sound.play();
                            } catch (retryError) {
                                console.error('[RadioContext] ❌ Retry play failed:', retryError);
                                URL.revokeObjectURL(url);
                            }
                        }, 100);
                    }
                });
                
                // Wait for audio to load before playing
                sound.once('load', () => {
                    console.log('[RadioContext] ▶️ Starting playback');
                    const playResult = sound.play();
                    if (typeof playResult === 'boolean' && !playResult) {
                        console.error('[RadioContext] ❌ Browser autoplay policy blocked audio');
                    }
                });
                
                // Fallback: if load takes too long, try playing anyway
                setTimeout(() => {
                    if (sound.state() !== 'loaded') {
                        console.warn('[RadioContext] ⏱️ Audio load timeout, attempting playback anyway');
                        sound.play();
                    }
                }, 500);
                
            } catch (error) {
                console.error('[RadioContext] ❌ Failed to play voice:', error);
            }
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('reconnect', handleReconnect);
        socket.on('channelState', handleChannelState);
        socket.on('talkingState', handleTalkingState);
        socket.on('speakerJoined', handleSpeakerJoined);
        socket.on('speakerLeft', handleSpeakerLeft);
        socket.on('listenerJoined', handleListenerJoined);
        socket.on('listenerLeft', handleListenerLeft);
        socket.on('channelDeleted', handleChannelDeleted);
        socket.on('serverTone', handleServerTone);
        socket.on('voice', handleVoice);
        socket.on('playGunshot', (data: any) => {
            console.log('[RadioContext] 🔫 Gunshot received:', data);
            
            // Рассчитываем громкость из дистанции (как в Lua)
            let volume = 0.8;
            const distance = data.distance;
            
            if (distance <= 10) {
                volume = 1.0;
            } else if (distance <= 25) {
                volume = 1.0 - ((distance - 10) / 15) * 0.99;
            } else if (distance <= 100) {
                volume = 0.01 * (1.0 - ((distance - 25) / 75) * 0.9);
            } else {
                volume = 0;
            }
            
            if (volume > 0) {
                playGunshotSound(volume);
            }
        });
        
        socket.on('channelAlert', (data: any) => {
            console.log('[RadioContext] Channel alert received:', data);
            
            if (data.tone === 'ALERT_A' || data.type === 'SIGNAL_100') {
                playTone('ALERT_A');
                console.log('[RadioContext] Playing ALERT_A for channel alert');
            }
        });
        
        socket.on('dispatchAlert', (data: any) => {
            console.log('[RadioContext] Dispatch alert received:', data);
            
            if (data.tone) {
                playTone(data.tone);
            }
        });

        cleanupRef.current = [
            () => socket.off('connect', handleConnect),
            () => socket.off('disconnect', handleDisconnect),
            () => socket.off('connect_error', handleConnectError),
            () => socket.off('reconnect', handleReconnect),
            () => socket.off('channelState', handleChannelState),
            () => socket.off('talkingState', handleTalkingState),
            () => socket.off('speakerJoined', handleSpeakerJoined),
            () => socket.off('speakerLeft', handleSpeakerLeft),
            () => socket.off('listenerJoined', handleListenerJoined),
            () => socket.off('listenerLeft', handleListenerLeft),
            () => socket.off('channelDeleted', handleChannelDeleted),
            () => socket.off('serverTone', handleServerTone),
            () => socket.off('voice', handleVoice),
            () => socket.off('playGunshot'),
            () => socket.off('channelAlert'),
            () => socket.off('dispatchAlert'),
        ];

        setIsInitialized(true);
    }, [getRadioSocketUrl, currentChannel, volume, listeningChannels]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            cleanupRef.current.forEach(cleanup => cleanup());
            disconnect();
        };
    }, [connect, disconnect]);

    const setSpeakerChannel = useCallback((channelId: string) => {
        setCurrentChannel(channelId);
        if (socketRef.current?.connected) {
            socketRef.current.emit('setSpeakerChannel', parseFloat(channelId));
            console.log(`[RadioContext] Now SPEAKING on channel ${channelId}`);
        } else {
            console.warn('[RadioContext] Cannot set speaker channel, not connected - attempting to connect');
            connect();
        }
    }, [connect]);

    const addListeningChannel = useCallback((channelId: string) => {
        if (socketRef.current?.connected) {
            // ✅ ИСПРАВЛЕНО: отправляем число
            socketRef.current.emit('addListeningChannel', parseFloat(channelId));
            setListeningChannels(prev => [...prev, channelId]);
        } else {
            console.warn('[RadioContext] Cannot add listening channel, not connected');
        }
    }, []);

    const removeListeningChannel = useCallback((channelId: string) => {
        if (socketRef.current?.connected) {
            // ✅ ИСПРАВЛЕНО: отправляем число
            socketRef.current.emit('removeListeningChannel', parseFloat(channelId));
            setListeningChannels(prev => prev.filter(ch => ch !== channelId));
        } else {
            console.warn('[RadioContext] Cannot remove listening channel, not connected');
        }
    }, []);

    const listenToUser = useCallback((serverId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('listenToUser', serverId);
        } else {
            console.warn('[RadioContext] Cannot listen to user, not connected');
        }
    }, []);

    const stopListeningToUser = useCallback((serverId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('stopListeningToUser', serverId);
        } else {
            console.warn('[RadioContext] Cannot stop listening to user, not connected');
        }
    }, []);

    const setTalking = useCallback((isTalking: boolean) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('setTalking', isTalking);
        } else {
            console.warn('[RadioContext] Cannot set talking state, not connected');
        }
    }, []);

    const setVolume = useCallback((vol: number) => {
        setVolumeState(vol);
        if (socketRef.current?.connected) {
            socketRef.current.emit('setVolume', vol);
        }
    }, []);

    const setToneVolume = useCallback((vol: number) => {
        setToneVolumeState(vol);
        if (socketRef.current?.connected) {
            socketRef.current.emit('setToneVolume', vol);
        }
    }, []);

    const playTone = useCallback((toneType: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('playTone', toneType);
        } else {
            console.warn('[RadioContext] Cannot play tone, not connected');
        }
    }, []);

    const setDispatchSession = useCallback((sessionId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('setDispatchSession', sessionId);
        } else {
            console.warn('[RadioContext] Cannot set dispatch session, not connected');
        }
    }, []);

    // ✅ ДОБАВЛЕН МЕТОД checkSubscription
    const checkSubscription = useCallback(() => {
        console.log('=== RADIO SUBSCRIPTION CHECK ===');
        console.log('Socket connected:', socketRef.current?.connected);
        console.log('Current channel:', currentChannel);
        console.log('Listening channels:', listeningChannels);
        console.log('Talking users:', talkingUsers);
        console.log('Available channels:', channels);
        
        if (socketRef.current?.connected) {
            socketRef.current.emit('getSubscriptionStatus', (response: any) => {
                console.log('Server subscription status:', response);
            });
        }
    }, [currentChannel, listeningChannels, talkingUsers, channels]);

    const emitServerTone = useCallback((frequency: number, tone: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('serverTone', { frequency, tone });
            console.log('[RadioContext] Server tone emitted:', { frequency, tone });
        } else {
            console.warn('[RadioContext] Cannot emit serverTone, not connected');
        }
    }, []);

    const sendCode100 = useCallback((frequency: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('toggleAlert', {
                frequency: frequency,
                tone: 'ALERT_A',
                type: 'SIGNAL_100'
            });
            console.log('[RadioContext] 📤 Code 100 sent to server for channel', frequency);
        } else {
            console.warn('[RadioContext] Cannot send Code 100, not connected');
        }
    }, []);

    const playGunshotSound = useCallback((volume: number = 0.8) => {
        const sound = new Howl({
            src: ['/audio/bgShot.wav'],
            format: ['wav'],
            volume: Math.min(1, Math.max(0, volume))
        });
        sound.play();
    }, []);

    // Debug useEffect для проверки статуса радио системы
    useEffect(() => {
        console.log('=== RADIO STATUS ===');
        console.log('Connected:', isConnected);
        console.log('Current channel:', currentChannel);
        console.log('Microphone enabled:', microphoneEnabled);
        console.log('Is recording:', isRecording);
        console.log('Dispatch session:', dispatchSessionId);
    }, [isConnected, currentChannel, microphoneEnabled, isRecording, dispatchSessionId]);

    const enableMicrophone = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1
                } 
            });
            
            mediaStreamRef.current = stream;
            
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm; codecs=opus',
                audioBitsPerSecond: 16000
            });
            
            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                if (chunks.length > 0 && socketRef.current?.connected && isRecording) {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const base64 = await blobToBase64(blob);
                    socketRef.current.emit('voice', {
                        channelName: currentChannel?.toString(),  // СТРОКА!
                        serverId: -1,                              // ЧИСЛО!
                        data: base64                               // ТОЛЬКО base64!
                    });
                    console.log('[RadioContext] Voice sent:', {
                        channelName: currentChannel,
                        serverId: -1,
                        dataSize: base64.length
                    });
                    chunks.length = 0;
                }
            };
            
            mediaRecorderRef.current = mediaRecorder;
            
            const recordInterval = setInterval(() => {
                if (isRecording && mediaRecorder.state === 'inactive') {
                    mediaRecorder.start();
                    setTimeout(() => {
                        if (mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                    }, 300);
                }
            }, 300);
            
            (window as any).recordInterval = recordInterval;
            
            setMicrophoneEnabled(true);
            console.log('[RadioContext] Microphone enabled');
        } catch (error) {
            console.error('[RadioContext] Failed to enable microphone:', error);
            throw error;
        }
    }, [currentChannel, isRecording, blobToBase64]);

    const disableMicrophone = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current = null;
        }
        
        if ((window as any).recordInterval) {
            clearInterval((window as any).recordInterval);
            delete (window as any).recordInterval;
        }
        
        setMicrophoneEnabled(false);
        setIsRecording(false);
        console.log('[RadioContext] Microphone disabled');
    }, []);

    const startRecording = useCallback(() => {
        setIsRecording(true);
        console.log('[RadioContext] Recording started');
    }, []);

    const stopRecording = useCallback(() => {
        setIsRecording(false);
        console.log('[RadioContext] Recording stopped');
    }, []);

    const authenticateDispatch = useCallback(async (callsign: string) => {
        const nacId = process.env.NEXT_PUBLIC_RADIO_DISPATCH_NAC_ID || '141';
        const radioUrl = getRadioSocketUrl();
        
        try {
            const response = await fetch(`${radioUrl}/radio/dispatch/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nacId: nacId,
                    callsign: callsign 
                })
            });
            
            const data = await response.json();
            if (data.success) {
                setDispatchSessionId(data.sessionId);
                setDispatchSession(data.sessionId);
                console.log('[RadioContext] Dispatch authenticated, session ID:', data.sessionId);
                console.log('[RadioContext] Dispatch ready to speak - will use setSpeakerChannel when channel selected');
            } else {
                console.error('[RadioContext] Dispatch authentication failed:', data.error);
                throw new Error(data.error || 'Authentication failed');
            }
        } catch (error) {
            console.error('[RadioContext] Failed to authenticate dispatch:', error);
            throw error;
        }
    }, [getRadioSocketUrl, setDispatchSession]);

    return (
        <RadioContext.Provider value={{
            socket: socketRef.current,
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
            checkSubscription,
            emitServerTone,
            sendCode100,
        }}>
            {children}
        </RadioContext.Provider>
    );
}

export function useRadio() {
    const context = useContext(RadioContext);
    if (context === undefined) {
        throw new Error("useRadio must be used within a RadioProvider");
    }
    return context;
}