import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/UI'
import ReCAPTCHA from 'react-google-recaptcha'
import { Home, Mail, KeyRound } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastSuccess } from '@/lib/notify'
import { refreshAuthOverview, roleHasPermission } from '@/lib/rolePolicy'
import { RECAPTCHA_SITE_KEY, getRecaptchaTokenSafely } from '@/lib/recaptcha'

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const emailQuery = searchParams.get('email') || ''
  const [email, setEmail] = useState(emailQuery)
  const [otp, setOtp] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const recaptchaRef = useRef(null)
  const navigate = useNavigate()

  /* ── Auto-verify when ?token= is present (link-based flow) ─── */
  useEffect(() => {
    if (!token) return
    let cancelled = false

    const verify = async () => {
      setStatus('loading')
      try {
        const res = await apiClient.get('/auth/verify-email', { params: { token } })
        if (cancelled) return
        setStatus('success')
        setMessage(res.data.message || 'Xác minh thành công')
        toastSuccess(res.data.message || 'Xác minh thành công')
        if (res.data.access_token) {
          localStorage.setItem('token', res.data.access_token)
          localStorage.setItem('user', JSON.stringify(res.data.user || {}))
          try { window.dispatchEvent(new Event('auth-changed')) } catch (e) { /* noop */ }
          try { await refreshAuthOverview() } catch (e) { /* ignore */ }
          if (res.data.user && roleHasPermission(res.data.user.role, 'admin_panel')) {
            navigate('/admin/dashboard')
            return
          }
          navigate('/')
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        const msg = err?.response?.data?.detail || 'Xác minh thất bại'
        setMessage(msg)
        toastError(msg)
      }
    }

    verify()
    return () => { cancelled = true }
  }, [token, navigate])

  /* ── Resend OTP ─────────────────────────────────────────────── */
  const resend = async () => {
    if (!email.trim()) {
      toastError('Vui lòng nhập email.')
      return
    }
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      const res = await apiClient.post('/auth/verify-email/resend', {
        email: email.trim(),
        recaptcha_token: recaptchaToken,
      })
      setStatus('idle')
      setMessage(res.data.message || 'Đã gửi lại email xác minh')
      toastSuccess(res.data.message || 'Đã gửi lại email xác minh')
    } catch (err) {
      setStatus('error')
      const msg = err?.response?.data?.detail || 'Gửi lại thất bại'
      setMessage(msg)
      toastError(msg)
    }
  }

  /* ── Verify OTP ─────────────────────────────────────────────── */
  const verifyOtp = async () => {
    if (!email.trim() || !otp.trim()) {
      toastError('Vui lòng nhập email và mã OTP.')
      return
    }
    if (status === 'loading') return
    setStatus('loading')
    setMessage('')
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      const res = await apiClient.post('/auth/verify-otp', {
        email: email.trim(),
        otp: otp.trim(),
        recaptcha_token: recaptchaToken,
      })
      setStatus('success')
      setMessage(res.data.message || 'Xác minh thành công')
      toastSuccess(res.data.message || 'Xác minh thành công')
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user || {}))
        try { window.dispatchEvent(new Event('auth-changed')) } catch (e) { /* noop */ }
        try { await refreshAuthOverview() } catch (e) { /* ignore */ }
        if (res.data.user && roleHasPermission(res.data.user.role, 'admin_panel')) {
          navigate('/admin/dashboard')
          return
        }
        navigate('/')
      }
    } catch (err) {
      setStatus('error')
      const msg = err?.response?.data?.detail || 'Xác minh thất bại'
      setMessage(msg)
      toastError(msg)
    }
  }

  const isLoading = status === 'loading'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_30%,#e6f4ff_0,#f8fafc_40%,#fff7ed_100%)] flex items-center justify-center p-4">
      <div className="fixed left-4 top-6 z-[130]">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-full px-4 py-2 bg-white/90 backdrop-blur-md border border-white/30 shadow hover:scale-105 transition-transform duration-200">
          <Home size={18} className="text-fpt-blue" />
          <span className="hidden sm:inline font-black text-sm text-fpt-blue">Trang chủ</span>
        </Link>
      </div>
      <Card className="max-w-xl w-full p-10 space-y-6 border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] rounded-[32px]">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest">
            <Mail size={14} /> Xác minh OTP
          </span>
          <h1 className="text-3xl font-black text-fpt-blue italic">XÁC MINH EMAIL</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Nhập mã OTP để kích hoạt tài khoản</p>
        </div>

        {message && (
          <div className={`${status === 'error' ? 'bg-red-50 text-red-600 border-red-100 animate-[shake_0.4s_ease-in-out]' : 'bg-green-50 text-green-700 border-green-100'} p-4 rounded-xl border font-bold text-sm`}>
            {message}
          </div>
        )}

        {!token && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500 text-center">
              {emailQuery ? (
                <>Nhập mã OTP đã gửi đến <span className="font-bold text-fpt-blue">{emailQuery}</span></>
              ) : (
                'Nhập email và mã OTP để xác minh tài khoản'
              )}
            </p>
            {!emailQuery && (
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                autoComplete="email"
                required
              />
            )}
            <Input
              label="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã 6 số"
              maxLength={12}
              autoComplete="one-time-code"
              autoFocus
              required
            />
            <div className="flex gap-3">
              <Button
                variant="orange"
                onClick={verifyOtp}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-black relative overflow-hidden"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Đang xác minh...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <KeyRound size={16} />
                    Xác minh OTP
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resend}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-black relative overflow-hidden"
              >
                <span className="flex items-center justify-center gap-2">
                  <Mail size={16} />
                  Gửi lại
                </span>
              </Button>
            </div>
            {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
            <p className="text-center text-xs text-gray-400 mt-2">
              Trang này được bảo vệ bởi reCAPTCHA.
            </p>
          </div>
        )}

        {token && status === 'loading' && (
          <div className="flex items-center justify-center gap-3 py-8 text-gray-400">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-bold text-sm">Đang xác minh...</span>
          </div>
        )}

        <div className="pt-2 text-sm text-center space-y-2">
          <p>
            <Link to="/login" className="text-fpt-blue font-black hover:underline">Quay lại đăng nhập</Link>
          </p>
          <p className="text-xs text-gray-400">
            Chưa nhận được OTP? Kiểm tra thư mục spam hoặc bấm "Gửi lại"
          </p>
        </div>
      </Card>
    </div>
  )
}
