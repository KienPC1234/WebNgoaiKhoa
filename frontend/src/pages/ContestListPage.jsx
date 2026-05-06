import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'
import { Card, Button, cn } from '../components/UI'
import {
  Award, Users, Calendar, Clock, ChevronRight, Search, Filter,
  Star, Eye, ArrowRight, Loader2, Trophy, MapPin, Tag,
} from 'lucide-react'

const SUBJECTS = {
  van: 'Ngữ Văn', ktpl: 'Kinh tế Pháp luật', 'lich-su': 'Lịch sử',
  'dia-li': 'Địa lí', vovinam: 'Vovinam', ngoaikhoa: 'Ngoại khoá',
}

const STATUS_CONFIG = {
  active: { label: 'Đang diễn ra', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  upcoming: { label: 'Sắp diễn ra', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  closed: { label: 'Đã đóng', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  archived: { label: 'Lưu trữ', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
}

export const ContestListPage = () => {
  const [contests, setContests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSubject, setFilterSubject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const params = { limit: 50 }
        if (filterSubject) params.subject = filterSubject
        if (filterStatus) params.status = filterStatus
        const res = await apiClient.get('/public/contests', { params })
        setContests(res.data || [])
      } catch { setContests([]) }
      finally { setLoading(false) }
    }
    fetch()
  }, [filterSubject, filterStatus])

  const filtered = contests.filter(c =>
    !searchTerm || c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const featured = filtered.filter(c => c.is_featured)
  const regular = filtered.filter(c => !c.is_featured)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-fpt-orange via-orange-500 to-amber-500 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
            <Trophy size={18} /> <span className="text-sm font-medium">Nền tảng cuộc thi</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Cuộc thi</h1>
          <p className="text-white/80 max-w-xl mx-auto">Khám phá và tham gia các cuộc thi đang diễn ra. Nộp bài dự thi, bình chọn và theo dõi kết quả.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6">
        <Card className="p-4 flex flex-wrap gap-3 items-center shadow-lg">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Tìm cuộc thi..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả môn</option>
            {Object.entries(SUBJECTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang diễn ra</option>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="closed">Đã đóng</option>
          </select>
        </Card>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-fpt-orange" size={32} /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Trophy size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Chưa có cuộc thi nào</p>
          </div>
        ) : (
          <div className="space-y-8">
            {featured.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Star size={18} className="text-yellow-500 fill-yellow-500" /> Nổi bật
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featured.map(c => <ContestCard key={c.id} contest={c} featured />)}
                </div>
              </div>
            )}
            {regular.length > 0 && (
              <div>
                {featured.length > 0 && <h2 className="text-lg font-bold text-gray-800 mb-4">Tất cả cuộc thi</h2>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regular.map(c => <ContestCard key={c.id} contest={c} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ContestCard = ({ contest, featured }) => {
  const statusCfg = STATUS_CONFIG[contest.status] || STATUS_CONFIG.active
  const now = new Date()
  const endDate = contest.end_date ? new Date(contest.end_date) : null
  const isEndingSoon = endDate && contest.status === 'active' && (endDate - now) < 7 * 24 * 60 * 60 * 1000

  return (
    <Link to={`/cuoc-thi/${contest.slug}`}>
      <Card className={cn(
        'group overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer h-full',
        featured && 'ring-2 ring-yellow-400/50'
      )}>
        {contest.banner_url || contest.image_url ? (
          <div className="relative h-40 overflow-hidden">
            <img
              src={contest.banner_url || contest.image_url}
              alt={contest.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusCfg.color)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} /> {statusCfg.label}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-fpt-orange/10 to-amber-100 flex items-center justify-center">
            <Trophy size={40} className="text-fpt-orange/30" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {!contest.banner_url && !contest.image_url && (
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusCfg.color)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} /> {statusCfg.label}
              </span>
            )}
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {SUBJECTS[contest.subject] || contest.subject}
            </span>
            {isEndingSoon && <span className="text-xs text-red-500 font-medium">Sắp kết thúc!</span>}
          </div>
          <h3 className="font-semibold text-gray-900 group-hover:text-fpt-orange transition-colors line-clamp-2 mb-2">
            {contest.title}
          </h3>
          {contest.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{contest.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Users size={12} /> {contest.submission_count} bài</span>
            <span className="flex items-center gap-1"><Eye size={12} /> {contest.view_count}</span>
            {contest.start_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {new Date(contest.start_date).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default ContestListPage
