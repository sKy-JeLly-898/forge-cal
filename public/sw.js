// Optional no-op service worker to avoid /sw.js 404 from aggressive browser probes.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
