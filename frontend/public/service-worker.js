/* service-worker.js
 * EMERGING TECHNOLOGY - Progressive Web App (PWA)
 * A service worker is a script the browser runs in the background, separate from the page.
 * It sits between the app and the network so the site can:
 *   1. load the app shell (HTML, JS, CSS, icons) when there is no connection, and
 *   2. show the last downloaded donations, token balance and claim codes while offline.
 */
const SHELL_CACHE = 'harvest-shell-v1';  // static files of the app
const API_CACHE = 'harvest-api-v1';      // last good copies of API GET responses
// Note: '/' is cached instead of '/index.html' because the server redirects /index.html to /,
// and browsers refuse a redirected response for a page navigation (bug found in testing).
const SHELL_FILES = ['/', '/manifest.json', '/logo192.png', '/logo512.png'];

// INSTALL: download and store the app shell the first time the worker is installed
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES)));
  self.skipWaiting();                    // activate the new worker immediately
});

// ACTIVATE: delete caches from older versions of this worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![SHELL_CACHE, API_CACHE].includes(k)).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();                  // start controlling open pages straight away
});

// FETCH: decide how every request made by the page is answered
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only GET requests can be cached; never touch WebSocket / Socket.IO traffic
  if (request.method !== 'GET' || url.pathname.startsWith('/socket.io')) return;

  if (url.pathname.startsWith('/api/')) {
    // API data: NETWORK FIRST - always try for fresh data, fall back to the cached copy
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (request.mode === 'navigate') {
    // Page navigation: try network, otherwise serve the cached app shell ('/') - single page app
    event.respondWith(fetch(request).catch(() => caches.match('/')));
  } else {
    // Static files (JS, CSS, images): CACHE FIRST, then update the cache from the network
    event.respondWith(
      caches.match(request).then(cached => cached || networkFirst(request, SHELL_CACHE))
    );
  }
});

// Fetch from the network and save a copy; if the network fails return the saved copy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'You are offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}
