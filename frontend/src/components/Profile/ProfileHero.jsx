import React, { useRef, useState, useEffect } from 'react'
import { Card, Button } from '@/components/UI'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastSuccess } from '@/lib/notify'

const initials = (name) => {
  if (!name) return ''
  const parts = name.trim().split(' ')
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
  return (first + last).toUpperCase()
}

export default function ProfileHero({ me, mySubmissions = [], onEditProfile, onAvatarUpdated }) {
  const total = mySubmissions.length || 0
  const approved = mySubmissions.filter((s) => s.status === 'approved').length || 0
  const pending = mySubmissions.filter((s) => s.status !== 'approved' && s.status !== 'rejected').length || 0

  const avatarSrc = me?.image_url || me?.avatar_url || ''

  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(avatarSrc)
  const [uploading, setUploading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setPreviewUrl(avatarSrc)
  }, [avatarSrc])

  const triggerPick = () => {
    if (inputRef.current) inputRef.current.click()
  }

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)

    // Try upload to backend if available
    if (!apiClient) return

    const fd = new FormData()
    fd.append('avatar', file)
    setUploading(true)
    try {
      const res = await apiClient.post('/auth/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (onAvatarUpdated) onAvatarUpdated()
      toastSuccess('Cập nhật ảnh đại diện thành công.')
    } catch (err) {
      toastError('Không thể tải ảnh lên — ảnh chỉ hiển thị tạm thời trên trình duyệt.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="overflow-visible p-0">
      <div className="bg-gradient-to-br from-[#fff6ec] via-[#fff3e5] to-[#fffaf3] pt-8 px-6 pb-6">
        <div className="relative flex flex-col items-center">
          <div className="relative transform -translate-y-2">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            <div
              role="button"
              tabIndex={0}
              onClick={triggerPick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerPick() } }}
              className="inline-flex items-center justify-center rounded-full overflow-hidden h-28 w-28 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange/30"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="avatar" className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="h-28 w-28 rounded-full bg-gradient-to-br from-fpt-orange to-fpt-blue flex items-center justify-center text-white font-black text-2xl border-4 border-white shadow-lg">
                  {initials(me?.full_name || me?.name || me?.email)}
                </div>
              )}
            </div>

            <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2">
              <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-gray-700 shadow-sm text-sm">
                {uploading ? '...' : '✎'}
              </div>
            </div>
          </div>

          <h2 className="mt-1 text-center font-extrabold text-xl text-fpt-blue">{me?.full_name || me?.name || 'Người dùng'}</h2>
          <p className="text-sm uppercase tracking-wide text-fpt-orange font-black">{me?.role || ''}</p>
          <p className="text-sm text-gray-500 mt-1">{me?.email}</p>

          <div className="mt-4 flex gap-2">
            <Button variant="orange" onClick={onEditProfile}>Chỉnh sửa hồ sơ</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Trang chủ</Button>
            <Button variant="ghost" onClick={() => { window.open(`/profile/public/${me?.id || ''}`, '_blank') }}>Xem trang</Button>
          </div>

          <div className="mt-4 w-full grid grid-cols-3 text-center gap-2">
            <div className="px-2">
              <div className="text-[11px] text-gray-600 font-black">Bài thi</div>
              <div className="text-xl font-extrabold text-fpt-blue">{total}</div>
            </div>
            <div className="px-2">
              <div className="text-[11px] text-gray-600 font-black">Đã duyệt</div>
              <div className="text-xl font-extrabold text-green-600">{approved}</div>
            </div>
            <div className="px-2">
              <div className="text-[11px] text-gray-600 font-black">Chờ</div>
              <div className="text-xl font-extrabold text-fpt-orange">{pending}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
