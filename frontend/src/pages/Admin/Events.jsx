import { useEffect, useState } from 'react'
import { Card, Button, RichTextEditor } from '@/components/UI'
import { CalendarDays, Plus, Save, Trash2 } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

const emptyForm = {
  title: '',
  description: '',
  event_date: '',
  location: '',
  image_url: '',
  status: 'upcoming',
  is_active: true,
}

export const AdminEvents = () => {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [viewMode, setViewMode] = useState('upcoming')

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

  const createEvent = async () => {
    if (!form.title || !form.description || !form.event_date || !form.location) {
      toastError('Vui lòng điền đầy đủ thông tin.')
      return
    }
    try {
      await cmsService.createEvent(form)
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

  return (
    <div className="space-y-8">
      <Card className="p-8 rounded-[32px] border-none shadow-xl bg-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-50 text-fpt-blue"><CalendarDays size={20} /></div>
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Su kien sap toi</h2>
        </div>

        <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode('upcoming')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition ${viewMode === 'upcoming' ? 'bg-white text-fpt-blue shadow-sm' : 'text-gray-500'}`}
          >
            Sắp tới
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition ${viewMode === 'all' ? 'bg-white text-fpt-blue shadow-sm' : 'text-gray-500'}`}
          >
            Tất cả
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Tieu de" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Dia diem" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input type="datetime-local" className="px-4 py-3 rounded-xl bg-gray-50 font-bold" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          <select className="px-4 py-3 rounded-xl bg-gray-50 font-bold" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="upcoming">Sap dien ra</option>
            <option value="registration">Mo dang ky</option>
          </select>
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold md:col-span-2" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Mô tả"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={createEvent} className="bg-fpt-orange text-white px-6 py-3 rounded-xl font-black inline-flex items-center gap-2 border-none">
            <Plus size={16} /> Them su kien
          </Button>
        </div>
      </Card>

      <Card className="p-8 rounded-[32px] border-none shadow-xl bg-white">
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-black uppercase tracking-widest">Dang tai...</div>
        ) : (
          <div className="space-y-4">
            {events.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-3">
                <input className="md:col-span-3 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.title || ''} onChange={(e) => patchEvent(item.id, 'title', e.target.value)} />
                <input className="md:col-span-2 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.location || ''} onChange={(e) => patchEvent(item.id, 'location', e.target.value)} />
                <input type="datetime-local" className="md:col-span-2 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.event_date ? new Date(item.event_date).toISOString().slice(0, 16) : ''} onChange={(e) => patchEvent(item.id, 'event_date', e.target.value)} />
                <select className="md:col-span-2 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.status || 'upcoming'} onChange={(e) => patchEvent(item.id, 'status', e.target.value)}>
                  <option value="upcoming">Sap dien ra</option>
                  <option value="registration">Mo dang ky</option>
                </select>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <Button onClick={() => saveEvent(item)} className="bg-fpt-blue text-white px-3 py-2 rounded-lg font-black border-none inline-flex items-center gap-1"><Save size={14} />Luu</Button>
                  <Button onClick={() => removeEvent(item.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg font-black border-none inline-flex items-center gap-1"><Trash2 size={14} />Xoa</Button>
                </div>
                <RichTextEditor
                  className="md:col-span-12"
                  size="compact"
                  value={item.description || ''}
                  onChange={(value) => patchEvent(item.id, 'description', value)}
                />
              </div>
            ))}
            {events.length === 0 && <div className="py-12 text-center text-gray-400 font-black uppercase tracking-widest">Chua co su kien.</div>}
          </div>
        )}
      </Card>
    </div>
  )
}
