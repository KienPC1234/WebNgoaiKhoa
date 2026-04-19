import { useEffect, useState } from 'react'
import { Card, Button, RichTextEditor } from '@/components/UI'
import { CalendarDays, Plus, Save, Trash2, Mail, BellRing } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

const emptyForm = {
  title: '',
  description: '',
  event_date: '',
  location: '',
  image_url: '',
  status: 'upcoming',
  linked_post_id: '',
  is_active: true,
}

export const AdminEvents = () => {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [viewMode, setViewMode] = useState('upcoming')
  const [pushConfig, setPushConfig] = useState(null)
  const [newsletterForm, setNewsletterForm] = useState({
    title: '',
    body: '',
    action_url: '/events/upcoming',
    send_email: true,
    send_webpush: true,
  })
  const [newsletterSending, setNewsletterSending] = useState(false)

  const fetchEvents = async (mode = viewMode) => {
    setLoading(true)
    try {
      const data = mode === 'all'
        ? await cmsService.getEvents()
        : await cmsService.getUpcomingEvents()
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      showApiError(error, 'Không tải được danh sách sự kiện.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(viewMode)
  }, [viewMode])

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

  const createEvent = async () => {
    if (!form.title || !form.description || !form.event_date || !form.location) {
      toastError('Vui lòng điền đầy đủ thông tin.')
      return
    }
    try {
      await cmsService.createEvent({
        ...form,
        linked_post_id: form.linked_post_id === '' ? null : Number(form.linked_post_id),
      })
      setForm(emptyForm)
      fetchEvents(viewMode)
    } catch (error) {
      console.error('Error creating event:', error)
      showApiError(error, 'Tạo sự kiện thất bại.')
    }
  }

  const patchEvent = (id, key, value) => {
    setEvents((prev) => prev.map((x) => (x.id === id ? { ...x, [key]: value } : x)))
  }

  const saveEvent = async (item) => {
    try {
      await cmsService.updateEvent(item.id, item)
      fetchEvents(viewMode)
    } catch (error) {
      console.error('Error updating event:', error)
      showApiError(error, 'Cập nhật sự kiện thất bại.')
    }
  }

  const removeEvent = async (id) => {
    const confirmed = await confirmAction({
      title: 'Xóa sự kiện này?',
      text: 'Dữ liệu sự kiện sẽ bị xóa khỏi hệ thống.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return
    try {
      await cmsService.deleteEvent(id)
      toastSuccess('Đã xóa sự kiện.')
      fetchEvents(viewMode)
    } catch (error) {
      console.error('Error deleting event:', error)
      showApiError(error, 'Xóa sự kiện thất bại.')
    }
  }

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

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays size={16} className="text-slate-500" />
          <h2 className="text-base font-semibold text-slate-800">Quản lý sự kiện</h2>
        </div>

        <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode('upcoming')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === 'upcoming' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Sắp tới
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${viewMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Tất cả
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Địa điểm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input type="datetime-local" className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="registration">Mở đăng ký</option>
          </select>
          <input
            type="number"
            min="1"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
            placeholder="ID bài viết liên kết (tùy chọn)"
            value={form.linked_post_id}
            onChange={(e) => setForm({ ...form, linked_post_id: e.target.value })}
          />
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm md:col-span-2" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Mô tả"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={createEvent} className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700">
            <Plus size={14} className="mr-1" /> Thêm sự kiện
          </Button>
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

      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Đang tải...</div>
        ) : (
          <div className="space-y-3">
            {events.map((item) => (
              <div key={item.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-12">
                <input className="md:col-span-3 rounded-md border border-slate-200 px-2.5 py-2 text-sm" value={item.title || ''} onChange={(e) => patchEvent(item.id, 'title', e.target.value)} />
                <input className="md:col-span-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm" value={item.location || ''} onChange={(e) => patchEvent(item.id, 'location', e.target.value)} />
                <input type="datetime-local" className="md:col-span-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm" value={item.event_date ? new Date(item.event_date).toISOString().slice(0, 16) : ''} onChange={(e) => patchEvent(item.id, 'event_date', e.target.value)} />
                <select className="md:col-span-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm" value={item.status || 'upcoming'} onChange={(e) => patchEvent(item.id, 'status', e.target.value)}>
                  <option value="upcoming">Sắp diễn ra</option>
                  <option value="registration">Mở đăng ký</option>
                </select>
                <input
                  type="number"
                  min="1"
                  className="md:col-span-2 rounded-md border border-slate-200 px-2.5 py-2 text-sm"
                  value={item.linked_post_id ?? ''}
                  onChange={(e) => patchEvent(item.id, 'linked_post_id', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="ID bài viết"
                />
                <div className="md:col-span-3 flex justify-end gap-2">
                  <Button onClick={() => saveEvent(item)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-100"><Save size={13} className="mr-1" />Lưu</Button>
                  <Button onClick={() => removeEvent(item.id)} className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs normal-case tracking-normal text-red-700 hover:bg-red-50"><Trash2 size={13} className="mr-1" />Xóa</Button>
                </div>
                <RichTextEditor
                  className="md:col-span-12"
                  size="compact"
                  value={item.description || ''}
                  onChange={(value) => patchEvent(item.id, 'description', value)}
                />
              </div>
            ))}
            {events.length === 0 && <div className="py-10 text-center text-slate-500">Chưa có sự kiện.</div>}
          </div>
        )}
      </Card>
    </div>
  )
}
