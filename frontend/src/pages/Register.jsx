import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/UI'
import { GoogleLogin } from '@react-oauth/google'
import ReCAPTCHA from 'react-google-recaptcha'
import { ShieldCheck, Home } from 'lucide-react'
import { useRef } from 'react'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastInfo, toastSuccess } from '@/lib/notify'
import { AiChatWidget } from '@/components/AiChatWidget'
import { refreshAuthOverview, roleHasPermission } from '@/lib/rolePolicy'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
const GOOGLE_OAUTH_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || ''

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

  const completeLogin = async (payload) => {
    localStorage.setItem('token', payload.access_token)
    localStorage.setItem('user', JSON.stringify(payload.user))
    // notify other parts of the app (same-tab listeners) that auth changed
    try { window.dispatchEvent(new Event('auth-changed')) } catch (e) {}
    toastSuccess('Đăng nhập bằng Google thành công.')
    try {
      await refreshAuthOverview()
    } catch (e) {}

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

    setLoading(true)
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      await apiClient.post('/auth/register', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        recaptcha_token: recaptchaToken,
      })
      setSuccess('Đăng ký thành công. Vui lòng nhập OTP đã gửi qua email để xác minh tài khoản.')
      toastSuccess('Đăng ký thành công. Vui lòng kiểm tra OTP trong email.')
      const nextEmail = form.email
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

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await apiClient.post('/auth/google', {
        id_token: credential,
        full_name: form.full_name || undefined,
      })
      await completeLogin(response.data)
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

        {error && <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-bold border border-green-100">{success}</div>}

        <form onSubmit={submit} className="space-y-5">
          <Input label="Họ và tên" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Input label="Xác nhận mật khẩu" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

          <Button type="submit" disabled={loading} variant="orange" className="w-full py-4 rounded-xl font-black text-lg">
            {loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}
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
              <GoogleLogin onSuccess={handleGoogleRegister} onError={() => toastError('Đăng ký Google thất bại.')} />
            </div>
          </div>
        ) : null}

        <p className="text-center text-sm text-gray-500">
          Đã có tài khoản? <Link to="/login" className="text-fpt-blue font-black">Đăng nhập</Link>
        </p>
        <p className="text-center text-sm text-gray-500">
          Đã đăng ký nhưng chưa xác minh? Vui lòng kiểm tra email để nhập mã OTP.
        </p>
      </Card>
      <AiChatWidget />
    </div>
  )
}
