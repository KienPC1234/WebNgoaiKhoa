/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

const SW_DEBUG_PREFIX = '[FCM_SW_DEBUG]'
const swLog = (...args) => console.log(SW_DEBUG_PREFIX, ...args)
const swError = (...args) => console.error(SW_DEBUG_PREFIX, ...args)

firebase.initializeApp({
  apiKey: 'AIzaSyDHf9BHLtYfj5AC7w_Tqh2jyHuOagqAFkQ',
  authDomain: 'ngoaikhoa.fptoj.com',
  projectId: 'water-wise-7b004',
  storageBucket: 'water-wise-7b004.firebasestorage.app',
  messagingSenderId: '398930919341',
  appId: '1:398930919341:web:7c08b1647155829e836b24',
  measurementId: 'G-LPKK3C02LY',
})

swLog('Firebase messaging service worker initialized')

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  swLog('onBackgroundMessage payload', payload)
  const title = payload?.notification?.title || 'Thông báo mới'
  const options = {
    body: payload?.notification?.body || 'Bạn có một cập nhật mới từ hệ thống.',
    icon: '/favicon-96x96.png',
    data: {
      link: payload?.fcmOptions?.link || '/',
    },
  }

  self.registration.showNotification(title, options).catch((error) => {
    swError('showNotification failed', error)
  })
})

self.addEventListener('notificationclick', (event) => {
  swLog('notificationclick', event?.notification?.data)
  event.notification.close()
  const target = event?.notification?.data?.link || '/'
  event.waitUntil(clients.openWindow(target))
})

self.addEventListener('install', () => {
  swLog('service worker install event')
})

self.addEventListener('activate', () => {
  swLog('service worker activate event')
})
