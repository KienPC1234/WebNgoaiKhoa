import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastInfo, toastSuccess } from '@/lib/notify'
import { roleHasPermission } from '@/lib/rolePolicy'

export default function useProfile() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const [me, setMe] = useState(null)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mySubmissions, setMySubmissions] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchMe = useCallback(async () => {
    if (!token) {
      navigate('/login', { state: { from: typeof window !== 'undefined' ? window.location.pathname : '/' } })
      return
    }
    setLoading(true)
    try {
      // First fetch the authenticated user info. Then only attempt
      // to fetch contestant-only submissions when the user's role
      // has the `contestant` permission to avoid 403 errors.
      const meRes = await apiClient.get('/auth/me')
      const res = meRes
      setMe(res.data)
      setName(res.data.full_name || '')

      let submissions = []
      try {
        const userRole = res.data?.role
        if (roleHasPermission(userRole, 'contestant')) {
          const submissionsRes = await apiClient.get('/public/submissions/me')
          submissions = submissionsRes.data || []
        }
      } catch (err) {
        // Ignore errors when fetching contestant-only data (e.g., 403)
        submissions = []
      }

      setMySubmissions(submissions)
    } catch (err) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      toastInfo('Vui lòng đăng nhập lại để tiếp tục.')
      navigate('/login', { state: { from: typeof window !== 'undefined' ? window.location.pathname : '/' } })
    } finally {
      setLoading(false)
    }
  }, [token, navigate])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

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

  const changePassword = async () => {
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

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return {
    me,
    name,
    setName,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    message,
    error,
    mySubmissions,
    loading,
    fetchMe,
    saveProfile,
    changePassword,
    logout,
  }
}
