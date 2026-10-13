const CACHE_NAME = "rondapp-pwa-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/apple-touch-icon.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("rondapp-pwa-") && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const isVersionedExpoAsset = url.pathname.startsWith("/_expo/static/");
  const isPwaAsset = PRECACHE_URLS.includes(url.pathname);
  if (!isVersionedExpoAsset && !isPwaAsset) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "Tienes una novedad en Rondapp." };
  }

  const title = typeof payload.title === "string" ? payload.title : "Rondapp";
  const body = typeof payload.body === "string"
    ? payload.body
    : "Tienes una novedad en Rondapp.";
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      tag: typeof payload.tag === "string" ? payload.tag : "rondapp",
      renotify: true,
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const requestedPath = typeof event.notification.data?.url === "string"
    ? event.notification.data.url
    : "/home";
  let targetUrl = new URL("/home", self.location.origin);
  try {
    const candidate = new URL(requestedPath, self.location.origin);
    if (candidate.origin === self.location.origin) targetUrl = candidate;
  } catch {
    // Keep the safe home destination for malformed notification data.
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windowClients) => {
        const existingClient = windowClients[0];
        if (existingClient) {
          if ("navigate" in existingClient) {
            await existingClient.navigate(targetUrl.href);
          }
          return existingClient.focus();
        }
        return self.clients.openWindow(targetUrl.href);
      }),
  );
});
