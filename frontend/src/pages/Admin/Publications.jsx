import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Button } from '@/components/UI'
import { Plus, Trash2, Edit, Search, Calendar, BookHeart, Mail, BellRing, RefreshCw } from 'lucide-react'
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

const mapPublication = (item) => ({
  id: item.id,
  entityType: 'publication',
  title: item.title,
  content: item.content,
  image_url: item.image_url,
  created_at: item.created_at,
  subject: item.subject,
  content_type: item.content_type,
  featured_year: item.featured_year,
  layout_metadata: item.layout_metadata,
})

const mapStory = (item) => ({
  id: item.id,
  entityType: 'story',
  title: item.title,
  snippet: item.snippet,
  content: item.content,
  image_url: item.image_url,
  created_at: item.created_at,
  subject: item.category || 'story',
  content_type: 'story',
  featured_year: '',
  layout_metadata: item.layout_metadata,
})

const mapEvent = (item) => ({
  id: item.id,
  entityType: 'event',
  title: item.title,
  content: item.description,
  image_url: item.image_url,
  created_at: item.created_at,
  subject: 'event',
  content_type: 'event',
  featured_year: item.event_date,
  layout_metadata: null,
})

export const AdminPublications = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [entityFilter, setEntityFilter] = useState('publication')
  
  const subjectFilter = searchParams.get('subject') || 'all'

  const updateSubjectFilter = (val) => {
    if (val === 'all') {
      searchParams.delete('subject')
    } else {
      searchParams.set('subject', val)
    }
    setSearchParams(searchParams)
  }

  const [newsletterForm, setNewsletterForm] = useState({
    title: '',
    body: '',
    action_url: '/events/upcoming',
    send_email: true,
    send_webpush: true,
  })
  const [newsletterSending, setNewsletterSending] = useState(false)
  const [pushConfig, setPushConfig] = useState(null)
  const [reindexing, setReindexing] = useState(false)

  const fetchItems = async () => {
    setLoading(true)
    try {
      // If subjectFilter is set and not 'all', we only fetch publications for that subject from backend
      const pubParams = subjectFilter !== 'all' ? { subject: subjectFilter } : {}
      
      const [publications, stories, events] = await Promise.all([
        cmsService.getPublications(pubParams),
        cmsService.getStories(),
        cmsService.getEvents(),
      ])
      
      const merged = [
        ...(publications || []).map(mapPublication),
        ...(stories || []).map(mapStory),
        ...(events || []).map(mapEvent),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setItems(merged)
    } catch (err) {
      showApiError(err, 'Không tải được danh sách nội dung.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [subjectFilter]) // Re-fetch when subject filter changes

  useEffect(() => {
    const fetchPushConfig = async () => {
      try {
        const data = await cmsService.getPushConfig()
        setPushConfig(data)
      } catch {
        setPushConfig(null)
      }
    }
    fetchPushConfig()
  }, [])

  const handleDelete = async (item) => {
    let deleteMessage = 'Xóa bài viết?'
    if (item.entityType === 'story') deleteMessage = 'Xóa câu chuyện?'
    if (item.entityType === 'event') deleteMessage = 'Xóa sự kiện?'

    const confirmed = await confirmAction({
      title: deleteMessage,
      text: 'Thao tác này không thể hoàn tác.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return

    try {
      if (item.entityType === 'story') {
        await cmsService.deleteStory(item.id)
      } else if (item.entityType === 'event') {
        await cmsService.deleteEvent(item.id)
      } else {
        await cmsService.deletePublication(item.id)
      }
      const successMsg = item.entityType === 'story' ? 'Đã xóa câu chuyện.' : item.entityType === 'event' ? 'Đã xóa sự kiện.' : 'Đã xóa bài viết.'
      toastSuccess(successMsg)
      fetchItems()
    } catch (err) {
      showApiError(err, 'Xóa nội dung thất bại.')
    }
  }

  const filteredItems = useMemo(() => {
    const scopedByEntity = entityFilter === 'all' ? items : items.filter((x) => x.entityType === entityFilter)
    const scoped = subjectFilter === 'all'
      ? scopedByEntity
      : scopedByEntity.filter((x) => x.entityType !== 'publication' || x.subject === subjectFilter)

    if (!searchTerm.trim()) return scoped
    const keyword = searchTerm.toLowerCase()
    return scoped.filter((p) =>
      [p.title, p.subject, p.content_type, p.featured_year, p.entityType, p.snippet]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [items, searchTerm, entityFilter, subjectFilter])

  const subjectBuckets = useMemo(() => {
    if (entityFilter !== 'publication' || subjectFilter !== 'all') return []

    return SUBJECT_CONFIG.map((config) => ({
      ...config,
      items: filteredItems.filter((item) => item.entityType === 'publication' && item.subject === config.value),
    })).filter((bucket) => bucket.items.length > 0)
  }, [entityFilter, subjectFilter, filteredItems])

  const handleSendNewsletter = async () => {
    if (!newsletterForm.title.trim() || !newsletterForm.body.trim()) return

    setNewsletterSending(true)
    try {
      const result = await cmsService.sendNewsletter(newsletterForm)
      if (result.queued) {
        toastSuccess(`Đã đưa vào hàng đợi gửi bản tin cho ${result.recipients} tài khoản.`)
      } else {
        toastSuccess('Không có người nhận phù hợp (đã unsubscribe hoặc chưa xác minh).')
      }
      setNewsletterForm((prev) => ({ ...prev, title: '', body: '' }))
    } catch (err) {
      showApiError(err, 'Gửi bản tin thất bại.')
    } finally {
      setNewsletterSending(false)
    }
  }

  const handleReindex = async () => {
    setReindexing(true)
    try {
      const result = await cmsService.resyncAIKnowledge()
      toastSuccess(`Đã reindex Vector DB (${result.documents || 0} documents).`)
    } catch (err) {
      showApiError(err, 'Reindex AI thất bại.')
    } finally {
      setReindexing(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm nội dung"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              />
            </div>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="all">Tất cả loại</option>
              <option value="publication">Bài viết</option>
              <option value="story">Câu chuyện</option>
              <option value="event">Sự kiện</option>
            </select>

            {entityFilter === 'publication' && (
              <select
                value={subjectFilter}
                onChange={(e) => updateSubjectFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
              >
                <option value="all">Tất cả môn</option>
                {SUBJECT_CONFIG.map((subject) => (
                  <option key={subject.value} value={subject.value}>{subject.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            <Button
              onClick={handleReindex}
              disabled={reindexing}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} className="mr-1" /> {reindexing ? 'Đang reindex...' : 'Reindex AI'}
            </Button>
            <Button
              onClick={() => navigate('/admin/publications/new')}
              className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700"
            >
              <Plus size={14} className="mr-1" /> Bài viết
            </Button>
            <Button
              onClick={() => navigate('/admin/publications/new?entity=story')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50"
            >
              <BookHeart size={14} className="mr-1" /> Câu chuyện
            </Button>
            <Button
              onClick={() => navigate('/admin/publications/new?entity=event')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50"
            >
              <Calendar size={14} className="mr-1" /> Sự kiện
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Mail size={16} className="text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-800">Gửi bản tin thủ công</h3>
        </div>

        {pushConfig && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Newsletter: <span className="font-semibold">{pushConfig.newsletter_enabled ? 'Bật' : 'Tắt'}</span> · Webpush: <span className="font-semibold">{pushConfig.webpush_enabled ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={newsletterForm.title}
            onChange={(e) => setNewsletterForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Tiêu đề bản tin"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
          <input
            value={newsletterForm.action_url}
            onChange={(e) => setNewsletterForm((prev) => ({ ...prev, action_url: e.target.value }))}
            placeholder="Link đích (vd: /events/upcoming)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          />
          <textarea
            value={newsletterForm.body}
            onChange={(e) => setNewsletterForm((prev) => ({ ...prev, body: e.target.value }))}
            placeholder="Nội dung thông báo"
            className="min-h-28 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm md:col-span-2"
          />

          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={newsletterForm.send_email}
              onChange={(e) => setNewsletterForm((prev) => ({ ...prev, send_email: e.target.checked }))}
            />
            Gửi email
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={newsletterForm.send_webpush}
              onChange={(e) => setNewsletterForm((prev) => ({ ...prev, send_webpush: e.target.checked }))}
            />
            Gửi webpush
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSendNewsletter}
            disabled={newsletterSending || !newsletterForm.title.trim() || !newsletterForm.body.trim()}
            className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700"
          >
            <BellRing size={14} className="mr-1" /> {newsletterSending ? 'Đang gửi...' : 'Đưa vào hàng đợi'}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Đang tải danh sách nội dung...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-14 text-center text-slate-500">Không có dữ liệu phù hợp.</div>
        ) : subjectBuckets.length > 0 ? (
          <div className="space-y-4 p-4">
            {subjectBuckets.map((bucket) => (
              <div key={bucket.value} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <h4 className="text-sm font-semibold text-slate-800">{bucket.label}</h4>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{bucket.items.length} bài</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tiêu đề</th>
                        <th className="px-4 py-3 font-medium">Danh mục</th>
                        <th className="px-4 py-3 font-medium">Ngày tạo</th>
                        <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.items.map((item) => {
                        const previewHtml = item.content || ''

                        return (
                          <tr key={`${item.entityType}-${item.id}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <p className="max-w-[420px] truncate font-medium text-slate-800">{item.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-1" dangerouslySetInnerHTML={{ __html: previewHtml.slice(0, 140) }} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">{toSubjectLabel(item.subject)} · {item.content_type || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => navigate(`/admin/publications/${item.id}/edit?entity=${item.entityType}`)}
                                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="rounded-md border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tiêu đề</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Danh mục</th>
                  <th className="px-4 py-3 font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isEvent = item.entityType === 'event'
                  const previewHtml = item.entityType === 'story' ? item.snippet || item.content || '' : item.content || ''

                  return (
                    <tr key={`${item.entityType}-${item.id}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="max-w-[420px] truncate font-medium text-slate-800">{item.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1" dangerouslySetInnerHTML={{ __html: previewHtml.slice(0, 140) }} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{item.entityType}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{toSubjectLabel(item.subject) || item.content_type || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => {
                              if (isEvent) {
                                navigate('/admin/events')
                              } else {
                                navigate(`/admin/publications/${item.id}/edit?entity=${item.entityType}`)
                              }
                            }}
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
