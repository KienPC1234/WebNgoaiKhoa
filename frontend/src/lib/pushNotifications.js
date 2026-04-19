import { getToken, onMessage } from 'firebase/messaging'
import { apiClient } from '@/lib/apiClient'
import { toastInfo } from '@/lib/notify'
import { FCM_DEBUG, FCM_DEBUG_PREFIX, getFirebaseMessaging, isFirebaseConfigured } from '@/lib/firebase.js'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
const SW_PATH = '/firebase-messaging-sw.js'
const TOKEN_CACHE_KEY = 'fcm_token_cached'
export const PUSH_PROMPT_DECISION_KEY = 'push_permission_prompt_decision'
const PUSH_PROMPT_DENIED = 'denied'
let isOnMessageBound = false

const log = (...args) => {
  if (!FCM_DEBUG) return
  console.log(FCM_DEBUG_PREFIX, ...args)
}

const warn = (...args) => {
  if (!FCM_DEBUG) return
  console.warn(FCM_DEBUG_PREFIX, ...args)
}

const errorLog = (...args) => {
  if (!FCM_DEBUG) return
  console.error(FCM_DEBUG_PREFIX, ...args)
}

const maskToken = (token) => {
  if (!token) return '<empty>'
  if (token.length <= 14) return token
  return `${token.slice(0, 7)}...${token.slice(-7)}`
}

const shouldInitPush = () => {
  const token = localStorage.getItem('token')
  const configured = isFirebaseConfigured()
  const shouldInit = Boolean(token) && configured

  log('shouldInitPush()', {
    hasAuthToken: Boolean(token),
    firebaseConfigured: configured,
    shouldInit,
  })

  return shouldInit
}

const readPromptDecision = () => localStorage.getItem(PUSH_PROMPT_DECISION_KEY)

export const rememberPushPromptDenied = () => {
  localStorage.setItem(PUSH_PROMPT_DECISION_KEY, PUSH_PROMPT_DENIED)
}

export const clearPushPromptDecision = () => {
  localStorage.removeItem(PUSH_PROMPT_DECISION_KEY)
}

export const shouldShowPushPermissionPrompt = () => {
  if (!shouldInitPush()) return false
  if (!('Notification' in window)) return false

  if (Notification.permission === 'granted') return false
  if (Notification.permission === 'denied') {
    rememberPushPromptDenied()
    return false
  }

  return readPromptDecision() !== PUSH_PROMPT_DENIED
}

export const initWebPush = async ({ requestPermission = false } = {}) => {
  log('initWebPush() start')

  if (!shouldInitPush()) {
    warn('Skip webpush init due to unmet prerequisites')
    return null
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    warn('Browser does not support Notification or serviceWorker')
    return null
  }

  const messaging = await getFirebaseMessaging()
  if (!messaging) {
    warn('No Firebase messaging instance available')
    return null
  }

  if (!VAPID_KEY) {
    warn('Missing VITE_FIREBASE_VAPID_KEY, skip FCM token registration')
    return null
  }

  log('VAPID key present')

  let permission = Notification.permission

  if (permission !== 'granted') {
    if (permission === 'denied') {
      rememberPushPromptDenied()
      warn('Notification permission is denied by browser settings')
      return null
    }

    if (!requestPermission) {
      warn('Skip Notification.requestPermission because request is not user initiated')
      return null
    }

    permission = await Notification.requestPermission()
  }

  log('Notification permission result', { permission })

  if (permission !== 'granted') {
    rememberPushPromptDenied()
    warn('Notification permission denied or dismissed')
    toastInfo('Notifications permission has been blocked as the user has ignored the permission prompt several times. This can be reset in Page Info which can be accessed by clicking the tune icon next to the URL.')
    return null
  }

  clearPushPromptDecision()

  let swRegistration
  try {
    swRegistration = await navigator.serviceWorker.register(SW_PATH)
    log('Service worker registered', {
      scope: swRegistration.scope,
      activeState: swRegistration.active?.state || null,
    })
  } catch (error) {
    errorLog('Service worker registration failed', error)
    return null
  }

  let nextToken
  try {
    nextToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })
  } catch (error) {
    errorLog('getToken() failed', error)
    return null
  }

  log('getToken() result', { token: maskToken(nextToken) })

  if (!nextToken) {
    warn('No FCM token returned')
    return null
  }

  const cachedToken = localStorage.getItem(TOKEN_CACHE_KEY)
  log('Token cache compare', {
    cachedToken: maskToken(cachedToken),
    nextToken: maskToken(nextToken),
    isDifferent: cachedToken !== nextToken,
  })

  if (cachedToken !== nextToken) {
    try {
      await apiClient.post('/auth/push/register', { token: nextToken })
      localStorage.setItem(TOKEN_CACHE_KEY, nextToken)
      log('Push token registered to backend successfully')
    } catch (error) {
      errorLog('Backend push register failed', error)
      throw error
    }
  } else {
    log('FCM token unchanged, skip backend register')
  }

  if (!isOnMessageBound) {
    onMessage(messaging, (payload) => {
      log('Foreground push payload', payload)
      const title = payload?.notification?.title || 'Thông báo mới'
      const message = payload?.notification?.body || 'Bạn có một cập nhật mới từ hệ thống.'
      toastInfo(`${title}: ${message}`)
    })
    isOnMessageBound = true
    log('Foreground onMessage handler attached')
  }

  log('initWebPush() completed')
  return nextToken
}

export const unregisterWebPushToken = async () => {
  const token = localStorage.getItem(TOKEN_CACHE_KEY)
  if (!token) {
    warn('No cached token to unregister')
    return
  }

  try {
    await apiClient.post('/auth/push/unregister', { token })
    log('Push token unregistered from backend', { token: maskToken(token) })
  } catch (error) {
    errorLog('Push token unregister failed', error)
    throw error
  } finally {
    localStorage.removeItem(TOKEN_CACHE_KEY)
    log('Local cached FCM token cleared')
  }
}
