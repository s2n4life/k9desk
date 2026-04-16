/// <reference lib="webworker" />
export default null;
declare let self: ServiceWorkerGlobalScope;

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'K9Desk Alert';
  const message = data.body || 'You have a new update!';
  const url = data.url || '/dashboard';
  
  const options = {
    body: message,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url },
    vibrate: [200, 100, 200],
    requireInteraction: true // Keep notification on screen until user interacts
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
