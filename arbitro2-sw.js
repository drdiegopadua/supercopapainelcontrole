// Service worker mínimo — só existe pra permitir "Instalar app" no
// navegador. Não faz cache agressivo (a súmula precisa sempre de
// dados ao vivo, nunca de uma versão salva).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', () => {});
