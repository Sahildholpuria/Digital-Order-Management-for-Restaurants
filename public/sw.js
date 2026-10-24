/**
 * Restaurants OS Service Worker
 * Optimized for Ultra-Fast Loading on Slow 2G/3G Cellular & Offline Networks.
 */

const CACHE_NAME = 'restaurants-os-v8';
const STATIC_ASSETS_CACHE = 'restaurants-os-static-v8';
const IMAGE_CACHE_NAME = 'restaurants-os-images-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
];

// Install Event: Precache core shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_ASSETS_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache notice:', err);
      });
    })
  );
});

// Activate Event: Clear outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![CACHE_NAME, STATIC_ASSETS_CACHE, IMAGE_CACHE_NAME].includes(key)) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper: Fetch with timeout for slow networks
const fetchWithTimeout = (request, timeoutMs = 3000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Static Fonts (Google Fonts, Gstatic)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(STATIC_ASSETS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const res = await fetch(event.request);
          if (res && res.status === 200) {
            cache.put(event.request, res.clone());
          }
          return res;
        } catch (_) {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 2. Images & Food Photos (Unsplash, Supabase Storage, Cloudinary, Local Assets)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i) ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('cloudinary.com')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          // Return cached image immediately, refresh in background if online
          fetch(event.request)
            .then((fresh) => {
              if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(event.request, fresh.clone());
            })
            .catch(() => {});
          return cached;
        }

        try {
          const networkRes = await fetch(event.request);
          if (networkRes && (networkRes.ok || networkRes.type === 'opaque')) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        } catch (_) {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 3. App Navigation (HTML shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Attempt network with 2.5s timeout for slow cellular connections
          const networkRes = await fetchWithTimeout(event.request, 2500);
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(STATIC_ASSETS_CACHE).then((cache) => cache.put(event.request, clone));
            return networkRes;
          }
        } catch (_) {}

        // Fast fallback to cached index.html
        const cached = (await caches.match(event.request)) || (await caches.match('/index.html'));
        if (cached) return cached;

        return new Response('Offline - Connect to internet', { status: 503 });
      })()
    );
    return;
  }

  // 4. JS & CSS Bundles (Stale-While-Revalidate with fast fallback)
  if (url.origin === self.location.origin && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              cache.put(event.request, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }
});
