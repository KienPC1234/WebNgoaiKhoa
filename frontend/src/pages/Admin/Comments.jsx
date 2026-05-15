import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Card, Button, cn } from '../../components/UI'
import { MessageSquare, Eye, EyeOff, Trash2, Search, RefreshCw, Filter } from 'lucide-react'
import { confirmAction, showApiError, toastSuccess } from '@/lib/notify'

const stripHtml = (html) => {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export const AdminComments = () => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVisible, setFilterVisible] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit: 500 }
      if (filterVisible === 'visible') params.is_visible = true
      if (filterVisible === 'hidden') params.is_visible = false
      if (filterType === 'publication') params.comment_type = 'publication'
      if (filterType === 'submission') params.comment_type = 'submission'
      if (search.trim()) params.q = search.trim()

      const res = await apiClient.get('/admin/comments', { params })
      setComments(res.data || [])
    } catch (err) {
      showApiError(err, 'Không thể tải danh sách bình luận.')
    } finally {
      setLoading(false)
    }
  }, [search, filterVisible, filterType])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleToggleVisibility = async (comment) => {
    try {
      await apiClient.put(`/admin/comments/${comment.id}/visibility`)
      toastSuccess(comment.is_visible ? 'Đã ẩn bình luận.' : 'Đã hiện bình luận.')
      fetchComments()
    } catch (err) {
      showApiError(err, 'Không thể thay đổi trạng thái bình luận.')
    }
  }

  const handleDelete = async (comment) => {
    const preview = stripHtml(comment.content).slice(0, 80)
    const confirmed = await confirmAction({
      title: 'Xóa bình luận này?',
      text: `"${preview}${preview.length >= 80 ? '...' : ''}" — Hành động này không thể hoàn tác.`,
      confirmButtonText: 'Xóa bình luận',
    })
    if (!confirmed) return

    try {
      await apiClient.delete(`/admin/comments/${comment.id}`)
      toastSuccess('Đã xóa bình luận.')
      fetchComments()
    } catch (err) {
      showApiError(err, 'Không thể xóa bình luận.')
    }
  }

  const filtered = comments

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MessageSquare size={24} />
            Quản lý bình luận
          </h1>
          <p className="text-sm text-slate-500 mt-1">Duyệt, ẩn hoặc xóa bình luận trên các bài viết và bài dự thi.</p>
        </div>
        <Button onClick={fetchComments} className="inline-flex items-center gap-2 text-sm">
          <RefreshCw size={14} />
          Làm mới
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung bình luận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filterVisible}
              onChange={(e) => setFilterVisible(e.target.value)}
              className="rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="visible">Đang hiện</option>
              <option value="hidden">Đã ẩn</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-200 py-2 px-3 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="all">Tất cả loại</option>
              <option value="publication">Bài viết</option>
              <option value="submission">Bài dự thi</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Không tìm thấy bình luận nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-600">Nội dung</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Tác giả</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Bài viết</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Ngày tạo</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className={cn('border-b border-slate-50 transition-colors hover:bg-slate-50', !c.is_visible && 'bg-amber-50/40')}>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-sm text-slate-800 line-clamp-2" title={stripHtml(c.content)}>
                        {stripHtml(c.content).slice(0, 120)}{stripHtml(c.content).length > 120 ? '...' : ''}
                      </div>
                      {c.parent_id && (
                        <span className="text-[10px] text-slate-400">Trả lời #{c.parent_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{c.author_name || 'Ẩn danh'}</div>
                      {c.author_email && (
                        <div className="text-xs text-slate-400">{c.author_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.publication_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {c.publication_title ? c.publication_title.slice(0, 30) : `#${c.publication_id}`}
                        </span>
                      ) : c.submission_id ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {c.submission_title ? c.submission_title.slice(0, 30) : `#${c.submission_id}`}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.is_visible ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <Eye size={12} /> Hiện
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <EyeOff size={12} /> Ẩn
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(c)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                            c.is_visible
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          )}
                          title={c.is_visible ? 'Ẩn bình luận' : 'Hiện bình luận'}
                        >
                          {c.is_visible ? <EyeOff size={13} /> : <Eye size={13} />}
                          {c.is_visible ? 'Ẩn' : 'Hiện'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                          title="Xóa bình luận"
                        >
                          <Trash2 size={13} />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-xs text-slate-400 text-right">
        Tổng: {filtered.length} bình luận
      </div>
    </div>
  )
}

export default AdminComments
