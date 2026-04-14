import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/UI'
import ReCAPTCHA from 'react-google-recaptcha'
import { ShieldCheck } from 'lucide-react'
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

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const recaptchaRef = useRef(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)

      formData.append('username', email)
      formData.append('password', password)
      if (recaptchaToken) formData.append('recaptcha_token', recaptchaToken)

      const response = await apiClient.post('/auth/login', formData)
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      toastSuccess('Đăng nhập thành công.')

      if (response.data.user.role === 'admin') {
        navigate('/admin/dashboard')
        return
      }

      navigate('/')
    } catch (err) {
      const message = err?.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng thử lại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#e6f4ff_0,#f8fafc_35%,#fff7ed_100%)] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-10 space-y-8 border border-white/60 bg-white/90 backdrop-blur-xl shadow-[0_30px_80px_-45px_rgba(15,23,42,0.4)] rounded-[32px]">
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-fpt-blue text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={14} /> Bảo mật OTP + reCAPTCHA
          </span>
          <h1 className="text-3xl font-black text-fpt-blue italic">ĐĂNG NHẬP</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Tổ xã hội</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100">
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
            required
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" disabled={loading} variant="orange" className="w-full py-4 rounded-xl font-black text-lg">
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
          {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
        </form>

        <div className="text-center text-sm text-gray-500 space-y-2">
          <p>
            Chưa có tài khoản? <Link to="/register" className="text-fpt-blue font-black">Đăng ký ngay</Link>
          </p>
          <p>
            Cần xác minh email? <Link to="/verify-email" className="text-fpt-orange font-black">Xác minh tài khoản</Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
