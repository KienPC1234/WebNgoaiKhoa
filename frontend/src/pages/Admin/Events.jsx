import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, Button, RichTextEditor } from '@/components/UI'
import CalendarView from '@/components/Admin/CalendarView'
import SeriesEditor from '@/components/Admin/SeriesEditor'
import { CalendarDays, Plus, Save, Trash2, Mail, BellRing, Download, UploadCloud, LayoutGrid, List, ImagePlus } from 'lucide-react'
import PostLinkModal from '@/components/Admin/PostLinkModal'
import { cmsService } from '@/lib/cmsService'
// useRef already imported above
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

const emptyForm = {
  title: '',
  description: '',
  event_date: '',
  location: '',
  rrule: '',
  timezone: '',
  image_url: '',
  status: 'upcoming',
  linked_post_id: '',
  is_active: true,
}

export const AdminEvents = () => {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [viewMode, setViewMode] = useState('list')
  const [pushConfig, setPushConfig] = useState(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkModalContext, setLinkModalContext] = useState(null)
  const [newsletterForm, setNewsletterForm] = useState({
    title: '',
    body: '',
    action_url: '/events/upcoming',
    send_email: true,
    send_webpush: true,
    audience: ['all'],
  })
  const [newsletterSending, setNewsletterSending] = useState(false)
  const [roleOptions, setRoleOptions] = useState([])
  const [editingEventId, setEditingEventId] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [calendarRange, setCalendarRange] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const importFileRef = useRef(null)

  const uploadEventImage = async (file) => {
    if (!file) return
    setUploadingImage(true)
    try {
      const res = await cmsService.uploadImage(file, 'event')
      const url = res?.url || ''
      if (!url) throw new Error('Upload không trả về URL')
      setForm((prev) => ({ ...prev, image_url: url }))
      toastSuccess('Đã tải ảnh sự kiện')
    } catch (err) {
      showApiError(err, 'Tải ảnh thất bại')
    } finally {
      setUploadingImage(false)
    }
  }

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

  // when switching modes: for calendar mode the CalendarView will request occurrences via onRangeChange
  useEffect(() => {
    if (viewMode === 'calendar') {
      // reset and wait for CalendarView to request the appropriate month range
      setEvents([])
      setLoading(false)
      return
    }
    fetchEvents(viewMode)
  }, [viewMode])

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await cmsService.getRoles()
        setRoleOptions((res || []).map((r) => ({ value: r.slug, label: r.name || r.slug })))
      } catch (err) {
        console.error('Error fetching roles:', err)
      }
    }
    fetchRoles()
  }, [])

  const handleCalendarRangeChange = useCallback(async (startIso, endIso) => {
    setLoading(true)
    try {
      const occ = await cmsService.getEventOccurrences(startIso, endIso)
      setEvents(occ || [])
      setCalendarRange({ start: startIso, end: endIso })
    } catch (err) {
      console.error('Error fetching event occurrences:', err)
      showApiError(err, 'Không tải được dữ liệu lịch.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleEventDrop = useCallback(async (dropData, targetDate) => {
    if (!dropData || !dropData.event_id) return
    setLoading(true)
    try {
      const canonical = await cmsService.getEventById(dropData.event_id)
      if (canonical.rrule) {
        toastError('Không thể di chuyển sự kiện định kỳ bằng kéo-thả. Vui lòng chỉnh sửa trực tiếp.')
        return
      }
      const orig = new Date(canonical.event_date)
      const newDt = new Date(targetDate)
      newDt.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds(), orig.getMilliseconds())

      const payload = {
        title: canonical.title,
        description: canonical.description,
        event_date: newDt.toISOString(),
        location: canonical.location || '',
        rrule: canonical.rrule || '',
        timezone: canonical.timezone || '',
        image_url: canonical.image_url || '',
        status: canonical.status || 'upcoming',
        linked_post_id: canonical.linked_post_id || null,
        is_active: canonical.is_active ?? true,
      }

      await cmsService.updateEvent(canonical.id, payload)
      toastSuccess('Đã di chuyển sự kiện.')
      if (viewMode === 'calendar' && calendarRange?.start) {
        await handleCalendarRangeChange(calendarRange.start, calendarRange.end)
      } else {
        fetchEvents(viewMode)
      }
    } catch (err) {
      console.error('Drop move failed', err)
      showApiError(err, 'Di chuyển sự kiện thất bại.')
    } finally {
      setLoading(false)
    }
  }, [viewMode, calendarRange, handleCalendarRangeChange])

  const handleImportCsv = async (file) => {
    if (!file) return
    try {
      const res = await cmsService.importEventsCsv(file)
      toastSuccess(`Imported ${res.created} events`)
      fetchEvents(viewMode)
    } catch (err) {
      console.error('Import failed', err)
      showApiError(err, 'Nhập CSV thất bại.')
    }
  }

  const handleExportCsv = async () => {
    try {
      const start = calendarRange?.start
      const end = calendarRange?.end
      const blob = await cmsService.exportEventsCsv(start, end)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'events_export.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
      showApiError(err, 'Xuất CSV thất bại.')
    }
  }

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
      setShowEditor(false)
      fetchEvents(viewMode)
    } catch (error) {
      console.error('Error creating event:', error)
      showApiError(error, 'Tạo sự kiện thất bại.')
    }
  }

  const updateFormEvent = async () => {
    if (!editingEventId) return
    try {
      await cmsService.updateEvent(editingEventId, {
        ...form,
        linked_post_id: form.linked_post_id === '' ? null : Number(form.linked_post_id),
      })
      setForm(emptyForm)
      setEditingEventId(null)
      setShowEditor(false)
      fetchEvents(viewMode)
    } catch (err) {
      console.error('Error updating event from form:', err)
      showApiError(err, 'Cập nhật sự kiện thất bại.')
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

  const openLinkModalForForm = () => {
    setLinkModalContext({ mode: 'form' })
    setLinkModalOpen(true)
  }

  const openLinkModalForRow = (id) => {
    setLinkModalContext({ mode: 'row', id })
    setLinkModalOpen(true)
  }

  const handleModalSelect = (pub) => {
    if (!pub) return
    if (linkModalContext?.mode === 'form') {
      setForm((prev) => ({ ...prev, linked_post_id: pub.id }))
    } else if (linkModalContext?.mode === 'row' && linkModalContext.id) {
      patchEvent(linkModalContext.id, 'linked_post_id', pub.id)
    }
    setLinkModalOpen(false)
    setLinkModalContext(null)
  }

  const openEventEditor = async (item) => {
    try {
      if (item.event_id) {
        const row = await cmsService.getEventById(item.event_id)
        setForm({
          title: row.title || '',
          description: row.description || '',
          event_date: row.event_date || '',
          location: row.location || '',
          image_url: row.image_url || '',
          status: row.status || 'upcoming',
          linked_post_id: row.linked_post_id || '',
          is_active: row.is_active ?? true,
          rrule: row.rrule || '',
          timezone: row.timezone || '',
        })
        setEditingEventId(row.id)
      } else {
        setForm({
          title: item.title || '',
          description: item.description || '',
          event_date: item.event_date || '',
          location: item.location || '',
          image_url: item.image_url || '',
          status: item.status || 'upcoming',
          linked_post_id: item.linked_post_id || '',
          is_active: item.is_active ?? true,
          rrule: item.rrule || '',
          timezone: item.timezone || '',
        })
        setEditingEventId(item.id || item.event_id)
      }
      setShowEditor(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('Failed to load event for edit:', err)
      showApiError(err, 'Không lấy được chi tiết sự kiện để chỉnh sửa.')
    }
  }

  // Auto-open editor when URL contains ?edit=<id>
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const editParam = params.get('edit')
      if (!editParam) return
      const editId = Number(editParam)
      if (!Number.isFinite(editId)) return

      ;(async () => {
        try {
          const row = await cmsService.getEventById(editId)
          if (row) openEventEditor(row)
        } catch (err) {
          console.error('Auto-open event editor failed for id', editId, err)
        }
      })()
    } catch (err) {
      console.error('Failed to parse edit query param', err)
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toLocalDatetimeInputValue = (d) => {
    const date = new Date(d)
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const openNewEventAt = (date) => {
    setEditingEventId(null)
    setForm({
      ...emptyForm,
      event_date: toLocalDatetimeInputValue(date),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    })
    setShowEditor(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      {showEditor && (
        <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Địa điểm" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <input type="datetime-local" className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          <div className="md:col-span-2">
            <SeriesEditor rrule={form.rrule} onChange={(val) => setForm({ ...form, rrule: val })} />
            <div className="mt-2">
              <input className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Timezone (e.g. Asia/Ho_Chi_Minh)" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
          </div>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="registration">Mở đăng ký</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              readOnly
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="ID bài viết liên kết (tùy chọn)"
              value={form.linked_post_id ? `ID ${form.linked_post_id}` : ''}
            />
            <Button onClick={openLinkModalForForm} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Link Post</Button>
            {form.linked_post_id && (
              <Button onClick={() => setForm({ ...form, linked_post_id: '' })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Clear</Button>
            )}
          </div>
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <ImagePlus size={14} /> {uploadingImage ? 'Đang tải...' : 'Upload ảnh'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0]
                    if (file) uploadEventImage(file)
                    e.target.value = ''
                  }}
                />
              </label>
              <input className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Hoặc dán URL ảnh" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>
            {form.image_url ? (
              <div className="mt-2 flex items-start gap-3">
                <img src={form.image_url} alt="Preview" className="h-24 w-36 rounded-lg border border-slate-200 object-cover" />
                <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="mt-1 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
                  <Trash2 size={12} /> Xóa ảnh
                </button>
              </div>
            ) : null}
          </div>
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Mô tả"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
          </div>

          <div className="mt-4 flex justify-end">
            {editingEventId ? (
              <Button onClick={updateFormEvent} className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700">
                <Save size={14} className="mr-1" /> Cập nhật
              </Button>
            ) : (
              <Button onClick={createEvent} className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700">
                <Plus size={14} className="mr-1" /> Thêm sự kiện
              </Button>
            )}
          </div>
        </Card>
      )}

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
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-slate-700 mb-1">Người nhận</div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Tất cả' },
                ...(roleOptions || []),
              ].map((role) => (
                <label key={role.value} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={(newsletterForm.audience || []).includes(role.value)}
                    onChange={() => {
                      setNewsletterForm((prev) => {
                        const cur = prev.audience || []
                        if (role.value === 'all') {
                          return { ...prev, audience: ['all'] }
                        }
                        // remove 'all' when selecting specific roles
                        let next = cur.filter((r) => r !== 'all')
                        if (next.includes(role.value)) {
                          next = next.filter((r) => r !== role.value)
                        } else {
                          next = [...next, role.value]
                        }
                        if (next.length === 0) next = ['all']
                        return { ...prev, audience: next }
                      })
                    }}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
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
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-slate-600" />
              <div className="text-sm font-semibold">Sự kiện</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-md bg-white border border-slate-200 p-1">
                <button type="button" onClick={() => setViewMode('list')} aria-label="List view" title="Danh sách" className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-100' : ''}`}>
                  <List size={16} />
                </button>
                <button type="button" onClick={() => setViewMode('grid')} aria-label="Grid view" title="Lưới" className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}>
                  <LayoutGrid size={16} />
                </button>
                <button type="button" onClick={() => setViewMode('calendar')} aria-label="Calendar view" title="Lịch" className={`p-2 rounded-md ${viewMode === 'calendar' ? 'bg-gray-100' : ''}`}>
                  <CalendarDays size={16} />
                </button>
              </div>
              <Button
                onClick={() => { setForm(emptyForm); setEditingEventId(null); setShowEditor(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                size="icon"
                title="Thêm sự kiện"
                aria-label="Thêm sự kiện"
                className="rounded-md"
              >
                <Plus size={16} />
              </Button>

              <input
                ref={importFileRef}
                type="file"
                accept="text/csv"
                onChange={(e) => handleImportCsv(e.target.files && e.target.files[0])}
                className="hidden"
              />
              <Button
                onClick={() => {
                  if (importFileRef.current) importFileRef.current.value = null
                  importFileRef.current && importFileRef.current.click()
                }}
                size="icon"
                title="Nhập CSV"
                aria-label="Nhập CSV"
                className="rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <UploadCloud size={16} />
              </Button>

              <Button
                onClick={handleExportCsv}
                size="icon"
                title="Xuất CSV"
                aria-label="Xuất CSV"
                className="rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} />
              </Button>
            </div>
          </div>
          {viewMode === 'calendar' ? (
          <div className="relative">
            <CalendarView
              events={events}
              onRangeChange={handleCalendarRangeChange}
              onDayClick={openNewEventAt}
              onSelectEvent={openEventEditor}
              onEventDrop={handleEventDrop}
            />
            
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-slate-500">Đang tải...</div>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          events.length === 0 ? (
            <div className="py-10 text-center text-slate-500">Chưa có sự kiện.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {events.map((item) => (
                <div key={item.id || item.event_id || item.occurrence_id} className="flex flex-col justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <div className="font-semibold text-sm truncate">{item.title || item.name || 'Untitled'}</div>
                    <div className="text-xs text-slate-500">{item.event_date ? new Date(item.event_date).toLocaleString() : ''}</div>
                    <div className="mt-2 text-sm text-slate-500 truncate">{item.location || ''}</div>
                    <div className="mt-2 text-xs inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{(item.status || '').toString()}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 justify-end">
                    <Button onClick={() => openEventEditor(item)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Sửa</Button>
                    <Button onClick={() => removeEvent(item.id || item.event_id)} className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs normal-case tracking-normal text-red-700 hover:bg-red-50"><Trash2 size={13} className="mr-1" />Xóa</Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {events.map((item) => (
              <div key={item.id || item.event_id || item.occurrence_id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-sm truncate">{item.title || item.name || 'Untitled'}</div>
                    <div className="text-xs text-slate-500">{item.event_date ? new Date(item.event_date).toLocaleString() : ''}</div>
                    <div className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{(item.status || '').toString()}</div>
                  </div>
                  <div className="text-sm text-slate-500 truncate">{item.location || ''}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={() => openEventEditor(item)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Sửa</Button>

                  <Button onClick={() => removeEvent(item.id || item.event_id)} className="rounded-md border border-red-200 bg-white px-3 py-2 text-xs normal-case tracking-normal text-red-700 hover:bg-red-50">
                    <Trash2 size={13} className="mr-1" />Xóa
                  </Button>
                </div>
              </div>
            ))}
            {events.length === 0 && <div className="py-10 text-center text-slate-500">Chưa có sự kiện.</div>}
          </div>
        )}
      </Card>
      <PostLinkModal open={linkModalOpen} onClose={() => { setLinkModalOpen(false); setLinkModalContext(null) }} onSelect={handleModalSelect} />
    </div>
  )
}
