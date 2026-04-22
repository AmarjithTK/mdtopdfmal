const CACHE_NAME = 'mdtopdfmal-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './tailwind-config.js',
  './manifest.json',
  './favicon.ico',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        const responseClone = response.clone();

        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }

        return response;
      });
    })
  );
});
