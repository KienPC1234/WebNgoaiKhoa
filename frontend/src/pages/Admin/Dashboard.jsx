import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../components/UI'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Users, FileText, Send, AlertCircle, TrendingUp, Calendar, Zap } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { roleHasPermission } from '@/lib/rolePolicy'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const data = [
  { name: 'T2', publications: 400, submissions: 24 },
  { name: 'T3', publications: 300, submissions: 13 },
  { name: 'T4', publications: 200, submissions: 98 },
  { name: 'T5', publications: 278, submissions: 39 },
  { name: 'T6', publications: 189, submissions: 48 },
  { name: 'T7', publications: 239, submissions: 38 },
  { name: 'CN', publications: 349, submissions: 43 },
];

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ users: 0, publications: 0, submissions: 0, pending_submissions: 0 })
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [overview, setOverview] = useState(null)
  const [aiOverview, setAiOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  // determine current user role from localStorage
  let currentUser = null
  try {
    currentUser = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    currentUser = null
  }
  const currentRole = currentUser?.role || ''

  const wsRef = useRef(null)
  const retryCountRef = useRef(0)

  const fetchData = useCallback(async () => {
    try {
      const rawUser = localStorage.getItem('user')
      let role = null
      try { role = rawUser ? JSON.parse(rawUser)?.role : null } catch { role = null }
      const isAdmin = roleHasPermission(role, 'admin')
      const canManageWebsite = isAdmin || roleHasPermission(role, 'content_manage')
      const canReviewSubmissions = isAdmin || roleHasPermission(role, 'submission_review')

      const overviewPromise = typeof cmsService.getAdminOverview === 'function' && (roleHasPermission(role, 'admin_panel') || canManageWebsite || canReviewSubmissions)
        ? cmsService.getAdminOverview()
        : Promise.resolve(null)

      const aiOverviewPromise = roleHasPermission(role, 'ai_knowledge') ? cmsService.getAIKnowledgeOverview() : Promise.resolve(null)

      const subsPromise = canReviewSubmissions ? cmsService.getRecentSubmissions() : Promise.resolve([])

      const [statsRes, subsRes, overviewRes, aiOverviewRes] = await Promise.all([
        cmsService.getStats(),
        subsPromise,
        overviewPromise,
        aiOverviewPromise,
      ])

      setStats(overviewRes?.stats || statsRes)
      setRecentSubmissions((subsRes || []).slice(0, 5))
      setOverview(overviewRes || null)
      setAiOverview(aiOverviewRes || null)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // WebSocket for real-time dashboard updates
  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_URL || ''
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const shouldConnect = Boolean(wsBase) || isLocalHost
    if (!shouldConnect) return

    let reconnectTimeout

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = wsBase
        ? `${wsBase.replace(/\/$/, '')}/notifications`
        : `${protocol}//${window.location.host}/ws/notifications`

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          retryCountRef.current = 0
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            // On any real-time event (new submission, notification, etc.),
            // refresh dashboard data to keep stats and recent submissions current.
            if (data?.type === 'new_submission' || data?.type === 'notification') {
              fetchData()
            }
          } catch {
            // ignore invalid payloads
          }
        }

        ws.onclose = () => {
          const delay = Math.min(30000, 3000 * (2 ** retryCountRef.current))
          retryCountRef.current += 1
          reconnectTimeout = setTimeout(connectWS, delay)
        }
      } catch {
        const delay = Math.min(30000, 3000 * (2 ** retryCountRef.current))
        retryCountRef.current += 1
        reconnectTimeout = setTimeout(connectWS, delay)
      }
    }

    connectWS()

    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [fetchData])

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"></div>
        <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu quản trị...</p>
      </div>
    </div>
  )

  const chartData = (overview && Array.isArray(overview.weekly_metrics) && overview.weekly_metrics.length)
    ? overview.weekly_metrics.map((m) => ({ name: m.name, publications: m.publications || 0, submissions: m.submissions || 0 }))
    : data

  // Derived dashboard trend values (use overview.weekly_metrics when available)
  const metrics = (overview && Array.isArray(overview.weekly_metrics)) ? overview.weekly_metrics : null
  const todayMetric = metrics && metrics.length ? metrics[metrics.length - 1] : null
  const publicationsToday = todayMetric ? (todayMetric.publications || 0) : 0
  const submissionsToday = todayMetric ? (todayMetric.submissions || 0) : 0
  const publicationsThisWeek = metrics ? metrics.reduce((acc, m) => acc + (m.publications || 0), 0) : 0
  const submissionsThisWeek = metrics ? metrics.reduce((acc, m) => acc + (m.submissions || 0), 0) : 0

  // Completion rate = (total - pending) / total
  const submissionCompletionRate = stats.submissions
    ? Math.round(((stats.submissions - (stats.pending_submissions || 0)) / stats.submissions) * 100)
    : 0

  const pendingCount = stats.pending_submissions || 0
  // Use backend-provided user weekly growth when available (percentage)
  const membersTrend = (overview && overview.user_weekly_growth != null)
    ? `${overview.user_weekly_growth > 0 ? '+' : ''}${overview.user_weekly_growth}%`
    : null

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard 
          icon={Users} 
          label="Thành viên" 
          value={stats.users} 
          tone="default"
          trend={membersTrend}
          description="Tăng trưởng tuần này"
        />
        <StatCard 
          icon={FileText} 
          label="Bài viết" 
          value={stats.publications} 
          tone="default"
          trend={publicationsToday ? `+${publicationsToday}` : '0'}
          description="Bài mới hôm nay"
        />
        <StatCard 
          icon={Send} 
          label="Bài dự thi" 
          value={stats.submissions} 
          tone="default"
          trend={`${submissionCompletionRate}%`}
          description="Tỉ lệ hoàn thành"
        />
        <StatCard 
          icon={AlertCircle} 
          label="Chờ duyệt" 
          value={stats.pending_submissions} 
          tone={stats.pending_submissions > 0 ? 'danger' : 'default'}
          trend={pendingCount > 0 ? String(pendingCount) : '0'}
          description="Yêu cầu đang đợi"
          isAlert={stats.pending_submissions > 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {(roleHasPermission(currentRole, 'admin') || roleHasPermission(currentRole, 'submission_review')) && (
        <Card className="lg:col-span-2 rounded-2xl border border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
              <TrendingUp size={16} className="text-slate-500" /> Xu hướng nội dung
            </CardTitle>
            <p className="text-xs text-slate-500">Số lượng bài mới và bài nộp trong tuần</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div>
              <div className="mb-4 flex gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Ấn phẩm mới</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-700" />Bài dự thi</span>
              </div>
            </div>
            <div className="h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={280} minWidth={0} minHeight={240}>
                <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} dy={8} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 6px 16px -8px rgb(15 23 42 / 0.3)', padding: '10px'}}
                  itemStyle={{fontSize: '12px', fontWeight: '600'}}
                />
                <Area type="monotone" dataKey="publications" stroke="#475569" strokeWidth={2.2} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="submissions" stroke="#0f172a" strokeWidth={2.2} fillOpacity={1} fill="url(#colorSubs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </CardContent>
        </Card>
      )}

      {roleHasPermission(currentRole, 'admin') && (
            <Card className="rounded-2xl border border-slate-200 shadow-sm">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                  <Zap size={16} className="text-slate-500" /> Trạng thái AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">AI Knowledge Core</span>
                    <span className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium',
                      overview?.ai_status === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {overview?.ai_status === 'ok' ? 'Online' : 'Degraded'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {(aiOverview?.documents_total ?? overview?.ai_documents ?? 0)} vector docs · core {(aiOverview?.documents_core ?? 0)} · static {(aiOverview?.source_counts?.site_static ?? 0)} · uploaded {(aiOverview?.documents_uploaded ?? 0)} chunks from {(aiOverview?.knowledge_assets ?? overview?.knowledge_assets ?? 0)} files
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MiniInfo label="Knowledge files" value={String(aiOverview?.knowledge_assets ?? overview?.knowledge_assets ?? 0)} />
                  <MiniInfo label="Uploaded chunks" value={String(aiOverview?.documents_uploaded ?? 0)} />
                  <MiniInfo label="Pending" value={String(stats.pending_submissions || 0)} />
                </div>

                <button
                  onClick={() => navigate('/admin/ai-knowledge')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Mở AI Knowledge
                </button>
              </CardContent>
            </Card>
          )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl border border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Bài dự thi mới nhất</CardTitle>
            {(roleHasPermission(currentRole, 'admin') || roleHasPermission(currentRole, 'submission_review')) && (
              <button
                onClick={() => navigate('/admin/submissions')}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Xem tất cả
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/70">
                <TableRow>
                  <TableHead className="px-6 py-3 text-xs text-slate-500">Sinh viên</TableHead>
                  <TableHead className="px-6 py-3 text-xs text-slate-500">Tác phẩm</TableHead>
                  <TableHead className="px-6 py-3 text-xs text-slate-500">Trạng thái</TableHead>
                  <TableHead className="px-6 py-3 text-xs text-slate-500">Ngày nộp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">Chưa có bài nộp mới.</TableCell>
                  </TableRow>
                ) : (
                  recentSubmissions.map((sub) => {
                    const studentName = sub.student_name || 'Ẩn danh'
                    const studentEmail = sub.student_email || 'Không có email'

                    return (
                      <TableRow key={sub.id} className="hover:bg-slate-50/80">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {studentName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{studentName}</p>
                              <p className="text-xs text-slate-500">{studentEmail}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-slate-700">{sub.title}</TableCell>
                        <TableCell className="px-6 py-4">
                          <StatusPill status={sub.status} />
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-slate-500">
                          {new Date(sub.created_at).toLocaleDateString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-800">Thao tác nhanh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            { (roleHasPermission(currentRole, 'admin') || roleHasPermission(currentRole, 'content_manage')) && (
              <ActionButton onClick={() => navigate('/admin/publications/new')} icon={FileText} label="Viết học liệu mới" />
            )}
            { (roleHasPermission(currentRole, 'admin') || roleHasPermission(currentRole, 'submission_review')) && (
              <ActionButton onClick={() => navigate('/admin/submissions')} icon={Send} label="Phê duyệt bài nộp" />
            )}
            { roleHasPermission(currentRole, 'admin') && (
              <ActionButton onClick={() => navigate('/admin/users')} icon={Users} label="Quản lý người dùng" />
            )}
            { (roleHasPermission(currentRole, 'admin') || roleHasPermission(currentRole, 'content_manage')) && (
              <ActionButton onClick={() => navigate('/admin/events')} icon={Calendar} label="Lên lịch sự kiện" />
            )}
            { roleHasPermission(currentRole, 'admin') && (
              <ActionButton onClick={() => navigate('/admin/ai-knowledge')} icon={Zap} label="Quản trị AI Knowledge" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const StatCard = ({ icon: Icon, label, value, trend, description, isAlert, tone = 'default' }) => (
  <Card className={cn('rounded-2xl border shadow-sm', tone === 'danger' ? 'border-red-200' : 'border-slate-200')}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className={cn(
          'rounded-lg p-2',
          tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
        )}>
          <Icon size={18} />
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <h3 className="text-2xl font-semibold text-slate-900">{value}</h3>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
            {trend != null && (
              <span className={cn(
                'rounded px-1.5 py-0.5 font-medium',
                isAlert ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              )}>
                {trend}
              </span>
            )}
            <span className="text-slate-500">{description}</span>
      </div>
    </CardContent>
  </Card>
)

const ActionButton = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
  >
    <Icon size={16} className="text-slate-500" />
    <span>{label}</span>
  </button>
)

const StatusPill = ({ status }) => {
  const map = {
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
  }
  const labelMap = {
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    pending: 'Chờ duyệt',
  }

  return (
    <span className={cn('rounded-full px-3 py-1.5 text-xs font-medium', map[status] || 'bg-slate-100 text-slate-700')}>
      {labelMap[status] || status}
    </span>
  )
}

const MiniInfo = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 flex flex-col justify-between min-h-[56px]">
    <div className="text-xs text-slate-500 leading-tight">{label}</div>
    <div className="text-sm font-semibold text-slate-800 leading-none">{value}</div>
  </div>
)
