const CACHE = 'random-date-v3';
const BASE = self.location.pathname.replace(/sw\.js$/, '');
const ASSETS = [BASE, BASE + 'index.html', BASE + 'css/style.css', BASE + 'js/app.js', BASE + 'manifest.json', BASE + 'icons/icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
