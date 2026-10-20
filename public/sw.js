// BolaComVisão Service Worker - High-Performance Mobile & Offline PWA
const CACHE_NAME = 'bolacomvisao-cache-v4';
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.jpg',
  '/favicon.ico',
  '/assets/images/bolacomvisao_logo_1786622535530.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        // Cache assets gracefully one by one to avoid total failure if one fails
        await Promise.allSettled(
          PRE_CACHE_ASSETS.map((asset) =>
            fetch(asset, { cache: 'no-cache' })
              .then((resp) => {
                if (resp && resp.status === 200) {
                  return cache.put(asset, resp);
                }
              })
              .catch(() => {})
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('🧹 Clearing legacy service worker cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Do not intercept external API endpoints (Firebase, Google Auth, Google Identity Toolkit)
  if (
    url.origin !== self.location.origin &&
    (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('gstatic.com'))
  ) {
    return;
  }

  // Never cache development server internals
  if (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v')
  ) {
    return;
  }

  // API calls: Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true, message: 'Modo Offline ativo' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // HTML / Navigation requests: Network first with Cache fallback for true offline loading
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/index.html');
          if (rootCached) return rootCached;
          return caches.match('/');
        })
    );
    return;
  }

  // Static Assets, scripts, styles, images: Network First with Cache fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) {
          return cached;
        }
        // If image request and not found, fallback to logo
        if (request.destination === 'image') {
          const logo = await caches.match('/logo.jpg');
          if (logo) return logo;
        }
        // Let normal browser network error bubble without poisoning script responses
        return Promise.reject(new Error('Network offline'));
      })
  );
});
