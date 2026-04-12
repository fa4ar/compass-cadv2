// lib/radio-api.ts
import api from './axios';

export interface RadioConfig {
    channels: RadioChannel[];
    tones: RadioTone[];
    volume: number;
    toneVolume: number;
}

export interface RadioChannel {
    id: string;
    name: string;
    frequency: string;
    participants: number;
}

export interface RadioTone {
    id: string;
    name: string;
    type: string;
}

export interface RadioStatus {
    isConnected: boolean;
    currentChannel: string | null;
    listeningChannels: string[];
    talkingUsers: any[];
}

// Получить конфигурацию радио
export async function getRadioConfig(): Promise<RadioConfig> {
    const res = await api.get('/radio/dispatch/config');
    return res.data;
}

// Получить статус радио
export async function getRadioStatus(): Promise<RadioStatus> {
    const res = await api.get('/radio/dispatch/status');
    return res.data;
}

// Получить список тонов
export async function getRadioTones(): Promise<RadioTone[]> {
    const res = await api.get('/radio/dispatch/tones');
    return res.data;
}

// Аутентификация диспетчера
export async function authenticateDispatcher(callsign: string): Promise<{ success: boolean; token?: string }> {
    const res = await api.post('/radio/dispatch/auth', { callsign });
    return res.data;
}

// Переключить канал
export async function switchChannel(channelId: string): Promise<void> {
    await api.post('/radio/dispatch/switchChannel', { channelId });
}

// Воспроизвести тон
export async function playTone(toneType: string): Promise<void> {
    await api.post('/radio/dispatch/tone', { toneType });
}

// Отправить broadcast сообщение
export async function sendBroadcast(message: string, channelId?: string): Promise<void> {
    await api.post('/radio/dispatch/broadcast', { message, channelId });
}

// Триггерить алерт
export async function triggerAlert(type: 'channel' | 'global', channelId?: string): Promise<void> {
    await api.post('/radio/dispatch/alert/trigger', { type, channelId });
}

// Очистить алерт
export async function clearAlert(): Promise<void> {
    await api.post('/radio/dispatch/alert/clear');
}

// Oneshot алерт
export async function oneshotAlert(type: string): Promise<void> {
    await api.post('/radio/dispatch/alert/oneshot', { type });
}

// Отключить пользователя от радио
export async function disconnectUser(userId: string): Promise<void> {
    await api.post('/dispatch/user/disconnect', { userId });
}

// Обновить callsign пользователя
export async function updateUserCallsign(userId: string, callsign: string): Promise<void> {
    await api.post('/dispatch/user/update-callsign', { userId, callsign });
}

// Отправить алерт пользователю
export async function sendUserAlert(userId: string, message: string): Promise<void> {
    await api.post('/dispatch/user/alert', { userId, message });
}
