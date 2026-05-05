import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/UI'
import ReCAPTCHA from 'react-google-recaptcha'
import { ShieldCheck, Home, Mail, KeyRound } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastSuccess } from '@/lib/notify'
import { refreshAuthOverview, roleHasPermission } from '@/lib/rolePolicy'
import { RECAPTCHA_SITE_KEY, getRecaptchaTokenSafely } from '@/lib/recaptcha'

export const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef(null)

  /* ── Step 1: Request OTP ────────────────────────────────────── */
  const handleRequestOtp = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)
      await apiClient.post('/auth/password/forgot', {
        email: email.trim(),
        recaptcha_token: recaptchaToken,
      })
      toastSuccess('Mã OTP đã được gửi đến email của bạn.')
      setStep('otp')
    } catch (err) {
      const message = err?.response?.data?.detail || 'Gửi OTP thất bại. Vui lòng thử lại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 2: Reset password with OTP ────────────────────────── */
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (loading) return
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      toastError('Xác nhận mật khẩu không khớp.')
      return
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      toastError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    setLoading(true)
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)
      const res = await apiClient.post('/auth/password/reset', {
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
        recaptcha_token: recaptchaToken,
      })

      toastSuccess('Mật khẩu đã được đặt lại thành công!')

      // Auto-login after reset
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user || {}))
        try { window.dispatchEvent(new Event('auth-changed')) } catch (e) { /* noop */ }
        try { await refreshAuthOverview() } catch (e) { /* ignore */ }

        if (res.data.user && roleHasPermission(res.data.user.role, 'admin_panel')) {
          navigate('/admin/dashboard')
          return
        }
      }
      navigate('/login')
    } catch (err) {
      const message = err?.response?.data?.detail || 'Đặt lại mật khẩu thất bại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_30%,#e6f4ff_0,#f8fafc_40%,#fff7ed_100%)] flex items-center justify-center p-4">
      <div className="fixed left-4 top-6 z-[130]">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-full px-4 py-2 bg-white/90 backdrop-blur-md border border-white/30 shadow hover:scale-105 transition-transform duration-200">
          <Home size={18} className="text-fpt-blue" />
          <span className="hidden sm:inline font-black text-sm text-fpt-blue">Trang chủ</span>
        </Link>
      </div>
      <Card className="max-w-md w-full p-10 space-y-8 border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] rounded-[32px]">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-fpt-orange text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={14} /> Khôi phục mật khẩu
          </span>
          <h1 className="text-3xl font-black text-fpt-blue italic">
            {step === 'email' ? 'QUÊN MẬT KHẨU' : 'ĐẶT LẠI MẬT KHẨU'}
          </h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Tổ xã hội</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 animate-[shake_0.4s_ease-in-out]">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <p className="text-sm text-gray-500 text-center">
              Nhập email đã đăng ký. Chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
            </p>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@email.com"
              autoComplete="email"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              variant="orange"
              className="w-full py-4 rounded-xl font-black text-lg relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang gửi...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Mail size={18} />
                  Gửi mã OTP
                </span>
              )}
            </Button>
            {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <p className="text-sm text-gray-500 text-center">
              Nhập mã OTP đã gửi đến <span className="font-bold text-fpt-blue">{email}</span> và mật khẩu mới.
            </p>
            <Input
              label="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã 6 số"
              maxLength={12}
              autoComplete="one-time-code"
              required
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              variant="orange"
              className="w-full py-4 rounded-xl font-black text-lg relative overflow-hidden"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang đặt lại...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <KeyRound size={18} />
                  Đặt lại mật khẩu
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setStep('email'); setError(''); }}
              className="w-full py-2 rounded-xl font-bold text-sm"
            >
              Gửi lại mã OTP
            </Button>
            {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
          </form>
        )}

        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>
            Nhớ mật khẩu? <Link to="/login" className="text-fpt-blue font-black hover:underline">Đăng nhập</Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
