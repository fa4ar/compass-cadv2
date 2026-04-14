"use client";

import { useCallback, useRef, useEffect } from 'react';

type SoundType = 
    | 'search_success' 
    | 'search_error' 
    | 'new_call_911' 
    | 'notification' 
    | 'supervisor_request'
    | 'message_received'
    | 'message_sent'
    | 'code_100'
    | 'code_3';

const SOUNDS: Record<SoundType, string> = {
    search_success: '/sounds/search_success.mp3',
    search_error: '/sounds/search_error.mp3',
    new_call_911: '/sounds/new_call.mp3',
    notification: '/sounds/notification.mp3',
    supervisor_request: '/sounds/supervisor.mp3',
    message_received: '/sounds/message.mp3',
    message_sent: '/sounds/message_sent.mp3',
    code_100: '', // Используем Web Audio API
    code_3: '', // Используем Web Audio API
};

// Web Audio API для генерации простых звуков
class SoundGenerator {
    private context: AudioContext | null = null;
    private isInitialized: boolean = false;
    
    private async ensureContext(): Promise<AudioContext> {
        if (!this.context) {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        // Resume context if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
        return this.context;
    }
    
    async playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
        try {
            const ctx = await this.ensureContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            console.error('Sound error:', e);
        }
    }
    
    async playSearchSuccess() {
        await this.playTone(800, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.2), 100);
        setTimeout(() => this.playTone(1200, 0.15, 'sine', 0.2), 200);
    }
    
    async playSearchError() {
        await this.playTone(200, 0.3, 'square', 0.15);
    }
    
    async playNewCall911() {
        console.log('[Sound] Playing new call 911 sound');
        // Use higher volume and more distinct pattern
        await this.playTone(800, 0.15, 'sine', 0.4);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.4), 150);
        setTimeout(() => this.playTone(800, 0.15, 'sine', 0.4), 300);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.4), 450);
        setTimeout(() => this.playTone(1200, 0.4, 'sine', 0.5), 600);
    }
    
    async playNotification() {
        await this.playTone(500, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(700, 0.2, 'sine', 0.2), 100);
    }
    
    async playSupervisorRequest() {
        await this.playTone(400, 0.2, 'triangle', 0.25);
        setTimeout(() => this.playTone(500, 0.2, 'triangle', 0.25), 200);
        setTimeout(() => this.playTone(600, 0.2, 'triangle', 0.25), 400);
        setTimeout(() => this.playTone(800, 0.4, 'triangle', 0.3), 600);
    }
    
    async playMessageReceived() {
        await this.playTone(600, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(800, 0.15, 'sine', 0.2), 80);
    }
    
    async playMessageSent() {
        await this.playTone(800, 0.08, 'sine', 0.15);
        setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.15), 80);
    }

    async playCode100() {
        // Аналогично search_success, но более громко и настойчиво
        await this.playTone(800, 0.15, 'sine', 0.4);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.4), 150);
        setTimeout(() => this.playTone(1200, 0.2, 'sine', 0.4), 300);
    }

    async playCode3() {
        // Быстрый звук для Code 3
        await this.playTone(600, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(800, 0.1, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.3), 200);
    }
}

const soundGenerator = new SoundGenerator();

export function useSound() {
    const playSound = useCallback(async (type: SoundType) => {
        console.log('[Sound] Playing:', type);
        try {
            switch (type) {
                case 'search_success':
                    await soundGenerator.playSearchSuccess();
                    break;
                case 'search_error':
                    await soundGenerator.playSearchError();
                    break;
                case 'new_call_911':
                    await soundGenerator.playNewCall911();
                    break;
                case 'notification':
                    await soundGenerator.playNotification();
                    break;
                case 'supervisor_request':
                    await soundGenerator.playSupervisorRequest();
                    break;
                case 'message_received':
                    await soundGenerator.playMessageReceived();
                    break;
                case 'message_sent':
                    await soundGenerator.playMessageSent();
                    break;
                case 'code_100':
                    await soundGenerator.playCode100();
                    break;
                case 'code_3':
                    await soundGenerator.playCode3();
                    break;
            }
        } catch (e) {
            console.error('[Sound] Play error:', e);
        }
    }, []);
    
    return { playSound };
}

export { SoundGenerator, SOUNDS };
