import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input } from '@/components/UI'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastInfo, toastSuccess } from '@/lib/notify'

export const Profile = () => {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const [me, setMe] = useState(null)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mySubmissions, setMySubmissions] = useState([])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    const fetchMe = async () => {
      try {
        const [meRes, submissionsRes] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/public/submissions/me'),
        ])
        const res = meRes
        setMe(res.data)
        setName(res.data.full_name || '')
        setMySubmissions(submissionsRes.data || [])
      } catch (err) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        toastInfo('Vui lòng đăng nhập lại để tiếp tục.')
        navigate('/login')
      }
    }

    fetchMe()
  }, [token, navigate])

  const saveProfile = async () => {
    setMessage('')
    setError('')
    try {
      await apiClient.put('/auth/me', { full_name: name })
      setMessage('Đã cập nhật thông tin hồ sơ.')
      toastSuccess('Đã cập nhật thông tin hồ sơ.')
    } catch (err) {
      const message = err.response?.data?.detail || 'Cập nhật hồ sơ thất bại.'
      setError(message)
      toastError(message)
    }
  }

  const handleChangePassword = async () => {
    setMessage('')
    setError('')
    try {
      await apiClient.post('/auth/password/change', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setMessage('Đã đổi mật khẩu thành công.')
      toastSuccess('Đã đổi mật khẩu thành công.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      const message = err.response?.data?.detail || 'Đổi mật khẩu thất bại.'
      setError(message)
      toastError(message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!me) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 font-black">Đang tải hồ sơ...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-8">
          <h1 className="text-3xl font-black text-fpt-blue italic mb-6">HỒ SƠ TÀI KHOẢN</h1>

          {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg font-bold">{error}</div>}
          {message && <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg font-bold">{message}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Email" value={me.email} disabled />
            <Input label="Vai trò" value={me.role} disabled />
            <Input label="Trạng thái xác minh" value={me.email_verified ? 'Đã xác minh' : 'Chưa xác minh'} disabled />
            <Input label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={saveProfile} variant="orange">Lưu hồ sơ</Button>
            <Button onClick={handleLogout} variant="danger">Đăng xuất</Button>
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-xl font-black text-fpt-blue mb-4">ĐỔI MẬT KHẨU</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input label="Mật khẩu hiện tại" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input label="Mật khẩu mới" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Button variant="orange" onClick={handleChangePassword}>Đổi mật khẩu</Button>
          </div>
        </Card>

        <Card className="p-8">
          <h2 className="text-xl font-black text-fpt-blue mb-4">BÀI THI CỦA TÔI</h2>
          {mySubmissions.length === 0 ? (
            <p className="text-gray-400 font-semibold">Bạn chưa có bài thi nào.</p>
          ) : (
            <div className="space-y-3">
              {mySubmissions.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex justify-between items-center gap-4">
                    <h3 className="font-black text-fpt-blue">{item.title}</h3>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-fpt-orange'
                    }`}>
                      {item.status === 'approved' ? 'Đã duyệt' : item.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-3">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
