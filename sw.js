// Armator.PRO Service Worker
// WAŻNE: zmień CACHE_VERSION przy każdym deploymencie
const CACHE_VERSION = 'v6';
const CACHE_NAME = `armator-${CACHE_VERSION}`;

const ASSETS = [
  '/app.html',
  '/manifest.json',
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => console.log('Cache partial:', err));
    })
  );
  // Aktywuj natychmiast bez czekania na zamknięcie starych kart
  self.skipWaiting();
});

// Activate - usuń WSZYSTKIE stare cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch - Network First (zawsze próbuj sieć, cache jako fallback)
// To zapewnia że użytkownik zawsze dostaje najnowszą wersję
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Dla plików aplikacji: network first
  if (event.request.url.includes('/app.html') || 
      event.request.url.includes('/manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Dla reszty: cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('/app.html');
      });
    })
  );
});
