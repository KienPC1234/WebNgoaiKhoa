import { useState, useEffect, useRef } from 'react'
import { Card, Button, cn } from '../components/UI'
import { Send, ThumbsUp, Edit3, ShieldCheck, PenTool, BookOpen, User, Calendar, X, Sparkles, FileText, MessageSquare, Eye } from 'lucide-react'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import { showApiError, toastError, toastInfo, toastSuccess } from '@/lib/notify'
import { apiClient } from '@/lib/apiClient'
import { PageFlip } from 'page-flip'
import * as pdfjsLib from 'pdfjs-dist'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
const SUBMISSION_DRAFT_KEY = 'phanmon_van_submission_draft_v1'
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const TITLE_MIN_LENGTH = 6
const CONTENT_MIN_LENGTH = 30
const FLIP_PREVIEW_WIDTH = 360
const FLIP_PREVIEW_MIN_HEIGHT = 440
const FLIP_PREVIEW_MAX_HEIGHT = 620

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

export const PhanMonVan = () => {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'sang-tac')
  const [submissionStatus, setSubmissionStatus] = useState(null)
  const [approvedSubmissions, setApprovedSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [commentsBySubmission, setCommentsBySubmission] = useState({})
  const [commentsLoadingBySubmission, setCommentsLoadingBySubmission] = useState({})
  const [commentEditorValue, setCommentEditorValue] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [votedSubmissionIds, setVotedSubmissionIds] = useState([])
  const [votingSubmissionIds, setVotingSubmissionIds] = useState([])

  // Form states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [studentName, setStudentName] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false)
  const [pdfPreviewPages, setPdfPreviewPages] = useState([])
  const [pdfPreviewAspectRatio, setPdfPreviewAspectRatio] = useState(1.45)
  const [formErrors, setFormErrors] = useState({})
  const [mySubmissions, setMySubmissions] = useState([])
  const [mySubsLoading, setMySubsLoading] = useState(false)
  const navigate = useNavigate()
  const recaptchaRef = useRef(null)
  const flipRef = useRef(null)
  const flipInstanceRef = useRef(null)

  const token = localStorage.getItem('token')
  const pdfFlipHeight = Math.min(
    FLIP_PREVIEW_MAX_HEIGHT,
    Math.max(FLIP_PREVIEW_MIN_HEIGHT, Math.round(FLIP_PREVIEW_WIDTH * pdfPreviewAspectRatio)),
  )

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['sang-tac', 'the-le', 'bai-thi'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab === 'bai-thi') {
      fetchApprovedSubmissions()
      if (token) {
        fetchMyVotedSubmissionIds()
      }
    }
  }, [activeTab, token])

  useEffect(() => {
    if (activeTab !== 'bai-thi') {
      setSelectedSubmission(null)
    }
  }, [activeTab])

  useEffect(() => {
    try {
      const draft = localStorage.getItem(SUBMISSION_DRAFT_KEY)
      if (!draft) return
      const parsed = JSON.parse(draft)
      setTitle(parsed?.title || '')
      setContent(parsed?.content || '')
      setStudentName(parsed?.studentName || '')
    } catch {
      localStorage.removeItem(SUBMISSION_DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    const hasDraftContent = title.trim() || content.trim() || studentName.trim()
    if (!hasDraftContent) {
      localStorage.removeItem(SUBMISSION_DRAFT_KEY)
      return
    }

    localStorage.setItem(
      SUBMISSION_DRAFT_KEY,
      JSON.stringify({
        title,
        content,
        studentName,
      }),
    )
  }, [title, content, studentName])

  useEffect(() => {
    if (activeTab === 'sang-tac' && token) {
      fetchMySubmissions()
    }
  }, [activeTab, token])

  useEffect(() => {
    return () => {
      if (flipInstanceRef.current) {
        flipInstanceRef.current.destroy()
        flipInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!pdfPreviewPages.length || !flipRef.current) return

    if (flipInstanceRef.current) {
      flipInstanceRef.current.destroy()
      flipInstanceRef.current = null
    }

    const instance = new PageFlip(flipRef.current, {
      width: FLIP_PREVIEW_WIDTH,
      height: pdfFlipHeight,
      size: 'stretch',
      maxShadowOpacity: 0.35,
      mobileScrollSupport: true,
      usePortrait: true,
    })
    const pages = Array.from(flipRef.current.querySelectorAll('.pdf-page'))
    if (pages.length) {
      instance.loadFromHTML(pages)
      flipInstanceRef.current = instance
    }
  }, [pdfPreviewPages, pdfFlipHeight])

  const trimCanvasWhitespace = (sourceCanvas) => {
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
    if (!sourceCtx) return sourceCanvas

    const { width, height } = sourceCanvas
    const imageData = sourceCtx.getImageData(0, 0, width, height)
    const pixels = imageData.data

    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4
        const r = pixels[index]
        const g = pixels[index + 1]
        const b = pixels[index + 2]
        const a = pixels[index + 3]
        const hasVisibleContent = a > 10 && !(r > 245 && g > 245 && b > 245)

        if (!hasVisibleContent) continue

        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }

    if (maxX < minX || maxY < minY) {
      return sourceCanvas
    }

    const padding = 6
    const cropX = Math.max(0, minX - padding)
    const cropY = Math.max(0, minY - padding)
    const cropWidth = Math.min(width - cropX, maxX - minX + 1 + padding * 2)
    const cropHeight = Math.min(height - cropY, maxY - minY + 1 + padding * 2)

    const trimmedCanvas = document.createElement('canvas')
    trimmedCanvas.width = cropWidth
    trimmedCanvas.height = cropHeight
    const trimmedCtx = trimmedCanvas.getContext('2d')
    if (!trimmedCtx) return sourceCanvas

    trimmedCtx.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
    return trimmedCanvas
  }

  const buildPdfPreview = async (file) => {
    if (!file) {
      setPdfPreviewPages([])
      setPdfPreviewAspectRatio(1.45)
      return
    }

    setPdfPreviewLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const pages = []
      const maxPages = Math.min(pdf.numPages, 8)
      let firstPageRatio = null

      for (let i = 1; i <= maxPages; i += 1) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.18 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: context, viewport }).promise

        const trimmedCanvas = trimCanvasWhitespace(canvas)
        if (!firstPageRatio && trimmedCanvas.width > 0) {
          firstPageRatio = trimmedCanvas.height / trimmedCanvas.width
        }
        pages.push(trimmedCanvas.toDataURL('image/jpeg', 0.92))
      }

      setPdfPreviewPages(pages)
      if (firstPageRatio) {
        setPdfPreviewAspectRatio(firstPageRatio)
      }
    } catch (error) {
      setPdfPreviewPages([])
      setPdfPreviewAspectRatio(1.45)
      toastError('Không đọc được file PDF để preview.')
    } finally {
      setPdfPreviewLoading(false)
    }
  }

  const fetchApprovedSubmissions = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/public/submissions`)
      setApprovedSubmissions(response.data)
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMySubmissions = async () => {
    setMySubsLoading(true)
    try {
      const response = await apiClient.get('/public/submissions/me')
      setMySubmissions(response.data || [])
    } catch (error) {
      console.error('Error fetching my submissions:', error)
    } finally {
      setMySubsLoading(false)
    }
  }

  const fetchMyVotedSubmissionIds = async () => {
    if (!token) {
      setVotedSubmissionIds([])
      return
    }

    try {
      const response = await apiClient.get('/public/submissions/votes/me')
      setVotedSubmissionIds(Array.isArray(response.data) ? response.data : [])
    } catch {
      setVotedSubmissionIds([])
    }
  }

  const validateSubmission = () => {
    const normalizedTitle = title.trim()
    const normalizedContent = content.trim()
    const normalizedStudentName = studentName.trim()
    const errors = {}

    if (!normalizedStudentName) {
      errors.studentName = 'Vui lòng nhập họ và tên tác giả.'
    }

    if (!normalizedTitle) {
      errors.title = 'Vui lòng nhập tên tác phẩm.'
    } else if (normalizedTitle.length < TITLE_MIN_LENGTH) {
      errors.title = `Tên tác phẩm cần tối thiểu ${TITLE_MIN_LENGTH} ký tự.`
    }

    if (!normalizedContent) {
      errors.content = 'Vui lòng nhập nội dung sáng tác.'
    } else if (normalizedContent.length < CONTENT_MIN_LENGTH) {
      errors.content = `Nội dung cần tối thiểu ${CONTENT_MIN_LENGTH} ký tự.`
    }

    setFormErrors(errors)
    return {
      isValid: Object.keys(errors).length === 0,
      normalizedTitle,
      normalizedContent,
      normalizedStudentName,
    }
  }

  const handleSendToBGK = async () => {
    if (!token) {
      toastInfo('Vui lòng đăng nhập để gửi bài thi.')
      navigate('/login')
      return
    }

    const { isValid, normalizedTitle, normalizedContent, normalizedStudentName } = validateSubmission()
    if (!isValid) {
      toastError('Vui lòng kiểm tra lại các thông tin bắt buộc trước khi gửi.')
      return
    }

    setSubmissionStatus('loading')
    try {
      let recaptchaToken = null
      if (RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        recaptchaToken = await recaptchaRef.current.executeAsync()
        recaptchaRef.current.reset()
      }

      if (pdfFile) {
        const formData = new FormData()
        formData.append('title', normalizedTitle)
        formData.append('content', normalizedContent)
        formData.append('student_name', normalizedStudentName)
        if (recaptchaToken) formData.append('recaptcha_token', recaptchaToken)
        formData.append('file', pdfFile)

        await apiClient.post('/public/submissions/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await apiClient.post('/public/submissions', {
          title: normalizedTitle,
          content: normalizedContent,
          student_name: normalizedStudentName,
          recaptcha_token: recaptchaToken,
        })
      }
      setSubmissionStatus('success')
      setTitle('')
      setContent('')
      setStudentName('')
      setPdfFile(null)
      setPdfPreviewPages([])
      setPdfPreviewAspectRatio(1.45)
      setFormErrors({})
      localStorage.removeItem(SUBMISSION_DRAFT_KEY)
      if (token) {
        fetchMySubmissions()
      }
      toastSuccess('Đã gửi bài thi thành công.')
    } catch (error) {
      console.error('Submission error:', error)
      setSubmissionStatus('error')
      showApiError(error, 'Gửi bài thi thất bại.')
    }
  }

  const statusBadgeClass = (status) => {
    if (status === 'approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200'
    return 'bg-amber-100 text-amber-700 border-amber-200'
  }

  const hasVotedSubmission = (submissionId) => votedSubmissionIds.includes(submissionId)
  const isVotingSubmission = (submissionId) => votingSubmissionIds.includes(submissionId)

  const handleVote = async (id) => {
    if (!token) {
      toastInfo('Vui lòng đăng nhập để bình chọn bài thi.')
      navigate('/login')
      return
    }

    if (votedSubmissionIds.includes(id)) {
      toastInfo('Bạn đã bình chọn cho bài thi này rồi.')
      return
    }

    if (votingSubmissionIds.includes(id)) {
      return
    }

    setVotingSubmissionIds((prev) => [...prev, id])

    try {
      let recaptchaToken = null
      if (RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        recaptchaToken = await recaptchaRef.current.executeAsync()
        recaptchaRef.current.reset()
      }

      const response = await axios.post(`${API_URL}/public/submissions/${id}/vote`, {
        recaptcha_token: recaptchaToken,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const nextVotes = response.data.votes
      setApprovedSubmissions(prev => prev.map(s => s.id === id ? { ...s, votes: nextVotes || (s.votes + 1) } : s))
      setSelectedSubmission((prev) => {
        if (!prev || prev.id !== id) return prev
        return { ...prev, votes: nextVotes || (prev.votes + 1) }
      })
      setVotedSubmissionIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      toastSuccess('Đã bình chọn thành công.')
    } catch (error) {
      console.error('Vote error:', error)
      const statusCode = error?.response?.status
      if (statusCode === 409) {
        setVotedSubmissionIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
        toastInfo('Bạn đã bình chọn cho bài thi này rồi.')
      } else {
        showApiError(error, 'Bình chọn thất bại.')
      }
    } finally {
      setVotingSubmissionIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const fetchSubmissionComments = async (submissionId) => {
    setCommentsLoadingBySubmission((prev) => ({ ...prev, [submissionId]: true }))
    try {
      const response = await axios.get(`${API_URL}/public/submissions/${submissionId}/comments`)
      setCommentsBySubmission((prev) => ({ ...prev, [submissionId]: response.data || [] }))
    } catch (error) {
      setCommentsBySubmission((prev) => ({ ...prev, [submissionId]: [] }))
      showApiError(error, 'Không tải được bình luận của bài thi.')
    } finally {
      setCommentsLoadingBySubmission((prev) => ({ ...prev, [submissionId]: false }))
    }
  }

  const openSubmissionDetail = (submission) => {
    // Scroll page to top so the user sees the start of the article/modal
    try {
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (e) {
      /* ignore */
    }

    setSelectedSubmission(submission)
    setCommentEditorValue('')
    fetchSubmissionComments(submission.id)
  }

  const closeSubmissionDetail = () => {
    setSelectedSubmission(null)
    setCommentEditorValue('')
  }

  const sanitizeCommentHtml = (html) => {
    if (!html) return ''
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
  }

  const handleCreateComment = async () => {
    if (!selectedSubmission) return
    if (!token) {
      toastInfo('Vui lòng đăng nhập để bình luận bài thi.')
      navigate('/login')
      return
    }

    const plainText = commentEditorValue.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    if (!plainText || plainText.length < 2) {
      toastError('Bình luận cần tối thiểu 2 ký tự.')
      return
    }

    setCommentSubmitting(true)
    try {
      let recaptchaToken = null
      if (RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        recaptchaToken = await recaptchaRef.current.executeAsync()
        recaptchaRef.current.reset()
      }

      const response = await axios.post(
        `${API_URL}/public/submissions/${selectedSubmission.id}/comments`,
        {
          content: commentEditorValue,
          recaptcha_token: recaptchaToken,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      const newComment = response.data
      setCommentsBySubmission((prev) => ({
        ...prev,
        [selectedSubmission.id]: [newComment, ...(prev[selectedSubmission.id] || [])],
      }))
      setCommentEditorValue('')
      toastSuccess('Đã gửi bình luận thành công.')
    } catch (error) {
      showApiError(error, 'Gửi bình luận thất bại.')
    } finally {
      setCommentSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/30">
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-orange-400 via-fpt-orange to-red-500 py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10" data-aos="zoom-in">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl border border-white/30">
            <BookOpen size={16} />
            Ấn phẩm chuyên san
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic drop-shadow-lg">"NHÁI BÉN"</h1>
          <p className="text-orange-50 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
            Không gian sáng tạo dành riêng cho những tâm hồn yêu văn chương. Nơi nét bút trẻ được bay bổng, tôn vinh và lan tỏa.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 -mt-10 relative z-20">
        {/* Tabs Navigation */}
        <div className="flex justify-center mb-12" data-aos="fade-up">
          <div className="flex gap-4 p-2 bg-white rounded-full shadow-xl border border-gray-100">
            {[
              { id: 'sang-tac', label: 'SÁNG TÁC', icon: PenTool },
              { id: 'the-le', label: 'THỂ LỆ', icon: ShieldCheck },
              { id: 'bai-thi', label: 'BÀI DỰ THI', icon: Send },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  // Update URL without full reload
                  const newUrl = `${window.location.pathname}?tab=${tab.id}`
                  window.history.pushState({ path: newUrl }, '', newUrl)
                }}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-full font-black text-sm transition-all",
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-fpt-orange to-orange-500 text-white shadow-lg shadow-orange-200/50" 
                    : "bg-transparent text-gray-500 hover:bg-orange-50 hover:text-fpt-orange"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="min-h-[500px]">
          {activeTab === 'sang-tac' && (
            <div className="max-w-4xl mx-auto" data-aos="fade-up">
              <Card className="p-10 border-0 shadow-2xl rounded-[40px] bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fpt-orange to-orange-400"></div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-fpt-blue flex items-center gap-3">
                    <div className="p-3 bg-orange-50 rounded-2xl text-fpt-orange"><Edit3 size={24} /></div>
                    SOẠN THẢO TÁC PHẨM
                  </h2>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">Bản nháp tự động lưu</span>
                </div>
                
                <div className="space-y-8">
                  <div className="rounded-2xl border border-fpt-orange/20 bg-orange-50/70 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-fpt-orange">Hướng dẫn nộp bài nhanh</p>
                    <div className="mt-2 space-y-1 text-sm font-semibold text-slate-600">
                      <p>1. Điền đủ tên tác giả, tên tác phẩm và nội dung.</p>
                      <p>2. Nếu có file đính kèm, hãy chọn đúng định dạng PDF (tối đa 15MB).</p>
                      <p>3. Bấm GỬI BÀI THI, hệ thống sẽ chuyển bài sang trạng thái Chờ duyệt.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Họ và tên tác giả</label>
                      <input 
                        type="text" 
                        placeholder="Nguyễn Văn A..." 
                        value={studentName}
                        onChange={(e) => {
                          setStudentName(e.target.value)
                          setSubmissionStatus(null)
                          if (formErrors.studentName) {
                            setFormErrors(prev => ({ ...prev, studentName: null }))
                          }
                        }}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-bold transition-all text-sm"
                      />
                      {formErrors.studentName && <p className="text-xs font-bold text-red-500 ml-1">{formErrors.studentName}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tệp PDF (tuỳ chọn)</label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          if (file && file.type !== 'application/pdf') {
                            toastError('Chỉ hỗ trợ tệp PDF.')
                            e.target.value = ''
                            setPdfFile(null)
                            setPdfPreviewPages([])
                            setPdfPreviewAspectRatio(1.45)
                            return
                          }
                          if (file && file.size > MAX_UPLOAD_BYTES) {
                            toastError('Tệp PDF vượt quá 15MB. Vui lòng chọn tệp nhỏ hơn.')
                            e.target.value = ''
                            setPdfFile(null)
                            setPdfPreviewPages([])
                            setPdfPreviewAspectRatio(1.45)
                            return
                          }
                          setPdfFile(file)
                          buildPdfPreview(file)
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-semibold transition-all text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên tác phẩm</label>
                    <input 
                      type="text" 
                      placeholder="Tiêu đề tác phẩm..." 
                      value={title}
                        onChange={(e) => {
                          setTitle(e.target.value)
                          setSubmissionStatus(null)
                          if (formErrors.title) {
                            setFormErrors(prev => ({ ...prev, title: null }))
                          }
                        }}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-black transition-all text-xl"
                    />
                      <div className="flex items-center justify-between px-1">
                        {formErrors.title ? <p className="text-xs font-bold text-red-500">{formErrors.title}</p> : <span />}
                        <p className="text-[11px] font-semibold text-slate-400">{title.trim().length} ký tự</p>
                      </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nội dung sáng tác</label>
                    <textarea 
                      className="w-full h-96 px-6 py-6 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-3xl outline-none text-gray-700 leading-relaxed resize-none font-medium custom-scrollbar transition-all"
                      placeholder="Hãy để cảm hứng của bạn bắt đầu tại đây..."
                      value={content}
                      onChange={(e) => {
                        setContent(e.target.value)
                        setSubmissionStatus(null)
                        if (formErrors.content) {
                          setFormErrors(prev => ({ ...prev, content: null }))
                        }
                      }}
                    ></textarea>
                    <div className="flex items-center justify-between px-1">
                      {formErrors.content ? <p className="text-xs font-bold text-red-500">{formErrors.content}</p> : <span />}
                      <p className="text-[11px] font-semibold text-slate-400">{content.trim().length} ký tự</p>
                    </div>
                  </div>

                  {pdfFile && (
                    <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-widest text-fpt-orange inline-flex items-center gap-2">
                          <FileText size={14} /> Preview PDF với hiệu ứng lật trang
                        </p>
                        <span className="text-[11px] font-semibold text-slate-500">{pdfFile.name}</span>
                      </div>

                      {pdfPreviewLoading ? (
                        <p className="text-sm font-semibold text-slate-500">Đang render PDF...</p>
                      ) : pdfPreviewPages.length > 0 ? (
                        <div className="mx-auto w-full max-w-[420px]">
                          <div
                            ref={flipRef}
                            style={{ height: `${pdfFlipHeight}px` }}
                            className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            {pdfPreviewPages.map((src, index) => (
                              <div key={index} className="pdf-page h-full w-full bg-white">
                                <img src={src} alt={`PDF page ${index + 1}`} className="h-full w-full object-contain" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-500">Không thể hiển thị preview cho PDF này.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-fpt-blue text-xs font-bold bg-blue-50 px-4 py-2 rounded-xl">
                    <ShieldCheck size={16} className="text-fpt-orange" />
                    Bài dự thi gắn với tài khoản đã xác minh OTP và gửi trực tiếp tới Ban Giám Khảo
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <Button 
                      className="flex-1 md:flex-none bg-white text-gray-500 border-2 border-gray-200 hover:bg-gray-50 hover:text-fpt-blue hover:border-fpt-blue px-8 font-black"
                      onClick={() => {
                        setTitle('')
                        setContent('')
                        setStudentName('')
                        setPdfFile(null)
                        setPdfPreviewPages([])
                        setPdfPreviewAspectRatio(1.45)
                        setFormErrors({})
                        setSubmissionStatus(null)
                        localStorage.removeItem(SUBMISSION_DRAFT_KEY)
                      }}
                    >XÓA TRỐNG</Button>
                    <Button 
                      onClick={handleSendToBGK}
                      disabled={submissionStatus === 'loading'}
                      className="flex-1 md:flex-none bg-gradient-to-r from-fpt-orange to-orange-500 hover:from-orange-500 hover:to-orange-600 shadow-[0_10px_30px_-10px_rgba(242,112,36,0.6)] px-10 font-black flex items-center gap-2 border-none"
                    >
                      {submissionStatus === 'loading' ? 'ĐANG XỬ LÝ...' : submissionStatus === 'success' ? 'THÀNH CÔNG!' : 'GỬI BÀI THI'}
                      <Sparkles size={18} />
                    </Button>
                  </div>
                </div>

                {submissionStatus === 'success' && (
                  <div className="mt-6 p-5 bg-green-50 border-2 border-green-100 rounded-2xl text-green-700 text-sm font-black flex items-center gap-3 animate-bounce">
                    <div className="bg-green-100 p-2 rounded-full"><ShieldCheck size={20} /></div>
                    Tuyệt vời! Tác phẩm của bạn đã nằm trên bàn của Ban Giám Khảo. Hãy theo dõi thông báo nhé.
                  </div>
                )}
                {submissionStatus === 'error' && (
                  <div className="mt-6 p-5 bg-red-50 border-2 border-red-100 rounded-2xl text-red-700 text-sm font-black flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-full"><X size={20} /></div>
                    Ối! Có lỗi xảy ra trong quá trình gửi. Vui lòng kiểm tra lại kết nối mạng.
                  </div>
                )}
                {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}

                <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">Bài đã nộp của bạn</h3>
                    {token ? (
                      <button
                        onClick={fetchMySubmissions}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100"
                      >
                        Làm mới
                      </button>
                    ) : null}
                  </div>

                  {!token ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">
                      Đăng nhập để xem lịch sử bài đã nộp và trạng thái duyệt.
                    </div>
                  ) : mySubsLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">Đang tải danh sách bài đã nộp...</div>
                  ) : mySubmissions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">Bạn chưa gửi bài nào.</div>
                  ) : (
                    <div className="space-y-3">
                      {mySubmissions.slice(0, 5).map((sub) => (
                        <div key={sub.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-slate-700">#{sub.id} - {sub.title}</p>
                            <span className={cn('rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest', statusBadgeClass(sub.status))}>
                              {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Nộp lúc: {new Date(sub.created_at).toLocaleString('vi-VN')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'the-le' && (
            <div className="max-w-4xl mx-auto" data-aos="zoom-in">
              <Card className="p-12 border-0 shadow-2xl rounded-[40px] bg-white relative overflow-hidden">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-fpt-orange opacity-5 rounded-full"></div>
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-fpt-blue opacity-5 rounded-full"></div>
                
                <div className="relative z-10">
                  <h2 className="text-4xl font-black text-fpt-blue mb-10 flex items-center gap-4 border-b-4 border-orange-100 pb-6 inline-flex italic uppercase tracking-tighter">
                    <div className="p-3 bg-gradient-to-br from-fpt-orange to-orange-400 rounded-2xl text-white shadow-lg"><ShieldCheck size={32} /></div>
                    THỂ LỆ "NHÁI BÉN" 2026
                  </h2>
                  
                  <div className="space-y-8 text-gray-700 font-medium leading-relaxed text-lg">
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">01</div>
                      <p className="pt-2">Tác phẩm tham gia phải là <span className="font-black text-fpt-blue">sáng tác mới 100%</span>, chưa từng công bố trên bất kỳ phương tiện thông tin đại chúng hay mạng xã hội nào.</p>
                    </div>
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">02</div>
                      <p className="pt-2">Chủ đề xuyên suốt năm nay: <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpt-orange to-red-500 font-black text-2xl ml-2 inline-block gradient-text-fix pt-3 md:pt-6">"NHỊP ĐẬP SỐ - KHÁT VỌNG VƯƠN TẦM"</span>.</p>
                    </div>
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">03</div>
                      <div>
                        <p className="pt-2 font-black text-fpt-blue">Thể loại được chấp nhận:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-500">
                          <li>Truyện ngắn (tối đa 3000 chữ)</li>
                          <li>Tản văn, Ghi chép (tối đa 1500 chữ)</li>
                          <li>Thơ tự do, Thơ có luật</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">04</div>
                      <p className="pt-2">Đối tượng tham gia mở rộng cho <span className="font-black text-fpt-blue">toàn thể học sinh, sinh viên</span> trong hệ thống giáo dục FPT yêu thích văn chương.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'bai-thi' && (
            <div className="space-y-8" data-aos="fade-up">
              {loading ? (
                <div className="text-center py-32">
                  <div className="w-16 h-16 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
                  <p className="font-black text-fpt-blue uppercase tracking-[0.2em] animate-pulse">Đang tải Thư viện Tác phẩm...</p>
                </div>
              ) : approvedSubmissions.length === 0 ? (
                <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-orange-100 shadow-xl shadow-orange-50">
                  <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen size={40} className="text-fpt-orange" />
                  </div>
                  <h3 className="text-2xl font-black text-fpt-blue mb-2 uppercase tracking-tighter">Kho tàng đang chờ mở</h3>
                  <p className="text-gray-500 font-medium">Chưa có tác phẩm nào được công bố. Hãy là ngòi bút đầu tiên khai bút!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {approvedSubmissions.map((sub, idx) => (
                    <Card key={sub.id} data-aos="fade-up" data-aos-delay={idx * 100} className="group hover:shadow-[0_20px_50px_-15px_rgba(242,112,36,0.3)] transition-all duration-500 border-none bg-white p-0 overflow-hidden flex flex-col rounded-[32px] hover:-translate-y-2">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 h-48 flex flex-col items-center justify-center relative overflow-hidden p-6 border-b border-orange-200/50">
                        <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-lg text-[10px] font-black text-fpt-orange shadow-sm uppercase tracking-widest border border-orange-100">
                          MS: {sub.id.toString().padStart(4, '0')}
                        </div>
                        <BookOpen size={48} className="text-fpt-orange/40 group-hover:scale-110 group-hover:text-fpt-orange transition-all duration-500" />
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col relative bg-white">
                        <h3 className="text-2xl font-black text-gray-800 mb-4 group-hover:text-fpt-orange transition-colors line-clamp-2 leading-snug">{sub.title}</h3>

                        {sub.attachment_url && (
                          <a
                            href={sub.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-fpt-orange"
                          >
                            <FileText size={14} /> PDF đính kèm
                          </a>
                        )}
                        
                        <p className="text-gray-500 text-sm font-medium mb-8 flex-1 line-clamp-4 leading-relaxed prose-sm">
                          {sub.content}
                        </p>

                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="flex items-center gap-2"><User size={14} className="text-fpt-blue" /> {sub.student_name}</span>
                            <span className="flex items-center gap-2"><Calendar size={14} className="text-fpt-orange" /> {new Date(sub.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <button 
                              onClick={() => handleVote(sub.id)}
                              disabled={hasVotedSubmission(sub.id) || isVotingSubmission(sub.id)}
                              className={cn(
                                'flex items-center gap-2 transition-colors group/vote bg-orange-50 px-4 py-2 rounded-xl',
                                hasVotedSubmission(sub.id) || isVotingSubmission(sub.id)
                                  ? 'text-slate-400 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-white hover:bg-fpt-orange'
                              )}
                            >
                              <ThumbsUp size={18} className={cn('group-active/vote:scale-125 transition-transform', hasVotedSubmission(sub.id) || isVotingSubmission(sub.id) ? 'text-slate-400' : 'group-hover/vote:text-white text-fpt-orange')} />
                              <span className={cn('text-sm font-black', hasVotedSubmission(sub.id) || isVotingSubmission(sub.id) ? 'text-slate-400' : 'text-fpt-orange group-hover/vote:text-white')}>
                                {sub.votes} {hasVotedSubmission(sub.id) ? 'Đã bình chọn' : 'Lượt thích'}
                              </span>
                            </button>
                            <Button
                              onClick={() => openSubmissionDetail(sub)}
                              className="bg-transparent border-2 border-gray-200 text-gray-500 hover:border-fpt-blue hover:text-fpt-blue hover:bg-white px-6 py-2 text-xs font-black rounded-xl inline-flex items-center gap-2"
                            >
                              <Eye size={14} /> ĐỌC
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedSubmission && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto" onClick={closeSubmissionDetail}>
          <div
            className="mx-auto max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-4 rounded-t-3xl backdrop-blur">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-fpt-orange">Tác phẩm đã duyệt</p>
                <h3 className="mt-1 text-xl md:text-2xl font-black text-slate-800">{selectedSubmission.title}</h3>
              </div>
              <button
                onClick={closeSubmissionDetail}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 inline-flex items-center gap-1.5"><User size={13} /> {selectedSubmission.student_name || 'Ẩn danh'}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 inline-flex items-center gap-1.5"><Calendar size={13} /> {new Date(selectedSubmission.created_at).toLocaleString('vi-VN')}</span>
                <button
                  onClick={() => handleVote(selectedSubmission.id)}
                  disabled={hasVotedSubmission(selectedSubmission.id) || isVotingSubmission(selectedSubmission.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 inline-flex items-center gap-1.5 transition-colors',
                    hasVotedSubmission(selectedSubmission.id) || isVotingSubmission(selectedSubmission.id)
                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-orange-200 bg-orange-50 text-fpt-orange hover:bg-fpt-orange hover:text-white'
                  )}
                >
                  <ThumbsUp size={13} /> {selectedSubmission.votes} {hasVotedSubmission(selectedSubmission.id) ? 'đã bình chọn' : 'lượt thích'}
                </button>
              </div>

              {selectedSubmission.attachment_url && (
                <a
                  href={selectedSubmission.attachment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-fpt-orange"
                >
                  <FileText size={14} /> Mở PDF đính kèm
                </a>
              )}

              <article className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedSubmission.content}
              </article>

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-700 inline-flex items-center gap-2">
                    <MessageSquare size={14} /> Bình luận cộng đồng
                  </h4>
                  <button
                    onClick={() => fetchSubmissionComments(selectedSubmission.id)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100"
                  >
                    Làm mới
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <RichTextEditor
                    label="Viết bình luận"
                    value={commentEditorValue}
                    onChange={setCommentEditorValue}
                    placeholder="Chia sẻ cảm nhận của bạn về tác phẩm này..."
                    size="compact"
                    disabled={commentSubmitting}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={handleCreateComment}
                      disabled={commentSubmitting}
                      className="bg-fpt-orange hover:bg-orange-600 border-none px-5 py-2 text-xs font-black rounded-xl"
                    >
                      {commentSubmitting ? 'ĐANG GỬI...' : 'GỬI BÌNH LUẬN'}
                    </Button>
                  </div>
                </div>

                {commentsLoadingBySubmission[selectedSubmission.id] ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">Đang tải bình luận...</div>
                ) : (commentsBySubmission[selectedSubmission.id] || []).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">Chưa có bình luận nào. Hãy là người bình luận đầu tiên.</div>
                ) : (
                  <div className="space-y-3">
                    {(commentsBySubmission[selectedSubmission.id] || []).map((comment) => (
                      <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                          <span>{comment.author_name || 'Người dùng'}</span>
                          <span>•</span>
                          <span>{new Date(comment.created_at).toLocaleString('vi-VN')}</span>
                        </div>
                        <div
                          className="prose prose-sm max-w-none text-slate-700"
                          dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.content) }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
