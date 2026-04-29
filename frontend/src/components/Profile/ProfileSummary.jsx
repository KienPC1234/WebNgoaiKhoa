import React from 'react'
import { Card, Button, Input } from '@/components/UI'

export default function ProfileSummary({ me, name, setName, onSave, onLogout, error, message }) {
  return (
    <Card className="border border-orange-100/80 bg-white/95 p-6 shadow-[0_28px_64px_-40px_rgba(15,23,42,0.45)] md:p-8">
      <h1 className="mb-6 text-3xl font-black italic leading-tight text-fpt-blue md:text-4xl">HỒ SƠ TÀI KHOẢN</h1>

      {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg font-bold">{error}</div>}
      {message && <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg font-bold">{message}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input label="Email" value={me.email} disabled />
        <Input label="Vai trò" value={me.role} disabled />
        <Input label="Trạng thái xác minh" value={me.email_verified ? 'Đã xác minh' : 'Chưa xác minh'} disabled />
        <Input label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onSave} variant="orange">Lưu hồ sơ</Button>
        <Button onClick={onLogout} variant="danger">Đăng xuất</Button>
      </div>
    </Card>
  )
}
