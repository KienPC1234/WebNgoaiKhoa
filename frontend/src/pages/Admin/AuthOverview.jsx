import { useMemo } from 'react'
import { Shield, Users, Globe, FileCheck2, Lock, AlertTriangle } from 'lucide-react'
import { Card, cn } from '@/components/UI'

const ROLE_LABELS = {
  admin: 'Admin hệ thống',
  website_manager: 'Quản lý website',
  submission_judge: 'Người chấm bài',
  teacher: 'Giáo viên',
  student: 'Học sinh/sinh viên',
}

const ROLE_CAPABILITIES = {
  admin: ['Truy cập toàn bộ admin panel', 'Quản lý người dùng', 'Đổi quyền người dùng', 'Quản lý nội dung website', 'Duyệt bài dự thi'],
  website_manager: ['Truy cập admin panel', 'Quản lý bài viết/sự kiện/CMS', 'Không được quản lý user'],
  submission_judge: ['Truy cập admin panel', 'Duyệt bài dự thi', 'Không được quản lý website'],
  teacher: ['Không có quyền admin panel'],
  student: ['Không có quyền admin panel'],
}

const ADMIN_PANEL_ROLES = new Set(['admin', 'website_manager', 'submission_judge'])
const WEBSITE_MANAGER_ROLES = new Set(['admin', 'website_manager'])
const SUBMISSION_REVIEW_ROLES = new Set(['admin', 'submission_judge'])

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

  const checks = useMemo(() => {
    return [
      {
        label: 'Đăng nhập',
        ok: Boolean(token),
        detail: token ? 'Có token phiên đăng nhập' : 'Chưa có token',
      },
      {
        label: 'Truy cập admin panel',
        ok: ADMIN_PANEL_ROLES.has(role),
        detail: `Vai trò hiện tại: ${ROLE_LABELS[role] || role}`,
      },
      {
        label: 'Quyền quản lý website',
        ok: WEBSITE_MANAGER_ROLES.has(role),
        detail: WEBSITE_MANAGER_ROLES.has(role) ? 'Được phép quản lý bài viết/CMS' : 'Không có quyền quản lý nội dung website',
      },
      {
        label: 'Quyền duyệt bài',
        ok: SUBMISSION_REVIEW_ROLES.has(role),
        detail: SUBMISSION_REVIEW_ROLES.has(role) ? 'Được phép duyệt bài dự thi' : 'Không có quyền duyệt bài',
      },
      {
        label: 'Bảo vệ role admin',
        ok: true,
        detail: 'Hệ thống chặn thay đổi role của tài khoản admin khác (kiểm tra ở API và giao diện Users).',
      },
    ]
  }, [role, token])

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
            <Shield size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tổng quan xác thực và phân quyền</h1>
            <p className="mt-1 text-sm text-slate-600">
              Màn hình này tổng hợp trạng thái auth hiện tại và policy phân quyền theo vai trò.
            </p>
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
                <th className="px-4 py-3">Khả năng</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <tr key={key} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    <div className="inline-flex items-center gap-2">
                      {key === 'admin' ? <Lock size={14} /> : key === 'website_manager' ? <Globe size={14} /> : key === 'submission_judge' ? <FileCheck2 size={14} /> : <Users size={14} />}
                      {label}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <ul className="space-y-1">
                      {ROLE_CAPABILITIES[key].map((capability) => (
                        <li key={capability}>- {capability}</li>
                      ))}
                    </ul>
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
            <p className="mt-1 text-sm text-amber-700">
              Tài khoản có role admin chỉ nên cấp cho người quản trị hệ thống. Admin không được thay đổi role của admin khác,
              và quy tắc này được thực thi đồng thời ở frontend và backend.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
