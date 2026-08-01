const CACHE_NAME = 'restaurants-os-v5';
const IMAGE_CACHE_NAME = 'restaurants-os-images-v1';

// Install Event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event: Clear all legacy caches automatically to force latest deployment & fresh data
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== IMAGE_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-First Strategy: Always fetch latest live data from server)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Handle CDN food images (Unsplash, Supabase Storage, Cloudinary)
  if (
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('cloudinary.com')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (e) {
          const cachedResponse = await cache.match(event.request);
          return cachedResponse || new Response('', { status: 408, statusText: 'Image Request Failed' });
        }
      })
    );
    return;
  }

  // Handle Local Application Code & Data Requests — Always fetch fresh network response first
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          // Force network fetch first to guarantee latest code & data
          const networkResponse = await fetch(event.request, { cache: 'no-store' });
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        } catch (err) {
          // Only fallback to cache if user is completely offline
          const cachedFallback = await caches.match(event.request);
          if (cachedFallback) return cachedFallback;

          if (event.request.mode === 'navigate') {
            const indexCache = await caches.match('/index.html');
            if (indexCache) return indexCache;
          }

          return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
        }
      })()
    );
  }
});
