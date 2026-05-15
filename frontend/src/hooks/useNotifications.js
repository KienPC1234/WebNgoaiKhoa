import { useContext } from 'react'
import { NotificationsContext } from '@/contexts/NotificationsContext'

// Lightweight hook that consumes the shared NotificationsContext.
// This prevents multiple components from independently fetching or opening WebSockets.
export default function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    // Fallback: return no-op implementations to avoid crashing if provider is missing
    return {
      notifications: [],
      unreadCount: 0,
      isSubscribed: false,
      fetchList: async () => {},
      markAsRead: async () => {},
      markAllRead: async () => {},
      subscribeToPush: async () => {},
      unsubscribeFromPush: async () => {},
      toasts: [],
      removeToast: () => {},
    }
  }
  return ctx
}
