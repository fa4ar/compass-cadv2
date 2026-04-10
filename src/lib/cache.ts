interface ServiceWorkerMessage {
  type: string;
  [key: string]: any;
}

const sendMessageToServiceWorker = async (
  message: ServiceWorkerMessage,
): Promise<boolean> => {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const activeWorker = registration.active;

  if (!activeWorker) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === `${message.type}_RESPONSE`) {
        navigator.serviceWorker.removeEventListener("message", messageHandler);
        resolve(Boolean(event.data?.ok));
      }
    };

    navigator.serviceWorker.addEventListener("message", messageHandler);
    activeWorker.postMessage(message);

    setTimeout(() => {
      navigator.serviceWorker.removeEventListener("message", messageHandler);
      resolve(false);
    }, 1500);
  });
};

export const clearClientCaches = async (): Promise<boolean> => {
  if (!("caches" in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  } catch (error) {
    console.error("Failed to clear caches:", error);
    return false;
  }
};

export const invalidateClientCache = async (urls: string[]): Promise<boolean> => {
  if (!("caches" in window)) {
    return false;
  }

  try {
    const cache = await caches.open("default");
    for (const url of urls) {
      await cache.delete(url);
    }
    return true;
  } catch (error) {
    console.error("Failed to invalidate cache:", error);
    return false;
  }
};
