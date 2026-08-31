// Minimal service worker: exists only to satisfy PWA installability
// criteria (Android's "Add to Home Screen" prompt requires a registered
// service worker with a fetch handler). This app is data-heavy and
// server-rendered, so it deliberately does NOT cache pages or API
// responses — every request just passes straight through to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: let the browser handle the request normally.
});
