import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Card, Button, cn } from '../../components/UI'
import {
  Plus, Edit3, Trash2, Copy, Search, Filter, Eye, EyeOff,
  Award, Users, Calendar, Settings, ChevronDown, ChevronRight,
  CheckCircle, XCircle, Clock, Archive, Star, StarOff, X,
  Save, Loader2, FileText, BarChart3, GripVertical, RefreshCcw,
} from 'lucide-react'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

const CONTEST_TYPES = [
  { value: 'van-chuong', label: 'Văn chương' },
  { value: 'hoi-hoa', label: 'Hội họa' },
  { value: 'nghiep-vu', label: 'Nghiệp vụ' },
  { value: 'thuyet-trinh', label: 'Thuyết trình' },
  { value: 'thi-tu-tap', label: 'Thi tập thể' },
  { value: 'thi-ca-nhan', label: 'Thi cá nhân' },
  { value: 'custom', label: 'Tùy chỉnh' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Nháp', icon: FileText, color: 'text-gray-500 bg-gray-100' },
  { value: 'upcoming', label: 'Sắp diễn ra', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  { value: 'active', label: 'Đang diễn ra', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  { value: 'closed', label: 'Đã đóng', icon: XCircle, color: 'text-orange-600 bg-orange-50' },
  { value: 'archived', label: 'Lưu trữ', icon: Archive, color: 'text-gray-400 bg-gray-50' },
]

const SUBJECTS = [
  { value: 'van', label: 'Ngữ Văn' },
  { value: 'ktpl', label: 'Kinh tế Pháp luật' },
  { value: 'lich-su', label: 'Lịch sử' },
  { value: 'dia-li', label: 'Địa lí' },
  { value: 'vovinam', label: 'Vovinam' },
  { value: 'ngoaikhoa', label: 'Ngoại khoá' },
]

const VOTING_METHODS = [
  { value: 'none', label: 'Không bình chọn' },
  { value: 'public-vote', label: 'Bình chọn công khai' },
  { value: 'judges-only', label: 'Chỉ BGK' },
  { value: 'mixed', label: 'Kết hợp' },
]

const SUBMISSION_TYPES = [
  { value: 'text', label: 'Text/URL', description: 'Nội dung text, link video, slides...' },
  { value: 'file', label: 'Upload File', description: 'PDF, DOC, DOCX...' },
  { value: 'image', label: 'Upload Ảnh', description: 'JPG, PNG, GIF, WebP' },
]

const emptyContest = {
  title: '', slug: '', description: '', rules: '', subject: 'van',
  contest_type: 'custom', custom_type_name: '', status: 'draft',
  image_url: '', banner_url: '', start_date: '', end_date: '',
  voting_method: 'public-vote', max_submissions_per_user: 1,
  allowed_submission_types: ['text', 'file', 'image'],
  allow_file_upload: true, allowed_file_types: '.pdf,.doc,.docx',
  max_file_size_mb: 15, allow_image_upload: true, max_image_size_mb: 10,
  allow_url_submission: true, require_approval: true, show_author: true,
  show_vote_count: true, show_comments: true, min_title_length: 6,
  max_title_length: 200, min_content_length: 0, max_content_length: 60000,
  custom_fields: null, judging_criteria: null, prizes: null,
  contact_info: '', is_featured: false, display_order: 0, tags: [],
}

export const AdminContests = () => {
  const [contests, setContests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingContest, setEditingContest] = useState(null)
  const [form, setForm] = useState({ ...emptyContest })
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [stats, setStats] = useState(null)
  const [selectedContestSubs, setSelectedContestSubs] = useState(null)
  const [subsLoading, setSubsLoading] = useState(false)
  const [selectedSubIds, setSelectedSubIds] = useState([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showJudgePanel, setShowJudgePanel] = useState(null)
  const [judges, setJudges] = useState([])
  const [judgesLoading, setJudgesLoading] = useState(false)
  const [newJudgeEmail, setNewJudgeEmail] = useState('')

  useEffect(() => { fetchContests(); fetchStats() }, [])

  const fetchContests = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (filterSubject) params.subject = filterSubject
      if (filterType) params.contest_type = filterType
      if (searchTerm) params.search = searchTerm
      const res = await apiClient.get('/admin/contests', { params })
      setContests(res.data || [])
    } catch (err) {
      showApiError(err, 'Không thể tải danh sách cuộc thi.')
    } finally { setLoading(false) }
  }

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/admin/contests/stats/overview')
      setStats(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchContests() }, [filterStatus, filterSubject, filterType])

  const openCreate = () => {
    setEditingContest(null)
    setForm({ ...emptyContest })
    setShowAdvanced(false)
    setShowEditor(true)
  }

  const openEdit = (contest) => {
    setEditingContest(contest)
    setForm({
      title: contest.title || '',
      slug: contest.slug || '',
      description: contest.description || '',
      rules: contest.rules || '',
      subject: contest.subject || 'van',
      contest_type: contest.contest_type || 'custom',
      custom_type_name: contest.custom_type_name || '',
      status: contest.status || 'draft',
      image_url: contest.image_url || '',
      banner_url: contest.banner_url || '',
      start_date: contest.start_date ? contest.start_date.slice(0, 16) : '',
      end_date: contest.end_date ? contest.end_date.slice(0, 16) : '',
      voting_method: contest.voting_method || 'public-vote',
      max_submissions_per_user: contest.max_submissions_per_user ?? 1,
      allow_file_upload: contest.allow_file_upload ?? true,
      allowed_file_types: contest.allowed_file_types || '.pdf,.doc,.docx',
      max_file_size_mb: contest.max_file_size_mb ?? 15,
      require_approval: contest.require_approval ?? true,
      show_author: contest.show_author ?? true,
      show_vote_count: contest.show_vote_count ?? true,
      show_comments: contest.show_comments ?? true,
      min_title_length: contest.min_title_length ?? 6,
      max_title_length: contest.max_title_length ?? 200,
      min_content_length: contest.min_content_length ?? 30,
      max_content_length: contest.max_content_length ?? 60000,
      custom_fields: contest.custom_fields || null,
      judging_criteria: contest.judging_criteria || null,
      prizes: contest.prizes || null,
      contact_info: contest.contact_info || '',
      is_featured: contest.is_featured ?? false,
      display_order: contest.display_order ?? 0,
      tags: contest.tags || [],
    })
    setShowAdvanced(false)
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toastError('Vui lòng nhập tên cuộc thi.'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.start_date) payload.start_date = new Date(payload.start_date).toISOString()
      if (payload.end_date) payload.end_date = new Date(payload.end_date).toISOString()
      if (!payload.start_date) delete payload.start_date
      if (!payload.end_date) delete payload.end_date

      if (typeof payload.custom_fields === 'string' && payload.custom_fields.trim()) {
        try {
          payload.custom_fields = JSON.parse(payload.custom_fields)
        } catch (err) {
          toastError('Định dạng Custom JSON Metadata không hợp lệ.')
          setSaving(false)
          return
        }
      }

      if (editingContest) {
        await apiClient.put(`/admin/contests/${editingContest.id}`, payload)
        toastSuccess('Đã cập nhật cuộc thi.')
      } else {
        await apiClient.post('/admin/contests', payload)
        toastSuccess('Đã tạo cuộc thi mới.')
      }
      setShowEditor(false)
      fetchContests()
      fetchStats()
    } catch (err) {
      showApiError(err, 'Không thể lưu cuộc thi.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (contest) => {
    const confirmed = await confirmAction({
      title: 'Xoá cuộc thi?',
      text: `Bạn có chắc muốn xoá "${contest.title}"?${contest.submission_count > 0 ? ` (${contest.submission_count} bài dự thi sẽ được gỡ liên kết)` : ''}`,
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Hủy',
    })
    if (!confirmed) return
    try {
      await apiClient.delete(`/admin/contests/${contest.id}`, { params: { force: true } })
      toastSuccess('Đã xoá cuộc thi.')
      fetchContests()
      fetchStats()
    } catch (err) { showApiError(err, 'Không thể xoá cuộc thi.') }
  }

  const handleDuplicate = async (contest) => {
    try {
      await apiClient.post(`/admin/contests/${contest.id}/duplicate`)
      toastSuccess('Đã nhân bản cuộc thi.')
      fetchContests()
    } catch (err) { showApiError(err, 'Không thể nhân bản.') }
  }

  const handleToggleFeatured = async (contest) => {
    try {
      await apiClient.put(`/admin/contests/${contest.id}`, { is_featured: !contest.is_featured })
      fetchContests()
    } catch (err) { showApiError(err, 'Không thể cập nhật.') }
  }

  const viewSubmissions = async (contest) => {
    if (selectedContestSubs?.id === contest.id) { setSelectedContestSubs(null); return }
    setSubsLoading(true)
    try {
      const res = await apiClient.get(`/admin/contests/${contest.id}/submissions`)
      setSelectedContestSubs({ ...contest, submissions: res.data || [] })
    } catch (err) { showApiError(err, 'Không thể tải bài dự thi.') }
    finally { setSubsLoading(false) }
  }

  const handleSubStatus = async (subId, status) => {
    try {
      await apiClient.put(`/admin/submissions/${subId}/status`, { status })
      if (selectedContestSubs) {
        setSelectedContestSubs(prev => ({
          ...prev,
          submissions: prev.submissions.map(s => s.id === subId ? { ...s, status } : s),
        }))
      }
      toastSuccess('Đã cập nhật trạng thái.')
    } catch (err) { showApiError(err, 'Lỗi cập nhật trạng thái.') }
  }

  const handleBulkStatus = async (status) => {
    if (selectedSubIds.length === 0) { toastError('Chưa chọn bài nào.'); return }
    const reason = status === 'rejected' ? prompt('Lý do từ chối (tùy chọn):') : null
    setBulkActionLoading(true)
    try {
      await apiClient.post(`/admin/contests/${selectedContestSubs.id}/submissions/bulk-status`, {
        submission_ids: selectedSubIds,
        status,
        rejection_reason: reason || undefined,
      })
      toastSuccess(`Đã ${status === 'approved' ? 'duyệt' : status === 'rejected' ? 'từ chối' : 'cập nhật'} ${selectedSubIds.length} bài.`)
      setSelectedSubIds([])
      viewSubmissions(selectedContestSubs)
    } catch (err) { showApiError(err, 'Lỗi bulk update.') }
    finally { setBulkActionLoading(false) }
  }

  const handleBulkDelete = async () => {
    if (selectedSubIds.length === 0) { toastError('Chưa chọn bài nào.'); return }
    const confirmed = await confirmAction({
      title: `Xoá ${selectedSubIds.length} bài dự thi?`,
      text: 'Hành động này không thể hoàn tác.',
      confirmButtonText: 'Xoá',
      cancelButtonText: 'Hủy',
    })
    if (!confirmed) return
    setBulkActionLoading(true)
    try {
      await apiClient.post(`/admin/contests/${selectedContestSubs.id}/submissions/bulk-delete`, {
        submission_ids: selectedSubIds,
      })
      toastSuccess(`Đã xoá ${selectedSubIds.length} bài.`)
      setSelectedSubIds([])
      viewSubmissions(selectedContestSubs)
    } catch (err) { showApiError(err, 'Lỗi bulk delete.') }
    finally { setBulkActionLoading(false) }
  }

  const toggleSubSelect = (subId) => {
    setSelectedSubIds(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId])
  }

  const toggleSelectAll = () => {
    if (!selectedContestSubs?.submissions) return
    if (selectedSubIds.length === selectedContestSubs.submissions.length) {
      setSelectedSubIds([])
    } else {
      setSelectedSubIds(selectedContestSubs.submissions.map(s => s.id))
    }
  }

  const fetchJudges = async (contestId) => {
    setJudgesLoading(true)
    try {
      const res = await apiClient.get(`/admin/contests/${contestId}/judges`)
      setJudges(res.data || [])
    } catch { setJudges([]) }
    finally { setJudgesLoading(false) }
  }

  const handleAssignJudge = async (contestId) => {
    if (!newJudgeEmail.trim()) return
    try {
      const usersRes = await apiClient.get('/admin/users', { params: { search: newJudgeEmail } })
      const user = usersRes.data?.find(u => u.email === newJudgeEmail.trim())
      if (!user) { toastError('Không tìm thấy user với email này.'); return }
      await apiClient.post(`/admin/contests/${contestId}/judges`, { user_id: user.id })
      toastSuccess('Đã phân công giám khảo.')
      setNewJudgeEmail('')
      fetchJudges(contestId)
    } catch (err) { showApiError(err, 'Lỗi phân công giám khảo.') }
  }

  const handleRemoveJudge = async (contestId, userId) => {
    try {
      await apiClient.delete(`/admin/contests/${contestId}/judges/${userId}`)
      toastSuccess('Đã xóa giám khảo.')
      fetchJudges(contestId)
    } catch (err) { showApiError(err, 'Lỗi xóa giám khảo.') }
  }

  const openJudgePanel = (contest) => {
    if (showJudgePanel?.id === contest.id) { setShowJudgePanel(null); return }
    setShowJudgePanel(contest)
    fetchJudges(contest.id)
  }

  const filteredContests = contests.filter(c => {
    if (searchTerm && !c.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const getStatusBadge = (status) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status)
    if (!opt) return null
    const Icon = opt.icon
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', opt.color)}>
        <Icon size={12} /> {opt.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award size={28} className="text-fpt-orange" />
            Quản lý Cuộc thi
          </h1>
          <p className="text-sm text-gray-500 mt-1">Tạo và quản lý các cuộc thi, thể lệ, bài dự thi</p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus size={16} /> Tạo cuộc thi
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Tổng cuộc thi', value: stats.total_contests, color: 'bg-white' },
            { label: 'Đang diễn ra', value: stats.active, color: 'bg-green-50' },
            { label: 'Sắp diễn ra', value: stats.upcoming, color: 'bg-blue-50' },
            { label: 'Đã đóng', value: stats.closed, color: 'bg-orange-50' },
            { label: 'Tổng bài dự thi', value: stats.total_submissions, color: 'bg-purple-50' },
          ].map(item => (
            <Card key={item.label} className={cn('p-3 text-center', item.color)}>
              <div className="text-2xl font-bold text-gray-800">{item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc thi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchContests()}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả môn</option>
            {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả thể loại</option>
            {CONTEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={fetchContests}><RefreshCcw size={14} /></Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-fpt-orange" size={32} /></div>
      ) : filteredContests.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <Award size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Chưa có cuộc thi nào</p>
          <p className="text-sm mt-1">Nhấn "Tạo cuộc thi" để bắt đầu</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredContests.map(contest => (
            <Card key={contest.id} className="p-0 overflow-hidden">
              <div className="flex items-stretch">
                {contest.image_url && (
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100">
                    <img src={contest.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{contest.title}</h3>
                        {contest.is_featured && <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                        {getStatusBadge(contest.status)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Award size={12} />
                          {contest.type_label || contest.contest_type}
                        </span>
                        <span>{SUBJECTS.find(s => s.value === contest.subject)?.label || contest.subject}</span>
                        <span className="flex items-center gap-1"><Users size={12} /> {contest.submission_count} bài</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {contest.view_count}</span>
                        {contest.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(contest.start_date).toLocaleDateString('vi-VN')}
                            {contest.end_date && ` - ${new Date(contest.end_date).toLocaleDateString('vi-VN')}`}
                          </span>
                        )}
                      </div>
                      {contest.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{contest.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggleFeatured(contest)}
                        className="p-1.5 rounded hover:bg-gray-100"
                        title={contest.is_featured ? 'Bỏ nổi bật' : 'Đặt nổi bật'}
                      >
                        {contest.is_featured ? <Star size={16} className="text-yellow-500 fill-yellow-500" /> : <StarOff size={16} className="text-gray-400" />}
                      </button>
                      <button onClick={() => viewSubmissions(contest)} className="p-1.5 rounded hover:bg-gray-100" title="Xem bài dự thi">
                        <BarChart3 size={16} className={selectedContestSubs?.id === contest.id ? 'text-fpt-orange' : 'text-gray-400'} />
                      </button>
                      <button onClick={() => openEdit(contest)} className="p-1.5 rounded hover:bg-gray-100" title="Chỉnh sửa">
                        <Edit3 size={16} className="text-gray-500" />
                      </button>
                      <button onClick={() => handleDuplicate(contest)} className="p-1.5 rounded hover:bg-gray-100" title="Nhân bản">
                        <Copy size={16} className="text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(contest)} className="p-1.5 rounded hover:bg-red-50" title="Xoá">
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {selectedContestSubs?.id === contest.id && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <FileText size={14} /> Bài dự thi ({selectedContestSubs.submissions.length})
                    </h4>
                    <div className="flex items-center gap-2">
                      {selectedSubIds.length > 0 && (
                        <>
                          <span className="text-xs text-gray-500">Đã chọn {selectedSubIds.length}</span>
                          <Button size="sm" variant="outline" onClick={() => handleBulkStatus('approved')} disabled={bulkActionLoading}>
                            <CheckCircle size={12} className="mr-1" /> Duyệt
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleBulkStatus('rejected')} disabled={bulkActionLoading}>
                            <XCircle size={12} className="mr-1" /> Từ chối
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleBulkDelete} disabled={bulkActionLoading} className="text-red-600 hover:text-red-700">
                            <Trash2 size={12} className="mr-1" /> Xoá
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openJudgePanel(contest)}>
                        <Users size={12} className="mr-1" /> Giám khảo
                      </Button>
                    </div>
                  </div>

                  {showJudgePanel?.id === contest.id && (
                    <div className="mb-4 bg-white rounded-lg border p-3">
                      <h5 className="font-medium text-sm mb-2">Quản lý Giám khảo</h5>
                      <div className="flex gap-2 mb-3">
                        <input
                          value={newJudgeEmail}
                          onChange={e => setNewJudgeEmail(e.target.value)}
                          placeholder="Email giám khảo..."
                          className="flex-1 border rounded px-2 py-1.5 text-sm"
                          onKeyDown={e => e.key === 'Enter' && handleAssignJudge(contest.id)}
                        />
                        <Button size="sm" onClick={() => handleAssignJudge(contest.id)}>Thêm</Button>
                      </div>
                      {judgesLoading ? (
                        <div className="flex justify-center py-2"><Loader2 className="animate-spin" size={16} /></div>
                      ) : judges.length === 0 ? (
                        <p className="text-xs text-gray-400">Chưa có giám khảo nào</p>
                      ) : (
                        <div className="space-y-1">
                          {judges.map(j => (
                            <div key={j.user_id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5">
                              <span className="text-sm">{j.judge_name || j.judge_email}</span>
                              <button onClick={() => handleRemoveJudge(contest.id, j.user_id)} className="p-1 hover:bg-red-50 rounded">
                                <X size={12} className="text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {subsLoading ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="animate-spin" size={20} /></div>
                  ) : selectedContestSubs.submissions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Chưa có bài dự thi nào</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="flex items-center gap-2 px-3 py-1">
                        <input
                          type="checkbox"
                          checked={selectedSubIds.length === selectedContestSubs.submissions.length}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-500">Chọn tất cả</span>
                      </div>
                      {selectedContestSubs.submissions.map(sub => (
                        <div key={sub.id} className={cn('flex items-center justify-between bg-white rounded-lg px-3 py-2 border', selectedSubIds.includes(sub.id) && 'ring-2 ring-fpt-orange')}>
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={selectedSubIds.includes(sub.id)}
                              onChange={() => toggleSubSelect(sub.id)}
                              className="rounded flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{sub.title}</p>
                              <p className="text-xs text-gray-400">{sub.student_name} &middot; {new Date(sub.created_at).toLocaleDateString('vi-VN')}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Users size={12} /> {sub.votes}
                            </span>
                            {sub.status === 'pending' && (
                              <>
                                <button onClick={() => handleSubStatus(sub.id, 'approved')} className="p-1 rounded hover:bg-green-50" title="Duyệt">
                                  <CheckCircle size={16} className="text-green-500" />
                                </button>
                                <button onClick={() => handleSubStatus(sub.id, 'rejected')} className="p-1 rounded hover:bg-red-50" title="Từ chối">
                                  <XCircle size={16} className="text-red-400" />
                                </button>
                              </>
                            )}
                            {sub.status === 'approved' && <CheckCircle size={14} className="text-green-500" />}
                            {sub.status === 'rejected' && <XCircle size={14} className="text-red-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showEditor && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingContest ? 'Chỉnh sửa cuộc thi' : 'Tạo cuộc thi mới'}</h2>
              <button onClick={() => setShowEditor(false)} className="p-1 rounded hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Tên cuộc thi <span className="text-red-500">*</span></label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="VD: Cuộc thi sáng tác Văn 2026" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tự động từ tên" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Môn học</label>
                  <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Thể loại</label>
                  <select value={form.contest_type} onChange={e => setForm(f => ({ ...f, contest_type: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {CONTEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {form.contest_type === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Tên thể loại tùy chỉnh</label>
                    <input value={form.custom_type_name} onChange={e => setForm(f => ({ ...f, custom_type_name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="VD: Thi viết thư" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phương thức bình chọn</label>
                  <select value={form.voting_method} onChange={e => setForm(f => ({ ...f, voting_method: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {VOTING_METHODS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Loại bài dự thi cho phép</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SUBMISSION_TYPES.map(type => {
                    const isEnabled = (form.allowed_submission_types || []).includes(type.value)
                    return (
                      <label
                        key={type.value}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          isEnabled ? 'border-fpt-orange bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            const current = form.allowed_submission_types || []
                            if (e.target.checked) {
                              setForm(f => ({ ...f, allowed_submission_types: [...current, type.value] }))
                            } else {
                              setForm(f => ({ ...f, allowed_submission_types: current.filter(t => t !== type.value) }))
                            }
                          }}
                          className="mt-1 rounded"
                        />
                        <div>
                          <p className="text-sm font-medium">{type.label}</p>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Mô tả ngắn về cuộc thi..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thể lệ</label>
                <textarea value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nội dung thể lệ chi tiết..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
                  <input type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL hình ảnh</label>
                  <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">URL banner</label>
                  <input value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
                </div>
              </div>

              <div className="border rounded-lg">
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-gray-50">
                  <span className="flex items-center gap-2"><Settings size={14} /> Cài đặt nâng cao</span>
                  {showAdvanced ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {showAdvanced && (
                  <div className="p-4 border-t space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Số bài tối đa / người</label>
                        <input type="number" min={1} value={form.max_submissions_per_user} onChange={e => setForm(f => ({ ...f, max_submissions_per_user: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Max file (MB)</label>
                        <input type="number" min={1} value={form.max_file_size_mb} onChange={e => setForm(f => ({ ...f, max_file_size_mb: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Độ dài tên min</label>
                        <input type="number" min={1} value={form.min_title_length} onChange={e => setForm(f => ({ ...f, min_title_length: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Độ dài tên max</label>
                        <input type="number" min={1} value={form.max_title_length} onChange={e => setForm(f => ({ ...f, max_title_length: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Nội dung min</label>
                        <input type="number" min={1} value={form.min_content_length} onChange={e => setForm(f => ({ ...f, min_content_length: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Nội dung max</label>
                        <input type="number" min={1} value={form.max_content_length} onChange={e => setForm(f => ({ ...f, max_content_length: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Loại file cho phép</label>
                        <input value={form.allowed_file_types} onChange={e => setForm(f => ({ ...f, allowed_file_types: e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" placeholder=".pdf,.doc,.docx" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Thứ tự hiển thị</label>
                        <input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: +e.target.value }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Tags (phẩy cách)</label>
                        <input value={(form.tags || []).join(', ')} onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} className="w-full border rounded px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Thông tin liên hệ</label>
                      <textarea value={form.contact_info} onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))} rows={2} className="w-full border rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Custom JSON Metadata (Cấu hình thêm)</label>
                      <textarea
                        value={typeof form.custom_fields === 'string' ? form.custom_fields : JSON.stringify(form.custom_fields || {}, null, 2)}
                        onChange={e => {
                          const val = e.target.value;
                          setForm(f => ({ ...f, custom_fields: val }));
                        }}
                        rows={4}
                        className="w-full border rounded px-2 py-1.5 text-xs font-mono"
                        placeholder='{ "key": "value" }'
                      />
                      <p className="text-[10px] text-gray-400">Định dạng JSON. Dùng để lưu trữ các thông tin mở rộng khác.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium">Tiêu chí chấm điểm</label>
                          <Button size="xs" variant="outline" onClick={() => {
                            const current = form.judging_criteria || []
                            setForm(f => ({ ...f, judging_criteria: [...current, { name: '', weight: '' }] }))
                          }}>+ Thêm</Button>
                        </div>
                        <div className="space-y-2">
                          {(form.judging_criteria || []).map((c, i) => (
                            <div key={i} className="flex gap-2">
                              <input placeholder="Tên tiêu chí" value={c.name} onChange={e => {
                                const next = [...form.judging_criteria]; next[i].name = e.target.value;
                                setForm(f => ({ ...f, judging_criteria: next }))
                              }} className="flex-1 border rounded px-2 py-1 text-xs" />
                              <input placeholder="Trọng số" value={c.weight} onChange={e => {
                                const next = [...form.judging_criteria]; next[i].weight = e.target.value;
                                setForm(f => ({ ...f, judging_criteria: next }))
                              }} className="w-20 border rounded px-2 py-1 text-xs" />
                              <button onClick={() => {
                                const next = form.judging_criteria.filter((_, idx) => idx !== i)
                                setForm(f => ({ ...f, judging_criteria: next }))
                              }} className="p-1 text-red-400"><Trash2 size={14} /></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium">Giải thưởng</label>
                          <Button size="xs" variant="outline" onClick={() => {
                            const current = form.prizes || []
                            setForm(f => ({ ...f, prizes: [...current, { name: '', description: '' }] }))
                          }}>+ Thêm</Button>
                        </div>
                        <div className="space-y-2">
                          {(form.prizes || []).map((p, i) => (
                            <div key={i} className="flex gap-2">
                              <input placeholder="Tên giải" value={p.name} onChange={e => {
                                const next = [...form.prizes]; next[i].name = e.target.value;
                                setForm(f => ({ ...f, prizes: next }))
                              }} className="flex-1 border rounded px-2 py-1 text-xs" />
                              <input placeholder="Mô tả" value={p.description} onChange={e => {
                                const next = [...form.prizes]; next[i].description = e.target.value;
                                setForm(f => ({ ...f, prizes: next }))
                              }} className="flex-1 border rounded px-2 py-1 text-xs" />
                              <button onClick={() => {
                                const next = form.prizes.filter((_, idx) => idx !== i)
                                setForm(f => ({ ...f, prizes: next }))
                              }} className="p-1 text-red-400"><Trash2 size={14} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { key: 'allow_file_upload', label: 'Cho phép upload file' },
                        { key: 'require_approval', label: 'Yêu cầu duyệt bài' },
                        { key: 'show_author', label: 'Hiện tên tác giả' },
                        { key: 'show_vote_count', label: 'Hiện số lượt vote' },
                        { key: 'show_comments', label: 'Cho phép bình luận' },
                        { key: 'is_featured', label: 'Cuộc thi nổi bật' },
                      ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form[item.key]}
                            onChange={e => setForm(f => ({ ...f, [item.key]: e.target.checked }))}
                            className="rounded"
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setShowEditor(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingContest ? 'Cập nhật' : 'Tạo cuộc thi'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminContests
