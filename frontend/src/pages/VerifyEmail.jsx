import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, Button, Input } from '@/components/UI'
import ReCAPTCHA from 'react-google-recaptcha'
import { useRef } from 'react'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastSuccess } from '@/lib/notify'

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

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const recaptchaRef = useRef(null)

  useEffect(() => {
    const verify = async () => {
      if (!token) return
      setStatus('loading')
      try {
        const res = await apiClient.get('/auth/verify-email', { params: { token } })
        setStatus('success')
        setMessage(res.data.message || 'Xác minh thành công')
        toastSuccess(res.data.message || 'Xác minh thành công')
      } catch (err) {
        setStatus('error')
        const message = err?.response?.data?.detail || 'Xác minh thất bại'
        setMessage(message)
        toastError(message)
      }
    }

    verify()
  }, [token])

  const resend = async () => {
    setStatus('loading')
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      const res = await apiClient.post('/auth/verify-email/resend', { email, recaptcha_token: recaptchaToken })
      setStatus('success')
      setMessage(res.data.message || 'Đã gửi lại email xác minh')
      toastSuccess(res.data.message || 'Đã gửi lại email xác minh')
    } catch (err) {
      setStatus('error')
      const message = err?.response?.data?.detail || 'Gửi lại thất bại'
      setMessage(message)
      toastError(message)
    }
  }

  const verifyOtp = async () => {
    setStatus('loading')
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      const res = await apiClient.post('/auth/verify-otp', {
        email,
        otp,
        recaptcha_token: recaptchaToken,
      })
      setStatus('success')
      setMessage(res.data.message || 'Xác minh thành công')
      toastSuccess(res.data.message || 'Xác minh thành công')
    } catch (err) {
      setStatus('error')
      const message = err?.response?.data?.detail || 'Xác minh thất bại'
      setMessage(message)
      toastError(message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-xl w-full p-10 space-y-6">
        <h1 className="text-3xl font-black text-fpt-blue italic">XÁC MINH OTP EMAIL</h1>

        {message && (
          <div className={`${status === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'} p-4 rounded-xl border font-bold`}>
            {message}
          </div>
        )}

        {!token && (
          <div className="space-y-4">
            <p className="text-gray-500 font-semibold">Nhập email và OTP để kích hoạt tài khoản.</p>
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Nhập mã 6 số" />
            <div className="flex gap-3">
              <Button variant="orange" onClick={verifyOtp} disabled={status === 'loading'}>Xác minh OTP</Button>
              <Button onClick={resend} disabled={status === 'loading'}>Gửi lại OTP</Button>
            </div>
            {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
          </div>
        )}

        <div className="pt-2 text-sm">
          <Link to="/login" className="text-fpt-blue font-black">Quay lại đăng nhập</Link>
        </div>
      </Card>
    </div>
  )
}
