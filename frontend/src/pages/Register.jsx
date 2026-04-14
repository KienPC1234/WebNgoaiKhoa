import { useState } from 'react'
import { Link } from 'react-router-dom'
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

export const Register = () => {
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
      setForm({ full_name: '', email: '', password: '', confirmPassword: '' })
    } catch (err) {
      const message = err?.response?.data?.detail || 'Đăng ký thất bại.'
      setError(message)
      toastError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_80%_10%,#e0ecff_0,#f8fafc_30%,#fff7ed_100%)] flex items-center justify-center p-4">
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

        <p className="text-center text-sm text-gray-500">
          Đã có tài khoản? <Link to="/login" className="text-fpt-blue font-black">Đăng nhập</Link>
        </p>
        <p className="text-center text-sm text-gray-500">
          Đã đăng ký nhưng chưa xác minh? <Link to="/verify-email" className="text-fpt-orange font-black">Nhập OTP</Link>
        </p>
      </Card>
    </div>
  )
}
