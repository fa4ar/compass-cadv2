const STATIC_CACHE = 'cad-static-v3';
const RUNTIME_CACHE = 'cad-runtime-v3';
const META_CACHE = 'cad-runtime-meta-v3';
const RUNTIME_TTL_MS = 5 * 60 * 1000;

const isCacheableStaticAsset = (request) => {
	if (request.method !== 'GET') {
		return false;
	}

	const url = new URL(request.url);
	const isSameOrigin = url.origin === self.location.origin;
	if (!isSameOrigin) {
		return false;
	}

	if (request.mode === 'navigate') {
		return false;
	}

	// Исключаем ВСЕ API маршруты из кэширования
	if (url.pathname.startsWith('/api')) {
		console.log('[SW] Skipping cache for API request:', url.pathname);
		return false;
	}

	return (
		url.pathname.startsWith('/_next/static/') ||
		url.pathname.startsWith('/map/') ||
		/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/.test(url.pathname)
	);
};

const readRuntimeTimestamp = async (requestUrl) => {
	const metaCache = await caches.open(META_CACHE);
	const metadata = await metaCache.match(requestUrl);
	if (!metadata) {
		return 0;
	}
	const value = await metadata.text();
	const timestamp = Number(value);
	return Number.isFinite(timestamp) ? timestamp : 0;
};

const writeRuntimeTimestamp = async (requestUrl) => {
	const metaCache = await caches.open(META_CACHE);
	await metaCache.put(requestUrl, new Response(String(Date.now())));
};

self.addEventListener('install', (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE, META_CACHE].includes(key))
					.map((key) => caches.delete(key))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	if (!isCacheableStaticAsset(event.request)) {
		return;
	}

	event.respondWith(
		(async () => {
			const runtimeCache = await caches.open(RUNTIME_CACHE);
			const cached = await runtimeCache.match(event.request);

			if (cached) {
				const cachedAt = await readRuntimeTimestamp(event.request.url);
				if (Date.now() - cachedAt < RUNTIME_TTL_MS) {
					return cached;
				}
			}

			const networkResponse = await fetch(event.request);
			if (networkResponse.ok) {
				await runtimeCache.put(event.request, networkResponse.clone());
				await writeRuntimeTimestamp(event.request.url);
			}

			return networkResponse;
		})()
	);
});

self.addEventListener('message', (event) => {
	const message = event.data || {};
	const port = event.ports?.[0];

	const reply = (ok) => {
		if (port) {
			port.postMessage({ ok });
		}
	};

	if (message.type === 'CLEAR_ALL_CACHES') {
		event.waitUntil(
			(async () => {
				const keys = await caches.keys();
				await Promise.all(keys.map((key) => caches.delete(key)));
				reply(true);
			})()
		);
		return;
	}

	if (message.type === 'INVALIDATE_URLS') {
		const urls = Array.isArray(message.urls) ? message.urls : [];
		event.waitUntil(
			(async () => {
				const runtimeCache = await caches.open(RUNTIME_CACHE);
				const staticCache = await caches.open(STATIC_CACHE);
				const metaCache = await caches.open(META_CACHE);

				await Promise.all(
					urls.flatMap((url) => [
						runtimeCache.delete(url),
						staticCache.delete(url),
						metaCache.delete(url),
					])
				);

				reply(true);
			})()
		);
		return;
	}

	reply(false);
});
