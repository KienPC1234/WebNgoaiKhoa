import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, FileText, Layers3, User } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import PostActions from '@/components/PostActions'
import { Card } from '@/components/ui/core'
import { PublicDocumentView } from '@/cms-editor/renderer/PublicDocumentView'
import { normalizeLayoutMetadataToDocument } from '@/cms-editor/core/legacy'
import CommentsSection from '@/components/comments/CommentsSection'
import { PostDetailSkeleton } from '@/components/PostDetailSkeleton'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const PublicPostDetail = () => {
  const { postId } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showError, setShowError] = useState(false)
  const navigate = useNavigate()
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
        if (!apiClient.isCancel(err)) {
          setError('Không tìm thấy bài viết hoặc bài viết đã bị gỡ.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadDetail()

    return () => controller.abort()
  }, [postId])

  // Delay showing the error UI briefly to avoid transient flashes
  useEffect(() => {
    let t = null
    if (!loading && !post) {
      // show error only after a short delay (avoids transient failures)
      t = setTimeout(() => setShowError(true), 300)
    } else {
      setShowError(false)
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [loading, post])

  const cmsDocument = useMemo(() => normalizeLayoutMetadataToDocument(post?.layout_metadata, post?.title || 'Publication'), [post])
  const pdfAttachmentUrl = cmsDocument?.metadata?.pdf_attachment_url || ''

  const buildPdfPreview = useCallback(async (sourceUrl) => {
    if (!sourceUrl) {
      setPdfPreviewPages([])
      return
    }

    setPdfPreviewLoading(true)
    try {
      // Dynamic import heavy PDF.js library only when needed
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      
      const pdf = await pdfjsLib.getDocument(sourceUrl).promise
      const pages = []
      const isCompactDevice = typeof window !== 'undefined' && window.innerWidth < 1024
      const maxPages = Math.min(pdf.numPages, isCompactDevice ? 6 : 12) // Further limit mobile preview for speed

      for (let i = 1; i <= maxPages; i += 1) {
        const page = await pdf.getPage(i)
        // Adjust scale for mobile to save memory
        const scale = isCompactDevice ? 1.0 : 1.2
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { alpha: false }) // Optimization: disable alpha
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        await page.render({ 
          canvasContext: context, 
          viewport,
          intent: 'display'
        }).promise
        
        pages.push({
          src: canvas.toDataURL('image/jpeg', 0.8), // Reduced quality slightly for faster transfer/rendering
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        })
        
        // Yield execution to keep UI responsive
        if (i % 2 === 0) await new Promise(r => setTimeout(r, 0))
      }

      setPdfPreviewPages(pages)
      if (pages[0]?.width && pages[0]?.height) {
        const containerWidth = Math.min(window.innerWidth - 64, 430)
        const width = Math.min(Math.max(pages[0].width, 300), containerWidth)
        const ratio = pages[0].height / pages[0].width
        setFlipSize({ width, height: Math.round(width * ratio) })
      }
      setFlipCurrentPage(1)
    } catch (err) {
      console.error('[PDFPreview] Error:', err)
      setPdfPreviewPages([])
    } finally {
      setPdfPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only build preview if we have an attachment and post is loaded
    if (pdfAttachmentUrl && post) {
      // Use requestIdleCallback to avoid blocking the main thread during initial render
      if ('requestIdleCallback' in window) {
        const idleId = window.requestIdleCallback(() => buildPdfPreview(pdfAttachmentUrl), { timeout: 2000 })
        return () => window.cancelIdleCallback(idleId)
      } else {
        const t = setTimeout(() => buildPdfPreview(pdfAttachmentUrl), 500)
        return () => clearTimeout(t)
      }
    }
  }, [buildPdfPreview, pdfAttachmentUrl, post])

  useEffect(() => {
    if (!pdfPreviewPages.length || !flipRef.current) return

    let active = true
    let instance = null

    const initFlip = async () => {
      try {
        // Dynamic import PageFlip
        const { PageFlip } = await import('page-flip')
        if (!active || !flipRef.current) return

        if (flipInstanceRef.current) {
          flipInstanceRef.current.destroy()
          flipInstanceRef.current = null
        }

        instance = new PageFlip(flipRef.current, {
          width: flipSize.width,
          height: flipSize.height,
          size: 'stretch',
          maxShadowOpacity: 0.3,
          mobileScrollSupport: true,
          usePortrait: true,
          showCover: false,
          drawShadow: true,
          flippingTime: 800,
        })

        const pages = Array.from(flipRef.current.querySelectorAll('.pdf-page'))
        if (pages.length) {
          instance.loadFromHTML(pages)
          instance.on('flip', (event) => {
            setFlipCurrentPage((event.data || 0) + 1)
          })
          flipInstanceRef.current = instance
        }
      } catch (err) {
        console.error('[PageFlip] Init error:', err)
      }
    }

    initFlip()

    return () => {
      active = false
      if (flipInstanceRef.current) {
        flipInstanceRef.current.destroy()
        flipInstanceRef.current = null
      }
    }
  }, [pdfPreviewPages, flipSize])

  if (loading || (!post && !showError)) {
    return <PostDetailSkeleton />
  }

  if (!post && showError) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 rounded-3xl bg-white border border-red-100">
            <p className="font-black text-red-500">{error || 'Không thể tải bài viết.'}</p>
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              className="inline-flex mt-4 items-center gap-2 text-fpt-blue font-black"
            >
              <ArrowLeft size={16} /> Quay lại
            </button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell-public page-shell-post-detail bg-gray-50/50">
      <section className="page-hero page-hero-caro page-hero-post-detail text-slate-700">
        <div className="max-w-5xl mx-auto space-y-6">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="tap-target inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-widest text-fpt-blue"
          >
            <ArrowLeft size={14} /> Quay lại
          </button>
          <h1 className="text-4xl md:text-6xl font-black italic leading-tight text-fpt-blue">{post.title}</h1>
          <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
            <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
            <span className="inline-flex items-center gap-1.5"><Layers3 size={14} /> {post.content_type || 'an-pham'}</span>
            <span className="inline-flex items-center gap-1.5"><User size={14} /> {post.subject || 'van'}</span>
          </div>
          <PostActions publicationId={post.id} />
        </div>
      </section>

      <div className="mx-auto mt-8 w-full max-w-5xl space-y-8 px-4 cv-auto">
        {cmsDocument?.blocks?.length > 0 && (
          <Card className="p-6 rounded-3xl border-none shadow-lg space-y-4 bg-white/80 backdrop-blur-sm">
            <PublicDocumentView document={cmsDocument} context={{ publication: post }} />
          </Card>
        )}

        {pdfAttachmentUrl && (
          <Card className="p-6 rounded-3xl border-none shadow-lg space-y-4 bg-white/80 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="inline-flex items-center gap-2 text-lg font-black uppercase tracking-widest text-fpt-blue">
                <FileText size={18} /> Flipbook PDF
              </h3>
              <a href={pdfAttachmentUrl} target="_blank" rel="noreferrer" className="tap-target rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 bg-white">
                Mở file PDF
              </a>
            </div>

            {pdfPreviewLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 animate-pulse">
                <div className="w-12 h-12 rounded-full border-4 border-fpt-blue/20 border-t-fpt-blue animate-spin" />
                <p className="text-sm font-black uppercase tracking-tighter text-slate-400">Đang dựng flipbook...</p>
              </div>
            ) : pdfPreviewPages.length > 0 ? (
              <div className="mx-auto w-full max-w-[460px] space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-600">
                  <span>Trang {Math.min(flipCurrentPage, pdfPreviewPages.length)} / {pdfPreviewPages.length}</span>
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => flipInstanceRef.current?.flipPrev()}
                      className="tap-target rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-100 active:scale-95 transition-transform"
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      onClick={() => flipInstanceRef.current?.flipNext()}
                      className="tap-target rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-100 active:scale-95 transition-transform"
                    >
                      Sau
                    </button>
                  </div>
                </div>

                <div
                  ref={flipRef}
                  className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-inner"
                  style={{ height: `${flipSize.height}px` }}
                >
                  {pdfPreviewPages.map((page, index) => (
                    <div key={`public-pdf-page-${index}`} className="pdf-page h-full w-full bg-white">
                      <img src={page.src} alt={`PDF page ${index + 1}`} className="h-full w-full object-contain" loading="lazy" />
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs font-medium text-slate-400 italic">Bạn có thể vuốt/kéo góc trang hoặc dùng nút Trước/Sau.</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl text-center">Không thể hiển thị preview flipbook. Bạn vẫn có thể mở PDF trực tiếp.</p>
            )}
          </Card>
        )}

        <Card className="p-6 rounded-3xl border-none shadow-lg space-y-4 bg-white/80 backdrop-blur-sm">
          <CommentsSection publicationId={post.id} commentsEnabled={post.comments_enabled !== false} />
        </Card>

      </div>
    </div>
  )
}
