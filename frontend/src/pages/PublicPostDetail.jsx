import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, FileText, Layers3, User } from 'lucide-react'
import { Card } from '@/components/ui/core'
import { PublicDocumentView } from '@/cms-editor/renderer/PublicDocumentView'
import { normalizeLayoutMetadataToDocument } from '@/cms-editor/core/legacy'
import { PageFlip } from 'page-flip'
import * as pdfjsLib from 'pdfjs-dist'

const API_URL = import.meta.env.VITE_API_URL || '/api'
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export const PublicPostDetail = () => {
  const { postId } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pdfPreviewPages, setPdfPreviewPages] = useState([])
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false)
  const [flipSize, setFlipSize] = useState({ width: 390, height: 552 })
  const [flipCurrentPage, setFlipCurrentPage] = useState(1)
  const flipRef = useRef(null)
  const flipInstanceRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    const loadDetail = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_URL}/public/publications/${postId}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setPost(data)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError('Không tìm thấy bài viết hoặc bài viết đã bị gỡ.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadDetail()

    return () => controller.abort()
  }, [postId])

  const cmsDocument = useMemo(() => normalizeLayoutMetadataToDocument(post?.layout_metadata, post?.title || 'Publication'), [post])
  const pdfAttachmentUrl = cmsDocument?.metadata?.pdf_attachment_url || ''

  const buildPdfPreview = useCallback(async (sourceUrl) => {
    if (!sourceUrl) {
      setPdfPreviewPages([])
      return
    }

    setPdfPreviewLoading(true)
    try {
      const pdf = await pdfjsLib.getDocument(sourceUrl).promise
      const pages = []
      const isCompactDevice = typeof window !== 'undefined' && window.innerWidth < 1024
      const maxPages = Math.min(pdf.numPages, isCompactDevice ? 8 : 12)

      for (let i = 1; i <= maxPages; i += 1) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.2 })
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
      setFlipCurrentPage(1)
    } catch {
      setPdfPreviewPages([])
      setFlipCurrentPage(1)
    } finally {
      setPdfPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    buildPdfPreview(pdfAttachmentUrl)
  }, [buildPdfPreview, pdfAttachmentUrl])

  useEffect(() => {
    if (!pdfPreviewPages.length || !flipRef.current) return

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
    }

    return () => {
      if (flipInstanceRef.current) {
        flipInstanceRef.current.destroy()
        flipInstanceRef.current = null
      }
    }
  }, [pdfPreviewPages, flipSize])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 font-black">Đang tải bài viết...</div>
  }

  if (!post || error) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 rounded-3xl bg-white border border-red-100">
            <p className="font-black text-red-500">{error || 'Không thể tải bài viết.'}</p>
            <Link to="/" className="inline-flex mt-4 items-center gap-2 text-fpt-blue font-black">
              <ArrowLeft size={16} /> Quay lại trang chủ
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell-public bg-gray-50/50">
      <section className="page-hero page-hero-caro text-slate-700">
        <div className="max-w-5xl mx-auto space-y-6">
          <Link to="/" className="tap-target inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-widest text-fpt-blue">
            <ArrowLeft size={14} /> Quay lại
          </Link>
          <h1 className="text-4xl md:text-6xl font-black italic leading-tight text-fpt-blue">{post.title}</h1>
          <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
            <span className="inline-flex items-center gap-1.5"><Layers3 size={14} /> {post.content_type || 'an-pham'}</span>
            <span className="inline-flex items-center gap-1.5"><User size={14} /> {post.subject || 'van'}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 w-full max-w-5xl space-y-8 px-4 cv-auto">
        {cmsDocument?.blocks?.length > 0 && (
            <Card className="p-6 rounded-3xl border-none shadow-lg space-y-4">
            <h3 className="text-lg font-black text-fpt-blue uppercase tracking-widest">Bố cục nội dung</h3>
            <PublicDocumentView document={cmsDocument} context={{ publication: post }} />
          </Card>
        )}

        {pdfAttachmentUrl && (
          <Card className="p-6 rounded-3xl border-none shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-lg font-black uppercase tracking-widest text-fpt-blue">
                <FileText size={18} /> Flipbook PDF
              </h3>
              <a href={pdfAttachmentUrl} target="_blank" rel="noreferrer" className="tap-target rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Mở file PDF
              </a>
            </div>

            {pdfPreviewLoading ? (
              <p className="text-sm font-semibold text-slate-500">Đang dựng flipbook...</p>
            ) : pdfPreviewPages.length > 0 ? (
              <div className="mx-auto w-full max-w-[460px] space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  <span>Trang {Math.min(flipCurrentPage, pdfPreviewPages.length)} / {pdfPreviewPages.length}</span>
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => flipInstanceRef.current?.flipPrev()}
                      className="tap-target rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-100"
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      onClick={() => flipInstanceRef.current?.flipNext()}
                      className="tap-target rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-100"
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
                    <div key={`public-pdf-page-${index}`} className="pdf-page h-full w-full bg-white">
                      <img src={page.src} alt={`PDF page ${index + 1}`} className="h-full w-full object-contain" />
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs font-medium text-slate-500">Bạn có thể vuốt/kéo góc trang hoặc dùng nút Trước/Sau.</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Không thể hiển thị preview flipbook. Bạn vẫn có thể mở PDF trực tiếp.</p>
            )}
          </Card>
        )}

      </div>
    </div>
  )
}
