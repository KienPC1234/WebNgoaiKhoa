import { getApp, getApps, initializeApp } from 'firebase/app'

export const FCM_DEBUG = String(import.meta.env.VITE_DEBUG_FCM || 'false').toLowerCase() === 'true'
export const FCM_DEBUG_PREFIX = '[FCM_DEBUG]'

const fcmLog = (...args) => {
  if (!FCM_DEBUG) return
  console.log(FCM_DEBUG_PREFIX, ...args)
}

const fcmWarn = (...args) => {
  if (!FCM_DEBUG) return
  console.warn(FCM_DEBUG_PREFIX, ...args)
}

const fcmError = (...args) => {
  if (!FCM_DEBUG) return
  console.error(FCM_DEBUG_PREFIX, ...args)
}

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
}

const hasBaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
)

fcmLog('Firebase config check', {
  hasBaseConfig,
  hasApiKey: Boolean(firebaseConfig.apiKey),
  hasProjectId: Boolean(firebaseConfig.projectId),
  hasSenderId: Boolean(firebaseConfig.messagingSenderId),
  hasAppId: Boolean(firebaseConfig.appId),
  hasMeasurementId: Boolean(firebaseConfig.measurementId),
})

export const isFirebaseConfigured = () => hasBaseConfig

export const firebaseApp = hasBaseConfig
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

if (firebaseApp) {
  fcmLog('Firebase app initialized')
} else {
  fcmWarn('Firebase app is not initialized due to missing base config')
}

export const setupFirebaseAnalytics = async () => {
  if (!firebaseApp || !firebaseConfig.measurementId) {
    fcmWarn('Skip analytics setup', {
      hasFirebaseApp: Boolean(firebaseApp),
      hasMeasurementId: Boolean(firebaseConfig.measurementId),
    })
    return null
  }

  try {
    const { getAnalytics, isSupported: isAnalyticsSupported } = await import('firebase/analytics')
    const supported = await isAnalyticsSupported()
    fcmLog('Analytics support check', { supported })
    if (!supported) return null
    return getAnalytics(firebaseApp)
  } catch (error) {
    fcmError('Analytics initialization failed', error)
    return null
  }
}

export const getFirebaseMessaging = async () => {
  if (!firebaseApp) {
    fcmWarn('Skip messaging initialization: firebaseApp not ready')
    return null
  }

  try {
    const { getMessaging, isSupported: isMessagingSupported } = await import('firebase/messaging')
    const supported = await isMessagingSupported()
    fcmLog('Messaging support check', { supported })
    if (!supported) return null
    return getMessaging(firebaseApp)
  } catch (error) {
    fcmError('Messaging initialization failed', error)
    return null
  }
}

