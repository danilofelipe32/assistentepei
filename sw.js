
// sw.js
const CACHE_NAME = 'assistente-pei-pwa-cache-v14'; // Incremented cache version
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  // App source files
  './index.tsx', // Main consolidated file
  // External dependencies
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1',
  'https://aistudiocdn.com/zustand@^4.5.4',
  // RAG File Processing Libraries for offline support
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.0/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js'
];

// Instala o service worker e armazena os ativos essenciais no cache.
self.addEventListener('install', event => {
  console.log('A tentar instalar o service worker e armazenar os ativos essenciais...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto. A adicionar todos os URLs essenciais ao cache.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Todos os ativos essenciais foram armazenados no cache com sucesso. A ativar o service worker.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Falha ao armazenar ativos essenciais no cache. A instalação do Service Worker falhou.', error);
      })
  );
});

// Intercepta as requisições de rede.
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(response) {
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
    );
});

// Ativa o service worker e limpa caches antigos.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('A deletar cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
