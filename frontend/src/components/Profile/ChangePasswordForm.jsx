import React from 'react'
import { Card, Button, Input } from '@/components/UI'

export default function ChangePasswordForm({ currentPassword, newPassword, setCurrentPassword, setNewPassword, onChangePassword }) {
  return (
    <Card className="border border-orange-100/80 bg-white/95 p-6 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.4)] md:p-8">
      <h2 className="mb-4 text-2xl font-black leading-tight text-fpt-blue">ĐỔI MẬT KHẨU</h2>
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        <Input label="Mật khẩu hiện tại" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <Input label="Mật khẩu mới" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Button variant="orange" onClick={onChangePassword}>Đổi mật khẩu</Button>
      </div>
    </Card>
  )
}
