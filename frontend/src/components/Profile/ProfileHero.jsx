import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { toastError, toastSuccess } from '@/lib/notify'
import { Camera, Edit3, Home, ExternalLink, FileText, CheckCircle2, Clock } from 'lucide-react'

const initials = (name) => {
  if (!name) return ''
  const parts = name.trim().split(' ')
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
  return (first + last).toUpperCase()
}

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white/60 backdrop-blur-sm px-3 py-3 transition-all hover:bg-white hover:shadow-md hover:shadow-gray-100/50">
    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color} transition-transform group-hover:scale-110`}>
      <Icon size={16} className="text-white" />
    </div>
    <span className="text-lg font-black text-gray-800 leading-none">{value}</span>
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
  </div>
)

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

    if (!apiClient) return

    const fd = new FormData()
    fd.append('avatar', file)
    setUploading(true)
    try {
      await apiClient.post('/auth/me/avatar', fd, {
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

  const displayName = me?.full_name || me?.name || 'Người dùng'
  const roleDisplay = me?.role || ''

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white shadow-xl shadow-gray-200/40">
      {/* Decorative top gradient */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-fpt-orange via-orange-400 to-amber-300 opacity-90" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3)_0%,transparent_60%)]" />

      {/* Content */}
      <div className="relative px-6 pt-8 pb-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            {/* Gradient ring */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-fpt-orange via-amber-400 to-fpt-blue opacity-70 blur-[2px] transition-opacity group-hover:opacity-100" />

            <div
              role="button"
              tabIndex={0}
              onClick={triggerPick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerPick() } }}
              className="relative inline-flex items-center justify-center rounded-full overflow-hidden h-24 w-24 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange/50"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="avatar" className="h-24 w-24 rounded-full object-cover border-[3px] border-white shadow-lg" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-fpt-orange to-fpt-blue flex items-center justify-center text-white font-black text-2xl border-[3px] border-white shadow-lg">
                  {initials(displayName)}
                </div>
              )}

              {/* Upload overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                {uploading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Camera size={18} className="text-white" />
                )}
              </div>
            </div>
          </div>

          {/* Name & info */}
          <h2 className="mt-4 text-center text-lg font-black text-gray-800 leading-tight">{displayName}</h2>
          {roleDisplay && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-fpt-orange/10 to-amber-100/50 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-fpt-orange">
              {roleDisplay}
            </span>
          )}
          <p className="mt-1.5 text-xs text-gray-400 font-medium">{me?.email}</p>

          {/* Action buttons */}
          <div className="mt-4 flex w-full gap-2">
            <button
              onClick={onEditProfile}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-fpt-orange to-orange-400 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-200/50 transition-all hover:shadow-lg hover:shadow-orange-200/60 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Edit3 size={13} />
              Sửa hồ sơ
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 hover:border-gray-300"
            >
              <Home size={13} />
            </button>
            <button
              onClick={() => window.open(`/profile/public/${me?.id || ''}`, '_blank')}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 hover:border-gray-300"
            >
              <ExternalLink size={13} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          <StatCard icon={FileText} label="Bài thi" value={total} color="bg-gradient-to-br from-blue-500 to-blue-600" />
          <StatCard icon={CheckCircle2} label="Đã duyệt" value={approved} color="bg-gradient-to-br from-emerald-500 to-green-600" />
          <StatCard icon={Clock} label="Chờ duyệt" value={pending} color="bg-gradient-to-br from-fpt-orange to-amber-500" />
        </div>
      </div>
    </div>
  )
}
