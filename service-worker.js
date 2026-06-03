const CACHE_NAME = 'zoomclean-pro-v1';
const ASSETS_TO_CACHE = [
  '/pos.html',
  '/inventory.html',
  '/debt.html',
  '/finance.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/10.7.1/firebase-app.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/firebase/10.7.1/firebase-database.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {
      // Some external resources might fail, continue anyway
      console.log('Some assets failed to cache');
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version but also fetch fresh version in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed, return offline page if it's an HTML request
        if (event.request.mode === 'navigate') {
          return caches.match('/pos.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_DATA' });
        });
      })
    );
  }
});

// Push notifications (optional)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'ZOOM CLEAN Pro', {
      body: data.body || 'إشعار جديد',
      icon: data.icon || '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: data.tag || 'default',
      dir: 'rtl',
      lang: 'ar'
    })
  );
});
