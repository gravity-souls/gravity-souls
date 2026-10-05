/* Notification-only worker: no fetch interception, page cache or offline account data. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let id, locale;
    try { const payload = event.data.json(); id = payload.deliveryId; locale = payload.locale; } catch { return; }
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return;
    // Revalidate current login, session binding, unread and access before disclosure.
    // Push must be visible on Safari. Failures show a generic, non-private notice.
    const response = await fetch(`/api/push/display?id=${encodeURIComponent(id)}`, { credentials: 'same-origin', cache: 'no-store' }).catch(() => null);
    const generic = { en: 'You have an update.', fr: 'Vous avez une notification.', zh: '你有一条新通知。' };
    let value = { body: generic[locale] || generic.en, url: '/messages', tag: id };
    if (response && response.ok) { try { value = await response.json(); } catch { /* Display a generic visible notification. */ } }
    const url = typeof value.url === 'string' && /^\/messages\/[a-zA-Z0-9_-]{1,128}$/.test(value.url) ? value.url : '/messages';
    await self.registration.showNotification('Gravity Souls', { body: typeof value.body === 'string' ? value.body.slice(0, 240) : '', tag: typeof value.tag === 'string' ? value.tag : id, renotify: false, icon: '/gravity-souls-icon.svg', data: { url } });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data && event.notification.data.url;
  const url = new URL(typeof path === 'string' && /^\/messages\/[a-zA-Z0-9_-]{1,128}$/.test(path) ? path : '/messages', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'navigate' in client) { await client.navigate(url); await client.focus(); return; }
    }
    await self.clients.openWindow(url);
  })());
});
