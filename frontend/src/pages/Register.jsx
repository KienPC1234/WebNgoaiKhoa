import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/UI'
import { GoogleLogin } from '@react-oauth/google'
import ReCAPTCHA from 'react-google-recaptcha'
import { ShieldCheck, Home } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastInfo, toastSuccess } from '@/lib/notify'
import { refreshAuthOverview, roleHasPermission } from '@/lib/rolePolicy'
import { RECAPTCHA_SITE_KEY, getRecaptchaTokenSafely } from '@/lib/recaptcha'
import { lazy, Suspense } from 'react'

const AiChatWidget = lazy(() =>
  import('@/components/AiChatWidget').then((m) => ({ default: m.AiChatWidget || m.default }))
)

const GOOGLE_OAUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

/* ── Password strength helper ─────────────────────────────────── */
const getPasswordStrength = (pw) => {
  if (!pw) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  if (score <= 1) return { score, label: 'Yếu', color: 'bg-red-400' }
  if (score <= 2) return { score, label: 'Trung bình', color: 'bg-yellow-400' }
  if (score <= 3) return { score, label: 'Khá', color: 'bg-blue-400' }
  return { score, label: 'Mạnh', color: 'bg-green-500' }
}

export const Register = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const recaptchaRef = useRef(null)

  const strength = getPasswordStrength(form.password)

  const completeGoogleLogin = async (payload) => {
    localStorage.setItem('token', payload.access_token)
    localStorage.setItem('user', JSON.stringify(payload.user))
    try { window.dispatchEvent(new Event('auth-changed')) } catch (e) { /* noop */ }
    toastSuccess('Đăng ký/đăng nhập Google thành công.')
    try {
      await refreshAuthOverview()
    } catch (e) { /* ignore */ }

    if (roleHasPermission(payload.user.role, 'admin_panel')) {
      navigate('/admin/dashboard')
      return
    }

    navigate('/')
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      toastError('Xác nhận mật khẩu không khớp.')
      return
    }

    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.')
      toastError('Mật khẩu phải có ít nhất 6 ký tự.')
      return
    }

    if (loading) return // guard against double-submit
    setLoading(true)
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      await apiClient.post('/auth/register', {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        recaptcha_token: recaptchaToken,
      })
      setSuccess('Đăng ký thành công. Vui lòng nhập OTP đã gửi qua email để xác minh tài khoản.')
      toastSuccess('Đăng ký thành công. Vui lòng kiểm tra OTP trong email.')
      const nextEmail = form.email.trim()
      setForm({ full_name: '', email: '', password: '', confirmPassword: '' })
      navigate(`/verify-email?email=${encodeURIComponent(nextEmail)}`)
    } catch (err) {
      const message = err?.response?.data?.detail || 'Đăng ký thất bại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async (credentialResponse) => {
    const credential = credentialResponse?.credential
    if (!credential) {
      toastInfo('Không nhận được token Google. Vui lòng thử lại.')
      return
    }

    if (loading) return
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await apiClient.post('/auth/google', {
        id_token: credential,
        full_name: form.full_name.trim() || undefined,
      })
      await completeGoogleLogin(response.data)
    } catch (err) {
      const message = err?.response?.data?.detail || 'Đăng ký/đăng nhập Google thất bại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,#e0ecff_0,#f8fafc_30%,#fff7ed_100%)] flex items-center justify-center p-4">
      <div className="fixed left-4 top-6 z-[130]">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-full px-4 py-2 bg-white/90 backdrop-blur-md border border-white/30 shadow hover:scale-105 transition-transform duration-200">
          <Home size={18} className="text-fpt-blue" />
          <span className="hidden sm:inline font-black text-sm text-fpt-blue">Trang chủ</span>
        </Link>
      </div>
      <Card className="max-w-lg w-full p-10 space-y-8 border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] rounded-[32px]">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 text-fpt-orange text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={14} /> Xác minh email bằng OTP
          </span>
          <h1 className="text-3xl font-black text-fpt-blue italic">ĐĂNG KÝ TÀI KHOẢN</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Tổ xã hội</p>
        </div>

        {error && <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 animate-[shake_0.4s_ease-in-out]">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-bold border border-green-100">{success}</div>}

        <form onSubmit={submit} className="space-y-5">
          <Input label="Họ và tên" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} autoComplete="name" required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
          <div className="space-y-2">
            <Input label="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required />
            {form.password.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{strength.label}</span>
              </div>
            )}
          </div>
          <Input label="Xác nhận mật khẩu" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} autoComplete="new-password" required />

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
                Đang đăng ký...
              </span>
            ) : 'Tạo tài khoản'}
          </Button>
          {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
        </form>

        <p className="text-center text-xs text-gray-400 mt-2">
          Trang này được bảo vệ bởi reCAPTCHA. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="underline">Chính sách bảo mật</a> và <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="underline">Điều khoản</a> của Google áp dụng.
        </p>

        {GOOGLE_OAUTH_CLIENT_ID ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">hoặc</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleRegister}
                onError={() => toastError('Đăng ký Google thất bại.')}
                disabled={loading}
              />
            </div>
          </div>
        ) : null}

        <p className="text-center text-sm text-gray-500">
          Đã có tài khoản? <Link to="/login" className="text-fpt-blue font-black hover:underline">Đăng nhập</Link>
        </p>
        <p className="text-center text-sm text-gray-500">
          Đã đăng ký nhưng chưa xác minh? <Link to="/verify-email" className="text-fpt-blue font-black hover:underline">Nhập OTP</Link>
        </p>
      </Card>
      <Suspense fallback={null}>
        <AiChatWidget />
      </Suspense>
    </div>
  )
}
