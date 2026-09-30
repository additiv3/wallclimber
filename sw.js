/* Wall Climber – Service Worker: offline spielbar, online immer die neueste Version.
   Vorlage: das Vite-Plugin in vite.config.ts setzt Cache-Name und Vorab-Liste ein und schreibt dist/sw.js. */
const CACHE = 'wallclimber-c654260';
const PRECACHE = ["./","./index.html","./manifest.webmanifest","./icons/icon-180.png","./icons/icon-192.png","./icons/icon-512-maskable.png","./icons/icon-512.png","./assets/index-b6U3NRcJ.css","./assets/index-z_R8_bxq.js"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('wallclimber-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Netz zuerst (hoechstens 4 s warten, dann Speicher): eine neue Version ist sofort da,
   im Funkloch startet das Spiel trotzdem aus dem Speicher. */
function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'));
    const timer = setTimeout(() => {
      fromCache().then((hit) => { if (hit && !done) { done = true; resolve(hit); } });
    }, 4000);
    // Neue Anfrage nur aus der URL: Seitenaufrufe (mode 'navigate') lassen sich in aelterem Safari nicht mit Optionen kopieren
    fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then((hit) => { if (!done) { done = true; resolve(hit || Response.error()); } });
    });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Google Fonts o. ae.: normaler Browser-Cache
  if (url.pathname.endsWith('/version.json')) return;         // Update-Pruefung: immer frisch aus dem Netz
  e.respondWith(networkFirst(req));
});
