import { apiClient } from '@/lib/apiClient'
import { toastInfo } from '@/lib/notify'

let VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''
const SW_PATH = '/sw.js?v=20260506'
const SUB_CACHE_KEY = 'webpush_endpoint'
const PUSH_PROMPT_DECISION_KEY = 'push_permission_prompt_decision'
const PUSH_PROMPT_DENIED = 'denied'

// Always log — important for debugging production issues
const TAG = '%c[PUSH]'
const STYLE = 'color:#f97316;font-weight:bold'
const ERR_STYLE = 'color:#ef4444;font-weight:bold'
const OK_STYLE = 'color:#22c55e;font-weight:bold'

const log = (...args) => console.log(TAG, STYLE, ...args)
const warn = (...args) => console.warn(TAG, STYLE, ...args)
const errorLog = (...args) => console.error(TAG, ERR_STYLE, ...args)
const okLog = (...args) => console.log(TAG, OK_STYLE, ...args)

/**
 * Convert a base64url string to a Uint8Array (for applicationServerKey).
 */
function urlBase64ToUint8Array(base64String) {
  if (!base64String) {
    errorLog('urlBase64ToUint8Array: base64String is empty')
    return null
  }
  try {
    log('Decoding VAPID Key:', base64String.substring(0, 20) + '...')
    // Trim and sanitize
    const cleaned = base64String.trim().replace(/['"]/g, '').replace(/\s/g, '')
    const padding = '='.repeat((4 - (cleaned.length % 4)) % 4)
    const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    log('Decoded length:', outputArray.length, 'First byte:', outputArray[0])
    return outputArray
  } catch (err) {
    errorLog('urlBase64ToUint8Array failed', err)
    return null
  }
}

async function fetchVapidKey() {
  try {
    const res = await apiClient.get('/public/push/vapid')
    const key = res.data?.vapid_key
    if (key) {
      VAPID_PUBLIC_KEY = key
      return key
    }
  } catch (err) {
    warn('Failed to fetch VAPID key from backend, using env fallback', err)
  }
  return VAPID_PUBLIC_KEY
}

// ---------------------------------------------------------------------------
// Service Worker status — query SW via MessageChannel
// ---------------------------------------------------------------------------
export const getSwStatus = () => {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve({ state: 'unsupported' })
      return
    }

    navigator.serviceWorker.ready.then((reg) => {
      if (!reg.active) {
        resolve({ state: 'no-active-worker' })
        return
      }

      const channel = new MessageChannel()
      const timeout = setTimeout(() => resolve({ state: 'timeout' }), 3000)

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout)
        resolve(event.data)
      }

      reg.active.postMessage({ type: 'SW_STATUS' }, [channel.port2])
    }).catch(() => {
      resolve({ state: 'not-registered' })
    })
  })
}

export const logSwStatus = async () => {
  const swStatus = await getSwStatus()
  const permission = 'Notification' in window ? Notification.permission : 'n/a'
  const cached = localStorage.getItem(SUB_CACHE_KEY)

  let swReg = null
  let subscription = null
  try {
    swReg = await navigator.serviceWorker.getRegistration(SW_PATH)
    if (swReg) subscription = await swReg.pushManager.getSubscription()
  } catch { /* ignore */ }

  console.log('%c[PUSH] Service Worker Status', 'color:#3b82f6;font-weight:bold;font-size:13px')
  console.table({
    'SW State': swStatus.state || 'unknown',
    'SW Version': swStatus.version || '-',
    'Permission': permission,
    'SW Registered': swReg ? 'Yes' : 'No',
    'SW Active': swReg?.active?.state || '-',
    'PushManager Subscription': subscription ? 'Active' : 'None',
    'Cached Endpoint': cached ? 'present' : 'missing',
    'VAPID Key': VAPID_PUBLIC_KEY ? `${VAPID_PUBLIC_KEY.substring(0, 15)}...` : 'MISSING',
    'Auth Token': localStorage.getItem('token') ? 'present' : 'missing',
  })

  if (subscription) {
    console.log('%c[PUSH] Subscription endpoint:', OK_STYLE, subscription.endpoint.substring(0, 80) + '...')
  }

  return { swStatus, permission, subscription, cached }
}

// ---------------------------------------------------------------------------
// Check if we have a real subscription (not just cached endpoint)
// ---------------------------------------------------------------------------
export const isWebPushSubscribed = async () => {
  const cached = localStorage.getItem(SUB_CACHE_KEY)
  if (!cached) return false

  // Verify actual PushManager subscription exists
  try {
    if (!('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    if (!sub) {
      // Cache is stale — clear it
      localStorage.removeItem(SUB_CACHE_KEY)
      return false
    }
    return true
  } catch {
    return Boolean(cached)
  }
}

// Sync version for contexts that need it synchronously
export const isWebPushSubscribedSync = () => {
  return Boolean(localStorage.getItem(SUB_CACHE_KEY))
}

const shouldInitPush = () => {
  const token = localStorage.getItem('token')
  // We want to allow initialization even without VAPID_PUBLIC_KEY initially,
  // as we'll fetch it from the backend.
  return Boolean(token)
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

// ---------------------------------------------------------------------------
// initWebPush — main entry point
// ---------------------------------------------------------------------------
export const initWebPush = async ({ requestPermission = false, force = false } = {}) => {
  log('initWebPush() start', { requestPermission, force })

  if (!shouldInitPush()) {
    warn('Skip — missing token')
    return null
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    errorLog('Browser missing Notification/ServiceWorker/PushManager support')
    return null
  }

  // Ensure we have the latest VAPID key
  const activeKey = await fetchVapidKey()
  if (!activeKey) {
    errorLog('Missing VAPID public key (env and backend empty)')
    return null
  }

  let permission = Notification.permission

  if (permission !== 'granted') {
    if (permission === 'denied') {
      rememberPushPromptDenied()
      warn('Permission denied by browser settings')
      return null
    }

    if (!requestPermission) {
      log('Permission is "default" but requestPermission=false, skip')
      return null
    }

    permission = await Notification.requestPermission()
  }

  log('Permission:', permission)

  if (permission !== 'granted') {
    if (permission === 'denied') {
      rememberPushPromptDenied()
      warn('Permission explicitly denied')
      toastInfo('Notifications permission has been blocked. Reset in Page Info (tune icon next to URL).')
    }
    return null
  }

  clearPushPromptDecision()

  if (force) {
    log('Force mode: attempting to clear existing registration first...')
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_PATH)
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
        await reg.unregister()
        okLog('Previous registration cleared')
      }
    } catch (err) {
      warn('Force clear failed (ignoring)', err)
    }
  }

  // Register service worker
  let swRegistration
  try {
    swRegistration = await navigator.serviceWorker.register(SW_PATH)
    okLog('Service Worker registered', { scope: swRegistration.scope })
  } catch (error) {
    errorLog('SW registration failed', error)
    return null
  }

  // Wait for ready
  try {
    swRegistration = await navigator.serviceWorker.ready
    okLog('Service Worker ready', { state: swRegistration.active?.state })
  } catch (error) {
    errorLog('SW ready failed', error)
    return null
  }

  // Get or create push subscription
  let subscription
  try {
    subscription = await swRegistration.pushManager.getSubscription()

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(activeKey)
      if (!applicationServerKey) {
        throw new Error('Invalid VAPID key format')
      }

      // VAPID keys must be 65 bytes and start with 0x04 (uncompressed point)
      if (applicationServerKey.length !== 65 || applicationServerKey[0] !== 4) {
        warn('VAPID key might be invalid (expected 65 bytes starting with 0x04)', {
          length: applicationServerKey.length,
          firstByte: applicationServerKey[0],
        })
      }

      subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
      okLog('New push subscription created')
    } else {
      okLog('Existing push subscription found')
    }
  } catch (error) {
    errorLog('Push subscribe failed', error)

    // Handle common "Push service error" (AbortError)
    // 1. If it's the first failure, try a forced re-registration
    // 2. If it's the second failure, it's likely a network/browser issue
    if (error.name === 'AbortError' && !force) {
      warn('Push service error detected (AbortError). Retrying with force=true in 1s...')
      await new Promise(r => setTimeout(r, 1000))
      return initWebPush({ requestPermission, force: true })
    }

    if (error.name === 'NotAllowedError') {
      errorLog('Subscription failed because a user gesture is required or permission was revoked.')
    }

    return null
  }

  if (!subscription) {
    errorLog('No subscription returned from PushManager')
    return null
  }

  const { endpoint, keys } = subscription.toJSON()

  // Register with backend if endpoint changed
  const cachedEndpoint = localStorage.getItem(SUB_CACHE_KEY)

  if (cachedEndpoint !== endpoint) {
    try {
      const authToken = localStorage.getItem('token')
      if (authToken) {
        await apiClient.post('/auth/push/register', {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        })
        okLog('Registered with backend')
      } else {
        await apiClient.post('/public/push/subscribe', {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        })
        okLog('Registered (anonymous) with backend')
      }
      localStorage.setItem(SUB_CACHE_KEY, endpoint)
    } catch (error) {
      errorLog('Backend register failed', error)
    }
  } else {
    log('Endpoint unchanged, skip backend register')
  }

  // Log final status
  await logSwStatus()

  log('initWebPush() completed')
  return endpoint
}

// ---------------------------------------------------------------------------
// Unregister
// ---------------------------------------------------------------------------
export const unregisterWebPushToken = async () => {
  const cachedEndpoint = localStorage.getItem(SUB_CACHE_KEY)
  if (!cachedEndpoint) {
    warn('No cached endpoint to unregister')
    return
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        okLog('Unsubscribed from PushManager')
      }
    }

    await apiClient.post('/auth/push/unregister', { endpoint: cachedEndpoint })
    okLog('Unregistered from backend')
  } catch (error) {
    errorLog('Unregister failed', error)
  } finally {
    localStorage.removeItem(SUB_CACHE_KEY)
    log('Cached endpoint cleared')
  }
}

export const subscribeWebPush = async () => {
  return await initWebPush({ requestPermission: true })
}

export const unsubscribeWebPush = async () => {
  return await unregisterWebPushToken()
}

// ---------------------------------------------------------------------------
// Debug helpers — exposed on window.__debugWebPush
// ---------------------------------------------------------------------------

const _debugLog = (label, ...args) => console.log(`%c[WEBPUSH_DEBUG] ${label}`, 'color:#f97316;font-weight:bold', ...args)
const _debugErr = (label, ...args) => console.error(`%c[WEBPUSH_DEBUG] ${label}`, 'color:#ef4444;font-weight:bold', ...args)

export const debugWebPush = async () => {
  const report = {}

  report.browserSupport = {
    notification: 'Notification' in window,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
  }

  report.permission = 'Notification' in window ? Notification.permission : 'n/a'

  let swReg = null
  try {
    swReg = await navigator.serviceWorker.getRegistration(SW_PATH)
    report.serviceWorker = {
      registered: !!swReg,
      active: swReg?.active?.state || null,
      scope: swReg?.scope || null,
    }
  } catch (e) {
    report.serviceWorker = { registered: false, error: e.message }
  }

  if (swReg) {
    try {
      const sub = await swReg.pushManager.getSubscription()
      report.subscription = sub ? {
        endpoint: sub.endpoint?.substring(0, 80) + '...',
        hasKeys: !!sub.toJSON().keys,
        expirationTime: sub.expirationTime,
      } : null
    } catch (e) {
      report.subscription = { error: e.message }
    }
  }

  report.cachedEndpoint = localStorage.getItem(SUB_CACHE_KEY) ? 'present' : 'missing'
  report.authToken = localStorage.getItem('token') ? 'present' : 'missing'
  report.vapidKey = VAPID_PUBLIC_KEY ? `${VAPID_PUBLIC_KEY.substring(0, 20)}...` : 'MISSING'

  // SW status via message channel
  report.swChannelStatus = await getSwStatus()

  _debugLog('STATUS', report)

  const issues = []
  if (!report.browserSupport.notification) issues.push('Browser does not support Notification API')
  if (!report.browserSupport.serviceWorker) issues.push('Browser does not support Service Workers')
  if (!report.browserSupport.pushManager) issues.push('Browser does not support PushManager')
  if (report.permission !== 'granted') issues.push(`Notification permission is "${report.permission}", need "granted"`)
  if (!report.serviceWorker?.registered) issues.push('Service worker not registered — call __initWebPush() first')
  if (!report.subscription) issues.push('No push subscription — call __initWebPush() first')
  if (!report.authToken) issues.push('No auth token — user not logged in')
  if (!VAPID_PUBLIC_KEY) issues.push('VITE_VAPID_PUBLIC_KEY not configured')

  if (issues.length > 0) {
    _debugErr('ISSUES FOUND')
    issues.forEach((issue, i) => console.error(`  ${i + 1}. ${issue}`))
    console.error('Run: await __initWebPush({ requestPermission: true }) to fix')
    return { ok: false, report, issues }
  }

  _debugLog('SENDING', 'Calling backend /admin/debug/webpush ...')
  try {
    const res = await apiClient.post('/admin/debug/webpush')
    report.backendResponse = res

    if (res.ok) {
      const allSent = res.results?.every((r) => r.sent)
      if (allSent) {
        _debugLog('SUCCESS', `Backend sent ${res.subscriptions_found} push(es). Check notification tray!`)
      } else {
        _debugErr('PARTIAL', 'Some pushes failed:', res.results?.filter((r) => !r.sent))
      }
    } else {
      _debugErr('FAILED', res.error, res.detail)
    }
  } catch (e) {
    _debugErr('API ERROR', e.response?.data || e.message)
    report.backendError = e.response?.data || e.message
  }

  return { ok: true, report }
}

export const webPushStatus = async () => {
  try {
    const res = await apiClient.get('/admin/debug/webpush/status')
    console.table({
      'Webpush Enabled': res.webpush_enabled ? 'Yes' : 'No',
      'VAPID Configured': res.vapid_configured ? 'Yes' : 'No',
      'Your Subscriptions': res.admin_subscriptions,
      'Total Subscriptions': res.total_subscriptions,
    })
    if (res.admin_subscriptions_detail?.length) {
      console.table(res.admin_subscriptions_detail)
    }
    return res
  } catch (e) {
    _debugErr('STATUS ERROR', e.response?.data || e.message)
    return null
  }
}
