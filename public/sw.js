// Custom service worker for Background Sync API
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-meter-readings') {
    event.waitUntil(
      (async () => {
        // Post a message to all clients to trigger sync in the app
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_METER_READINGS' });
        }
      })()
    );
  }
});

// You can extend this to do direct IndexedDB sync in the service worker if needed. 