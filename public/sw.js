// M.ROBOT Service Worker — SELF-UNREGISTER version
// This version intentionally UNREGISTERS itself and clears all caches
// to fix the issue where users couldn't see updates due to cached old content.

const CACHE_NAME = "mrobot-v1";

// Listen for install — clear all caches immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.keys().then((names) => 
      Promise.all(names.map((n) => caches.delete(n)))
    ).then(() => self.skipWaiting())
  );
});

// Listen for activate — claim all clients and unregister
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clear all caches
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      
      // Unregister this service worker
      const registrations = await self.registration.scope;
      await self.registration.unregister();
      
      // Take control of all clients
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

// Pass-through fetch — NO caching
self.addEventListener("fetch", (event) => {
  // Just pass through to the network, never cache
  event.respondWith(fetch(event.request));
});

// Handle notification clicks (keep this for any existing notifications)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
