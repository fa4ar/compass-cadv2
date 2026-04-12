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

    // Вспомогательная функция для записи строки в DataView
    const writeString = (view: DataView, offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    // Вспомогательная функция для конвертации аудио в base64
    const audioBufferToBase64 = (buffer: Float32Array): string => {
        const length = buffer.length;
        const pcmData = new Int16Array(length);
        for (let i = 0; i < length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, Math.floor(buffer[i] * 32768)));
        }
        
        const sampleRate = 16000;
        const channels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * channels * bitsPerSample / 8;
        const blockAlign = channels * bitsPerSample / 8;
        
        const wavHeader = new ArrayBuffer(44);
        const view = new DataView(wavHeader);
        
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(view, 36, 'data');
        view.setUint32(40, length * 2, true);
        
        const wavData = new Uint8Array(44 + length * 2);
        wavData.set(new Uint8Array(wavHeader), 0);
        
        const pcmBytes = new Int16Array(wavData.buffer, 44, length);
        pcmBytes.set(pcmData);
        
        let binary = '';
        const bytes = new Uint8Array(wavData.buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    };

    // Вспомогательная функция для конвертации Blob в base64
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
        // Если URL не указан, используем относительные пути через прокси Next.js
        const radioUrl = process.env.NEXT_PUBLIC_RADIO_SOCKET_URL;
        if (!radioUrl) {
            return ''; // Будет использовать текущий origin через прокси
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
            transports: ['polling', 'websocket'], // Пробуем polling и websocket через прокси
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            auth: {
                authToken: process.env.NEXT_PUBLIC_RADIO_AUTH_TOKEN || 'changeme',
                serverId: -1, // Диспетчер использует отрицательный ID
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

        // Radio-specific events
        const handleChannelState = (data: any) => {
            console.log('[RadioContext] Channel state updated:', data);
            if (data.channelId) {
                setChannels(prev => {
                    const updated = prev.map(ch => 
                        ch.id === data.channelId 
                            ? { ...ch, participants: data.participants || ch.participants }
                            : ch
                    );
                    // Если канал новый, добавляем его
                    if (!prev.find(ch => ch.id === data.channelId)) {
                        updated.push({
                            id: data.channelId,
                            name: data.name || `Channel ${data.channelId}`,
                            frequency: data.frequency || '100.0',
                            participants: data.participants || 0,
                            isActive: data.channelId === currentChannel
                        });
                    }
                    return updated;
                });
            }
        };

        const handleTalkingState = (data: any) => {
            console.log('[RadioContext] Talking state updated:', data);
            setTalkingUsers(prev => {
                const updated = prev.map(user => 
                    user.id === data.serverId 
                        ? { ...user, isTalking: data.state }
                        : user
                );
                // Если пользователь новый, добавляем его
                if (!prev.find(u => u.id === data.serverId)) {
                    updated.push({
                        id: data.serverId,
                        name: data.name || 'Unknown',
                        callsign: data.callsign || '',
                        isTalking: data.state,
                        channel: data.frequency
                    });
                }
                return updated;
            });
        };

        const handleSpeakerJoined = (data: any) => {
            console.log('[RadioContext] Speaker joined:', data);
            setTalkingUsers(prev => {
                const exists = prev.find(u => u.id === data.serverId);
                if (exists) return prev;
                return [
                    ...prev,
                    {
                        id: data.serverId,
                        name: data.name || 'Unknown',
                        callsign: data.callsign || '',
                        isTalking: false,
                        channel: data.frequency
                    }
                ];
            });
        };

        const handleSpeakerLeft = (data: any) => {
            console.log('[RadioContext] Speaker left:', data);
            setTalkingUsers(prev => prev.filter(u => u.id !== data.serverId));
        };

        const handleListenerJoined = (data: any) => {
            console.log('[RadioContext] Listener joined:', data);
            setListeningChannels(prev => {
                if (prev.includes(data.frequency)) return prev;
                return [...prev, data.frequency];
            });
        };

        const handleListenerLeft = (data: any) => {
            console.log('[RadioContext] Listener left:', data);
            setListeningChannels(prev => prev.filter(ch => ch !== data.frequency));
        };

        const handleChannelDeleted = (data: any) => {
            console.log('[RadioContext] Channel deleted:', data);
            setChannels(prev => prev.filter(ch => ch.id !== data.frequency));
        };

        const handleServerTone = (data: any) => {
            console.log('[RadioContext] Server tone:', data);
            // Можно добавить воспроизведение звука
        };

        const handleVoice = (data: any) => {
            console.log('[RadioContext] Voice packet received:', data);
            if (data.data) {
                const audioBase64 = data.data;
                const binary = atob(audioBase64);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                const blob = new Blob([array], { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                
                const sound = new Howl({
                    src: [url],
                    format: ['webm'],
                    volume: 1,
                    onload: () => {
                        sound.volume(volume / 100);
                    },
                    onend: () => URL.revokeObjectURL(url)
                });
                sound.play();
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
    }, [getRadioSocketUrl, currentChannel]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        }
    }, []);

    useEffect(() => {
        // Автоматическое подключение при монтировании провайдера
        connect();

        return () => {
            cleanupRef.current.forEach(cleanup => cleanup());
            disconnect();
        };
    }, [connect, disconnect]);

    const setSpeakerChannel = useCallback((channelId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('setSpeakerChannel', channelId);
            setCurrentChannel(channelId);
            setChannels(prev => prev.map(ch => 
                ch.id === channelId ? { ...ch, isActive: true } : { ...ch, isActive: false }
            ));
        } else {
            console.warn('[RadioContext] Cannot set speaker channel, not connected');
        }
    }, []);

    const addListeningChannel = useCallback((channelId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('addListeningChannel', channelId);
            setListeningChannels(prev => [...prev, channelId]);
        } else {
            console.warn('[RadioContext] Cannot add listening channel, not connected');
        }
    }, []);

    const removeListeningChannel = useCallback((channelId: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('removeListeningChannel', channelId);
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
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000
            });
            
            const source = audioContextRef.current.createMediaStreamSource(stream);
            
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
                if (chunks.length > 0 && socketRef.current?.connected) {
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
        
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
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
