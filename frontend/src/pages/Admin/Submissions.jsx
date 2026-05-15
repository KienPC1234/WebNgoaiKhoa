import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Card, Button, cn } from '../../components/UI'
import { 
  CheckCircle, XCircle, Clock, Eye, Search, 
  Calendar, Trash2, Filter, 
  FileText, CheckSquare, Square, Download, RefreshCcw, ThumbsUp,
  Paperclip, X
} from 'lucide-react'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

export const AdminSubmissions = () => {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, approved, rejected
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, votes
  const [hasAttachmentFilter, setHasAttachmentFilter] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([])
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    fetchSubs()
  }, [])

  const fetchSubs = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/admin/submissions')
      const allSubs = res.data || []
      setSubs(allSubs)

      if (!selectedSub) {
        const pendingFirst = allSubs.find((item) => item.status === 'pending')
        setSelectedSub(pendingFirst || allSubs[0] || null)
      }
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
      text: `Bạn sắp ${actionLabel} bài dự thi #${id}. ${status === 'rejected' ? 'Lý do từ chối sẽ được lưu lại.' : ''}`,
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
    const previousReason = target.rejection_reason
    
    setUpdatingId(id)
    setSubs((prev) => prev.map((item) => (item.id === id ? { ...item, status, rejection_reason: status === 'rejected' ? rejectionReason : null } : item)))
    if (selectedSub?.id === id) {
      setSelectedSub((prev) => ({ ...prev, status, rejection_reason: status === 'rejected' ? rejectionReason : null }))
    }

    try {
      await apiClient.put(`/admin/submissions/${id}/status`, { 
        status, 
        rejection_reason: status === 'rejected' ? rejectionReason : null 
      })
      toastSuccess(status === 'approved' ? 'Đã phê duyệt bài dự thi.' : 'Đã từ chối bài dự thi.')
      if (status === 'rejected') setRejectionReason('')
    } catch (err) {
      setSubs((prev) => prev.map((item) => (item.id === id ? { ...item, status: previousStatus, rejection_reason: previousReason } : item)))
      if (selectedSub?.id === id) {
        setSelectedSub((prev) => ({ ...prev, status: previousStatus, rejection_reason: previousReason }))
      }
      showApiError(err, 'Lỗi khi cập nhật trạng thái.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmAction({
      title: 'Xác nhận xóa bài thi?',
      text: 'Hành động này sẽ xóa vĩnh viễn bài dự thi và không thể hoàn tác.',
      confirmButtonText: 'Xóa ngay',
      confirmButtonColor: '#ef4444'
    })
    if (!confirmed) return

    try {
      await apiClient.delete(`/admin/submissions/${id}`)
      toastSuccess('Đã xóa bài dự thi.')
      setSubs(prev => prev.filter(s => s.id !== id))
      if (selectedSub?.id === id) setSelectedSub(null)
      setSelectedIds(prev => prev.filter(sid => sid !== id))
    } catch (err) {
      showApiError(err, 'Lỗi khi xóa bài dự thi.')
    }
  }

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) return
    const confirmed = await confirmAction({
      title: `Xác nhận ${status === 'approved' ? 'duyệt' : 'từ chối'} hàng loạt?`,
      text: `Bạn đang chọn ${selectedIds.length} bài dự thi để ${status === 'approved' ? 'phê duyệt' : 'từ chối'}.`
    })
    if (!confirmed) return

    try {
      await apiClient.post('/admin/submissions/bulk-status', { ids: selectedIds, status })
      toastSuccess(`Đã cập nhật ${selectedIds.length} bài.`)
      setSubs(prev => prev.map(s => selectedIds.includes(s.id) ? { ...s, status } : s))
      setSelectedIds([])
    } catch (err) {
      showApiError(err, 'Lỗi cập nhật hàng loạt.')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    const confirmed = await confirmAction({
      title: 'Xóa hàng loạt?',
      text: `Bạn sắp xóa vĩnh viễn ${selectedIds.length} bài dự thi đã chọn.`,
      confirmButtonText: 'Xóa tất cả',
      confirmButtonColor: '#ef4444'
    })
    if (!confirmed) return

    try {
      await apiClient.delete('/admin/submissions/bulk-delete', { data: { ids: selectedIds } })
      toastSuccess(`Đã xóa ${selectedIds.length} bài.`)
      setSubs(prev => prev.filter(s => !selectedIds.includes(s.id)))
      setSelectedIds([])
      if (selectedSub && selectedIds.includes(selectedSub.id)) setSelectedSub(null)
    } catch (err) {
      showApiError(err, 'Lỗi xóa hàng loạt.')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSubs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSubs.map(s => s.id))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id])
  }

  const filteredSubs = subs.filter((sub) => {
    const studentName = (sub.student_name || '').toLowerCase()
    const title = (sub.title || '').toLowerCase()
    const query = searchTerm.toLowerCase()
    const matchesFilter = filter === 'all' || sub.status === filter
    const matchesSearch = studentName.includes(query) || title.includes(query)
    const matchesAttachment = !hasAttachmentFilter || !!sub.attachment_url
    return matchesFilter && matchesSearch && matchesAttachment
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'votes') return (b.votes || 0) - (a.votes || 0)
    return 0
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
  }, [filteredSubs.length]) // Only re-evaluate if count changes

  useEffect(() => {
    setShowRejectForm(false)
    setRejectionReason('')
  }, [selectedSub?.id])

  return (
    <div className="flex flex-col space-y-5 pb-8">
      {/* Header Controls */}
      <Card className="rounded-2xl border border-slate-200 p-4 shadow-sm bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm border',
                  filter === f 
                    ? 'bg-slate-900 text-white border-slate-900 scale-105'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                {f === 'all' ? `Tất cả (${stats.all})` : f === 'pending' ? `Chờ duyệt (${stats.pending})` : f === 'approved' ? `Đã duyệt (${stats.approved})` : `Từ chối (${stats.rejected})`}
              </button>
            ))}
            </div>
          
            <div className="flex items-center gap-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Tìm tên hoặc tiêu đề..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full lg:w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:bg-white transition-all shadow-inner"
                />
              </div>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-slate-400"
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="votes">Nhiều vote nhất</option>
              </select>

              <button
                onClick={() => setHasAttachmentFilter(!hasAttachmentFilter)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all",
                  hasAttachmentFilter ? "bg-orange-50 border-orange-200 text-fpt-orange" : "bg-slate-50 border-slate-200 text-slate-400"
                )}
                title="Lọc bài có đính kèm"
              >
                <Filter size={18} />
              </button>
              
              <button onClick={fetchSubs} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm">
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-4 bg-slate-900 text-white px-5 py-3 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <CheckSquare size={20} className="text-emerald-400" />
                <span className="text-sm font-black">Đã chọn {selectedIds.length} bài dự thi</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => handleBulkStatus('approved')}
                  className="bg-emerald-500 hover:bg-emerald-600 border-none text-white px-4 py-1.5 text-xs font-black rounded-lg"
                >
                  DUYỆT HÀNG LOẠT
                </Button>
                <Button 
                   onClick={() => handleBulkStatus('rejected')}
                  className="bg-amber-500 hover:bg-amber-600 border-none text-white px-4 py-1.5 text-xs font-black rounded-lg"
                >
                  TỪ CHỐI
                </Button>
                <Button 
                  onClick={handleBulkDelete}
                  className="bg-red-500 hover:bg-red-600 border-none text-white px-4 py-1.5 text-xs font-black rounded-lg"
                >
                  <Trash2 size={14} className="mr-1" /> XÓA
                </Button>
                <div className="w-px h-6 bg-white/20 mx-1"></div>
                <button onClick={() => setSelectedIds([])} className="text-xs font-bold hover:underline opacity-80">Hủy chọn</button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Left Sidebar: List */}
        <div className="space-y-3 lg:col-span-5 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-2 custom-scrollbar">
          <div className="flex items-center justify-between px-2 mb-2">
             <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
             >
               {selectedIds.length === filteredSubs.length && filteredSubs.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
               CHỌN TẤT CẢ
             </button>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               Hiển thị {filteredSubs.length} kết quả
             </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-slate-900"></div>
              <p className="text-sm font-bold text-slate-500">Đang đồng bộ dữ liệu...</p>
            </div>
          ) : filteredSubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
              <Clock size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Không tìm thấy bài dự thi nào khớp với bộ lọc.</p>
            </div>
          ) : (
            filteredSubs.map((sub) => {
              const isSelected = selectedIds.includes(sub.id)
              const isCurrent = selectedSub?.id === sub.id

              return (
              <Card 
                key={sub.id} 
                onClick={() => setSelectedSub(sub)}
                className={cn(
                  'group relative cursor-pointer rounded-2xl border p-5 shadow-sm transition-all duration-300 overflow-hidden',
                  isCurrent ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2' : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md'
                )}
              >
                <div 
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center transition-opacity z-10",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(sub.id); }}
                >
                   {isSelected ? <CheckSquare size={20} className={isCurrent ? "text-emerald-400" : "text-slate-900"} /> : <Square size={20} className={isCurrent ? "text-white/40" : "text-slate-300"} />}
                </div>

                <div className={cn("transition-transform duration-300", isSelected ? "translate-x-6" : "group-hover:translate-x-6")}>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black shadow-sm transition-colors',
                        isCurrent ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      )}>
                        {(sub.student_name || 'A').charAt(0)}
                      </div>
                      <div>
                        <h4 className={cn('text-sm font-black line-clamp-1', isCurrent ? 'text-white' : 'text-slate-800')}>{sub.student_name || 'Ẩn danh'}</h4>
                        <p className={cn('text-[10px] font-bold uppercase tracking-tight', isCurrent ? 'text-white/60' : 'text-slate-400')}>{sub.student_email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        'rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border',
                        sub.status === 'approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        sub.status === 'rejected' ? 'bg-red-50 border-red-100 text-red-600' :
                        'bg-amber-50 border-amber-100 text-amber-600'
                      )}>
                        {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                      </span>
                      {sub.attachment_url && <FileText size={14} className={isCurrent ? "text-emerald-400" : "text-fpt-orange"} />}
                    </div>
                  </div>
                  
                  <h3 className={cn('mb-2 line-clamp-1 text-base font-black', isCurrent ? 'text-white' : 'text-slate-800')}>{sub.title}</h3>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100/10">
                    <div className="flex items-center gap-3 text-[10px] font-bold opacity-60">
                       <span className="flex items-center gap-1"><ThumbsUp size={14} /> {sub.votes || 0} vote</span>
                       <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(sub.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}
                      className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600", isCurrent ? "text-white/50 hover:text-white hover:bg-white/10" : "text-slate-300")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
              )
            })
          )}
        </div>

        {/* Right Content: Detail */}
        <div className="lg:col-span-7 lg:sticky lg:top-24">
          {selectedSub ? (
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-lg flex flex-col overflow-hidden lg:max-h-[calc(100vh-200px)] animate-in fade-in zoom-in-95 duration-200">

              {/* ── Header ───────────────────────────────────────── */}
              <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                      selectedSub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      selectedSub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    )}>
                      {selectedSub.status === 'approved' && <CheckCircle size={10} />}
                      {selectedSub.status === 'rejected' && <XCircle size={10} />}
                      {selectedSub.status === 'pending' && <Clock size={10} />}
                      {selectedSub.status === 'approved' ? 'Đã duyệt' : selectedSub.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">#{selectedSub.id}</span>
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] font-medium text-slate-400">{new Date(selectedSub.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 leading-snug line-clamp-2">{selectedSub.title}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      const headers = ['ID', 'Tên học sinh', 'Email', 'Tiêu đề', 'Nội dung', 'Ngày gửi', 'Trạng thái', 'Lượt vote'];
                      const row = [
                        selectedSub.id,
                        `"${(selectedSub.student_name || '').replace(/"/g, '""')}"`,
                        `"${(selectedSub.student_email || '').replace(/"/g, '""')}"`,
                        `"${(selectedSub.title || '').replace(/"/g, '""')}"`,
                        `"${(selectedSub.content || '').replace(/"/g, '""')}"`,
                        new Date(selectedSub.created_at).toLocaleString('vi-VN'),
                        selectedSub.status,
                        selectedSub.votes || 0
                      ].join(',');
                      const csvContent = [headers.join(','), row].join('\n');
                      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `submission-${selectedSub.id}.csv`;
                      link.click();
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Xuất CSV"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedSub(null)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Đóng"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* ── Author / Meta row ────────────────────────────── */}
              <div className="flex items-center gap-4 px-6 py-3 bg-slate-50/60 border-b border-slate-100">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-black text-slate-600 shrink-0">
                  {(selectedSub.student_name || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{selectedSub.student_name || 'Ẩn danh'}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedSub.student_email || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-xs font-bold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp size={14} className="text-slate-400" />
                    {selectedSub.votes || 0}
                  </span>
                  {selectedSub.attachment_url && (
                    <a
                      href={selectedSub.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-fpt-orange hover:underline"
                    >
                      <Paperclip size={14} />
                      PDF
                    </a>
                  )}
                </div>
              </div>

              {/* ── Content body ─────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar lg:max-h-[calc(100vh-440px)]">
                {/* Attachment banner */}
                {selectedSub.attachment_url && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                    <FileText size={18} className="text-fpt-orange shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-700">Tệp đính kèm PDF</p>
                      <p className="text-[10px] text-fpt-orange font-semibold uppercase tracking-wider">Học sinh đã tải lên bản in</p>
                    </div>
                    <a
                      href={selectedSub.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg bg-fpt-orange px-4 py-1.5 text-[10px] font-black text-white uppercase tracking-wider hover:bg-orange-600 transition-colors"
                    >
                      Xem
                    </a>
                  </div>
                )}

                {/* Main content */}
                <article className="prose prose-sm prose-slate max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 !mt-0">
                    {selectedSub.content || 'Không có nội dung bài dự thi.'}
                  </p>
                </article>

                {/* Existing rejection reason */}
                {selectedSub.status === 'rejected' && selectedSub.rejection_reason && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">
                      <XCircle size={12} /> Lý do từ chối
                    </p>
                    <p className="text-sm font-medium text-red-800 italic">"{selectedSub.rejection_reason}"</p>
                  </div>
                )}
              </div>

              {/* ── Action footer ────────────────────────────────── */}
              <div className="border-t border-slate-100 bg-white px-6 py-4 space-y-3">
                {/* Rejection reason input — shown when user clicks Từ chối */}
                {showRejectForm && (selectedSub.status === 'pending' || selectedSub.status === 'approved') && (
                  <div className="animate-in fade-in slide-in-from-bottom-1 duration-150">
                    <textarea
                      autoFocus
                      placeholder="Lý do từ chối (tùy chọn)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleUpdateStatus(selectedSub.id, 'rejected')
                        }
                        if (e.key === 'Escape') setShowRejectForm(false)
                      }}
                      className="w-full rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none h-16 placeholder:text-red-300"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Ctrl+Enter để gửi · Esc để hủy</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(selectedSub.id)}
                    className="p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 size={16} />
                  </button>

                  {showRejectForm ? (
                    <>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedSub.id, 'rejected')}
                        disabled={updatingId === selectedSub.id}
                        className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm"
                      >
                        <XCircle size={14} />
                        {updatingId === selectedSub.id ? 'Đang gửi...' : 'Xác nhận từ chối'}
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedSub.status !== 'rejected' && (
                        <button
                          onClick={() => setShowRejectForm(true)}
                          disabled={updatingId === selectedSub.id}
                          className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40 transition-all"
                        >
                          <XCircle size={14} />
                          Từ chối
                        </button>
                      )}

                      <div className="flex-1" />

                      <button
                        onClick={() => handleUpdateStatus(selectedSub.id, 'approved')}
                        disabled={selectedSub.status === 'approved' || updatingId === selectedSub.id}
                        className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-40 transition-all shadow-md hover:shadow-lg"
                      >
                        <CheckCircle size={14} />
                        {updatingId === selectedSub.id ? 'Đang xử lý...' : selectedSub.status === 'approved' ? 'Đã phê duyệt' : 'Phê duyệt'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-[500px] flex-col items-center justify-center space-y-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Eye size={28} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="text-sm font-black text-slate-600">Chưa chọn bài nào</p>
                <p className="text-xs text-slate-400">Chọn một bài dự thi bên trái để xem nội dung và phê duyệt.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
