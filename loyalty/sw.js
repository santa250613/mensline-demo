const CACHE = "ml-diamond-v7";
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["/loyalty/", "/loyalty/admin.html", "/loyalty/logo_diamante.png"])));
  self.skipWaiting();
});
self.addEventListener("activate", e => e.waitUntil(clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
// Push (fase 2 — listo para cuando el Worker tenga VAPID)
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = { title: "MensLine", body: "Nuevo sello 💎" }; }
  const opts = { body: d.body || "", icon: "/logo_diamante.png", badge: "/logo_diamante.png",
                 vibrate: [120, 60, 120], tag: "ml-loyalty" };
  e.waitUntil(self.registration.showNotification(d.title || "MensLine Diamond Club", opts));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(list =>
    list.length ? list[0].focus() : clients.openWindow("/")));
});