// Erhöhe die Versionsnummer, wenn du Dateien änderst, damit alle Geräte die neue Fassung laden.
const V = 'bj-v2';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon.svg'];

self.addEventListener('install', e => {
  // Jede Datei einzeln: fehlt ein Icon, wird trotzdem installiert
  e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // Seite: Netzwerk (max. 4 s), sonst Cache
  if (r.mode === 'navigate') {
    e.respondWith(
      new Promise(resolve => {
        const t = setTimeout(() => caches.match('index.html').then(h => h && resolve(h)), 4000);
        fetch(r).then(res => {
          clearTimeout(t);
          if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); }
          resolve(res);
        }).catch(() => { clearTimeout(t); caches.match('index.html').then(h => resolve(h || Response.error())); });
      })
    );
    return;
  }
  // Schriften und eigene Dateien: Cache zuerst, im Hintergrund erneuern
  if (u.origin === location.origin || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(r).then(hit => {
        const net = fetch(r).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});

// Tipp auf eine Benachrichtigung öffnet die App
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
