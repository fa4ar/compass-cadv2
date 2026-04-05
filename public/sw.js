// Исправленный Service Worker
self.addEventListener('fetch', (event) => {
	// Пропускаем POST, PUT, DELETE, PATCH запросы
	if (event.request.method !== 'GET') {
		return; // Не кэшируем не-GET запросы
	}

	// Обрабатываем только GET запросы
	event.respondWith(
		caches.match(event.request).then((response) => {
			if (response) {
				return response;
			}
			return fetch(event.request).then((response) => {
				// Кэшируем только успешные GET запросы
				if (response.status === 200 && event.request.method === 'GET') {
					const responseClone = response.clone();
					caches.open('my-cache').then((cache) => {
						cache.put(event.request, responseClone);
					});
				}
				return response;
			});
		})
	);
});

// При установке кэшируем только GET запросы
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open('my-cache').then((cache) => {
			return cache.addAll([
				'/',
				'/index.html',
				// Только GET-ресурсы
			]).catch(err => {
				console.log('Cache addAll failed:', err);
			});
		})
	);
});