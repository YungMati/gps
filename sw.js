// Zmiana wersji oddziela powłokę instalowaną w tle od otwartej aplikacji.
const PREFIX = 'rallynav-shell-';
const CACHE = PREFIX + 'v9';
const FILES = [
  './index.html', './assets/rallynav.css', './assets/navigation.js', './assets/app.js',
  './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png',
  './vendor/leaflet/leaflet.js', './vendor/leaflet/leaflet.css',
  ...['layers.png','layers-2x.png','marker-icon.png','marker-icon-2x.png','marker-shadow.png']
    .map(name => './vendor/leaflet/images/' + name)
];
const urls = new Set(FILES.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll([...urls].map(url => new Request(url, {cache:'reload'})))
  ));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== CACHE && (key.startsWith(PREFIX) || key.startsWith('rallynav-tiles-w'))) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  url.search = '';
  const home = new URL('./index.html',self.registration.scope).href;
  const key = req.mode === 'navigate' && url.href === self.registration.scope ? home : url.href;
  if (!urls.has(key)) return;
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(key)) || fetch(req)));
});
