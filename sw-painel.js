// Cache de apoio do painel/Modo Mesa: abre mesmo se a internet cair depois da primeira visita.
// Rede primeiro (sempre pega a versão nova); cai pro cache só se estiver offline.
// Chamadas do Apps Script nunca são cacheadas.
const CACHE_PAINEL = 'painel-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('script.google.com') || u.hostname.endsWith('googleusercontent.com')) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(CACHE_PAINEL).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => caches.match(r))
  );
});
