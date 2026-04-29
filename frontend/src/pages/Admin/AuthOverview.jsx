import { useMemo, useEffect, useState } from 'react'
import { Shield, Users, Globe, FileCheck2, Lock, AlertTriangle, Edit3, Trash2, Plus } from 'lucide-react'
import { Card, cn, Button } from '@/components/UI'
import { cmsService } from '@/lib/cmsService'
import RoleEditorModal from '@/components/Admin/RoleEditorModal'
import { toastSuccess, showApiError, confirmAction } from '@/lib/notify'

const toBoolLabel = (value) => (value ? 'Có' : 'Không')

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const AuthOverview = () => {
  const token = localStorage.getItem('token')
  const currentUser = getUserFromStorage()
  const role = currentUser?.role || 'unknown'

  const [overview, setOverview] = useState(null)
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)

  const fetch = async () => {
    setLoading(true)
    try {
      const o = await cmsService.getAuthOverview()
      setOverview(o)
      setRoles(o.role_details || [])
    } catch (err) {
      showApiError(err, 'Không tải được dữ liệu phân quyền')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const checks = useMemo(() => {
    const perms = overview?.permissions || {}
    const myPerms = perms[role] || []
    const has = (p) => myPerms.includes(p) || myPerms.includes('admin')
    return [
      { label: 'Đăng nhập', ok: Boolean(token), detail: token ? 'Có token phiên đăng nhập' : 'Chưa có token' },
      { label: 'Truy cập admin panel', ok: has('admin_panel'), detail: `Vai trò hiện tại: ${overview?.role_details?.find(r => r.slug === role)?.name || role}` },
      { label: 'Quyền quản lý website', ok: has('content_manage'), detail: has('content_manage') ? 'Được phép quản lý bài viết/CMS' : 'Không có quyền quản lý nội dung website' },
      { label: 'Quyền duyệt bài', ok: has('submission_review'), detail: has('submission_review') ? 'Được phép duyệt bài dự thi' : 'Không có quyền duyệt bài' },
      { label: 'Bảo vệ role admin', ok: true, detail: 'Hệ thống chặn thay đổi role của tài khoản admin khác (kiểm tra ở API và giao diện Users).' },
    ]
  }, [overview, role, token])

  const openCreate = () => { setEditingRole(null); setEditorOpen(true) }
  const openEdit = (r) => { setEditingRole(r); setEditorOpen(true) }

  const handleSaveRole = async (payload) => {
    try {
      if (payload.id) {
        await cmsService.updateRole(payload.id, { slug: payload.slug, name: payload.name, permissions: payload.permissions, built_in: payload.built_in })
        toastSuccess('Cập nhật vai trò thành công')
      } else {
        await cmsService.createRole({ slug: payload.slug, name: payload.name, permissions: payload.permissions, built_in: payload.built_in })
        toastSuccess('Tạo vai trò mới thành công')
      }
      await fetch()
    } catch (err) {
      showApiError(err, 'Lưu vai trò thất bại')
      throw err
    }
  }

  const handleDeleteRole = async (id) => {
    const ok = await confirmAction({ title: 'Xóa vai trò?', text: 'Hành động này sẽ xóa vai trò nếu không có user nào đang gán.' })
    if (!ok) return
    try {
      await cmsService.deleteRole(id)
      toastSuccess('Xóa vai trò thành công')
      await fetch()
    } catch (err) {
      showApiError(err, 'Xóa vai trò thất bại')
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Shield size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Tổng quan xác thực và phân quyền</h1>
                <p className="mt-1 text-sm text-slate-600">Màn hình này tổng hợp trạng thái auth hiện tại và policy phân quyền theo vai trò.</p>
              </div>
              <div>
                <Button onClick={openCreate} className="inline-flex items-center gap-2"><Plus size={14} /> Thêm vai trò</Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Trạng thái phiên hiện tại</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {checks.map((item) => (
            <div
              key={item.label}
              className={cn(
                'rounded-xl border px-4 py-3',
                item.ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/70'
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
                    item.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {toBoolLabel(item.ok)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Ma trận vai trò</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Quyền</th>
                <th className="px-4 py-3">Người đang gán</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {(roles || []).map((r) => (
                <tr key={r.slug} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    <div className="inline-flex items-center gap-2">
                      {r.slug === 'admin' ? <Lock size={14} /> : r.slug === 'website_manager' ? <Globe size={14} /> : r.slug === 'submission_judge' ? <FileCheck2 size={14} /> : <Users size={14} />}
                      {r.name || r.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex flex-wrap gap-2">
                      {(r.permissions || []).map((p) => (
                        <div key={p} className="rounded-full bg-gray-100 px-3 py-1 text-xs">{p}</div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{(overview?.roles && overview.roles[r.slug]) || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(r)} className="text-slate-600 hover:text-slate-900 flex items-center gap-2"><Edit3 size={14} /> Chỉnh sửa</button>
                      {!r.built_in && <button onClick={() => handleDeleteRole(r.id)} className="text-red-600 hover:text-red-800 flex items-center gap-2"><Trash2 size={14} /> Xóa</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Lưu ý bảo mật quan trọng</p>
            <p className="mt-1 text-sm text-amber-700">Tài khoản có role admin chỉ nên cấp cho người quản trị hệ thống. Admin không được thay đổi role của admin khác, và quy tắc này được thực thi đồng thời ở frontend và backend.</p>
          </div>
        </div>
      </Card>

      <RoleEditorModal open={editorOpen} role={editingRole} onClose={() => setEditorOpen(false)} onSave={handleSaveRole} onDelete={async (id) => { await handleDeleteRole(id) }} />
    </div>
  )
}
