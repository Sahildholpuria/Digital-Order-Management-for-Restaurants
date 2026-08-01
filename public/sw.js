const CACHE_NAME = 'restaurants-os-v4';
const IMAGE_CACHE_NAME = 'restaurants-os-images-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== IMAGE_CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (High-Performance Caching & Low Internet Resilience)
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
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (e) {
          return new Response('', { status: 408, statusText: 'Image Request Failed' });
        }
      })
    );
    return;
  }

  // Handle Local Application Assets & Bundles
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const isAsset = url.pathname.startsWith('/assets/');
        
        try {
          if (isAsset) {
            const cachedAsset = await caches.match(event.request);
            if (cachedAsset) return cachedAsset;
          }

          const networkResponse = await fetch(event.request);
          // Only cache successful 200 OK responses (don't cache 404 HTML fallback responses!)
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        } catch (err) {
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
