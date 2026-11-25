// Flight Deck Tools — offline cache.
// Bump VERSION whenever any file changes so devices pick up the update.
const VERSION = 'fdt-v7.09';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './img/rvsm.jpg',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js',
  './lib/tess/tesseract.min.js',
  './lib/tess/worker.min.js',
  './lib/tess/tesseract-core-simd-lstm.wasm.js',
  './lib/tess/tesseract-core-lstm.wasm.js',
  './lib/tess/eng.traineddata.gz'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Pages: network first when online (so updates arrive), cache only when offline.
// Everything else: cache first.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    // Offline (airplane mode): open straight from the cache without touching the network,
    // otherwise iOS shows "Turn off Airplane Mode or use Wi-Fi to access data".
    if (self.navigator && self.navigator.onLine === false) {
      e.respondWith(caches.match('./index.html').then(hit => hit || fetch(req)));
      return;
    }
    e.respondWith(
      fetch(new Request(req.url, {cache: 'no-store'}))
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

// "Update app" button: let a waiting version take over straight away
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
