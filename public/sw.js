// Minimal service worker so Chromium browsers offer "Install app" (#345). Current Chrome installs on the manifest
// alone; the fetch listener is for older Chromium, Samsung Internet and Brave. It never calls respondWith and caches
// nothing (offline is Phase 8), so Chrome may warn about a no-op fetch handler: intended. To remove the worker later,
// ship a self-unregistering sw.js instead of deleting this file (docs/native.md).

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
