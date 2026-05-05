import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@/components/ui/core'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import ReCAPTCHA from 'react-google-recaptcha'
import { apiClient } from '@/lib/apiClient'
import { toastSuccess, toastError, toastInfo } from '@/lib/notify'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

const getRecaptchaTokenSafely = async (recaptchaRef) => {
  if (!RECAPTCHA_SITE_KEY || !recaptchaRef.current) return null

  try {
    const token = await Promise.race([
      recaptchaRef.current.executeAsync(),
      new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ])
    recaptchaRef.current.reset()
    return token || null
  } catch {
    return null
  }
}

const getInitials = (name) => {
  const normalized = String(name || '').trim()
  if (!normalized) return '?'
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const CommentComposer = ({
  publicationId,
  onCreated,
  autoFocus = false,
  parentId = null,
  onCancel,
  submitLabel,
  compact = false,
}) => {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const recaptchaRef = useRef(null)
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const userName = currentUser?.full_name || currentUser?.email || 'Người dùng'
  const userImage = currentUser?.image_url || ''

  const sanitizeCommentHtml = (html) => {
    if (!html) return ''
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  }

  const handleSubmit = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      toastInfo('Vui lòng đăng nhập để bình luận.')
      navigate('/login', { state: { from: typeof window !== 'undefined' ? window.location.pathname : '/' } })
      return
    }

    const normalizedValue = typeof value === 'string' ? value : String(value || '')
    const plain = normalizedValue.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    if (!plain || plain.length < 2) {
      toastError('Bình luận cần tối thiểu 2 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      const resp = await apiClient.post(`/public/publications/${publicationId}/comments`, {
        content: sanitizeCommentHtml(normalizedValue),
        parent_id: parentId,
        recaptcha_token: recaptchaToken,
      })

      onCreated?.(resp.data)
      setValue('')
      if (parentId && typeof onCancel === 'function') onCancel()
      toastSuccess('Đã gửi bình luận thành công.')
    } catch (err) {
      toastError('Gửi bình luận thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${compact ? 'p-3' : 'p-4'}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          {userImage ? (
            <img src={userImage} alt={userName} className="h-9 w-9 rounded-full border border-white/80 object-cover shadow-sm" loading="lazy" />
          ) : (
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-200 to-orange-300 text-xs font-black text-orange-800 shadow-sm">
              {getInitials(userName)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800">{userName}</div>
            <div className="text-xs text-slate-400">Chia sẻ ý kiến của bạn...</div>
          </div>
        </div>

        <RichTextEditor
          value={value}
          onChange={setValue}
          enableMentions
          autoFocus={autoFocus}
          placeholder={parentId ? 'Viết phản hồi của bạn...' : 'Nhập bình luận của bạn...'}
          size={compact ? 'compact' : 'default'}
        />
        {RECAPTCHA_SITE_KEY && <ReCAPTCHA size="invisible" ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />}
        <div className="flex items-center justify-end gap-2">
          {typeof onCancel === 'function' && (
            <Button
              onClick={onCancel}
              disabled={submitting}
              variant="outline"
              className="rounded-xl px-4 py-2 text-xs uppercase tracking-[0.12em]"
            >
              Hủy
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={submitting} className="rounded-xl px-4 py-2 text-xs uppercase tracking-[0.12em]">{submitting ? 'Đang gửi...' : (submitLabel || (parentId ? 'Trả lời' : 'Gửi bình luận'))}</Button>
        </div>
      </div>
    </Card>
  )
}

export default CommentComposer
