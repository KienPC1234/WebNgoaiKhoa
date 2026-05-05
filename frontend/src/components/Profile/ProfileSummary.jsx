import React from 'react'
import { User, Mail, Shield, BadgeCheck, Save, LogOut } from 'lucide-react'

const InfoField = ({ icon: Icon, label, value, verified }) => (
  <div className="flex items-start gap-3 rounded-2xl bg-gray-50/80 px-4 py-3.5 transition-colors hover:bg-gray-50">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm shadow-gray-100/80">
      <Icon size={15} className="text-gray-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-gray-700 truncate">{value || '—'}</p>
        {verified !== undefined && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
            verified
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-amber-50 text-amber-600'
          }`}>
            {verified ? 'Đã xác minh' : 'Chưa xác minh'}
          </span>
        )}
      </div>
    </div>
  </div>
)

export default function ProfileSummary({ me, name, setName, onSave, onLogout, error, message }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fpt-blue to-blue-600">
            <User size={14} className="text-white" />
          </div>
          Thông tin tài khoản
        </h2>
        <p className="mt-1 text-xs text-gray-400 font-medium ml-10">Quản lý thông tin cá nhân của bạn</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-black text-red-500">!</span>
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-black text-emerald-600">✓</span>
          {message}
        </div>
      )}

      {/* Read-only info */}
      <div className="space-y-2">
        <InfoField icon={Mail} label="Email" value={me.email} />
        <InfoField icon={Shield} label="Vai trò" value={me.role} />
        <InfoField icon={BadgeCheck} label="Trạng thái xác minh" value={me.email_verified ? 'Đã xác minh' : 'Chưa xác minh'} verified={me.email_verified} />
      </div>

      {/* Editable name */}
      <div className="rounded-2xl border-2 border-fpt-orange/10 bg-gradient-to-br from-orange-50/40 to-amber-50/20 p-4">
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
          <User size={12} />
          Họ và tên
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nhập họ và tên..."
          className="w-full rounded-xl border-2 border-transparent bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all placeholder:text-gray-300 focus:border-fpt-orange focus:outline-none focus:ring-2 focus:ring-fpt-orange/20"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fpt-orange to-orange-400 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-200/50 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        >
          <Save size={14} />
          Lưu hồ sơ
        </button>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-xs font-bold text-red-500 transition-all hover:bg-red-50 hover:border-red-300"
        >
          <LogOut size={14} />
          Đăng xuất
        </button>
      </div>
    </div>
  )
}
