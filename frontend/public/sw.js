const SW_VERSION = 'v2'
const log = (...args) => console.log('%c[SW]', 'color:#3b82f6;font-weight:bold', ...args)

// --- Lifecycle ---
self.addEventListener('install', (event) => {
  log(`installed (${SW_VERSION})`)
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  log(`activated (${SW_VERSION})`)
  event.waitUntil(self.clients.claim())
})

// --- Message handler (main page can query SW status) ---
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SW_STATUS') {
    event.ports?.[0]?.postMessage({
      type: 'SW_STATUS',
      version: SW_VERSION,
      state: 'active',
      timestamp: Date.now(),
    })
  }
})

// --- Push ---
self.addEventListener('push', (event) => {
  log('push received', { hasData: !!event.data })

  let data = { title: 'Thông báo mới', body: '', url: '/' }
  try {
    if (event.data) {
      const payload = event.data.json()
      data.title = payload.title || data.title
      data.body = payload.body || data.body
      data.url = payload.url || data.url
    }
  } catch (e) {
    data.body = event.data?.text() || ''
  }

  const options = {
    body: data.body,
    icon: '/favicon-96x96.png',
    badge: '/favicon-96x96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url, timestamp: Date.now() },
    tag: 'webpush-notification',
    renotify: true,
  }

  log('showNotification', { title: data.title, url: data.url })

  event.waitUntil(
    self.registration.showNotification(data.title, options).catch((error) => {
      console.error('[SW] showNotification failed', error)
    })
  )
})

// --- Notification click ---
self.addEventListener('notificationclick', (event) => {
  log('notificationclick', event.notification.data)
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})

self.addEventListener('notificationclose', (event) => {
  log('notification dismissed')
})
