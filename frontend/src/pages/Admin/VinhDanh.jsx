import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button } from '@/components/UI'
import { Edit, Trash2, Plus, Calendar } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastSuccess } from '@/lib/notify'

const SUBJECT_CONFIG = [
  { value: 'van', label: 'Ngữ văn' },
  { value: 'ktpl', label: 'KTPL' },
  { value: 'lich-su', label: 'Lịch sử' },
  { value: 'dia-li', label: 'Địa lí' },
  { value: 'vovinam', label: 'Vovinam' },
]

const SUBJECT_LABELS = SUBJECT_CONFIG.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const toSubjectLabel = (subject) => {
  if (!subject) return '-'
  return SUBJECT_LABELS[subject] || subject
}

export const AdminVinhDanh = () => {
  const navigate = useNavigate()
  const { subject: paramSubject } = useParams()
  const [subject, setSubject] = useState(paramSubject || 'all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async (subjectFilter) => {
    setLoading(true)
    try {
      const params = { content_type: 'vinh-danh' }
      if (subjectFilter && subjectFilter !== 'all') params.subject = subjectFilter
      const pubs = await cmsService.getPublications(params)
      setItems(pubs || [])
    } catch (err) {
      showApiError(err, 'Không tải được danh sách Vinh danh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems(subject)
  }, [subject])

  const handleDelete = async (id) => {
    const confirmed = await confirmAction({
      title: 'Xóa mục vinh danh?',
      text: 'Thao tác này không thể hoàn tác.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return

    try {
      await cmsService.deletePublication(id)
      toastSuccess('Đã xóa mục vinh danh.')
      fetchItems(subject)
    } catch (err) {
      showApiError(err, 'Xóa thất bại.')
    }
  }

  const subjectBuckets = useMemo(() => {
    return SUBJECT_CONFIG.map((cfg) => ({ ...cfg, items: items.filter((i) => i.subject === cfg.value) }))
  }, [items])

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">Vinh danh</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quản lý các nội dung được vinh danh theo môn</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/admin/publications/new?content_type=vinh-danh')}
              className="rounded-md border-none bg-fpt-blue px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-800"
            >
              <Plus size={14} className="mr-1" /> Tạo Vinh danh
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSubject('all')}
            className={`px-3 py-1 rounded ${subject === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
          >
            Tất cả
          </button>
          {SUBJECT_CONFIG.map((s) => (
            <button
              key={s.value}
              onClick={() => setSubject(s.value)}
              className={`px-3 py-1 rounded ${subject === s.value ? 'bg-fpt-blue text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Đang tải danh sách vinh danh...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-14 text-center text-slate-500">Không có bản ghi vinh danh.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tiêu đề</th>
                  <th className="px-4 py-3 font-medium">Năm/Loại</th>
                  <th className="px-4 py-3 font-medium">Danh mục</th>
                  <th className="px-4 py-3 font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="max-w-[420px] truncate font-medium text-slate-800">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1" dangerouslySetInnerHTML={{ __html: (item.content || '').slice(0, 140) }} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.featured_year || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{toSubjectLabel(item.subject)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => navigate(`/admin/publications/${item.id}/edit`)}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
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
    </div>
  )
}

export default AdminVinhDanh
