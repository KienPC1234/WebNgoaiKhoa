import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { Card, Button, cn } from '../components/UI'
import {
  Award, Users, Calendar, Clock, ChevronLeft, ThumbsUp, Send,
  Edit3, BookOpen, FileText, MessageSquare, Eye, X, Loader2,
  Trophy, Info, CheckCircle, XCircle, AlertCircle, Upload, Tag,
} from 'lucide-react'
import { showApiError, toastError, toastSuccess } from '@/lib/notify'
import { roleHasPermission } from '@/lib/rolePolicy'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import ReCAPTCHA from 'react-google-recaptcha'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
const SUBMISSION_DRAFT_PREFIX = 'contest_submission_draft_'

const getRecaptchaTokenSafely = async (recaptchaRef) => {
  if (!RECAPTCHA_SITE_KEY || !recaptchaRef.current) return null
  try {
    const token = await Promise.race([
      recaptchaRef.current.executeAsync(),
      new Promise(resolve => setTimeout(() => resolve(null), 8000)),
    ])
    recaptchaRef.current.reset()
    return token || null
  } catch { return null }
}

const STATUS_CONFIG = {
  active: { label: 'Đang diễn ra', color: 'bg-green-100 text-green-700' },
  upcoming: { label: 'Sắp diễn ra', color: 'bg-blue-100 text-blue-700' },
  closed: { label: 'Đã đóng', color: 'bg-orange-100 text-orange-700' },
}

const SUBJECTS = {
  van: 'Ngữ Văn', ktpl: 'Kinh tế Pháp luật', 'lich-su': 'Lịch sử',
  'dia-li': 'Địa lí', vovinam: 'Vovinam', ngoaikhoa: 'Ngoại khoá',
}

export const ContestDetailPage = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [contest, setContest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'bai-thi')
  const [submissions, setSubmissions] = useState([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  const [selectedSub, setSelectedSub] = useState(null)
  const [votedIds, setVotedIds] = useState([])
  const [votingIds, setVotingIds] = useState([])
  const [mySubmissions, setMySubmissions] = useState([])
  const [mySubsLoading, setMySubsLoading] = useState(false)

  // Form
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [studentName, setStudentName] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const recaptchaRef = useRef(null)

  const userJson = localStorage.getItem('user')
  const user = userJson ? JSON.parse(userJson) : null
  const token = localStorage.getItem('token')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['sang-tac', 'the-le', 'bai-thi'].includes(tabParam)) setActiveTab(tabParam)
  }, [searchParams])

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get(`/public/contests/${slug}`)
        setContest(res.data)
      } catch (err) {
        if (err.response?.status === 404) { navigate('/cuoc-thi', { replace: true }); return }
        showApiError(err, 'Không thể tải cuộc thi.')
      } finally { setLoading(false) }
    }
    fetch()
  }, [slug])

  useEffect(() => {
    if (!contest) return
    if (activeTab === 'bai-thi') {
      fetchSubmissions()
      if (token) {
        let role = null
        try { role = JSON.parse(localStorage.getItem('user'))?.role } catch {}
        if (roleHasPermission(role, 'contestant')) fetchVotedIds()
      }
    }
    if (activeTab === 'sang-tac' && token) fetchMySubmissions()
  }, [activeTab, contest?.id])

  const fetchSubmissions = async () => {
    setSubsLoading(true)
    try {
      const res = await apiClient.get(`/public/contests/${slug}/submissions`, { params: { sort: sortBy } })
      setSubmissions(res.data || [])
    } catch { setSubmissions([]) }
    finally { setSubsLoading(false) }
  }

  const fetchVotedIds = async () => {
    try {
      const res = await apiClient.get('/public/submissions/votes/me')
      setVotedIds(res.data || [])
    } catch {}
  }

  const fetchMySubmissions = async () => {
    setMySubsLoading(true)
    try {
      const res = await apiClient.get(`/public/contests/${slug}/submissions/mine`)
      setMySubmissions(res.data || [])
    } catch { setMySubmissions([]) }
    finally { setMySubsLoading(false) }
  }

  useEffect(() => { if (contest && activeTab === 'bai-thi') fetchSubmissions() }, [sortBy])

  const validate = () => {
    const errs = {}
    if (!title.trim()) errs.title = 'Vui lòng nhập tiêu đề'
    else if (title.trim().length < (contest?.min_title_length || 6)) errs.title = `Tối thiểu ${contest?.min_title_length || 6} ký tự`
    if (!content.trim()) errs.content = 'Vui lòng nhập nội dung'
    else if (content.trim().length < (contest?.min_content_length || 30)) errs.content = `Tối thiểu ${contest?.min_content_length || 30} ký tự`
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)
      if (pdfFile && contest?.allow_file_upload) {
        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('content', content.trim())
        if (studentName.trim()) formData.append('student_name', studentName.trim())
        if (recaptchaToken) formData.append('recaptcha_token', recaptchaToken)
        formData.append('file', pdfFile)
        await apiClient.post(`/public/contests/${slug}/submissions/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await apiClient.post(`/public/contests/${slug}/submissions`, {
          title: title.trim(), content: content.trim(),
          student_name: studentName.trim() || undefined,
          recaptcha_token: recaptchaToken,
        })
      }
      setSubmitSuccess(true)
      setTitle(''); setContent(''); setStudentName(''); setPdfFile(null)
      localStorage.removeItem(SUBMISSION_DRAFT_PREFIX + slug)
      fetchMySubmissions()
    } catch (err) { showApiError(err, 'Không thể nộp bài.') }
    finally { setSubmitting(false) }
  }

  const handleVote = async (subId) => {
    if (!token) { navigate('/login'); return }
    if (votingIds.includes(subId)) return
    setVotingIds(prev => [...prev, subId])
    try {
      const recaptchaToken = await getRecaptchaTokenSafely(recaptchaRef)
      const res = await apiClient.post(`/public/contests/${slug}/submissions/${subId}/vote`, { recaptcha_token: recaptchaToken })
      if (res.data.voted) {
        setVotedIds(prev => [...prev, subId])
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, votes: s.votes + 1 } : s))
      } else {
        setVotedIds(prev => prev.filter(id => id !== subId))
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, votes: Math.max(0, s.votes - 1) } : s))
      }
    } catch (err) { showApiError(err, 'Không thể bình chọn.') }
    finally { setVotingIds(prev => prev.filter(id => id !== subId)) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-fpt-orange" size={32} /></div>
  if (!contest) return null

  const statusCfg = STATUS_CONFIG[contest.status] || STATUS_CONFIG.active
  const isAccepting = contest.is_accepting_submissions
  const canVote = contest.voting_method !== 'none' && contest.voting_method !== 'judges-only'

  return (
    <div className="min-h-screen bg-gray-50">
      {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-fpt-orange via-orange-500 to-amber-500 text-white overflow-hidden">
        {contest.banner_url && (
          <img src={contest.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-16">
          <button onClick={() => navigate('/cuoc-thi')} className="flex items-center gap-1 text-white/70 hover:text-white text-sm mb-4">
            <ChevronLeft size={16} /> Danh sách cuộc thi
          </button>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium', statusCfg.color)}>
              {statusCfg.label}
            </span>
            <span className="text-sm text-white/70">{SUBJECTS[contest.subject] || contest.subject}</span>
            {contest.type_label && <span className="text-sm text-white/70">&middot; {contest.type_label}</span>}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">{contest.title}</h1>
          {contest.description && <p className="text-white/80 max-w-2xl mb-4">{contest.description}</p>}
          <div className="flex items-center gap-4 text-sm text-white/60 flex-wrap">
            <span className="flex items-center gap-1"><Users size={14} /> {contest.submission_count} bài dự thi</span>
            <span className="flex items-center gap-1"><Eye size={14} /> {contest.view_count} lượt xem</span>
            {contest.start_date && (
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(contest.start_date).toLocaleDateString('vi-VN')}
                {contest.end_date && ` - ${new Date(contest.end_date).toLocaleDateString('vi-VN')}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {[
            { key: 'bai-thi', label: 'Bài dự thi', icon: FileText },
            { key: 'sang-tac', label: 'Nộp bài', icon: Edit3 },
            { key: 'the-le', label: 'Thể lệ', icon: BookOpen },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-fpt-orange text-fpt-orange'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'bai-thi' && (
          <SubmissionsTab
            submissions={submissions}
            loading={subsLoading}
            sortBy={sortBy}
            setSortBy={setSortBy}
            canVote={canVote}
            votedIds={votedIds}
            votingIds={votingIds}
            handleVote={handleVote}
            showAuthor={contest.show_author}
            showVoteCount={contest.show_vote_count}
            selectedSub={selectedSub}
            setSelectedSub={setSelectedSub}
            showComments={contest.show_comments}
            contestSlug={slug}
          />
        )}

        {activeTab === 'sang-tac' && (
          <SubmitTab
            contest={contest}
            isAccepting={isAccepting}
            token={token}
            user={user}
            title={title} setTitle={setTitle}
            content={content} setContent={setContent}
            studentName={studentName} setStudentName={setStudentName}
            pdfFile={pdfFile} setPdfFile={setPdfFile}
            formErrors={formErrors}
            submitting={submitting}
            submitSuccess={submitSuccess}
            handleSubmit={handleSubmit}
            mySubmissions={mySubmissions}
            mySubsLoading={mySubsLoading}
            recaptchaRef={recaptchaRef}
            navigate={navigate}
            slug={slug}
          />
        )}

        {activeTab === 'the-le' && (
          <RulesTab contest={contest} />
        )}
      </div>
    </div>
  )
}

const SubmissionsTab = ({ submissions, loading, sortBy, setSortBy, canVote, votedIds, votingIds, handleVote, showAuthor, showVoteCount, selectedSub, setSelectedSub, showComments, contestSlug }) => {
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState([])
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  useEffect(() => {
    if (selectedSub && showComments) fetchComments(selectedSub.id)
  }, [selectedSub?.id])

  const fetchComments = async (subId) => {
    setCommentLoading(true)
    try {
      const res = await apiClient.get(`/public/submissions/${subId}/comments`)
      setComments(res.data || [])
    } catch { setComments([]) }
    finally { setCommentLoading(false) }
  }

  const submitComment = async () => {
    if (!commentText.trim() || !selectedSub) return
    setCommentSubmitting(true)
    try {
      await apiClient.post(`/public/submissions/${selectedSub.id}/comments`, { content: commentText.trim() })
      setCommentText('')
      fetchComments(selectedSub.id)
    } catch (err) { showApiError(err, 'Không thể gửi bình luận.') }
    finally { setCommentSubmitting(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-fpt-orange" size={28} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg">Bài dự thi ({submissions.length})</h2>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="votes">Nhiều bình chọn</option>
        </select>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>Chưa có bài dự thi nào được duyệt</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {submissions.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-all',
                  selectedSub?.id === sub.id
                    ? 'border-fpt-orange bg-orange-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <p className="font-medium text-sm line-clamp-1">{sub.title}</p>
                {showAuthor && <p className="text-xs text-gray-400 mt-0.5">{sub.student_name}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  {showVoteCount && <span className="flex items-center gap-1"><ThumbsUp size={10} /> {sub.votes}</span>}
                  <span>{new Date(sub.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedSub ? (
              <Card className="p-5">
                <h3 className="text-xl font-bold mb-2">{selectedSub.title}</h3>
                {showAuthor && <p className="text-sm text-gray-500 mb-3">{selectedSub.student_name}</p>}
                <div className="prose prose-sm max-w-none mb-4" dangerouslySetInnerHTML={{ __html: selectedSub.content }} />
                {selectedSub.attachment_url && (
                  <a href={selectedSub.attachment_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm text-fpt-orange hover:underline mb-4">
                    <FileText size={14} /> Xem file đính kèm
                  </a>
                )}
                {canVote && (
                  <div className="flex items-center gap-3 pt-3 border-t">
                    <button
                      onClick={() => handleVote(selectedSub.id)}
                      disabled={votingIds.includes(selectedSub.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        votedIds.includes(selectedSub.id)
                          ? 'bg-fpt-orange text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      <ThumbsUp size={16} /> {votedIds.includes(selectedSub.id) ? 'Đã bình chọn' : 'Bình chọn'}
                      {showVoteCount && <span>({selectedSub.votes})</span>}
                    </button>
                  </div>
                )}

                {showComments && (
                  <div className="mt-5 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <MessageSquare size={14} /> Bình luận ({comments.length})
                    </h4>
                    {commentLoading ? (
                      <div className="flex items-center justify-center py-4"><Loader2 className="animate-spin" size={20} /></div>
                    ) : (
                      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                        {comments.length === 0 && <p className="text-xs text-gray-400">Chưa có bình luận</p>}
                        {comments.map(c => (
                          <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-xs font-medium text-gray-600">{c.author_name || 'Ẩn danh'}</p>
                            <p className="text-sm mt-0.5">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {token ? (
                      <div className="flex gap-2">
                        <input
                          value={commentText}
                          onChange={e => setCommentText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && submitComment()}
                          placeholder="Viết bình luận..."
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        />
                        <Button onClick={submitComment} disabled={commentSubmitting || !commentText.trim()} size="sm">
                          <Send size={14} />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Đăng nhập để bình luận</p>
                    )}
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-12 text-center text-gray-400">
                <Eye size={40} className="mx-auto mb-3 opacity-30" />
                <p>Chọn một bài để xem chi tiết</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const SubmitTab = ({ contest, isAccepting, token, user, title, setTitle, content, setContent, studentName, setStudentName, pdfFile, setPdfFile, formErrors, submitting, submitSuccess, handleSubmit, mySubmissions, mySubsLoading, recaptchaRef, navigate, slug }) => {
  if (!token) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-orange-400" />
        <p className="text-lg font-medium mb-2">Bạn cần đăng nhập</p>
        <p className="text-sm text-gray-500 mb-4">Đăng nhập để nộp bài dự thi</p>
        <Button onClick={() => navigate('/login')}>Đăng nhập</Button>
      </Card>
    )
  }

  if (!isAccepting) {
    return (
      <Card className="p-12 text-center">
        <Clock size={40} className="mx-auto mb-3 text-gray-400" />
        <p className="text-lg font-medium">Cuộc thi đã đóng nhận bài</p>
      </Card>
    )
  }

  if (submitSuccess) {
    return (
      <Card className="p-12 text-center">
        <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
        <p className="text-lg font-bold mb-2">Nộp bài thành công!</p>
        <p className="text-sm text-gray-500 mb-4">
          {contest.require_approval ? 'Bài của bạn đang chờ phê duyệt.' : 'Bài của bạn đã được đăng.'}
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Edit3 size={20} /> Nộp bài dự thi
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề <span className="text-red-500">*</span></label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                className={cn('w-full border rounded-lg px-3 py-2 text-sm', formErrors.title && 'border-red-400')}
                placeholder={`Tối thiểu ${contest.min_title_length} ký tự`}
              />
              {formErrors.title && <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tên tác giả</label>
              <input
                value={studentName} onChange={e => setStudentName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={user?.full_name || 'Tên của bạn'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nội dung <span className="text-red-500">*</span></label>
              <RichTextEditor value={content} onChange={setContent} placeholder={`Tối thiểu ${contest.min_content_length} ký tự...`} />
              {formErrors.content && <p className="text-xs text-red-500 mt-1">{formErrors.content}</p>}
            </div>
            {contest.allow_file_upload && (
              <div>
                <label className="block text-sm font-medium mb-1">File đính kèm (tùy chọn)</label>
                <input
                  type="file"
                  accept={contest.allowed_file_types || '.pdf'}
                  onChange={e => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Tối đa {contest.max_file_size_mb}MB. Chấp nhận: {contest.allowed_file_types || '.pdf'}</p>
              </div>
            )}
            <Button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Nộp bài
            </Button>
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Info size={14} /> Quy định</h3>
          <ul className="text-xs text-gray-500 space-y-1.5">
            <li>Tiêu đề: {contest.min_title_length} - {contest.max_title_length} ký tự</li>
            <li>Nội dung: {contest.min_content_length} - {contest.max_content_length} ký tự</li>
            <li>Số bài tối đa: {contest.max_submissions_per_user}</li>
            {contest.require_approval && <li>Bài sẽ được duyệt trước khi hiển thị</li>}
          </ul>
        </Card>

        {mySubmissions.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium text-sm mb-3">Bài đã nộp ({mySubmissions.length})</h3>
            <div className="space-y-2">
              {mySubmissions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                  <span className="truncate">{sub.title}</span>
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                    sub.status === 'approved' && 'bg-green-100 text-green-700',
                    sub.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                    sub.status === 'rejected' && 'bg-red-100 text-red-700',
                  )}>
                    {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

const RulesTab = ({ contest }) => (
  <Card className="p-6">
    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
      <BookOpen size={20} /> Thể lệ cuộc thi
    </h2>
    {contest.rules ? (
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: contest.rules }} />
    ) : (
      <p className="text-gray-400 text-center py-8">Chưa có thể lệ</p>
    )}

    {(contest.judging_criteria?.length > 0 || contest.prizes?.length > 0 || contest.contact_info) && (
      <div className="mt-6 pt-4 border-t space-y-4">
        {contest.judging_criteria?.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-2">Tiêu chí đánh giá</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {contest.judging_criteria.map((c, i) => <li key={i}>{c.name || c}: {c.weight || ''}</li>)}
            </ul>
          </div>
        )}
        {contest.prizes?.length > 0 && (
          <div>
            <h3 className="font-medium text-sm mb-2 flex items-center gap-1"><Trophy size={14} /> Giải thưởng</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {contest.prizes.map((p, i) => <li key={i}>{p.name || p}: {p.description || ''}</li>)}
            </ul>
          </div>
        )}
        {contest.contact_info && (
          <div>
            <h3 className="font-medium text-sm mb-2">Thông tin liên hệ</h3>
            <p className="text-sm text-gray-600">{contest.contact_info}</p>
          </div>
        )}
      </div>
    )}
  </Card>
)

export default ContestDetailPage
