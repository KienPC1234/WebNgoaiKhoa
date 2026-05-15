import React, { useMemo } from 'react'
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const PasswordStrength = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' }
    let score = 0
    if (password.length >= 6) score++
    if (password.length >= 10) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 1) return { score: 1, label: 'Yếu', color: 'bg-red-400' }
    if (score <= 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-400' }
    if (score <= 3) return { score: 3, label: 'Khá', color: 'bg-blue-400' }
    return { score: 4, label: 'Mạnh', color: 'bg-emerald-400' }
  }, [password])

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength.score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-bold ${
        strength.score <= 1 ? 'text-red-400' : strength.score <= 2 ? 'text-amber-500' : strength.score <= 3 ? 'text-blue-500' : 'text-emerald-500'
      }`}>
        Độ mạnh: {strength.label}
      </p>
    </div>
  )
}

const PasswordInput = ({ label, value, onChange, placeholder }) => {
  const [show, setShow] = React.useState(false)

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <Lock size={11} />
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-xl border-2 border-transparent bg-gray-50 px-4 py-3 pr-10 text-sm font-bold text-gray-700 transition-all placeholder:text-gray-300 focus:border-fpt-orange focus:bg-white focus:outline-none focus:ring-2 focus:ring-fpt-orange/20"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePasswordForm({ currentPassword, newPassword, setCurrentPassword, setNewPassword, onChangePassword }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
            <ShieldCheck size={14} className="text-white" />
          </div>
          Đổi mật khẩu
        </h2>
        <p className="mt-1 text-xs text-gray-400 font-medium ml-10">Cập nhật mật khẩu để bảo vệ tài khoản</p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border-2 border-gray-100 bg-gray-50/50 p-5 space-y-4">
        <PasswordInput
          label="Mật khẩu hiện tại"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Nhập mật khẩu hiện tại..."
        />

        <div>
          <PasswordInput
            label="Mật khẩu mới"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới..."
          />
          <PasswordStrength password={newPassword} />
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onChangePassword}
        disabled={!currentPassword || !newPassword}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fpt-orange to-orange-400 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-orange-200/50 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
      >
        <KeyRound size={14} />
        Đổi mật khẩu
      </button>
    </div>
  )
}
