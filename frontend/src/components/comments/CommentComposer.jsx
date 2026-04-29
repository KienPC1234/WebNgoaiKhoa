import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@/components/ui/core'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import ReCAPTCHA from 'react-google-recaptcha'
import { apiClient } from '@/lib/apiClient'
import { toastSuccess, toastError, toastInfo } from '@/lib/notify'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

export const CommentComposer = ({ publicationId, onCreated, autoFocus = false }) => {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const recaptchaRef = useRef(null)
  const navigate = useNavigate()

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

    const plain = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    if (!plain || plain.length < 2) {
      toastError('Bình luận cần tối thiểu 2 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      let recaptchaToken = null
      if (RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        recaptchaToken = await recaptchaRef.current.executeAsync()
        recaptchaRef.current.reset()
      }

      const resp = await apiClient.post(`/public/publications/${publicationId}/comments`, {
        content: value,
        recaptcha_token: recaptchaToken,
      })

      onCreated?.(resp.data)
      setValue('')
      toastSuccess('Đã gửi bình luận thành công.')
    } catch (err) {
      toastError('Gửi bình luận thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <RichTextEditor value={value} onChange={setValue} enableMentions autoFocus={autoFocus} />
        {RECAPTCHA_SITE_KEY && <ReCAPTCHA size="invisible" ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi bình luận'}</Button>
        </div>
      </div>
    </Card>
  )
}

export default CommentComposer
