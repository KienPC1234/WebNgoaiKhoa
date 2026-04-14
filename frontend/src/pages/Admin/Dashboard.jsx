import { useEffect, useState } from 'react'
import { cn } from '../../components/UI'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Users, FileText, Send, PieChart, Clock, AlertCircle, ArrowUpRight, TrendingUp, Calendar, Zap } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Pie, Pie as RePie, Legend
} from 'recharts'

const data = [
  { name: 'T2', views: 400, submissions: 24 },
  { name: 'T3', views: 300, submissions: 13 },
  { name: 'T4', views: 200, submissions: 98 },
  { name: 'T5', views: 278, submissions: 39 },
  { name: 'T6', views: 189, submissions: 48 },
  { name: 'T7', views: 239, submissions: 38 },
  { name: 'CN', views: 349, submissions: 43 },
];

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, publications: 0, submissions: 0, pending_submissions: 0 })
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, subsRes] = await Promise.all([
          cmsService.getStats(),
          cmsService.getRecentSubmissions(),
        ])
        setStats(statsRes)
        setRecentSubmissions((subsRes || []).slice(0, 5))
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-fpt-blue uppercase tracking-widest text-xs animate-pulse">Khởi tạo dữ liệu hệ thống...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Thành viên" 
          value={stats.users} 
          color="from-blue-500 to-blue-600" 
          trend="+5.2%"
          description="Tăng trưởng tuần này"
        />
        <StatCard 
          icon={FileText} 
          label="Bài viết" 
          value={stats.publications} 
          color="from-orange-500 to-orange-600" 
          trend="+2"
          description="Đã xuất bản hôm nay"
        />
        <StatCard 
          icon={Send} 
          label="Bài dự thi" 
          value={stats.submissions} 
          color="from-emerald-500 to-emerald-600" 
          trend="92%"
          description="Tỉ lệ hoàn thành"
        />
        <StatCard 
          icon={AlertCircle} 
          label="Chờ duyệt" 
          value={stats.pending_submissions} 
          color={stats.pending_submissions > 0 ? "from-red-500 to-red-600" : "from-gray-400 to-gray-500"} 
          trend="Cần xử lý"
          description="Yêu cầu đang đợi"
          isAlert={stats.pending_submissions > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 border-none shadow-2xl shadow-gray-100 rounded-[40px] overflow-hidden bg-white p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-fpt-blue uppercase tracking-tight italic flex items-center gap-2">
                <TrendingUp size={20} className="text-fpt-orange" /> Hiệu suất hệ thống
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Lượt truy cập & Bài nộp theo tuần</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Views</span>
              <span className="flex items-center gap-1.5 text-[10px] font-black text-orange-500 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Subs</span>
            </div>
          </div>
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={280}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSubs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  itemStyle={{fontSize: '12px', fontWeight: '900', textTransform: 'uppercase'}}
                />
                <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="submissions" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSubs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI System Status */}
        <Card className="border-none shadow-2xl shadow-gray-100 rounded-[40px] bg-fpt-blue text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-fpt-orange opacity-10 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="p-8 h-full flex flex-col justify-between relative z-10">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                  <Zap size={24} className="text-fpt-orange" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Online</span>
                  </div>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">AI Engine Status</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-3xl font-black italic">gpt-oss:120b</h3>
                <p className="text-sm font-medium opacity-70 mt-2 leading-relaxed">Hệ thống AI đang hoạt động với độ trễ 142ms. Sẵn sàng xử lý các yêu cầu ngoại khóa.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-fpt-orange w-3/4 rounded-full shadow-[0_0_10px_rgba(242,112,36,0.8)]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest opacity-60">
                <span>Memory usage</span>
                <span>75% / 128GB</span>
              </div>
              <button className="w-full py-4 bg-white/10 hover:bg-white/20 transition-all rounded-2xl border border-white/10 font-black text-xs uppercase tracking-[0.2em]">Cấu hình AI Core</button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Submissions */}
        <Card className="lg:col-span-2 overflow-hidden border-none shadow-2xl shadow-gray-100 rounded-[40px] bg-white">
          <CardHeader className="flex flex-row justify-between items-center bg-white border-b border-gray-50 p-8 space-y-0">
            <CardTitle className="font-black text-fpt-blue uppercase tracking-tight flex items-center gap-3 text-xl italic">
              <div className="p-2 bg-orange-50 rounded-xl text-fpt-orange"><Clock size={20} /></div> Bài thi mới nhất
            </CardTitle>
            <button className="text-[10px] font-black text-fpt-blue hover:text-fpt-orange transition-all bg-gray-50 px-4 py-2 rounded-full uppercase tracking-widest border border-gray-100 shadow-sm">Xem tất cả</button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/30">
                <TableRow className="border-none">
                  <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sinh viên</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tác phẩm</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</TableHead>
                  <TableHead className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày nộp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-8 py-20 text-center text-gray-400 italic font-medium">Hệ thống đang chờ bài nộp đầu tiên...</TableCell>
                  </TableRow>
                ) : (
                  recentSubmissions.map((sub) => {
                    const studentName = sub.student_name || 'Ẩn danh'
                    const studentEmail = sub.student_email || 'Không có email'

                    return (
                    <TableRow key={sub.id} className="hover:bg-orange-50/20 transition-all group border-b border-gray-50/50 cursor-pointer">
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-black text-xs border-2 border-white shadow-sm">{studentName.charAt(0)}</div>
                          <div>
                            <p className="font-black text-gray-800 text-sm leading-tight group-hover:text-fpt-orange transition-colors">{studentName}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">{studentEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5 font-bold text-gray-600 text-sm">{sub.title}</TableCell>
                      <TableCell className="px-8 py-5">
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
                          sub.status === 'approved' ? 'bg-green-100 text-green-600' :
                          sub.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-orange-100 text-fpt-orange'
                        }`}>
                          {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                      </TableCell>
                      <TableCell className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">
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

        {/* Quick Actions Card */}
        <Card className="p-8 border-none shadow-2xl shadow-gray-100 rounded-[40px] bg-white flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-black text-fpt-blue uppercase tracking-tight italic mb-8 border-b-2 border-gray-50 pb-4 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-fpt-blue"><TrendingUp size={20} /></div> Hoạt động nhanh
            </h3>
            <div className="space-y-4">
              <ActionButton icon={FileText} label="Viết học liệu mới" color="hover:bg-fpt-orange" />
              <ActionButton icon={Send} label="Phê duyệt bài nộp" color="hover:bg-fpt-blue" />
              <ActionButton icon={Users} label="Cấp quyền quản trị" color="hover:bg-emerald-500" />
              <ActionButton icon={Calendar} label="Lên lịch sự kiện" color="hover:bg-purple-500" />
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-[32px] border border-orange-200/50">
            <h4 className="text-[10px] font-black text-fpt-orange uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><PieChart size={14} /> Tóm tắt</h4>
            <p className="text-xs font-bold text-gray-600 leading-relaxed italic">"Hệ thống ghi nhận sự gia tăng 20% bài dự thi trong 24h qua."</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

const StatCard = ({ icon: Icon, label, value, color, trend, description, isAlert }) => (
  <Card className={cn(
    "p-0 border-none shadow-2xl shadow-gray-100 rounded-[40px] group relative overflow-hidden transition-all duration-500 hover:-translate-y-2 bg-white",
    isAlert ? 'ring-2 ring-red-100' : ''
  )}>
    <div className="p-8">
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-4 rounded-3xl text-white shadow-xl transition-transform duration-500 group-hover:rotate-12 bg-gradient-to-br", color)}>
          <Icon size={28} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
          <h3 className="text-5xl font-black text-fpt-blue tracking-tighter">{value}</h3>
        </div>
      </div>
      <div className="mt-8 space-y-1 relative z-10">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-black px-2 py-0.5 rounded-lg", isAlert ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600")}>{trend}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{description}</span>
        </div>
      </div>
    </div>
    <Icon className="absolute -bottom-10 -left-10 text-gray-50/50 group-hover:text-gray-100/80 transition-all duration-700 group-hover:scale-110" size={180} strokeWidth={1} />
  </Card>
)

const ActionButton = ({ icon: Icon, label, color }) => (
  <button className={cn(
    "flex items-center gap-4 w-full p-4 rounded-3xl bg-gray-50 transition-all duration-300 group border border-transparent hover:border-white hover:shadow-xl hover:text-white",
    color
  )}>
    <div className="p-3 bg-white rounded-2xl text-gray-400 group-hover:bg-white/20 group-hover:text-white shadow-sm transition-colors">
      <Icon size={20} />
    </div>
    <span className="text-sm font-black uppercase tracking-widest">{label}</span>
  </button>
)
