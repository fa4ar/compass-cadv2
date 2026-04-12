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
            
            // 🔥 Автоматически подписываемся на канал если есть говорящие
            if (data.frequency && data.activeTalkers?.length > 0) {
                const freqStr = data.frequency.toString();
                if (!listeningChannels.includes(freqStr) && currentChannel !== freqStr) {
                    console.log(`[RadioContext] Auto-joining channel ${freqStr} due to active talker`);
                    if (socketRef.current?.connected) {
                        // ✅ ИСПРАВЛЕНО: отправляем просто число, а не объект
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
                const userData = {
                    id: data.serverId?.toString() || '',
                    name: data.name || 'Unknown',
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
                return [...prev, {
                    id: data.serverId?.toString() || '',
                    name: data.name || 'Unknown',
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
            console.log('[RadioContext] Server tone:', data);
        };

        // 🔥 ИСПРАВЛЕННЫЙ handleVoice с лучшей обработкой ошибок
        const handleVoice = (data: any) => {
            console.log('[RadioContext] Voice packet received:', {
                serverId: data.serverId,
                frequency: data.frequency,
                dataLength: data.data?.length,
                receiveType: data.receiveType
            });
            
            if (!data.data || data.data.length === 0) {
                console.warn('[RadioContext] No audio data in voice packet');
                return;
            }
            
            try {
                const audioBase64 = data.data;
                const binaryString = atob(audioBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                const blob = new Blob([bytes], { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                const sound = new Howl({
                    src: [url],
                    format: ['webm', 'opus'],
                    volume: volume / 100,
                    onend: () => {
                        URL.revokeObjectURL(url);
                    },
                    onloaderror: (id, error) => {
                        console.error('[RadioContext] Howl load error:', error);
                    },
                    onplayerror: (id, error) => {
                        console.error('[RadioContext] Howl play error:', error);
                    }
                });
                
                sound.play();
                console.log('[RadioContext] Voice playing, volume:', volume);
            } catch (error) {
                console.error('[RadioContext] Failed to play voice:', error);
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
        if (socketRef.current?.connected) {
            // ✅ ИСПРАВЛЕНО: отправляем число
            socketRef.current.emit('setSpeakerChannel', parseFloat(channelId));
            setCurrentChannel(channelId);
        } else {
            console.warn('[RadioContext] Cannot set speaker channel, not connected');
        }
    }, []);

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
                        channelName: currentChannel,
                        serverId: -1,
                        data: base64
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
                
                // Подписываемся на основные каналы
                setTimeout(() => {
                    const mainChannels = ['154.755', '460.250', '155.070'];
                    mainChannels.forEach(freq => {
                        if (socketRef.current?.connected) {
                            // ✅ ИСПРАВЛЕНО: отправляем число
                            socketRef.current.emit('addListeningChannel', parseFloat(freq));
                            console.log(`[RadioContext] Subscribed to channel ${freq}`);
                        }
                    });
                }, 1000);
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