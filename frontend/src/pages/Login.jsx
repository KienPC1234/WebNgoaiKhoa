import { useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const recaptchaRef = useRef(null)

  const completeLogin = async (payload) => {
    localStorage.setItem('token', payload.access_token)
    localStorage.setItem('user', JSON.stringify(payload.user))
    try { window.dispatchEvent(new Event('auth-changed')) } catch (e) { /* noop */ }
    toastSuccess('Đăng nhập thành công.')

    try {
      await refreshAuthOverview()
    } catch (e) {
      // ignore refresh errors — fallback permissions still work
    }

    const returnTo = location.state?.from
    if (returnTo) {
      if (returnTo.startsWith('/admin') && !roleHasPermission(payload.user.role, 'admin_panel')) {
        navigate('/')
        return
      }
      navigate(returnTo)
      return
    }

    if (roleHasPermission(payload.user.role, 'admin_panel')) {
      navigate('/admin/dashboard')
      return
    }

    navigate('/')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (loading) return // guard against double-submit
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      formData.append('username', email.trim())
      formData.append('password', password)
      if (recaptchaToken) formData.append('recaptcha_token', recaptchaToken)

      const response = await apiClient.post('/auth/login', formData)
      await completeLogin(response.data)
    } catch (err) {
      const message = err?.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng thử lại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async (credentialResponse) => {
    const credential = credentialResponse?.credential
    if (!credential) {
      toastInfo('Không nhận được token Google. Vui lòng thử lại.')
      return
    }

    if (loading) return
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.post('/auth/google', {
        id_token: credential,
      })
      await completeLogin(response.data)
    } catch (err) {
      const message = err?.response?.data?.detail || 'Đăng nhập Google thất bại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#e6f4ff_0,#f8fafc_35%,#fff7ed_100%)] flex items-center justify-center p-4">
      <div className="fixed left-4 top-6 z-[130]">
        <Link to="/" className="group inline-flex items-center gap-3 rounded-full px-4 py-2 bg-white/90 backdrop-blur-md border border-white/30 shadow hover:scale-105 transition-transform duration-200">
          <Home size={18} className="text-fpt-blue" />
          <span className="hidden sm:inline font-black text-sm text-fpt-blue">Trang chủ</span>
        </Link>
      </div>
      <Card className="max-w-md w-full p-10 space-y-8 border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] rounded-[32px]">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-fpt-blue text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={14} /> Bảo mật OTP + reCAPTCHA
          </span>
          <h1 className="text-3xl font-black text-fpt-blue italic">ĐĂNG NHẬP</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Tổ xã hội</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 animate-[shake_0.4s_ease-in-out]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@email.com"
            autoComplete="email"
            required
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
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
                Đang đăng nhập...
              </span>
            ) : 'Đăng nhập'}
          </Button>
          {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
        </form>

        {GOOGLE_OAUTH_CLIENT_ID ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">hoặc</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => toastError('Đăng nhập Google thất bại.')}
                disabled={loading}
              />
            </div>
          </div>
        ) : null}

        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>
            Chưa có tài khoản? <Link to="/register" className="text-fpt-blue font-black hover:underline">Đăng ký ngay</Link>
          </p>
          <p>
            <Link to="/forgot-password" className="text-fpt-orange font-black hover:underline">Quên mật khẩu?</Link>
          </p>
          <p>
            Cần xác minh email? <Link to="/verify-email" className="text-fpt-blue font-black hover:underline">Nhập OTP</Link>
          </p>
        </div>
      </Card>
      <Suspense fallback={null}>
        <AiChatWidget />
      </Suspense>
    </div>
  )
}
