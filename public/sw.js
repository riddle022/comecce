const CACHE_NAME = 'comecce-v2';
const urlsToCache = [
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Pula a espera para ativar o novo SW imediatamente
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  // Toma controle de todas as abas imediatamente
  event.waitUntil(clients.claim());

  // Limpa caches antigos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Estratégia NetworkFirst para HTML (navegação)
  // Garante que o usuário sempre receba a versão mais recente do index.html
  // evitando referência a arquivos JS/CSS antigos (erro 404)
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Estratégia StaleWhileRevalidate para outros recursos (JS, CSS, Imagens)
  // Tenta servir do cache, mas atualiza em segundo plano
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Apenas cacheia respostas válidas e do mesmo domínio (ou CDNs confiáveis se necessário)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });

        // Retorna o cache se existir, senão aguarda o fetch
        return cachedResponse || fetchPromise;
      })
  );
});
