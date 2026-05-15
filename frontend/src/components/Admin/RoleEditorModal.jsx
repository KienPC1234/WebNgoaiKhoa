import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input } from '@/components/UI'
import { X as XIcon } from 'lucide-react'

const KNOWN_PERMISSIONS = [
  { key: 'admin', label: 'Super admin (full access)' },
  { key: 'admin_panel', label: 'Access admin panel' },
  { key: 'user_manage', label: 'Manage users' },
  { key: 'auth_audit', label: 'Auth audit' },
  { key: 'ai_knowledge', label: 'AI knowledge' },
  { key: 'content_manage', label: 'Manage content' },
  { key: 'submission_review', label: 'Review submissions' },
  { key: 'public_user', label: 'Public user' },
]

const RoleEditorModal = ({ open, role, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState(role || { slug: '', name: '', permissions: [] })
  const [customPerm, setCustomPerm] = useState('')

  useEffect(() => {
    if (!open) return
    setForm({ slug: role?.slug || '', name: role?.name || '', permissions: role?.permissions ? [...role.permissions] : [], built_in: !!role?.built_in, id: role?.id })
  }, [open, role])

  if (!open) return null

  const togglePerm = (key) => {
    setForm((s) => {
      const perms = new Set(s.permissions || [])
      if (perms.has(key)) perms.delete(key)
      else perms.add(key)
      return { ...s, permissions: Array.from(perms) }
    })
  }

  const handleAddCustom = () => {
    const v = (customPerm || '').trim()
    if (!v) return
    setForm((s) => ({ ...s, permissions: Array.from(new Set([...(s.permissions || []), v])) }))
    setCustomPerm('')
  }

  const handleSave = async () => {
    if (!form.slug || !form.name) return
    await onSave({ slug: form.slug.trim(), name: form.name.trim(), permissions: form.permissions || [], built_in: !!form.built_in, id: form.id })
    onClose()
  }

  const handleDelete = async () => {
    if (!form.id) return
    await onDelete(form.id)
    onClose()
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{form.id ? 'Chỉnh sửa vai trò' : 'Thêm vai trò'}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><XIcon size={16} /></button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="px-3 py-2 rounded-lg border" placeholder="Slug (ví dụ: website_manager)" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!form.built_in} />
            <input className="px-3 py-2 rounded-lg border" placeholder="Tên hiển thị" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="text-sm font-semibold">Quyền</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {KNOWN_PERMISSIONS.map((p) => (
                <label key={p.key} className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(form.permissions || []).includes(p.key)} onChange={() => togglePerm(p.key)} />
                  <span className="ml-1">{p.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input className="px-3 py-2 rounded-lg border flex-1" placeholder="Thêm quyền tuỳ chỉnh (ví dụ: custom_permission)" value={customPerm} onChange={(e) => setCustomPerm(e.target.value)} />
              <Button size="sm" onClick={handleAddCustom}>Thêm</Button>
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-500">Quyền đã chọn</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(form.permissions || []).map((perm) => (
                  <div key={perm} className="rounded-full bg-gray-100 px-3 py-1 text-xs">{perm}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {form.id && !form.built_in && <Button variant="danger" onClick={handleDelete}>Xóa</Button>}
          <Button onClick={onClose} className="bg-slate-100 text-slate-700">Hủy</Button>
          <Button onClick={handleSave} className="bg-fpt-blue text-white">Lưu</Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

export default RoleEditorModal
