import { useState, useRef, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import useNotifications from '@/hooks/useNotifications'
import NotificationsPanel from '@/components/NotificationsPanel'

export default function NotificationButton() {
  const { notifications, unreadCount, markAsRead, markAllRead, subscribeToPush, unsubscribeFromPush, isSubscribed } = useNotifications()
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)

  // prefetch list when button is mounted to avoid repeated fetches on open
  useEffect(() => {
    try {
      if (typeof notifications === 'undefined') return
      // notifications are managed by provider; no-op here
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    const handleOutside = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={btnRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="tap-target inline-flex h-11 w-11 items-center justify-center rounded-xl border border-orange-100 bg-[#fff9f1] text-slate-700 transition-colors hover:bg-orange-50 hover:text-fpt-orange"
        title="Thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 -translate-y-1 translate-x-0 h-3 w-3 rounded-full bg-amber-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-[320px]">
          <NotificationsPanel
            notifications={notifications}
            onMarkRead={markAsRead}
            onMarkAllRead={markAllRead}
            onClose={() => setOpen(false)}
            isSubscribed={isSubscribed}
            onSubscribe={subscribeToPush}
            onUnsubscribe={unsubscribeFromPush}
          />
        </div>
      )}
    </div>
  )
}
