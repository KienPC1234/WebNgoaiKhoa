import { useEffect, useState } from 'react'
import { Card, Button, Input, Textarea } from '@/components/UI'
import { cmsService } from '@/lib/cmsService'
import { toastSuccess, showApiError } from '@/lib/notify'
import { RefreshCw, Save, Code2, ImagePlus, Trash2, Video, Link2, GripVertical, ExternalLink } from 'lucide-react'

/** Convert a Google Drive / YouTube share URL to an embeddable preview URL */
const getEmbedUrl = (url) => {
  if (!url) return null
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
  if (driveOpenMatch) return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/')
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/')
  return null
}

const DEFAULT_HOMEPAGE = {
  hero: {
    line1: 'Trải nghiệm',
    line2: 'Sáng tạo',
    description: 'Tôn trọng cá nhân, đề cao sự tự lập và phát triển con người toàn diện.',
    hero_image: '',
    background_image_url: '',
    background_images: [],
    background_transition_interval_ms: 6500,
    background_transition_effect: 'fade',
    cta_primary: 'Khám phá ngay',
  },
  news_section: {
    title: 'Tin tức cập nhật',
    subtitle: 'Bài viết cuộc thi mới nhất từ học sinh và giáo viên.',
  },
  events_section: {
    title: 'Lịch sự kiện',
    subtitle: 'Theo dõi các sự kiện quan trọng trong thời gian tới.',
  },
  videos_section: {
    title: 'Video giới thiệu',
    subtitle: 'Khám phá hoạt động và tinh thần học tập qua những thước phim ngắn.',
    items: [],
  },
}

const deepClone = (obj) => JSON.parse(JSON.stringify(obj))

const mergeHomepageData = (input) => {
  const merged = deepClone(DEFAULT_HOMEPAGE)
  if (!input || typeof input !== 'object') return merged

  const mergeObject = (target, source) => {
    Object.keys(source || {}).forEach((key) => {
      const srcValue = source[key]
      if (srcValue && typeof srcValue === 'object' && !Array.isArray(srcValue) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        mergeObject(target[key], srcValue)
      } else {
        target[key] = srcValue
      }
    })
  }

  mergeObject(merged, input)
  if (!Array.isArray(merged.hero?.background_images)) merged.hero.background_images = []
  if (!Number.isFinite(Number(merged.hero?.background_transition_interval_ms))) {
    merged.hero.background_transition_interval_ms = DEFAULT_HOMEPAGE.hero.background_transition_interval_ms
  } else {
    merged.hero.background_transition_interval_ms = Number(merged.hero.background_transition_interval_ms)
  }
  if (!['fade', 'slide'].includes(merged.hero?.background_transition_effect)) {
    merged.hero.background_transition_effect = DEFAULT_HOMEPAGE.hero.background_transition_effect
  }
  if (merged.hero?.background_image_url && !merged.hero.background_images.includes(merged.hero.background_image_url)) {
    merged.hero.background_images = [merged.hero.background_image_url, ...merged.hero.background_images]
  }
  if (!Array.isArray(merged.videos_section?.items)) merged.videos_section.items = []
  return merged
}

const SectionTitle = ({ title, subtitle }) => (
  <div>
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
  </div>
)

export const AdminSiteTexts = () => {
  const [form, setForm] = useState(() => deepClone(DEFAULT_HOMEPAGE))
  const [rawJsonOpen, setRawJsonOpen] = useState(false)
  const [rawJson, setRawJson] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingBg, setUploadingBg] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [newBgUrl, setNewBgUrl] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')

  const refreshData = async () => {
    setLoading(true)
    try {
      const data = await cmsService.getSiteTexts()
      const merged = mergeHomepageData(data)
      setForm(merged)
      setRawJson(JSON.stringify(merged, null, 2))
    } catch (err) {
      showApiError(err, 'Không tải được dữ liệu Trang chủ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  useEffect(() => {
    setRawJson(JSON.stringify(form, null, 2))
  }, [form])

  const saveStructured = async () => {
    setSaving(true)
    try {
      const payload = deepClone(form)
      payload.hero = payload.hero || {}
      payload.hero.background_image_url = (payload.hero.background_images && payload.hero.background_images[0]) || payload.hero.background_image_url || ''
      payload.hero.background_transition_interval_ms = Math.max(2000, Math.min(20000, Number(payload.hero.background_transition_interval_ms) || 6500))
      payload.hero.background_transition_effect = ['fade', 'slide'].includes(payload.hero.background_transition_effect)
        ? payload.hero.background_transition_effect
        : 'fade'
      await cmsService.updateSiteTexts(payload)
      toastSuccess('Đã lưu nội dung Trang chủ')
      await refreshData()
    } catch (err) {
      showApiError(err, 'Lưu nội dung thất bại')
    } finally {
      setSaving(false)
    }
  }

  const uploadHeroImage = async (file) => {
    if (!file) return
    setUploadingBg(true) // using same loading state for simplicity
    try {
      const res = await cmsService.uploadImage(file, 'cover')
      const url = res?.url || ''
      if (!url) throw new Error('Upload không trả về URL')
      setForm((prev) => ({
        ...prev,
        hero: {
          ...(prev.hero || {}),
          hero_image: url,
        },
      }))
      toastSuccess('Đã tải ảnh Hero')
    } catch (err) {
      showApiError(err, 'Tải ảnh Hero thất bại')
    } finally {
      setUploadingBg(false)
    }
  }

  const uploadHeroBackground = async (file) => {
    if (!file) return
    setUploadingBg(true)
    try {
      const res = await cmsService.uploadImage(file, 'cover')
      const url = res?.url || ''
      if (!url) throw new Error('Upload không trả về URL')
      const oldList = Array.isArray(form.hero?.background_images) ? form.hero.background_images : []
      setForm((prev) => ({
        ...prev,
        hero: {
          ...(prev.hero || {}),
          background_images: [url, ...oldList.filter((x) => x !== url)],
          background_image_url: url,
        },
      }))
      toastSuccess('Đã tải ảnh nền')
    } catch (err) {
      showApiError(err, 'Tải ảnh nền thất bại')
    } finally {
      setUploadingBg(false)
    }
  }

  const uploadIntroVideo = async (file) => {
    if (!file) return
    setUploadingVideo(true)
    try {
      const res = await cmsService.uploadHomepageVideo(file)
      const url = res?.url || ''
      if (!url) throw new Error('Upload video không trả về URL')
      const oldItems = Array.isArray(form.videos_section?.items) ? form.videos_section.items : []
      setForm((prev) => ({
        ...prev,
        videos_section: {
          ...(prev.videos_section || {}),
          items: [
            { title: file.name.replace(/\.[^.]+$/, ''), description: '', url, thumbnail_url: '' },
            ...oldItems,
          ],
        },
      }))
      toastSuccess('Đã tải video giới thiệu')
    } catch (err) {
      showApiError(err, 'Upload video thất bại')
    } finally {
      setUploadingVideo(false)
    }
  }

  const addVideoFromUrl = () => {
    const url = (newVideoUrl || '').trim()
    if (!url) return
    const oldItems = Array.isArray(form.videos_section?.items) ? form.videos_section.items : []
    // Extract a readable title from the URL
    let title = 'Video giới thiệu'
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (driveMatch) title = `Google Drive Video`
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
    if (ytMatch) title = `YouTube Video`
    setForm((prev) => ({
      ...prev,
      videos_section: {
        ...(prev.videos_section || {}),
        items: [
          { title, description: '', url, thumbnail_url: '' },
          ...oldItems,
        ],
      },
    }))
    setNewVideoUrl('')
    toastSuccess('Đã thêm video từ link')
  }

  const addBackgroundFromUrl = () => {
    const url = (newBgUrl || '').trim()
    if (!url) return
    const oldList = Array.isArray(form.hero?.background_images) ? form.hero.background_images : []
    setForm((prev) => ({
      ...prev,
      hero: {
        ...(prev.hero || {}),
        background_images: [url, ...oldList.filter((x) => x !== url)],
        background_image_url: oldList[0] ? prev.hero.background_image_url : url,
      },
    }))
    setNewBgUrl('')
  }

  const removeBackground = (idx) => {
    const oldList = Array.isArray(form.hero?.background_images) ? form.hero.background_images : []
    const next = oldList.filter((_, i) => i !== idx)
    setForm((prev) => ({
      ...prev,
      hero: {
        ...(prev.hero || {}),
        background_images: next,
        background_image_url: next[0] || '',
      },
    }))
  }

  const updateVideoItem = (idx, key, value) => {
    const oldItems = Array.isArray(form.videos_section?.items) ? form.videos_section.items : []
    const next = oldItems.map((item, i) => (i === idx ? { ...item, [key]: value } : item))
    setForm((prev) => ({
      ...prev,
      videos_section: {
        ...(prev.videos_section || {}),
        items: next,
      },
    }))
  }

  const removeVideoItem = (idx) => {
    const oldItems = Array.isArray(form.videos_section?.items) ? form.videos_section.items : []
    const next = oldItems.filter((_, i) => i !== idx)
    setForm((prev) => ({
      ...prev,
      videos_section: {
        ...(prev.videos_section || {}),
        items: next,
      },
    }))
  }

  const saveRawJson = async () => {
    let parsed
    try {
      parsed = JSON.parse(rawJson)
    } catch (err) {
      showApiError(err, 'JSON không hợp lệ')
      return
    }

    setSaving(true)
    try {
      await cmsService.updateSiteTexts(parsed)
      toastSuccess('Đã lưu JSON')
      const merged = mergeHomepageData(parsed)
      setForm(merged)
      setRawJson(JSON.stringify(merged, null, 2))
    } catch (err) {
      showApiError(err, 'Lưu JSON thất bại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Biên tập Trang chủ</h1>
            <p className="mt-1 text-sm text-slate-600">Thiết kế 4 phần: Hero ảnh scroll, Tin tức cuộc thi, Lịch sự kiện, Video giới thiệu.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="inline-flex items-center gap-2" onClick={refreshData} disabled={loading || saving}>
              <RefreshCw size={14} /> Tải lại
            </Button>
            <Button className="inline-flex items-center gap-2" onClick={saveStructured} disabled={loading || saving}>
              <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
            <Button variant="ghost" className="inline-flex items-center gap-2" onClick={() => setRawJsonOpen((s) => !s)}>
              <Code2 size={14} /> {rawJsonOpen ? 'Ẩn JSON' : 'Xem JSON'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <SectionTitle title="Phần 1: Hero ảnh nền scroll" subtitle="Upload nhiều ảnh nền, tuỳ chỉnh tốc độ và hiệu ứng chuyển nền trang chủ." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Ảnh đại diện Hero (hiển thị bên phải)</h3>
            <div className="flex flex-col gap-3">
              <label className="w-fit inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <ImagePlus size={14} /> {uploadingBg ? 'Đang tải...' : 'Upload ảnh Hero'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingBg}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0]
                    uploadHeroImage(file)
                    e.target.value = ''
                  }}
                />
              </label>
              
              <div className="flex items-center gap-2">
                <Input
                  className="!h-9 flex-1"
                  label=""
                  placeholder="Hoặc dán URL ảnh Hero"
                  value={form.hero?.hero_image || ''}
                  onChange={(e) => setForm({ ...form, hero: { ...(form.hero || {}), hero_image: e.target.value } })}
                />
              </div>

              {form.hero?.hero_image && (
                <div className="mt-2 w-full max-w-[200px] rounded-xl border border-slate-200 bg-white p-2">
                  <img src={form.hero.hero_image} alt="hero" className="h-32 w-full rounded-md object-cover" />
                  <div className="mt-2 flex items-center justify-end">
                    <button type="button" onClick={() => setForm({ ...form, hero: { ...(form.hero || {}), hero_image: '' } })} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Input label="Dòng tiêu đề 1" value={form.hero?.line1 || ''} onChange={(e) => setForm({ ...form, hero: { ...(form.hero || {}), line1: e.target.value } })} />
          <Input label="Dòng tiêu đề 2" value={form.hero?.line2 || ''} onChange={(e) => setForm({ ...form, hero: { ...(form.hero || {}), line2: e.target.value } })} />
          <div className="md:col-span-2">
            <Textarea label="Mô tả" value={form.hero?.description || ''} onChange={(e) => setForm({ ...form, hero: { ...(form.hero || {}), description: e.target.value } })} className="min-h-[90px]" />
          </div>
          <Input label="Nút chính" value={form.hero?.cta_primary || ''} onChange={(e) => setForm({ ...form, hero: { ...(form.hero || {}), cta_primary: e.target.value } })} />
          <Input
            type="number"
            min={2}
            max={20}
            step={0.5}
            label="Tốc độ chuyển nền (giây)"
            value={Number((Number(form.hero?.background_transition_interval_ms || 6500) / 1000).toFixed(1))}
            onChange={(e) => {
              const sec = Number(e.target.value)
              setForm({
                ...form,
                hero: {
                  ...(form.hero || {}),
                  background_transition_interval_ms: Number.isFinite(sec) ? Math.round(sec * 1000) : 6500,
                },
              })
            }}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Hiệu ứng chuyển nền</label>
            <select
              value={form.hero?.background_transition_effect || 'fade'}
              onChange={(e) => setForm({ ...form, hero: { ...(form.hero || {}), background_transition_effect: e.target.value } })}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
            >
              <option value="fade">Mờ dần (êm)</option>
              <option value="slide">Trượt ngang</option>
            </select>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <ImagePlus size={14} /> {uploadingBg ? 'Đang tải...' : 'Upload ảnh nền'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingBg}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0]
                    uploadHeroBackground(file)
                    e.target.value = ''
                  }}
                />
              </label>

              <Input
                className="!h-9 flex-1"
                label=""
                placeholder="Dán URL ảnh nền rồi bấm Thêm"
                value={newBgUrl}
                onChange={(e) => setNewBgUrl(e.target.value)}
              />
              <Button variant="outline" className="!rounded-lg !px-3 !py-2 !text-xs !font-semibold !tracking-normal" onClick={addBackgroundFromUrl}>Thêm</Button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(form.hero?.background_images || []).map((url, idx) => (
                <div key={`${url}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-2">
                  <img src={url} alt={`bg-${idx}`} className="h-28 w-full rounded-md object-cover" />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-[11px] text-slate-500">{idx === 0 ? 'Ảnh chính' : `Ảnh ${idx + 1}`}</p>
                    <button type="button" onClick={() => removeBackground(idx)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700">
                      <Trash2 size={12} /> Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <SectionTitle title="Phần 2: Tin tức cập nhật" subtitle="Hiển thị danh sách bài viết cuộc thi từ dữ liệu submissions đã duyệt." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Tiêu đề" value={form.news_section?.title || ''} onChange={(e) => setForm({ ...form, news_section: { ...(form.news_section || {}), title: e.target.value } })} />
          <Input label="Mô tả" value={form.news_section?.subtitle || ''} onChange={(e) => setForm({ ...form, news_section: { ...(form.news_section || {}), subtitle: e.target.value } })} />
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <SectionTitle title="Phần 3: Lịch sự kiện" subtitle="UI sẽ tự động làm nổi bật khi chỉ có 1 event và hiển thị tinh tế khi có nhiều event." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Tiêu đề" value={form.events_section?.title || ''} onChange={(e) => setForm({ ...form, events_section: { ...(form.events_section || {}), title: e.target.value } })} />
          <Input label="Mô tả" value={form.events_section?.subtitle || ''} onChange={(e) => setForm({ ...form, events_section: { ...(form.events_section || {}), subtitle: e.target.value } })} />
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
        <SectionTitle title="Phần 4: Video giới thiệu" subtitle="Upload video hoặc dán link Google Drive / YouTube. Hiển thị dạng scroll ngang trên trang chủ." />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Tiêu đề section" value={form.videos_section?.title || ''} onChange={(e) => setForm({ ...form, videos_section: { ...(form.videos_section || {}), title: e.target.value } })} />
          <Input label="Mô tả section" value={form.videos_section?.subtitle || ''} onChange={(e) => setForm({ ...form, videos_section: { ...(form.videos_section || {}), subtitle: e.target.value } })} />
        </div>

        {/* Add video controls */}
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Thêm video mới</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition">
              <Video size={14} className="text-fpt-orange" /> {uploadingVideo ? 'Đang tải...' : 'Upload file'}
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                className="hidden"
                disabled={uploadingVideo}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0]
                  uploadIntroVideo(file)
                  e.target.value = ''
                }}
              />
            </label>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">hoặc dán link</span>
            <div className="flex flex-1 min-w-[240px] items-center gap-2">
              <div className="relative flex-1">
                <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVideoFromUrl() } }}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-8 pr-3 text-xs shadow-sm focus:border-fpt-orange focus:ring-1 focus:ring-fpt-orange/30 outline-none transition"
                  placeholder="https://drive.google.com/file/d/... hoặc YouTube"
                  aria-label="URL video"
                />
              </div>
              <button
                type="button"
                onClick={addVideoFromUrl}
                disabled={!newVideoUrl.trim()}
                className="rounded-lg bg-fpt-orange px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Thêm
              </button>
            </div>
          </div>
        </div>

        {/* Video items list with preview */}
        <div className="mt-4 space-y-4">
          {(form.videos_section?.items || []).length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <Video size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-400">Chưa có video nào. Upload file hoặc dán link ở trên.</p>
            </div>
          )}
          {(form.videos_section?.items || []).map((item, idx) => {
            const embedUrl = getEmbedUrl(item.url)
            const isDirectVideo = item.url && /\.(mp4|webm|ogg)(\?|$)/i.test(item.url)
            return (
              <div key={`video-${idx}`} className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition">
                <div className="flex flex-col md:flex-row">
                  {/* Preview */}
                  <div className="relative w-full md:w-64 h-40 md:h-auto flex-shrink-0 bg-slate-900 overflow-hidden">
                    {embedUrl ? (
                      <iframe src={embedUrl} title={item.title || 'Preview'} className="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    ) : isDirectVideo ? (
                      <video src={item.url} poster={item.thumbnail_url || undefined} controls preload="metadata" className="w-full h-full object-cover" />
                    ) : item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.title || 'Thumbnail'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Video size={32} className="text-slate-600" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      {embedUrl ? 'Embed' : isDirectVideo ? 'MP4' : 'Link'}
                    </div>
                  </div>
                  {/* Fields */}
                  <div className="flex-1 p-4">
                    <div className="grid gap-2.5 md:grid-cols-2">
                      <Input label="Tiêu đề" value={item.title || ''} onChange={(e) => updateVideoItem(idx, 'title', e.target.value)} />
                      <Input label="URL video" value={item.url || ''} onChange={(e) => updateVideoItem(idx, 'url', e.target.value)} />
                      <Input label="Thumbnail URL" value={item.thumbnail_url || ''} onChange={(e) => updateVideoItem(idx, 'thumbnail_url', e.target.value)} />
                      <Textarea label="Mô tả" value={item.description || ''} onChange={(e) => updateVideoItem(idx, 'description', e.target.value)} className="min-h-[60px]" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-fpt-orange transition">
                          <ExternalLink size={10} /> Mở link gốc
                        </a>
                      )}
                      <button type="button" onClick={() => removeVideoItem(idx)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition">
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {rawJsonOpen ? (
        <Card className="rounded-2xl border border-slate-200 p-6 shadow-sm">
          <SectionTitle title="JSON nâng cao" subtitle="Dùng khi cần tinh chỉnh sâu các trường nâng cao." />
          <div className="mt-4 space-y-3">
            <textarea
              className="custom-scrollbar h-[420px] w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={saveRawJson} disabled={saving} className="inline-flex items-center gap-2">
                <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu JSON'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

export default AdminSiteTexts
