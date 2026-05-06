import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { Card, Button } from '@/components/UI'
import SubmissionsList from '@/components/Profile/SubmissionsList'
import { AiChatWidget } from '@/components/AiChatWidget'

export default function ProfilePublic() {
  const { userId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [error, setError] = useState(null)
  const [showAiWidget, setShowAiWidget] = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get(`/public/users/${userId}`)
        setUser(res.data.user)
        setSubmissions(res.data.submissions || [])
      } catch (e) {
        setError('Không tìm thấy trang hồ sơ công khai.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  useEffect(() => {
    // Only render AI widget here if one isn't already mounted globally
    try {
      setShowAiWidget(typeof window !== 'undefined' ? !Boolean(window.__AI_WIDGET_PRESENT) : false)
    } catch (e) {
      setShowAiWidget(false)
    }
  }, [])

  if (loading) return <div className="flex min-h-screen items-center justify-center text-gray-400 font-black">Đang tải...</div>
  if (error) return <div className="flex min-h-screen items-center justify-center text-red-500 font-bold">{error}</div>

  const avatarSrc = user?.image_url || ''

  const handleMessage = () => {
    if (user?.email) {
      window.location.href = `mailto:${user.email}`
    } else {
      alert('Người dùng không có địa chỉ liên hệ công khai.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf3] via-[#fffefb] to-[#f8fbff] px-3 py-6 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="p-6 flex items-center gap-4">
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg" />
          ) : (
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-fpt-orange to-fpt-blue flex items-center justify-center text-white font-black text-2xl border-4 border-white shadow-lg">{(user?.full_name || user?.email || '').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()}</div>
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-fpt-blue">{user?.full_name || 'Người dùng'}</h1>
                <p className="text-sm text-gray-500 mt-1">{user?.role}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => navigate('/')}>Trang chủ</Button>
                <Button variant="ghost" onClick={handleMessage}>Nhắn tin</Button>
              </div>
            </div>
          </div>
        </Card>

        <SubmissionsList mySubmissions={submissions} />
      </div>
      {showAiWidget && <AiChatWidget />}
    </div>
  )
}
