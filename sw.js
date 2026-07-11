// Ninety-Nine service worker — offline support + faster loads
const CACHE = 'ninety-nine-v1';
const SHELL = ['./', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Never cache API calls (Scryfall, Anthropic, Supabase) — always live
  if (/scryfall\.com|anthropic\.com|supabase\.co/.test(url.hostname)) {
    return; // let it hit the network normally
  }
  // App shell: cache-first, fall back to network, update cache in background
  if (e.request.method === 'GET' && url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const live = fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || live;
      })
    );
  }
});
