import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Users, FileText, Send, PieChart, Clock, AlertCircle, ArrowUpRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, publications: 0, submissions: 0, pending_submissions: 0 })
  const [recentSubmissions, setRecentSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      try {
        const [statsRes, subsRes] = await Promise.all([
          axios.get(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/admin/submissions`, { headers: { Authorization: `Bearer ${token}` } })
        ])
        setStats(statsRes.data)
        setRecentSubmissions(subsRes.data.slice(0, 5))
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
        <div className="w-12 h-12 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-fpt-blue uppercase tracking-widest text-xs">Đang tải dữ liệu...</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Thành viên" 
          value={stats.users} 
          color="bg-blue-500" 
          trend="+2 trong tuần này"
        />
        <StatCard 
          icon={FileText} 
          label="Bài viết/Học liệu" 
          value={stats.publications} 
          color="bg-orange-500" 
          trend="Đã xuất bản"
        />
        <StatCard 
          icon={Send} 
          label="Tổng bài thi" 
          value={stats.submissions} 
          color="bg-green-500" 
          trend="Từ sinh viên"
        />
        <StatCard 
          icon={AlertCircle} 
          label="Chờ phê duyệt" 
          value={stats.pending_submissions} 
          color="bg-red-500" 
          trend="Cần xử lý ngay"
          isAlert={stats.pending_submissions > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Submissions Table */}
        <Card className="lg:col-span-2 overflow-hidden border-none shadow-xl shadow-gray-100 rounded-3xl">
          <CardHeader className="flex flex-row justify-between items-center bg-white border-b border-gray-50 p-6 space-y-0">
            <CardTitle className="font-black text-fpt-blue uppercase tracking-tight flex items-center gap-2 text-lg">
              <Clock size={18} className="text-fpt-orange" /> Bài thi mới nhất
            </CardTitle>
            <button className="text-xs font-black text-fpt-blue hover:text-fpt-orange transition-colors uppercase tracking-widest">Xem tất cả</button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sinh viên</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tác phẩm</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</TableHead>
                  <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngày nộp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-50">
                {recentSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-6 py-10 text-center text-gray-400 italic font-medium">Chưa có bài nộp nào</TableCell>
                  </TableRow>
                ) : (
                  recentSubmissions.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-gray-50 transition-colors group border-none">
                      <TableCell className="px-6 py-4">
                        <p className="font-bold text-gray-800 text-sm">{sub.student_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{sub.student_email}</p>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-bold text-gray-600 text-sm">{sub.title}</TableCell>
                      <TableCell className="px-6 py-4">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest border ${
                          sub.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                          sub.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-orange-50 text-fpt-orange border-orange-100'
                        }`}>
                          {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-xs font-bold text-gray-400">
                        {new Date(sub.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions & System Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-gray-100 rounded-3xl bg-fpt-blue text-white relative overflow-hidden group">
            <CardContent className="p-8 relative z-10 space-y-4">
              <h3 className="text-xl font-black italic">HỆ THỐNG AI</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">Ollama: Trực tuyến</span>
              </div>
              <p className="text-xs font-medium opacity-60 leading-relaxed">Mô hình gemma4:31b đang hoạt động ổn định và sẵn sàng hỗ trợ người dùng.</p>
              <button className="pt-2 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all">
                CẤU HÌNH AI <ArrowUpRight size={14} />
              </button>
            </CardContent>
            <PieChart className="absolute -bottom-10 -right-10 text-white/5 group-hover:scale-110 transition-transform" size={200} />
          </Card>

          <Card className="p-8 border-none shadow-xl shadow-gray-100 rounded-3xl bg-white space-y-6">
            <CardTitle className="font-black text-fpt-blue uppercase tracking-tight text-lg">Thao tác nhanh</CardTitle>
            <CardContent className="p-0 grid grid-cols-1 gap-3">
              <button className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-fpt-orange hover:text-white transition-all group">
                <div className="p-2 bg-white rounded-xl text-fpt-orange group-hover:bg-white/20 group-hover:text-white transition-colors">
                  <FileText size={18} />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Viết học liệu mới</span>
              </button>
              <button className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-fpt-blue hover:text-white transition-all group">
                <div className="p-2 bg-white rounded-xl text-fpt-blue group-hover:bg-white/20 group-hover:text-white transition-colors">
                  <Send size={18} />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Duyệt bài nhanh</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ icon: Icon, label, value, color, trend, isAlert }) => (
  <Card className={`p-0 border-none shadow-xl shadow-gray-100 rounded-[32px] group relative overflow-hidden transition-all hover:-translate-y-1 ${isAlert ? 'ring-4 ring-red-100 ring-inset' : ''}`}>
    <CardContent className="p-8">
      <div className="flex justify-between items-start relative z-10">
        <div className={`p-4 rounded-2xl ${color} text-white shadow-lg transition-transform group-hover:rotate-6`}>
          <Icon size={24} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <h3 className="text-4xl font-black text-fpt-blue">{value}</h3>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 relative z-10">
        <span className={`text-[10px] font-black uppercase tracking-widest ${isAlert ? 'text-red-500' : 'text-gray-400'}`}>{trend}</span>
      </div>
    </CardContent>
    <Icon className="absolute -bottom-6 -left-6 text-gray-50 group-hover:text-gray-100/50 transition-colors" size={100} />
  </Card>
)
