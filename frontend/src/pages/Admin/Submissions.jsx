import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, Button, cn } from '../../components/UI'
import { CheckCircle, XCircle, Clock, Eye, Search, Filter, User, Mail, Calendar, Trash2, ArrowUpRight, MessageSquare, Sparkles } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const AdminSubmissions = () => {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, approved, rejected
  const [selectedSub, setSelectedSub] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchSubs()
  }, [])

  const fetchSubs = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSubs(res.data)
    } catch (err) {
      console.error('Error fetching subs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/admin/submissions/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchSubs()
      if (selectedSub?.id === id) {
        setSelectedSub({...selectedSub, status})
      }
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái')
    }
  }

  const filteredSubs = subs.filter((sub) => {
    const studentName = (sub.student_name || '').toLowerCase()
    const title = (sub.title || '').toLowerCase()
    const query = searchTerm.toLowerCase()
    const matchesFilter = filter === 'all' || sub.status === filter
    const matchesSearch = studentName.includes(query) || title.includes(query)
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-8 animate-fadeIn h-[calc(100vh-160px)] flex flex-col pb-10">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[40px] shadow-2xl shadow-gray-100/50 border border-gray-50">
        <div className="flex gap-3 p-2 bg-gray-50 rounded-[24px]">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f 
                  ? "bg-fpt-blue text-white shadow-xl shadow-blue-100" 
                  : "text-gray-400 hover:text-fpt-blue hover:bg-white"
              )}
            >
              {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : 'Từ chối'}
            </button>
          ))}
        </div>
        
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm theo tên hoặc tiêu đề..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-fpt-orange/20 font-bold text-sm shadow-inner"
          />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        {/* List Side */}
        <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-20 bg-white rounded-[40px] shadow-lg">
              <div className="w-12 h-12 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-black text-fpt-blue uppercase tracking-widest text-[10px]">Đang quét bài dự thi...</p>
            </div>
          ) : filteredSubs.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-gray-50">
              <Clock size={64} className="mx-auto text-gray-100 mb-6" />
              <p className="text-gray-300 font-black uppercase tracking-widest text-sm">Danh sách trống</p>
            </div>
          ) : (
            filteredSubs.map((sub) => {
              const studentName = sub.student_name || 'Ẩn danh'
              const studentEmail = sub.student_email || 'Không có email'

              return (
              <Card 
                key={sub.id} 
                onClick={() => setSelectedSub(sub)}
                className={cn(
                  "p-8 border-none shadow-xl cursor-pointer transition-all duration-500 rounded-[40px] group relative overflow-hidden",
                  selectedSub?.id === sub.id ? "bg-fpt-blue text-white ring-4 ring-blue-50" : "bg-white hover:bg-orange-50/30"
                )}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-inner transition-colors",
                      selectedSub?.id === sub.id ? "bg-white/20 text-white" : "bg-gray-50 text-gray-400 group-hover:bg-white"
                    )}>
                      {studentName.charAt(0)}
                    </div>
                    <div>
                      <h4 className={cn("font-black text-sm uppercase tracking-tight", selectedSub?.id === sub.id ? "text-white" : "text-fpt-blue")}>{studentName}</h4>
                      <p className={cn("text-[9px] font-bold uppercase tracking-[0.2em]", selectedSub?.id === sub.id ? "text-white/60" : "text-gray-400")}>{studentEmail}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border shadow-sm",
                    sub.status === 'approved' ? 'bg-green-500 border-green-400 text-white' :
                    sub.status === 'rejected' ? 'bg-red-500 border-red-400 text-white' :
                    'bg-orange-500 border-orange-400 text-white'
                  )}>
                    {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Mới'}
                  </span>
                </div>
                <h3 className={cn("font-black text-lg mb-2 truncate italic", selectedSub?.id === sub.id ? "text-white" : "text-gray-700")}>"{sub.title}"</h3>
                <p className={cn("text-xs line-clamp-2 leading-relaxed opacity-70", selectedSub?.id === sub.id ? "text-blue-50" : "text-gray-400")}>{sub.content || 'Không có nội dung'}</p>
                
                {selectedSub?.id === sub.id && (
                  <div className="absolute top-0 right-0 w-24 h-full bg-white/5 opacity-10 skew-x-12 translate-x-12"></div>
                )}
              </Card>
              )
            })
          )}
        </div>

        {/* Detail Side */}
        <div className="lg:col-span-7 h-full">
          {selectedSub ? (
            <Card className="h-full border-none shadow-[0_30px_100px_-20px_rgba(0,0,0,0.2)] rounded-[60px] bg-white flex flex-col overflow-hidden animate-fadeInRight border border-gray-50">
              <div className="p-10 border-b border-gray-50 bg-gray-50/30 relative">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                  <Sparkles size={120} className="text-fpt-blue" />
                </div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="space-y-2">
                    <span className="bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-orange-100">Bài dự thi #{selectedSub.id}</span>
                    <h2 className="text-4xl font-black text-fpt-blue italic leading-tight uppercase tracking-tighter max-w-2xl">{selectedSub.title}</h2>
                  </div>
                  <button onClick={() => setSelectedSub(null)} className="p-3 bg-white text-gray-300 hover:text-red-500 rounded-full shadow-sm transition-all hover:rotate-90">
                    <XCircle size={32} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                  <DetailBadge icon={User} label="Tác giả" value={selectedSub.student_name} color="text-fpt-orange" />
                  <DetailBadge icon={Mail} label="Email" value={selectedSub.student_email} color="text-fpt-blue" />
                  <DetailBadge icon={Calendar} label="Ngày gửi" value={new Date(selectedSub.created_at).toLocaleDateString('vi-VN')} color="text-emerald-500" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar relative">
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-600 font-medium leading-[2] whitespace-pre-wrap italic bg-gray-50/50 p-8 rounded-[40px] border border-gray-100 shadow-inner">
                    <MessageSquare className="text-orange-200 mb-4" size={40} />
                    {selectedSub.content}
                  </p>
                </div>
              </div>

              <div className="p-10 bg-white border-t border-gray-100 flex gap-6">
                <button 
                  onClick={() => handleUpdateStatus(selectedSub.id, 'rejected')}
                  disabled={selectedSub.status === 'rejected'}
                  className="flex-1 bg-white border-4 border-red-50 text-red-500 py-6 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
                >
                  <XCircle size={24} /> TỪ CHỐI BÀI
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedSub.id, 'approved')}
                  disabled={selectedSub.status === 'approved'}
                  className="flex-[2] bg-fpt-blue text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale border-none"
                >
                  <CheckCircle size={24} strokeWidth={3} /> PHÊ DUYỆT NGAY
                </button>
              </div>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 bg-white/50 rounded-[60px] border-4 border-dashed border-gray-50 p-20 animate-pulse">
              <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center">
                <Eye size={64} className="text-gray-200" strokeWidth={1} />
              </div>
              <div className="space-y-2">
                <p className="font-black uppercase tracking-[0.4em] text-gray-300 text-lg italic">Trung tâm kiểm duyệt</p>
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Vui lòng chọn một bản thảo để bắt đầu thẩm định</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const DetailBadge = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-4 bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm">
    <div className={cn("p-3 bg-gray-50 rounded-xl", color)}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-fpt-blue truncate">{value}</p>
    </div>
  </div>
)
