const CACHE_NAME = "alpalist-hoa-v3";
const STATIC_CACHE = "alpalist-static-v3";
const DYNAMIC_CACHE = "alpalist-dynamic-v3";
const API_CACHE = "alpalist-api-v3";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/login-avatar.png",
  "/login-avatar-circle.png",
];

const isLocalhost = Boolean(
  self.location.hostname === "localhost" ||
  self.location.hostname === "[::1]" ||
  self.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Cache strategies
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const network = await fetch(request);
  if (network.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, network.clone());
  }
  return network;
}

async function networkFirst(request) {
  try {
    const network = await fetch(request);
    if (network.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, network.clone());
    }
    return network;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error("Network unavailable and no cached data");
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkPromise = fetch(request).then((network) => {
    if (network.ok) {
      const cache = caches.open(DYNAMIC_CACHE);
      cache.then((c) => c.put(request, network.clone()));
    }
    return network;
  });
  return cached || networkPromise;
}

self.addEventListener("install", (event) => {
  if (isLocalhost) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (
            key !== STATIC_CACHE &&
            key !== DYNAMIC_CACHE &&
            key !== API_CACHE &&
            key !== CACHE_NAME
          ) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (isLocalhost || event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip Supabase calls and dev server sockets
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  // API routes - network first with cache fallback
  if (url.pathname.startsWith("/api")) {
    event.respondWith(networkFirst(event.request).catch(() => {
      return new Response(JSON.stringify({ error: "Offline - API unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }));
    return;
  }

  // Next.js internal chunks - cache first
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/__next")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Static assets - cache first
  if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Navigation requests - network first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      networkFirst(event.request).catch(async () => {
        const cached = await caches.match("/");
        if (cached) return cached;
        return new Response("Offline - No cached version available", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" },
        });
      })
    );
    return;
  }

  // Other requests - stale while revalidate
  event.respondWith(staleWhileRevalidate(event.request));
});