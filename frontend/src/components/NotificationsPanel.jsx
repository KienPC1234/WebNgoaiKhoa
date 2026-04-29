import { useMemo } from 'react'
import { X, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function NotificationsPanel({ notifications = [], onMarkRead = () => {}, onMarkAllRead = () => {}, onClose = () => {}, isSubscribed = false, onSubscribe = () => {}, onUnsubscribe = () => {} }) {
  const hasItems = notifications && notifications.length > 0

  const sorted = useMemo(() => {
    return [...(notifications || [])].sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()))
  }, [notifications])

  return (
    <div className="glass-card rounded-2xl border border-orange-100 p-3 shadow-[0_20px_40px_-18px_rgba(29,42,87,0.16)]">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-black uppercase tracking-tight text-fpt-blue">Thông báo</h4>
        <div className="flex items-center gap-2">
          <button onClick={onMarkAllRead} className="text-xs font-semibold text-slate-500 hover:text-fpt-orange">Đánh dấu đã đọc</button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-red-500"><X size={16} /></button>
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto pr-1">
        {!hasItems && (
          <div className="py-6 text-center text-sm text-slate-500">
            <Bell size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 font-semibold">Bạn chưa có thông báo</p>
            <p className="mt-1 text-xs">Bật thông báo nền để nhận cập nhật mới.</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {isSubscribed ? (
                <button onClick={onUnsubscribe} className="btn-ghost">Hủy đăng ký</button>
              ) : (
                <button onClick={onSubscribe} className="btn-primary">Bật thông báo</button>
              )}
            </div>
          </div>
        )}

        {hasItems && (
          <ul className="space-y-2">
            {sorted.map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-sm font-bold text-fpt-blue">{n.title || 'Thông báo'}</h5>
                      <span className="text-xs text-slate-400">{n.time || ''}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{n.message || n.body || ''}</p>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    <button onClick={() => onMarkRead(n.id)} className="p-2 text-slate-400 hover:text-fpt-orange">Đã đọc</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
