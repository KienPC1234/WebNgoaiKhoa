import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  FileText,
  Layers3,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react'
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAutoplay, setIsAutoplay] = useState(false)
  const flipRef = useRef(null)
  const flipInstanceRef = useRef(null)
  const autoplayTimerRef = useRef(null)

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

  const getFlipSize = useCallback((pages, fullscreen = false) => {
    if (!pages || !pages.length || !pages[0]) return { width: 390, height: 552 }
    const ratio = pages[0].height / pages[0].width
    if (fullscreen) {
      const isMobile = window.innerWidth < 768
      const availableWidth = window.innerWidth - 64
      const availableHeight = window.innerHeight - 180
      
      let singleWidth = isMobile ? availableWidth : availableWidth / 2
      singleWidth = Math.min(singleWidth, 550) // Cap max single page width
      
      if (singleWidth * ratio > availableHeight) {
        singleWidth = availableHeight / ratio
      }
      
      return { width: Math.round(singleWidth), height: Math.round(singleWidth * ratio) }
    } else {
      const isMobile = window.innerWidth < 768
      const maxSingleWidth = isMobile ? Math.min(window.innerWidth - 48, 380) : 440
      const width = Math.round(maxSingleWidth)
      return { width, height: Math.round(width * ratio) }
    }
  }, [])

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
      if (pages[0]) {
        setFlipSize(getFlipSize(pages, isFullscreen))
      }
      setFlipCurrentPage(1)
    } catch (err) {
      console.error('[PDFPreview] Error:', err)
      setPdfPreviewPages([])
    } finally {
      setPdfPreviewLoading(false)
    }
  }, [isFullscreen, getFlipSize])

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
    const handleResize = () => {
      if (pdfPreviewPages.length) {
        setFlipSize(getFlipSize(pdfPreviewPages, isFullscreen))
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pdfPreviewPages, isFullscreen, getFlipSize])

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

        // Clear container HTML to isolate from React's virtual DOM
        flipRef.current.innerHTML = ''

        // Create page DOM nodes dynamically
        const pageElements = []
        pdfPreviewPages.forEach((page, index) => {
          const pageDiv = document.createElement('div')
          pageDiv.className = 'pdf-page bg-white shadow-md relative overflow-hidden select-none'
          pageDiv.style.width = '100%'
          pageDiv.style.height = '100%'

          const img = document.createElement('img')
          img.src = page.src
          img.alt = `PDF page ${index + 1}`
          img.className = 'w-full h-full object-contain pointer-events-none'
          img.style.display = 'block'

          pageDiv.appendChild(img)
          flipRef.current.appendChild(pageDiv)
          pageElements.push(pageDiv)
        })

        instance = new PageFlip(flipRef.current, {
          width: flipSize.width,
          height: flipSize.height,
          size: 'stretch',
          maxShadowOpacity: 0.35,
          mobileScrollSupport: true,
          usePortrait: true,
          showCover: true,
          drawShadow: true,
          flippingTime: 800,
        })

        if (pageElements.length) {
          instance.loadFromHTML(pageElements)
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

  // Autoplay slideshow effect
  useEffect(() => {
    if (isAutoplay) {
      autoplayTimerRef.current = setInterval(() => {
        if (flipInstanceRef.current) {
          const current = flipInstanceRef.current.getCurrentPageIndex()
          const total = pdfPreviewPages.length
          if (current < total - 1) {
            flipInstanceRef.current.flipNext()
          } else {
            flipInstanceRef.current.flip(0)
          }
        }
      }, 3000)
    } else {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current)
      }
    }
    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current)
      }
    }
  }, [isAutoplay, pdfPreviewPages.length])

  const toggleFullscreen = () => {
    const nextFullscreen = !isFullscreen
    setIsFullscreen(nextFullscreen)
    if (pdfPreviewPages.length) {
      setFlipSize(getFlipSize(pdfPreviewPages, nextFullscreen))
    }
  }

  const toggleAutoplay = () => {
    setIsAutoplay(prev => !prev)
  }

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
          <Card className={isFullscreen 
            ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/98 p-6 text-white backdrop-blur-md" 
            : "p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4 bg-white/90 backdrop-blur-sm"
          }>
            {/* Header / Top actions */}
            <div className="flex w-full max-w-5xl items-center justify-between gap-3 border-b border-slate-200/20 pb-3">
              <h3 className={`inline-flex items-center gap-2 text-base md:text-lg font-black uppercase tracking-widest ${isFullscreen ? 'text-white' : 'text-fpt-blue'}`}>
                <FileText size={18} className="text-fpt-orange" /> 
                {isFullscreen ? 'Đọc Flipbook Toàn Màn Hình' : 'Flipbook PDF'}
              </h3>
              <div className="inline-flex gap-2">
                <a 
                  href={pdfAttachmentUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className={`tap-target rounded-full px-4 py-1.5 text-xs font-bold border transition-colors ${isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Mở file PDF
                </a>
                {isFullscreen && (
                  <button 
                    type="button" 
                    onClick={toggleFullscreen} 
                    className="tap-target rounded-full bg-red-600/90 text-white p-1.5 hover:bg-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {pdfPreviewLoading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-4">
                <div className={`w-12 h-12 rounded-full border-4 ${isFullscreen ? 'border-white/10 border-t-fpt-orange' : 'border-fpt-blue/20 border-t-fpt-blue'} animate-spin`} />
                <p className={`text-sm font-black uppercase tracking-tighter ${isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>Đang dựng flipbook...</p>
              </div>
            ) : pdfPreviewPages.length > 0 ? (
              <div className={`w-full flex flex-col items-center justify-center ${isFullscreen ? 'flex-1 h-[calc(100vh-140px)]' : 'space-y-4'}`}>
                
                {/* Book Container with Realistic Backdrop Desk styling */}
                <div className={`relative flex items-center justify-center ${isFullscreen ? 'flex-1 w-full my-auto' : 'w-full py-6 rounded-2xl border border-slate-100 bg-slate-50 shadow-inner'}`}>
                  <div 
                    className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-300 ${isFullscreen ? 'border-4 border-slate-800' : 'border border-slate-200'}`}
                    style={{ 
                      width: '100%',
                      maxWidth: `${flipSize.width * 2}px`,
                      height: `${flipSize.height}px` 
                    }}
                  >
                    {/* The page-flip target container */}
                    <div
                      ref={flipRef}
                      className="h-full w-full"
                    />
                    
                    {/* Center crease shadow overlay (spine) */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-[18px] -translate-x-1/2 bg-gradient-to-r from-black/0 via-black/15 to-black/0 pointer-events-none z-50 hidden md:block" />
                  </div>
                </div>

                {/* Toolbar Controls */}
                <div className={`w-full max-w-2xl flex flex-wrap items-center justify-center gap-2 md:gap-4 rounded-2xl p-3 border transition-colors ${isFullscreen ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/80 border-slate-200/50'}`}>
                  {/* First page button */}
                  <button
                    type="button"
                    onClick={() => flipInstanceRef.current?.flip(0)}
                    disabled={flipCurrentPage === 1}
                    className={`tap-target flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors ${isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  
                  {/* Prev page button */}
                  <button
                    type="button"
                    onClick={() => flipInstanceRef.current?.flipPrev()}
                    disabled={flipCurrentPage === 1}
                    className={`tap-target flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors ${isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {/* Current Page Indicator / Input */}
                  <div className={`flex items-center gap-1.5 px-2 text-xs md:text-sm font-bold ${isFullscreen ? 'text-slate-200' : 'text-slate-600'}`}>
                    <span>Trang</span>
                    <input
                      type="number"
                      min={1}
                      max={pdfPreviewPages.length}
                      value={flipCurrentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (val >= 1 && val <= pdfPreviewPages.length) {
                          flipInstanceRef.current?.flip(val - 1)
                        }
                      }}
                      className={`w-10 rounded py-0.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-fpt-orange ${isFullscreen ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-800 shadow-sm'}`}
                    />
                    <span>/ {pdfPreviewPages.length}</span>
                  </div>
                  
                  {/* Next page button */}
                  <button
                    type="button"
                    onClick={() => flipInstanceRef.current?.flipNext()}
                    disabled={flipCurrentPage === pdfPreviewPages.length}
                    className={`tap-target flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors ${isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                  >
                    <ChevronRight size={16} />
                  </button>

                  {/* Last page button */}
                  <button
                    type="button"
                    onClick={() => flipInstanceRef.current?.flip(pdfPreviewPages.length - 1)}
                    disabled={flipCurrentPage === pdfPreviewPages.length}
                    className={`tap-target flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors ${isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                  >
                    <ChevronsRight size={16} />
                  </button>
                  
                  <div className={`h-6 w-px ${isFullscreen ? 'bg-slate-800' : 'bg-slate-300'} hidden sm:block`} />

                  {/* Autoplay button */}
                  <button
                    type="button"
                    onClick={toggleAutoplay}
                    className={`tap-target flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${isAutoplay ? 'bg-fpt-orange text-white hover:bg-orange-600' : isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                  >
                    {isAutoplay ? <Pause size={14} /> : <Play size={14} />}
                    <span className="hidden sm:inline">{isAutoplay ? 'Dừng phát' : 'Tự động lật'}</span>
                  </button>
                  
                  {/* Fullscreen button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className={`tap-target flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-colors ${isFullscreen ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                  >
                    {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
                  </button>
                </div>
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
