import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { initWebPush, rememberPushPromptDenied, shouldShowPushPermissionPrompt } from '@/lib/pushNotifications'

const PUSH_PROMPT_SESSION_HIDDEN_KEY = 'push_permission_prompt_hidden_session'

export const NotificationPermissionPrompt = () => {
  const location = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const userToken = localStorage.getItem('token')
    if (!userToken) {
      setVisible(false)
      return
    }

    const hiddenForSession = sessionStorage.getItem(PUSH_PROMPT_SESSION_HIDDEN_KEY) === '1'
    if (hiddenForSession) {
      setVisible(false)
      return
    }

    if (shouldShowPushPermissionPrompt()) {
      setVisible(true)
    }
  }, [location.pathname])

  if (!visible) return null

  const handleAllow = async () => {
    await initWebPush({ requestPermission: true }).catch(() => null)
    sessionStorage.removeItem(PUSH_PROMPT_SESSION_HIDDEN_KEY)
    setVisible(false)
  }

  const handleDeny = () => {
    rememberPushPromptDenied()
    sessionStorage.removeItem(PUSH_PROMPT_SESSION_HIDDEN_KEY)
    setVisible(false)
  }

  const handleClose = () => {
    sessionStorage.setItem(PUSH_PROMPT_SESSION_HIDDEN_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-[120] w-[min(94vw,620px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_40px_-26px_rgba(15,23,42,0.6)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-orange-50 p-2 text-fpt-orange">
          <BellRing size={18} />
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Cho phép thông báo từ hệ thống</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Nếu bạn đồng ý, hệ thống sẽ gửi thông báo sự kiện mới, nhắc lịch và cập nhật bài viết.
            Nếu bạn từ chối, chúng tôi sẽ ghi nhớ và không hỏi lại.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAllow}
              className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
            >
              Cho phép
            </button>
            <button
              type="button"
              onClick={handleDeny}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Từ chối và không hỏi lại
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Đóng popup"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
