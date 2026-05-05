import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, FileText, Save, Trash2, UploadCloud } from 'lucide-react'
import { Button, Card } from '@/components/UI'
import { HybridCMSEditorRoot } from '@/cms-editor'
import { createDocument } from '@/cms-editor/core/model'
import {
  deriveHtmlContentFromDocument,
  normalizeLayoutMetadataToDocument,
} from '@/cms-editor/core/legacy'
import { cmsService } from '@/lib/cmsService'
import { showApiError, toastSuccess } from '@/lib/notify'
import { PageFlip } from 'page-flip'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const emptyForm = {
  title: '',
  image_url: '',
  category: 'van',
  subject: 'van',
  content_type: 'an-pham',
  short_description: '',
  featured_year: '2025-2026',
  author: 'Ban Tổ Chức',
  snippet: '',
  read_time_minutes: 5,
  is_published: true,
  status: 'upcoming',
}

const MAX_SHORT_DESCRIPTION_CHARS = 220

const normalizeShortDescription = (value) => {
  const cleaned = String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.slice(0, MAX_SHORT_DESCRIPTION_CHARS)
}

const extractShortDescriptionFromLayout = (layoutMetadata) => {
  if (!layoutMetadata || typeof layoutMetadata !== 'object') return ''
  return normalizeShortDescription(layoutMetadata?.metadata?.short_description || layoutMetadata?.short_description || '')
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
  const typeParam = searchParams.get('entity')
  const entity = ['story', 'event'].includes(typeParam) ? typeParam : 'publication'
  const isStory = entity === 'story'
  const isEvent = entity === 'event'
  const isPublication = entity === 'publication'

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [generatingShortDescription, setGeneratingShortDescription] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [notifyOptions, setNotifyOptions] = useState({ sendEmail: true, sendWebpush: true })
  const [coverUploading, setCoverUploading] = useState(false)
  const coverInputRef = useRef(null)
  const [initialDocument, setInitialDocument] = useState(() => createInitialDoc())
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfAttachmentUrl, setPdfAttachmentUrl] = useState('')
  const [pdfPreviewPages, setPdfPreviewPages] = useState([])
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false)
  const [flipSize, setFlipSize] = useState({ width: 390, height: 552 })
  const [flipCurrentPage, setFlipCurrentPage] = useState(1)
  const [removePdfAttachment, setRemovePdfAttachment] = useState(false)
  const latestDocumentRef = useRef(initialDocument)
  const flipRef = useRef(null)
  const flipInstanceRef = useRef(null)
  const autosaveLockRef = useRef(false)

  useEffect(() => {
    latestDocumentRef.current = initialDocument
  }, [initialDocument])

  useEffect(() => {
    return () => {
      if (flipInstanceRef.current) {
        flipInstanceRef.current.destroy()
        flipInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isPublication || !pdfPreviewPages.length || !flipRef.current) return

    if (flipInstanceRef.current) {
      flipInstanceRef.current.destroy()
      flipInstanceRef.current = null
    }

    const instance = new PageFlip(flipRef.current, {
      width: flipSize.width,
      height: flipSize.height,
      size: 'stretch',
      maxShadowOpacity: 0.35,
      mobileScrollSupport: true,
      usePortrait: true,
    })

    const pages = Array.from(flipRef.current.querySelectorAll('.pdf-page'))
    if (pages.length) {
      instance.loadFromHTML(pages)
      instance.on('flip', (event) => {
        setFlipCurrentPage((event.data || 0) + 1)
      })
      flipInstanceRef.current = instance
      setFlipCurrentPage(1)
    }
  }, [isPublication, pdfPreviewPages, flipSize])

  const buildPdfPreview = useCallback(async (source) => {
    if (!source) {
      setPdfPreviewPages([])
      return
    }

    setPdfPreviewLoading(true)
    try {
      const pdf = typeof source === 'string'
        ? await pdfjsLib.getDocument(source).promise
        : await pdfjsLib.getDocument({ data: await source.arrayBuffer() }).promise

      const pages = []
      const maxPages = Math.min(pdf.numPages, 10)

      for (let i = 1; i <= maxPages; i += 1) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.18 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: context, viewport }).promise
        pages.push({
          src: canvas.toDataURL('image/jpeg', 0.9),
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        })
      }

      setPdfPreviewPages(pages)
      if (pages[0]?.width && pages[0]?.height) {
        const width = Math.min(Math.max(pages[0].width, 300), 430)
        const ratio = pages[0].height / pages[0].width
        setFlipSize({ width, height: Math.round(width * ratio) })
      }
    } catch {
      setPdfPreviewPages([])
      setFlipCurrentPage(1)
    } finally {
      setPdfPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadEntity = async () => {
      if (!isEditing) return
      setLoading(true)
      try {
        let item
        if (isStory) {
          item = await cmsService.getStoryById(publicationId)
        } else if (isEvent) {
          item = await cmsService.getEventById(publicationId)
        } else {
          item = await cmsService.getPublicationById(publicationId)
        }

        setFormData({
          title: item.title || '',
          image_url: item.image_url || '',
          category: item.category || item.subject || (isStory ? 'Truyền cảm hứng' : isEvent ? 'event' : 'van'),
          subject: item.subject || item.category || (isEvent ? 'event' : 'van'),
          content_type: item.content_type || (isEvent ? 'event' : 'an-pham'),
          short_description: extractShortDescriptionFromLayout(item.layout_metadata),
          featured_year: item.featured_year || item.event_date || '2025-2026',
          author: item.author || 'Ban Tổ Chức',
          snippet: item.snippet || '',
          read_time_minutes: item.read_time_minutes || 5,
          is_published: item.is_published ?? true,
          status: item.status || 'upcoming',
        })

        const normalized = normalizeLayoutMetadataToDocument(
          item.layout_metadata,
          item.title
        )
        const fallback = createInitialDoc(item.title)
        
        const contentField = isEvent ? item.description : item.content
        if (contentField) {
          fallback.blocks = [
            {
              id: `legacy-content-${Date.now()}`,
              type: 'paragraph',
              props: { colSpan: 12, rowSpan: 1, text: String(contentField) },
              children: [],
            },
          ]
        }
        const nextDocument = normalized || fallback
        setInitialDocument(nextDocument)
        latestDocumentRef.current = nextDocument

        if (entity === 'publication') {
          const existingPdfUrl = nextDocument?.metadata?.pdf_attachment_url || ''
          setPdfAttachmentUrl(existingPdfUrl)
          setRemovePdfAttachment(false)
          setPdfFile(null)
          if (existingPdfUrl) {
            await buildPdfPreview(existingPdfUrl)
          } else {
            setPdfPreviewPages([])
          }
        }
      } catch (error) {
        const messages = {
          story: 'Không tải được câu chuyện để chỉnh sửa.',
          event: 'Không tải được sự kiện để chỉnh sửa.',
          publication: 'Không tải được bài viết để chỉnh sửa.',
        }
        showApiError(error, messages[entity])
        navigate('/admin/publications')
      } finally {
        setLoading(false)
      }
    }

    loadEntity()
  }, [isEditing, isStory, isEvent, entity, publicationId, navigate, buildPdfPreview])

  const triggerCoverUpload = () => {
    if (coverInputRef.current) coverInputRef.current.click()
  }

  const handleCoverFile = async (event) => {
    const file = event?.target?.files?.[0] || null
    if (!file) return
    setCoverUploading(true)
    try {
      const res = await cmsService.uploadImage(file, 'cover')
      const url = res?.url || res?.image_url || res?.file_url
      if (url) {
        setFormData((prev) => ({ ...prev, image_url: url }))
        toastSuccess('Ảnh bìa đã tải lên.')
      } else {
        toastSuccess('Ảnh đã tải lên (tạm hiển thị).')
      }
    } catch (err) {
      showApiError(err, 'Tải ảnh bìa thất bại.')
    } finally {
      setCoverUploading(false)
      // reset input value so same file can be uploaded again
      try { if (coverInputRef.current) coverInputRef.current.value = '' } catch (e) {}
    }
  }

  // Prefill form when creating a new publication via query params (e.g. ?content_type=vinh-danh&subject=van)
  useEffect(() => {
    if (isEditing) return
    try {
      const ct = searchParams.get('content_type')
      const subj = searchParams.get('subject') || searchParams.get('category')
      if (ct || subj) {
        setFormData((prev) => ({
          ...prev,
          content_type: ct || prev.content_type,
          subject: subj || prev.subject,
          category: subj || prev.category,
        }))
      }
    } catch (e) {
      // ignore
    }
  }, [isEditing, searchParams])

  // Prefill new publication from an event when creating via ?linked_event=<id>
  useEffect(() => {
    if (isEditing) return
    try {
      const linkedEvent = searchParams.get('linked_event')
      if (!linkedEvent) return
      let mounted = true
      ;(async () => {
        try {
          const ev = await cmsService.getEventById(Number(linkedEvent))
          if (!mounted || !ev) return
          setFormData((prev) => ({
            ...prev,
            title: ev.title || prev.title,
            image_url: ev.image_url || prev.image_url,
            // keep existing subject/content_type defaults for publications
          }))

          const fallback = createInitialDoc(ev.title)
          if (ev.description) {
            fallback.blocks = [
              {
                id: `legacy-content-${Date.now()}`,
                type: 'paragraph',
                props: { colSpan: 12, rowSpan: 1, text: String(ev.description) },
                children: [],
              },
            ]
          }
          setInitialDocument(fallback)
          latestDocumentRef.current = fallback
        } catch (err) {
          // ignore prefill failures
        }
      })()
      return () => { mounted = false }
    } catch (e) {
      // ignore
    }
  }, [isEditing, searchParams])

  const handleDocChange = useCallback((nextDocument) => {
    latestDocumentRef.current = nextDocument
  }, [])

  const handleGenerateShortDescription = useCallback(async () => {
    if (!isPublication) return

    setGeneratingShortDescription(true)
    try {
      const sourceDocument = latestDocumentRef.current || initialDocument
      const sourceContent = deriveHtmlContentFromDocument(sourceDocument)
      const generated = await cmsService.generatePublicationShortDescription({
        title: formData.title,
        subject: formData.subject,
        contentType: formData.content_type,
        content: sourceContent,
        layoutMetadata: sourceDocument,
      })

      const cleaned = normalizeShortDescription(generated)
      if (!cleaned) {
        throw new Error('AI generated an empty description')
      }

      setFormData((prev) => ({
        ...prev,
        short_description: cleaned,
      }))
      toastSuccess('Đã tạo mô tả ngắn bằng AI.')
    } catch (error) {
      showApiError(error, 'Không thể tạo mô tả bằng AI lúc này.')
    } finally {
      setGeneratingShortDescription(false)
    }
  }, [isPublication, initialDocument, formData.title, formData.subject, formData.content_type])

  const handleAutosave = useCallback(async (doc) => {
    if (!isEditing) return
    if (!publicationId) return
    if (autosaveLockRef.current) return
    autosaveLockRef.current = true
    try {
      const currentDocument = doc || latestDocumentRef.current || initialDocument
      const normalizedDoc = {
        ...currentDocument,
        title: formData.title,
        metadata: {
          ...(currentDocument.metadata || {}),
          entity,
          short_description: isPublication ? normalizeShortDescription(formData.short_description) : (currentDocument.metadata || {}).short_description,
        },
      }

        if (isStory) {
        const payload = {
          title: formData.title,
          content: deriveHtmlContentFromDocument(normalizedDoc),
          snippet: formData.snippet,
          author: formData.author,
          category: formData.category,
          layout_metadata: normalizedDoc,
          read_time_minutes: Number(formData.read_time_minutes || 5),
          is_published: !!formData.is_published,
        }
        await cmsService.saveStoryDraft(publicationId, payload)
      } else if (isEvent) {
        const payload = {
          title: formData.title,
          description: deriveHtmlContentFromDocument(normalizedDoc),
          layout_metadata: normalizedDoc,
          event_date: formData.featured_year,
          status: formData.status,
        }
        await cmsService.saveEventDraft(publicationId, payload)
      } else {
        const payload = {
          title: formData.title,
          content: deriveHtmlContentFromDocument(normalizedDoc),
          layout_metadata: normalizedDoc,
          category: formData.category,
          subject: formData.subject,
          content_type: formData.content_type,
          featured_year: formData.featured_year,
          image_url: formData.image_url,
        }
        await cmsService.savePublicationDraft(publicationId, payload)
      }
    } catch (err) {
      // Non-blocking: keep autosave failures local (will still have localStorage copy)
      console.debug('autosave failed', err)
    } finally {
      autosaveLockRef.current = false
    }
  }, [isEditing, publicationId, isStory, isEvent, entity, formData, initialDocument])

  const canSubmit = useMemo(() => {
    return formData.title.trim().length > 0
  }, [formData.title])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    setSaving(true)

    const currentDocument = latestDocumentRef.current || initialDocument

    const normalizedDoc = {
      ...currentDocument,
      title: formData.title,
      metadata: {
        ...(currentDocument.metadata || {}),
        entity,
        short_description: isPublication ? normalizeShortDescription(formData.short_description) : (currentDocument.metadata || {}).short_description,
      },
    }

    if (isPublication) {
      let finalPdfUrl = removePdfAttachment ? '' : pdfAttachmentUrl

      if (pdfFile) {
        const uploadResult = await cmsService.uploadPublicationPdf(pdfFile)
        finalPdfUrl = uploadResult?.url || ''
      }

      normalizedDoc.metadata = {
        ...(normalizedDoc.metadata || {}),
        pdf_attachment_url: finalPdfUrl || null,
      }
    }

    const shared = {
      title: formData.title,
      image_url: formData.image_url,
      layout_metadata: normalizedDoc,
    }

    try {
      if (isStory) {
        const payload = {
          ...shared,
          content: deriveHtmlContentFromDocument(normalizedDoc),
          author: formData.author,
          category: formData.category,
          snippet: formData.snippet,
          read_time_minutes: Number(formData.read_time_minutes || 5),
          is_published: !!formData.is_published,
        }

        if (isEditing) {
          await cmsService.updateStory(publicationId, payload)
        } else {
          await cmsService.createStory(payload, notifyOptions)
        }
        } else if (isEvent) {
        const payload = {
          ...shared,
          description: deriveHtmlContentFromDocument(normalizedDoc),
          event_date: formData.featured_year,
          status: formData.status,
        }

        if (isEditing) {
          await cmsService.updateEvent(publicationId, payload)
        } else {
          await cmsService.createEvent(payload, notifyOptions)
        }
        } else {
        const payload = {
          ...shared,
          content: deriveHtmlContentFromDocument(normalizedDoc),
          category: formData.category,
          subject: formData.subject,
          content_type: formData.content_type,
          featured_year: formData.featured_year,
        }

          if (isEditing) {
            await cmsService.updatePublication(publicationId, payload)
          } else {
            // create publication and, if requested, link it to an event via ?linked_event=
            const created = await cmsService.createPublication(payload, notifyOptions)
            try {
              const linkedEvent = searchParams.get('linked_event')
              if (linkedEvent) {
                const evId = Number(linkedEvent)
                if (Number.isFinite(evId)) {
                  // fetch current event and update with linked_post_id set to created.id
                  try {
                    const ev = await cmsService.getEventById(evId)
                    if (ev) {
                      const evPayload = {
                        title: ev.title || '',
                        description: ev.description || '',
                        event_date: ev.event_date || '',
                        location: ev.location || '',
                        rrule: ev.rrule || '',
                        timezone: ev.timezone || '',
                        image_url: ev.image_url || '',
                        status: ev.status || 'upcoming',
                        linked_post_id: created.id,
                        is_active: ev.is_active ?? true,
                      }
                      await cmsService.updateEvent(evId, evPayload)
                      toastSuccess('Bài viết được tạo và liên kết với sự kiện.')
                    }
                  } catch (err) {
                    console.error('Failed to link created publication to event', err)
                  }
                }
              }
            } catch (err) {
              // ignore linking errors
            }
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
            {isStory ? 'Story editor với CMS document model' : isEvent ? 'Event editor với CMS document model' : 'Publication editor với CMS document model'}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/publications')} className="bg-gray-100 text-gray-700 border-none rounded-xl font-black inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Quay lại danh sách
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-4 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
          <div className="md:col-span-2 xl:col-span-2">
            <input
              required
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm font-bold"
              placeholder="Tiêu đề"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                value={formData.image_url}
                onChange={(event) => setFormData((prev) => ({ ...prev, image_url: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
                placeholder="URL ảnh bìa"
              />
            </div>
            <div>
              <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
              <button type="button" onClick={triggerCoverUpload} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm">
                {coverUploading ? 'Đang tải...' : 'Tải ảnh bìa'}
              </button>
            </div>
          </div>

          {isStory ? (
            <div className="grid grid-cols-1 gap-2 w-full">
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
              <input
                type="number"
                min={1}
                value={formData.read_time_minutes}
                onChange={(event) => setFormData((prev) => ({ ...prev, read_time_minutes: Number(event.target.value) || 5 }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
                placeholder="Phút đọc"
              />
              <input
                value={formData.snippet}
                onChange={(event) => setFormData((prev) => ({ ...prev, snippet: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
                placeholder="Mô tả ngắn thẻ câu chuyện"
              />
            </div>
          ) : isEvent ? (
            <div className="grid grid-cols-1 gap-2 w-full">
              <input
                type="datetime-local"
                value={formData.featured_year}
                onChange={(event) => setFormData((prev) => ({ ...prev, featured_year: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
                placeholder="Ngày sự kiện"
              />
              <select
                value={formData.status}
                onChange={(event) => setFormData((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm font-black uppercase"
              >
                <option value="upcoming">Upcoming</option>
                <option value="registration">Registration</option>
                <option value="passed">Passed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 w-full">
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
                <option value="cuoc-thi">Cuộc thi</option>
              </select>
              <textarea
                value={formData.short_description}
                onChange={(event) => {
                  const nextValue = normalizeShortDescription(event.target.value)
                  setFormData((prev) => ({ ...prev, short_description: nextValue }))
                }}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm resize-y"
                placeholder="Mô tả ngắn hiển thị ở thẻ bài viết (không bắt buộc)"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleGenerateShortDescription}
                  disabled={generatingShortDescription}
                  className="inline-flex items-center rounded-lg border border-fpt-orange/30 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-fpt-orange disabled:opacity-60"
                >
                  {generatingShortDescription ? 'AI đang tạo...' : 'Mô tả bằng AI'}
                </button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {(formData.short_description || '').length}/{MAX_SHORT_DESCRIPTION_CHARS}
                </span>
              </div>
            </div>
          )}
        </Card>

        {isPublication && (
          <Card className="p-4 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-fpt-orange" />
              <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">PDF / Flipbook preview (Nhái Bén)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null
                  setPdfFile(file)
                  setRemovePdfAttachment(false)
                  if (file) buildPdfPreview(file)
                }}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm border border-gray-200"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPdfFile(null)
                    setPdfAttachmentUrl('')
                    setPdfPreviewPages([])
                    setRemovePdfAttachment(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Gỡ PDF
                </button>
                {pdfFile && (
                  <span className="text-xs font-semibold text-slate-500 inline-flex items-center gap-1"><UploadCloud size={12} /> {pdfFile.name}</span>
                )}
              </div>
            </div>

            {pdfAttachmentUrl && !pdfFile && !removePdfAttachment && (
              <p className="text-xs text-slate-500">
                PDF hiện tại: <a href={pdfAttachmentUrl} target="_blank" rel="noreferrer" className="text-fpt-blue font-semibold underline">{pdfAttachmentUrl}</a>
              </p>
            )}

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              {pdfPreviewLoading ? (
                <p className="text-sm font-semibold text-slate-500">Đang render preview flipbook...</p>
              ) : pdfPreviewPages.length > 0 ? (
                <div className="mx-auto w-full max-w-[460px] space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                    <span>Trang {Math.min(flipCurrentPage, pdfPreviewPages.length)} / {pdfPreviewPages.length}</span>
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => flipInstanceRef.current?.flipPrev()}
                        className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
                      >
                        Trước
                      </button>
                      <button
                        type="button"
                        onClick={() => flipInstanceRef.current?.flipNext()}
                        className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
                      >
                        Sau
                      </button>
                    </div>
                  </div>

                  <div
                    ref={flipRef}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    style={{ height: `${flipSize.height}px` }}
                  >
                    {pdfPreviewPages.map((page, index) => (
                      <div key={`admin-pdf-page-${index}`} className="pdf-page h-full w-full bg-white">
                        <img src={page.src} alt={`PDF page ${index + 1}`} className="h-full w-full object-contain" />
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs font-medium text-slate-500">Lật trang bằng kéo góc trang hoặc nút Trước/Sau.</p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-500">Chưa có PDF để preview.</p>
              )}
            </div>
          </Card>
        )}

        {!isEditing && (
          <Card className="p-4 rounded-2xl border border-gray-100 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Kênh đẩy thông báo khi tạo mới</h3>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={notifyOptions.sendEmail}
                  onChange={(event) => setNotifyOptions((prev) => ({ ...prev, sendEmail: event.target.checked }))}
                />
                Gửi email newsletter
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={notifyOptions.sendWebpush}
                  onChange={(event) => setNotifyOptions((prev) => ({ ...prev, sendWebpush: event.target.checked }))}
                />
                Gửi webpush
              </label>
            </div>
            <p className="text-xs font-medium text-gray-500">
              Các lựa chọn này chỉ áp dụng khi tạo mới tin tức. Khi cập nhật nội dung hiện có, hệ thống sẽ không gửi lại thông báo tự động.
            </p>
          </Card>
        )}

        <Card className="p-4 rounded-2xl border border-gray-100">
          <HybridCMSEditorRoot
              key={`${entity}-${publicationId || 'new'}`}
              initialDocument={initialDocument}
              onDocumentChange={handleDocChange}
              showDocumentTitle={false}
              onAutosave={isEditing ? handleAutosave : undefined}
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
