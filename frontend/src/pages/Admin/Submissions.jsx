import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Card, Button, cn } from '../../components/UI'
import { CheckCircle, XCircle, Clock, Eye, Search, User, Mail, Calendar, MessageSquare } from 'lucide-react'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

export const AdminSubmissions = () => {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, approved, rejected
  const [selectedSub, setSelectedSub] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    fetchSubs()
  }, [])

  const fetchSubs = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/admin/submissions')
      const allSubs = res.data || []
      setSubs(allSubs)

      const pendingFirst = allSubs.find((item) => item.status === 'pending')
      setSelectedSub(pendingFirst || allSubs[0] || null)
    } catch (err) {
      console.error('Error fetching subs:', err)
      showApiError(err, 'Không thể tải danh sách bài dự thi.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id, status) => {
    if (updatingId) return

    const actionLabel = status === 'approved' ? 'phê duyệt' : status === 'rejected' ? 'từ chối' : 'đặt chờ duyệt'
    const confirmed = await confirmAction({
      title: 'Xác nhận cập nhật trạng thái?',
      text: `Bạn sắp ${actionLabel} bài dự thi #${id}.`,
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
    })
    if (!confirmed) return

    const target = subs.find((item) => item.id === id)
    if (!target) {
      toastError('Không tìm thấy bài dự thi để cập nhật.')
      return
    }

    const previousStatus = target.status
    setUpdatingId(id)
    setSubs((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
    if (selectedSub?.id === id) {
      setSelectedSub((prev) => ({ ...prev, status }))
    }

    try {
      await apiClient.put(`/admin/submissions/${id}/status`, { status })
      toastSuccess(status === 'approved' ? 'Đã phê duyệt bài dự thi.' : 'Đã từ chối bài dự thi.')
    } catch (err) {
      setSubs((prev) => prev.map((item) => (item.id === id ? { ...item, status: previousStatus } : item)))
      if (selectedSub?.id === id) {
        setSelectedSub((prev) => ({ ...prev, status: previousStatus }))
      }
      showApiError(err, 'Lỗi khi cập nhật trạng thái.')
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredSubs = subs.filter((sub) => {
    const studentName = (sub.student_name || '').toLowerCase()
    const title = (sub.title || '').toLowerCase()
    const query = searchTerm.toLowerCase()
    const matchesFilter = filter === 'all' || sub.status === filter
    const matchesSearch = studentName.includes(query) || title.includes(query)
    return matchesFilter && matchesSearch
  })

  const stats = {
    all: subs.length,
    pending: subs.filter((item) => item.status === 'pending').length,
    approved: subs.filter((item) => item.status === 'approved').length,
    rejected: subs.filter((item) => item.status === 'rejected').length,
  }

  useEffect(() => {
    if (!filteredSubs.length) {
      setSelectedSub(null)
      return
    }

    if (!selectedSub || !filteredSubs.some((item) => item.id === selectedSub.id)) {
      setSelectedSub(filteredSubs[0])
    }
  }, [filteredSubs, selectedSub])

  return (
    <div className="flex flex-col space-y-5 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f 
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
              )}
            >
              {f === 'all' ? `Tất cả (${stats.all})` : f === 'pending' ? `Chờ duyệt (${stats.pending})` : f === 'approved' ? `Đã duyệt (${stats.approved})` : `Từ chối (${stats.rejected})`}
            </button>
          ))}
          </div>
        
          <div className="flex w-full gap-2 lg:w-auto">
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc tiêu đề" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
            />
            </div>
            <Button
              onClick={fetchSubs}
              className="border border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-100"
            >
              Làm mới
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <div className="space-y-3 lg:col-span-5 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
              <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"></div>
              <p className="text-sm text-slate-500">Đang tải bài dự thi...</p>
            </div>
          ) : filteredSubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
              <Clock size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-500">Danh sách trống</p>
            </div>
          ) : (
            filteredSubs.map((sub) => {
              const studentName = sub.student_name || 'Ẩn danh'
              const studentEmail = sub.student_email || 'Không có email'

              return (
              <Card 
                key={sub.id} 
                onClick={() => setSelectedSub(sub)}
                className={cn(
                  'cursor-pointer rounded-xl border p-4 shadow-sm transition-colors',
                  selectedSub?.id === sub.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                      selectedSub?.id === sub.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}>
                      {studentName.charAt(0)}
                    </div>
                    <div>
                      <h4 className={cn('text-sm font-medium', selectedSub?.id === sub.id ? 'text-white' : 'text-slate-800')}>{studentName}</h4>
                      <p className={cn('text-xs', selectedSub?.id === sub.id ? 'text-white/70' : 'text-slate-500')}>{studentEmail}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-medium',
                    sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  )}>
                    {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Mới'}
                  </span>
                </div>
                <h3 className={cn('mb-1 truncate text-sm font-medium', selectedSub?.id === sub.id ? 'text-white' : 'text-slate-800')}>{sub.title}</h3>
                <p className={cn('line-clamp-2 text-xs', selectedSub?.id === sub.id ? 'text-white/70' : 'text-slate-500')}>{sub.content || 'Không có nội dung'}</p>
              </Card>
              )
            })
          )}
        </div>

        <div className="lg:col-span-7 lg:sticky lg:top-4">
          {selectedSub ? (
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden lg:max-h-[calc(100vh-220px)]">
              <div className="border-b border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="space-y-2">
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white">Bài dự thi #{selectedSub.id}</span>
                    <h2 className="max-w-2xl text-xl font-semibold text-slate-800">{selectedSub.title}</h2>
                  </div>
                  <button onClick={() => setSelectedSub(null)} className="rounded-full p-1 text-slate-400 hover:text-red-600">
                    <XCircle size={22} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <DetailBadge icon={User} label="Tác giả" value={selectedSub.student_name} />
                  <DetailBadge icon={Mail} label="Email" value={selectedSub.student_email} />
                  <DetailBadge icon={Calendar} label="Ngày gửi" value={new Date(selectedSub.created_at).toLocaleDateString('vi-VN')} />
                </div>
              </div>
              
              <div className="custom-scrollbar relative flex-1 overflow-y-auto p-6 max-h-[50vh] lg:max-h-[calc(100vh-420px)]">
                <div className="prose prose-lg max-w-none">
                  {selectedSub.attachment_url ? (
                    <a
                      href={selectedSub.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-3 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-fpt-orange"
                    >
                      Xem PDF đính kèm
                    </a>
                  ) : null}
                  <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                    <MessageSquare className="mb-3 text-slate-300" size={22} />
                    {selectedSub.content}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-200 bg-white p-5">
                <button 
                  onClick={() => handleUpdateStatus(selectedSub.id, 'rejected')}
                  disabled={selectedSub.status === 'rejected' || updatingId === selectedSub.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                >
                  <XCircle size={16} /> Từ chối
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedSub.id, 'approved')}
                  disabled={selectedSub.status === 'approved' || updatingId === selectedSub.id}
                  className="flex flex-[1.4] items-center justify-center gap-2 rounded-md border-none bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
                >
                  <CheckCircle size={16} /> {updatingId === selectedSub.id ? 'Đang cập nhật...' : 'Phê duyệt'}
                </button>
              </div>
            </Card>
          ) : (
            <div className="flex h-full flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Eye size={30} className="text-slate-300" strokeWidth={1.6} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-700">Trung tâm kiểm duyệt</p>
                <p className="text-sm text-slate-500">Vui lòng chọn một bài để xem chi tiết và duyệt.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const DetailBadge = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
    <div className="rounded-md bg-slate-100 p-2 text-slate-600">
      <Icon size={15} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="truncate text-sm font-medium text-slate-700">{value || '-'}</p>
    </div>
  </div>
)
