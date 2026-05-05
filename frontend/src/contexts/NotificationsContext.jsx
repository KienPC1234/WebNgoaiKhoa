import React, { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { getNotifications, markNotificationAsRead, markAllNotificationsRead } from '@/lib/notificationsService'

const NotificationsContext = createContext(null)

let pushNotificationsModulePromise = null

const loadPushNotificationsModule = async () => {
  if (!pushNotificationsModulePromise) {
    pushNotificationsModulePromise = import('@/lib/pushNotifications').catch((error) => {
      pushNotificationsModulePromise = null
      throw error
    })
  }
  return pushNotificationsModulePromise
}

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([]) // ephemeral toast notifications shown in MainLayout
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const fetchInProgress = useRef(false)

  const refreshUnread = useCallback((items) => {
    const count = (items || []).filter((i) => !i.is_read).length
    setUnreadCount(count)
  }, [])

  const fetchList = useCallback(async () => {
    if (fetchInProgress.current) return
    fetchInProgress.current = true
    try {
      const list = await getNotifications()
      setNotifications(list || [])
      refreshUnread(list || [])
    } catch (e) {
      setNotifications([])
      setUnreadCount(0)
    } finally {
      fetchInProgress.current = false
    }
  }, [refreshUnread])

  useEffect(() => {
    loadPushNotificationsModule()
      .then((module) => {
        const checkSubscribed = module?.isWebPushSubscribed
        setIsSubscribed(Boolean(checkSubscribed && checkSubscribed()))
      })
      .catch(() => {
        setIsSubscribed(false)
      })
  }, [])

  useEffect(() => {
    // Only fetch notifications and open WS when we have an auth token.
    // This avoids 401s and noisy websocket errors on public pages.
    let ws
    let reconnectTimeout
    let retryCount = 0
    const wsBase = import.meta.env.VITE_WS_URL || ''
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const shouldConnectWs = Boolean(wsBase) || isLocalHost

    const start = () => {
      fetchList()

      if (!shouldConnectWs) return

      const connectWS = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = wsBase
          ? `${wsBase.replace(/\/$/, '')}/notifications`
          : `${protocol}//${window.location.host}/ws/notifications`

        try {
          ws = new WebSocket(wsUrl)

          ws.onopen = () => {
            retryCount = 0
          }

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              const newNotif = { ...data, id: data.id || Date.now() }
              // persist notification list
              setNotifications((prev) => [newNotif, ...prev])
              setUnreadCount((v) => v + 1)
              // ephemeral toast for UI
              setToasts((prev) => [newNotif, ...prev])
              // auto remove toast after 8s
              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== newNotif.id))
              }, 8000)
            } catch (e) {
              // ignore invalid payloads
            }
          }

          ws.onclose = () => {
            const reconnectDelay = Math.min(15000, 2000 * (2 ** retryCount))
            retryCount += 1
            reconnectTimeout = setTimeout(connectWS, reconnectDelay)
          }
        } catch (e) {
          const reconnectDelay = Math.min(15000, 2000 * (2 ** retryCount))
          retryCount += 1
          reconnectTimeout = setTimeout(connectWS, reconnectDelay)
        }
      }

      connectWS()
    }

    const stop = () => {
      if (ws) ws.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      ws = undefined
      reconnectTimeout = undefined
      retryCount = 0
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      // ensure cleared state
      setNotifications([])
      setUnreadCount(0)
      // listen for auth changes to start fetching when user logs in
      const onAuthChanged = () => {
        const t = localStorage.getItem('token')
        if (t) start()
      }
      window.addEventListener('auth-changed', onAuthChanged)
      window.addEventListener('storage', onAuthChanged)
      return () => {
        window.removeEventListener('auth-changed', onAuthChanged)
        window.removeEventListener('storage', onAuthChanged)
        stop()
      }
    }

    start()

    const onAuthChanged = () => {
      const t = localStorage.getItem('token')
      if (!t) {
        // logged out -> cleanup
        stop()
        setNotifications([])
        setUnreadCount(0)
      } else {
        // logged in (or token refreshed) -> refresh list and ensure ws connected
        fetchList()
      }
    }

    window.addEventListener('auth-changed', onAuthChanged)
    window.addEventListener('storage', onAuthChanged)

    return () => {
      window.removeEventListener('auth-changed', onAuthChanged)
      window.removeEventListener('storage', onAuthChanged)
      stop()
    }
  }, [fetchList])

  const markAsRead = useCallback(async (id) => {
    try {
      await markNotificationAsRead(id)
    } catch (e) {
      // ignore remote failure
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead()
    } catch (e) {
      // ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [])

  const subscribeToPush = useCallback(async () => {
    try {
      const module = await loadPushNotificationsModule()
      const token = await module.initWebPush({ requestPermission: true })
      setIsSubscribed(Boolean(token))
      return token
    } catch (e) {
      setIsSubscribed(false)
      throw e
    }
  }, [])

  const unsubscribeFromPush = useCallback(async () => {
    try {
      const module = await loadPushNotificationsModule()
      await module.unregisterWebPushToken()
    } finally {
      setIsSubscribed(false)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      isSubscribed,
      fetchList,
      markAsRead,
      markAllRead,
      subscribeToPush,
      unsubscribeFromPush,
      toasts,
      removeToast,
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export default NotificationsContext
