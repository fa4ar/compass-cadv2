type ServiceWorkerMessage = {
    type: 'CLEAR_ALL_CACHES' | 'INVALIDATE_URLS';
    urls?: string[];
};

const sendMessageToServiceWorker = async (message: ServiceWorkerMessage): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
        return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const activeWorker = registration.active || navigator.serviceWorker.controller;

    if (!activeWorker) {
        return false;
    }

    return await new Promise<boolean>((resolve) => {
        const channel = new MessageChannel();

        channel.port1.onmessage = (event) => {
            resolve(Boolean(event.data?.ok));
        };

        activeWorker.postMessage(message, [channel.port2]);

        setTimeout(() => resolve(false), 1500);
    });
};

export async function clearClientCaches(): Promise<boolean> {
    if (typeof window === 'undefined') {
        return false;
    }

    const clearedViaServiceWorker = await sendMessageToServiceWorker({ type: 'CLEAR_ALL_CACHES' });

    if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
    }

    return clearedViaServiceWorker;
}

export async function invalidateClientCache(urls: string[]): Promise<boolean> {
    if (typeof window === 'undefined' || urls.length === 0) {
        return false;
    }

    return await sendMessageToServiceWorker({
        type: 'INVALIDATE_URLS',
        urls,
    });
}
