import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, Button, cn } from '../../components/UI'
import { User, Search, Shield, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const token = localStorage.getItem('token')
  let currentUser = null
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    currentUser = null
  }

  const roleOptions = [
    { value: 'student', label: 'Học sinh/sinh viên' },
    { value: 'teacher', label: 'Giáo viên' },
    { value: 'submission_judge', label: 'Người chấm bài' },
    { value: 'website_manager', label: 'Quản lý website' },
    { value: 'admin', label: 'Admin hệ thống' },
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (user) => {
    try {
      await axios.put(`${API_URL}/admin/users/${user.id}`, {
        is_active: !user.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchUsers()
      toastSuccess(!user.is_active ? 'Đã kích hoạt tài khoản.' : 'Đã khóa tài khoản.')
    } catch (err) {
      showApiError(err, 'Lỗi khi cập nhật trạng thái người dùng.')
    }
  }

  const handleDeleteUser = async (user) => {
    const confirmed = await confirmAction({
      title: 'Xóa người dùng này?',
      text: `Tài khoản ${user.email} sẽ bị xóa khỏi hệ thống.`,
      confirmButtonText: 'Xóa tài khoản',
    })
    if (!confirmed) return

    try {
      await axios.delete(`${API_URL}/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toastSuccess('Đã xóa người dùng.')
      fetchUsers()
    } catch (err) {
      showApiError(err, 'Không thể xóa người dùng.')
    }
  }

  const handleUpdateRole = async (user, nextRole) => {
    if (!nextRole || nextRole === user.role) return

    const isEditingOtherAdmin = user.role === 'admin' && user.id !== currentUser?.id
    if (isEditingOtherAdmin) {
      toastError('Không thể thay đổi quyền của tài khoản admin khác.')
      return
    }

    const confirmed = await confirmAction({
      title: 'Đổi quyền người dùng?',
      text: `Bạn sắp đổi quyền của ${user.email} thành ${nextRole}.`,
      confirmButtonText: 'Xác nhận đổi quyền',
    })
    if (!confirmed) return

    try {
      await axios.put(`${API_URL}/admin/users/${user.id}`, {
        role: nextRole,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toastSuccess('Đã cập nhật quyền người dùng.')
      fetchUsers()
    } catch (err) {
      showApiError(err, 'Không thể cập nhật quyền người dùng.')
      fetchUsers()
    }
  }

  const filteredUsers = users.filter((user) => {
    const fullName = (user.full_name || '').toLowerCase()
    const email = (user.email || '').toLowerCase()
    const query = searchTerm.toLowerCase()

    return fullName.includes(query) || email.includes(query)
  })

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên hoặc email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <User size={16} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Tổng người dùng: {users.length}</span>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-14 text-center text-slate-500">Không tìm thấy người dùng phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Họ tên</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Vai trò</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{user.full_name || 'Chưa cập nhật'}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Shield size={12} className="text-slate-400" />
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user, e.target.value)}
                          disabled={user.role === 'admin' && user.id !== currentUser?.id}
                          className={cn(
                            'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700',
                            user.role === 'admin' ? 'border-slate-700 text-slate-900' : ''
                          )}
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                        user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      )}>
                        {user.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {user.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          onClick={() => handleToggleStatus(user)}
                          variant={user.is_active ? 'danger' : 'default'}
                          size="sm"
                          className={cn(
                            'rounded-md border-none px-3 py-1.5 text-xs normal-case tracking-normal',
                            user.is_active ? 'bg-red-50 text-red-700 hover:bg-red-600 hover:text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                          )}
                        >
                          {user.is_active ? 'Khóa tài khoản' : 'Kích hoạt'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user)}
                          size="sm"
                          className="rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                          title="Xóa người dùng"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
