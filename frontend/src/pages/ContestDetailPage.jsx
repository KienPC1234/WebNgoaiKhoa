import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { Card, Button, cn } from '../components/UI'
import {
  Award, Users, Calendar, Clock, ChevronLeft, ThumbsUp, Send,
  Edit3, BookOpen, FileText, MessageSquare, Eye, X, Loader2,
  Trophy, Info, CheckCircle, XCircle, AlertCircle, Upload, Tag,
  Share2, Trash2, Search, Medal, Crown, Image,
} from 'lucide-react'
import { showApiError, toastError, toastSuccess } from '@/lib/notify'
import { roleHasPermission } from '@/lib/rolePolicy'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import ReCAPTCHA from 'react-google-recaptcha'

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''
const SUBMISSION_DRAFT_PREFIX = 'contest_submission_draft_'

const sanitizeHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
}

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

const CountdownTimer = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!endDate) return
    const calc = () => {
      const diff = new Date(endDate) - new Date()
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false,
      }
    }
    setTimeLeft(calc())
    const timer = setInterval(() => setTimeLeft(calc()), 1000)
    return () => clearInterval(timer)
  }, [endDate])

  if (!timeLeft || timeLeft.expired) return null

  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock size={14} className="text-white/70" />
      <span className="text-white/80 font-mono">
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  )
}

const ShareButton = ({ title, url }) => {
  const [showMenu, setShowMenu] = useState(false)

  const shareUrl = url || window.location.href
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(title || '')

  const shareOptions = [
    { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, color: 'bg-blue-600' },
    { name: 'Zalo', url: `https://zalo.me/share?url=${encodedUrl}&title=${encodedTitle}`, color: 'bg-blue-500' },
    { name: 'Copy link', action: () => { navigator.clipboard.writeText(shareUrl); toastSuccess('Đã copy link!') }, color: 'bg-gray-600' },
  ]

  return (
    <div className="relative">
      <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">
        <Share2 size={14} /> Chia sẻ
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border p-2 min-w-[160px] z-50">
          {shareOptions.map(opt => (
            <button
              key={opt.name}
              onClick={() => { if (opt.action) opt.action(); else window.open(opt.url, '_blank', 'width=600,height=400'); setShowMenu(false) }}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors"
            >
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const LeaderboardTab = ({ slug }) => {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get(`/public/contests/${slug}/leaderboard`, { params: { limit: 50 } })
        setLeaderboard(res.data?.leaderboard || [])
      } catch { setLeaderboard([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [slug])

  const filtered = leaderboard.filter(item =>
    !searchTerm || item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-fpt-orange" size={28} /></div>

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-500" />
    if (rank === 2) return <Medal size={18} className="text-gray-400" />
    if (rank === 3) return <Medal size={18} className="text-amber-600" />
    return <span className="text-sm font-bold text-gray-500 w-[18px] text-center">{rank}</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm bài thi..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-gray-400">
          <Trophy size={40} className="mx-auto mb-3 opacity-30" />
          <p>Chưa có bài thi nào được xếp hạng</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id} className={cn('p-4 flex items-center gap-4 transition-colors', item.rank <= 3 && 'bg-gradient-to-r from-yellow-50 to-transparent')}>
              <div className="flex items-center justify-center w-10">
                {getRankIcon(item.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.title}</p>
                <p className="text-xs text-gray-500">{item.student_name}</p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-fpt-orange">
                <ThumbsUp size={14} />
                <span>{item.votes}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

const ResultsTab = ({ slug }) => {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get(`/public/contests/${slug}/results`)
        setResults(res.data)
      } catch { setResults(null) }
      finally { setLoading(false) }
    }
    fetch()
  }, [slug])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-fpt-orange" size={28} /></div>
  if (!results) return (
    <Card className="p-12 text-center text-gray-400">
      <Trophy size={40} className="mx-auto mb-3 opacity-30" />
      <p>Kết quả chưa được công bố</p>
    </Card>
  )

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: '🥇', bg: 'bg-yellow-50 border-yellow-200' }
    if (rank === 2) return { icon: '🥈', bg: 'bg-gray-50 border-gray-200' }
    if (rank === 3) return { icon: '🥉', bg: 'bg-amber-50 border-amber-200' }
    return { icon: `#${rank}`, bg: 'bg-white' }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <Trophy size={20} className="text-yellow-500" /> Kết quả cuộc thi
        </h2>
        <p className="text-sm text-gray-500">
          {results.total_winners > 0 ? `${results.total_winners} giải thưởng` : 'Kết quả theo bình chọn'}
          {results.total_approved > 0 && ` • ${results.total_approved} bài dự thi`}
        </p>
      </Card>

      {results.results?.length > 0 ? (
        <div className="space-y-3">
          {results.results.map((entry) => {
            const badge = getRankBadge(entry.rank)
            return (
              <Card key={entry.submission_id} className={cn('p-4 border', badge.bg)}>
                <div className="flex items-center gap-4">
                  <div className="text-2xl w-12 text-center">{badge.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{entry.title}</p>
                    <p className="text-xs text-gray-500">{entry.student_name}</p>
                    {entry.prize && (
                      <p className="text-xs text-fpt-orange font-medium mt-1">
                        🏆 {entry.prize.name}: {entry.prize.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-bold text-fpt-orange">
                      <ThumbsUp size={14} /> {entry.votes}
                    </div>
                    {entry.total_score > 0 && (
                      <p className="text-xs text-gray-500 mt-1">Điểm: {entry.total_score}</p>
                    )}
                    {entry.judge_count > 0 && (
                      <p className="text-xs text-gray-400">{entry.judge_count} giám khảo</p>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-12 text-center text-gray-400">
          <p>Chưa có kết quả</p>
        </Card>
      )}

      {results.contest?.prizes?.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Award size={16} /> Giải thưởng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.contest.prizes.map((prize, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-sm">{prize.name}</p>
                {prize.description && <p className="text-xs text-gray-500 mt-1">{prize.description}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

const JudgeTab = ({ slug, contest, token, navigate }) => {
  const [judgeData, setJudgeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scoring, setScoring] = useState(null)
  const [scores, setScores] = useState({})
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get(`/public/contests/${slug}/judge/submissions`)
        setJudgeData(res.data)
      } catch (err) {
        if (err.response?.status === 403) setJudgeData(null)
      }
      finally { setLoading(false) }
    }
    fetch()
  }, [slug, token])

  const handleScoreSubmit = async (subId) => {
    const criteria = judgeData?.contest?.judging_criteria || []
    const scoresList = criteria.map((c, idx) => ({
      criterion_index: idx,
      score: scores[idx] || 0,
    }))

    if (scoresList.some(s => s.score === 0)) {
      toastError('Vui lòng chấm điểm tất cả tiêu chí')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post(`/public/contests/${slug}/submissions/${subId}/score`, {
        scores: scoresList,
        comment: comment || undefined,
      })
      toastSuccess('Đã lưu điểm!')
      setScoring(null)
      setScores({})
      setComment('')
      const res = await apiClient.get(`/public/contests/${slug}/judge/submissions`)
      setJudgeData(res.data)
    } catch (err) { showApiError(err, 'Không thể lưu điểm.') }
    finally { setSubmitting(false) }
  }

  if (!token) return (
    <Card className="p-12 text-center">
      <AlertCircle size={40} className="mx-auto mb-3 text-orange-400" />
      <p className="text-lg font-medium mb-2">Bạn cần đăng nhập</p>
      <Button onClick={() => navigate('/login')}>Đăng nhập</Button>
    </Card>
  )

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-fpt-orange" size={28} /></div>

  if (!judgeData) return (
    <Card className="p-12 text-center text-gray-400">
      <Award size={40} className="mx-auto mb-3 opacity-30" />
      <p className="text-lg font-medium">Bạn chưa được phân công là giám khảo</p>
      <p className="text-sm mt-1">Liên hệ admin để được cấp quyền giám khảo</p>
    </Card>
  )

  const criteria = judgeData?.contest?.judging_criteria || []

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-bold text-sm mb-2">Chấm bài ({judgeData.submissions?.length || 0} bài)</h3>
        <p className="text-xs text-gray-500">Tiêu chí: {criteria.map(c => `${c.name} (${c.weight}x)`).join(', ')}</p>
      </Card>

      {judgeData.submissions?.map(sub => (
        <Card key={sub.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{sub.title}</p>
              <p className="text-xs text-gray-500 mt-1">{sub.student_name}</p>
              {sub.fully_scored && (
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-green-100 text-green-700 rounded">Đã chấm</span>
              )}
            </div>
            <Button
              size="sm"
              variant={sub.fully_scored ? 'outline' : 'default'}
              onClick={() => setScoring(scoring === sub.id ? null : sub.id)}
            >
              {sub.fully_scored ? 'Sửa điểm' : 'Chấm điểm'}
            </Button>
          </div>

          {scoring === sub.id && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="prose prose-sm max-w-none bg-gray-50 rounded p-3 text-xs" dangerouslySetInnerHTML={{ __html: sanitizeHtml(sub.content) }} />

              {criteria.map((crit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <label className="text-sm font-medium w-40 truncate">{crit.name}</label>
                  <input
                    type="range"
                    min={0}
                    max={crit.max_score || 10}
                    value={scores[idx] || 0}
                    onChange={e => setScores(prev => ({ ...prev, [idx]: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold w-8 text-right">{scores[idx] || 0}</span>
                  <span className="text-xs text-gray-400">/{crit.max_score || 10}</span>
                </div>
              ))}

              <div>
                <label className="text-sm font-medium">Nhận xét (tùy chọn)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm mt-1"
                  rows={2}
                  placeholder="Nhận xét cho bài thi..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleScoreSubmit(sub.id)} disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                  Lưu điểm
                </Button>
                <Button variant="outline" onClick={() => setScoring(null)}>Hủy</Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
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

  let user = null
  let token = null
  try {
    const userJson = localStorage.getItem('user')
    user = userJson ? JSON.parse(userJson) : null
    token = localStorage.getItem('token')
  } catch { /* ignore parse errors */ }

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['sang-tac', 'the-le', 'bai-thi', 'bang-xep-hang', 'ket-qua', 'giam-khao'].includes(tabParam)) setActiveTab(tabParam)
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
            {contest.status === 'active' && contest.end_date && <CountdownTimer endDate={contest.end_date} />}
          </div>
          <div className="mt-4">
            <ShareButton title={contest.title} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {[
            { key: 'bai-thi', label: 'Bài dự thi', icon: FileText, count: submissions.length },
            { key: 'bang-xep-hang', label: 'Bảng xếp hạng', icon: Trophy },
            { key: 'sang-tac', label: 'Nộp bài', icon: Edit3 },
            { key: 'giam-khao', label: 'Giám khảo', icon: Award },
            { key: 'ket-qua', label: 'Kết quả', icon: CheckCircle },
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
              {tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">{tab.count}</span>
              )}
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

        {activeTab === 'bang-xep-hang' && (
          <LeaderboardTab slug={slug} />
        )}

        {activeTab === 'giam-khao' && (
          <JudgeTab slug={slug} contest={contest} token={token} navigate={navigate} />
        )}

        {activeTab === 'ket-qua' && (
          <ResultsTab slug={slug} />
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
                <div className="prose prose-sm max-w-none mb-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedSub.content) }} />
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
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                        votingIds.includes(selectedSub.id) && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      {votingIds.includes(selectedSub.id) ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ThumbsUp size={16} />
                      )}
                      {votedIds.includes(selectedSub.id) ? 'Đã bình chọn' : 'Bình chọn'}
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
  const [submissionType, setSubmissionType] = useState('text')
  const [imageUrl, setImageUrl] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState(null)

  const allowedTypes = contest.allowed_submission_types || ['text', 'file', 'image']

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

  const typeLabels = {
    text: { label: 'Text/URL', icon: FileText },
    file: { label: 'Upload File', icon: Upload },
    image: { label: 'Upload Ảnh', icon: Image },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Edit3 size={20} /> Nộp bài dự thi
          </h2>

          {allowedTypes.length > 1 && (
            <div className="flex gap-2 mb-4">
              {allowedTypes.map(type => {
                const cfg = typeLabels[type] || typeLabels.text
                const Icon = cfg.icon
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSubmissionType(type)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                      submissionType === type
                        ? 'border-fpt-orange bg-orange-50 text-fpt-orange'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <Icon size={16} /> {cfg.label}
                  </button>
                )
              })}
            </div>
          )}

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

            {submissionType === 'text' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Nội dung</label>
                  <RichTextEditor value={content} onChange={setContent} placeholder="Nhập nội dung bài dự thi..." />
                  {formErrors.content && <p className="text-xs text-red-500 mt-1">{formErrors.content}</p>}
                </div>
                {contest.allow_url_submission && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Link tham khảo (tùy chọn)</label>
                    <input
                      value={externalUrl}
                      onChange={e => setExternalUrl(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="YouTube, Google Slides, Drive, Behance..."
                    />
                    <p className="text-xs text-gray-400 mt-1">Video, slides, portfolio, hoặc bất kỳ link nào</p>
                  </div>
                )}
              </>
            )}

            {submissionType === 'file' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Nội dung mô tả</label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={4}
                    placeholder="Mô tả ngắn về bài dự thi..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">File đính kèm <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept={contest.allowed_file_types || '.pdf,.doc,.docx'}
                    onChange={e => setPdfFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Tối đa {contest.max_file_size_mb}MB. Chấp nhận: {contest.allowed_file_types || '.pdf,.doc,.docx'}</p>
                </div>
              </>
            )}

            {submissionType === 'image' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Ảnh dự thi <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp"
                    onChange={e => setImageFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Tối đa {contest.max_image_size_mb || 10}MB. JPG, PNG, GIF, WebP</p>
                  {imageFile && (
                    <div className="mt-2">
                      <img src={URL.createObjectURL(imageFile)} alt="Preview" className="max-h-48 rounded-lg border" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Caption</label>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Mô tả về bức ảnh..."
                  />
                </div>
              </>
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
                <div key={sub.id} className="bg-gray-50 rounded px-2 py-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1">{sub.title}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium ml-2',
                      sub.status === 'approved' && 'bg-green-100 text-green-700',
                      sub.status === 'pending' && 'bg-yellow-100 text-yellow-700',
                      sub.status === 'rejected' && 'bg-red-100 text-red-700',
                    )}>
                      {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                    </span>
                  </div>
                  {sub.status !== 'rejected' && contest.status === 'active' && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => {
                          if (confirm('Rút bài này? Hành động này không thể hoàn tác.')) {
                            apiClient.delete(`/public/contests/${slug}/submissions/${sub.id}`)
                              .then(() => { toastSuccess('Đã rút bài'); fetchMySubmissions() })
                              .catch(err => showApiError(err, 'Không thể rút bài.'))
                          }
                        }}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={10} /> Rút bài
                      </button>
                    </div>
                  )}
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
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(contest.rules) }} />
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
