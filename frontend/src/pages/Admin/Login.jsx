import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, Button } from '../../components/UI'

const Input = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{label}</label>
    <input
      {...props}
      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-xl transition-all outline-none font-medium"
    />
  </div>
)

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)

      const response = await axios.post(`${API_URL}/auth/login`, formData)
      
      if (response.data.user.role !== 'admin') {
        setError('Bạn không có quyền truy cập trang quản trị.')
        return
      }

      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-10 space-y-8 border-none shadow-2xl rounded-[32px]">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-fpt-blue italic">ADMIN LOGIN</h1>
          <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em]">Ban Tổ Chức - Tổ xã hội</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@webngoaikhoa.edu.vn"
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
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-fpt-orange hover:bg-orange-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-orange-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? 'ĐANG ĐĂNG NHẬP...' : 'VÀO TRANG QUẢN TRỊ'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
