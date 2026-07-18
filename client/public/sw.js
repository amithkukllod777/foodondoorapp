// Foodondoor Service Worker — vanilla, no Workbox
const CACHE_VERSION = 'nutriwow-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static asset extensions to cache-first
const STATIC_EXT = /\.(js|css|png|jpg|jpeg|webp|avif|svg|ico|woff2?|ttf|eot)$/;

// Install: pre-cache the offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Cache a minimal offline page
      return cache.put(
        '/_offline',
        new Response(
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Foodondoor — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Poppins',sans-serif;background:#FAF9F6;display:flex;
         align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{text-align:center;max-width:380px;background:#fff;border-radius:24px;
          padding:48px 32px;box-shadow:6px 6px 12px rgba(0,0,0,.08),-4px -4px 10px rgba(255,255,255,.9)}
    .icon{font-size:56px;margin-bottom:16px}
    h1{font-family:'Baloo 2',cursive;color:#16a34a;font-size:24px;margin-bottom:8px}
    p{color:#555;font-size:15px;line-height:1.5;margin-bottom:20px}
    button{background:#16a34a;color:#fff;border:none;border-radius:12px;
           padding:12px 28px;font-size:15px;font-weight:600;cursor:pointer}
    button:active{transform:translateY(2px)}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. Please check your network and try again.</p>
    <button onclick="location.reload()">Retry</button>
  </div>
</body>
</html>`,
          { headers: { 'Content-Type': 'text/html' } }
        )
      );
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('nutriwow-') && !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // tRPC / API calls → network-first, fallback to cache
  if (url.pathname.startsWith('/trpc/') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets → cache-first
  if (STATIC_EXT.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation requests → network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/_offline'))
    );
    return;
  }
});
