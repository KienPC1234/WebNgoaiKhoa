import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button, Card } from '@/components/UI'
import { HybridCMSEditorRoot } from '@/cms-editor'
import { createDocument } from '@/cms-editor/core/model'
import {
  deriveHtmlContentFromDocument,
  normalizeLayoutMetadataToDocument,
} from '@/cms-editor/core/legacy'
import { cmsService } from '@/lib/cmsService'
import { showApiError, toastSuccess } from '@/lib/notify'

const emptyForm = {
  title: '',
  image_url: '',
  category: 'van',
  subject: 'van',
  content_type: 'an-pham',
  featured_year: '2025-2026',
  author: 'Ban Tổ Chức',
  snippet: '',
  read_time_minutes: 5,
  is_published: true,
}

const createInitialDoc = (title = 'Untitled Article') => {
  const doc = createDocument(title)
  doc.blocks = []
  return doc
}

export const AdminPostDesigner = () => {
  const { publicationId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const isEditing = Boolean(publicationId)
  const entity = searchParams.get('entity') === 'story' ? 'story' : 'publication'
  const isStory = entity === 'story'

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [documentState, setDocumentState] = useState(createInitialDoc())

  useEffect(() => {
    const loadEntity = async () => {
      if (!isEditing) return
      setLoading(true)
      try {
        const item = isStory
          ? await cmsService.getStoryById(publicationId)
          : await cmsService.getPublicationById(publicationId)

        setFormData({
          title: item.title || '',
          image_url: item.image_url || '',
          category: item.category || item.subject || (isStory ? 'Truyền cảm hứng' : 'van'),
          subject: item.subject || item.category || 'van',
          content_type: item.content_type || 'an-pham',
          featured_year: item.featured_year || '2025-2026',
          author: item.author || 'Ban Tổ Chức',
          snippet: item.snippet || '',
          read_time_minutes: item.read_time_minutes || 5,
          is_published: item.is_published ?? true,
        })

        const normalized = normalizeLayoutMetadataToDocument(item.layout_metadata, item.title)
        const fallback = createInitialDoc(item.title)
        if (item.content) {
          fallback.blocks = [
            {
              id: `legacy-content-${Date.now()}`,
              type: 'paragraph',
              props: { colSpan: 12, rowSpan: 1, text: String(item.content) },
              children: [],
            },
          ]
        }
        setDocumentState(normalized || fallback)
      } catch (error) {
        showApiError(error, isStory ? 'Không tải được câu chuyện để chỉnh sửa.' : 'Không tải được bài viết để chỉnh sửa.')
        navigate('/admin/publications')
      } finally {
        setLoading(false)
      }
    }

    loadEntity()
  }, [isEditing, isStory, publicationId, navigate])

  const handleDocChange = useCallback((nextDocument) => {
    setDocumentState(nextDocument)
  }, [])

  const canSubmit = useMemo(() => {
    return formData.title.trim().length > 0
  }, [formData.title])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)

    const normalizedDoc = {
      ...documentState,
      title: formData.title,
      metadata: {
        ...(documentState.metadata || {}),
        entity,
      },
    }

    const shared = {
      title: formData.title,
      image_url: formData.image_url,
      layout_metadata: normalizedDoc,
      content: deriveHtmlContentFromDocument(normalizedDoc),
    }

    try {
      if (isStory) {
        const payload = {
          ...shared,
          author: formData.author,
          category: formData.category,
          snippet: formData.snippet,
          read_time_minutes: Number(formData.read_time_minutes || 5),
          is_published: !!formData.is_published,
        }

        if (isEditing) {
          await cmsService.updateStory(publicationId, payload)
        } else {
          await cmsService.createStory(payload)
        }
      } else {
        const payload = {
          ...shared,
          category: formData.category,
          subject: formData.subject,
          content_type: formData.content_type,
          featured_year: formData.featured_year,
        }

        if (isEditing) {
          await cmsService.updatePublication(publicationId, payload)
        } else {
          await cmsService.createPublication(payload)
        }
      }

      toastSuccess(isEditing ? 'Đã cập nhật nội dung bằng CMS Editor.' : 'Đã tạo nội dung bằng CMS Editor.')
      navigate('/admin/publications')
    } catch (error) {
      showApiError(error, 'Lưu nội dung thất bại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-500 font-black uppercase tracking-widest">Đang tải CMS Editor...</div>
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div>
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Editor</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {isStory ? 'Story editor với CMS document model' : 'Publication editor với CMS document model'}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/publications')} className="bg-gray-100 text-gray-700 border-none rounded-xl font-black inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Quay lại danh sách
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-4 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            required
            value={formData.title}
            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm font-bold"
            placeholder="Tiêu đề"
          />

          <input
            value={formData.image_url}
            onChange={(event) => setFormData((prev) => ({ ...prev, image_url: event.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
            placeholder="URL ảnh bìa"
          />

          {isStory ? (
            <>
              <input
                value={formData.author}
                onChange={(event) => setFormData((prev) => ({ ...prev, author: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
                placeholder="Tác giả"
              />
              <input
                value={formData.category}
                onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
                placeholder="Chuyên mục"
              />
            </>
          ) : (
            <>
              <select
                value={formData.subject}
                onChange={(event) => setFormData((prev) => ({ ...prev, subject: event.target.value, category: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm font-black uppercase"
              >
                <option value="van">Ngữ Văn</option>
                <option value="ktpl">KTPL</option>
                <option value="lich-su">Lịch sử</option>
                <option value="dia-li">Địa lí</option>
                <option value="vovinam">Vovinam</option>
              </select>
              <select
                value={formData.content_type}
                onChange={(event) => setFormData((prev) => ({ ...prev, content_type: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm font-black uppercase"
              >
                <option value="an-pham">Ấn phẩm</option>
                <option value="tai-lieu">Tài liệu</option>
                <option value="vinh-danh">Vinh danh</option>
              </select>
            </>
          )}
        </Card>

        <Card className="p-4 rounded-2xl border border-gray-100">
          <HybridCMSEditorRoot
            initialDocument={documentState}
            onDocumentChange={handleDocChange}
          />
        </Card>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/publications')}
            className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-500 font-black uppercase tracking-widest"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="flex-[2] py-4 rounded-xl bg-fpt-blue text-white font-black uppercase tracking-widest border-none inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật bằng CMS Editor' : 'Tạo bằng CMS Editor'}
          </button>
        </div>
      </form>
    </div>
  )
}
