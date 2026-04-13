import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card } from '../../components/UI'
import { CheckCircle, XCircle, Clock, Eye, Search, Filter, User, Mail, Calendar } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const AdminSubmissions = () => {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, approved, rejected
  const [selectedSub, setSelectedSub] = useState(null)

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchSubs()
  }, [])

  const fetchSubs = async () => {
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
      await axios.put(`${API_URL}/admin/submissions/${id}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchSubs()
      if (selectedSub?.id === id) setSelectedSub(null)
    } catch (err) {
      alert('Lỗi khi cập nhật trạng thái')
    }
  }

  const filteredSubs = subs.filter(sub => filter === 'all' || sub.status === filter)

  return (
    <div className="space-y-8 animate-fadeIn h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-fpt-blue text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Tất cả' : f === 'pending' ? 'Chờ duyệt' : f === 'approved' ? 'Đã duyệt' : 'Từ chối'}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm tên sinh viên..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl outline-none focus:border-fpt-orange text-xs font-bold"
          />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden">
        {/* List */}
        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="text-center py-20 font-black text-fpt-blue animate-pulse italic">ĐANG TẢI...</div>
          ) : filteredSubs.length === 0 ? (
            <Card className="p-20 text-center border-2 border-dashed border-gray-100">
              <Clock size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Không có bài nộp nào</p>
            </Card>
          ) : (
            filteredSubs.map((sub) => (
              <Card 
                key={sub.id} 
                onClick={() => setSelectedSub(sub)}
                className={`p-6 border-none shadow-xl cursor-pointer transition-all rounded-[32px] group ${
                  selectedSub?.id === sub.id ? 'bg-blue-50/50 ring-2 ring-fpt-blue' : 'bg-white hover:bg-gray-50/50'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white transition-colors">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-fpt-blue text-sm">{sub.student_name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sub.student_email}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border ${
                    sub.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                    sub.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-orange-50 text-fpt-orange border-orange-100'
                  }`}>
                    {sub.status === 'approved' ? 'Đã duyệt' : sub.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                  </span>
                </div>
                <h3 className="font-bold text-gray-700 text-base mb-2 line-clamp-1">{sub.title}</h3>
                <p className="text-xs text-gray-400 line-clamp-2 italic leading-relaxed">"{sub.content}"</p>
              </Card>
            ))
          )}
        </div>

        {/* Detail View */}
        <div className="h-full">
          {selectedSub ? (
            <Card className="h-full border-none shadow-2xl rounded-[40px] bg-white flex flex-col overflow-hidden animate-fadeInRight">
              <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-black text-fpt-blue italic leading-tight uppercase tracking-tight pr-8">{selectedSub.title}</h2>
                  <button onClick={() => setSelectedSub(null)} className="text-gray-300 hover:text-gray-500 transition-colors">
                    <XCircle size={24} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100">
                    <User size={16} className="text-fpt-orange" />
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tác giả</p>
                      <p className="text-xs font-black text-fpt-blue">{selectedSub.student_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100">
                    <Calendar size={16} className="text-fpt-blue" />
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ngày nộp</p>
                      <p className="text-xs font-black text-fpt-blue">{new Date(selectedSub.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600 font-medium leading-[1.8] whitespace-pre-wrap italic">
                    {selectedSub.content}
                  </p>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => handleUpdateStatus(selectedSub.id, 'rejected')}
                  className="flex-1 bg-white border-2 border-red-100 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle size={20} /> TỪ CHỐI
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedSub.id, 'approved')}
                  className="flex-1 bg-fpt-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} /> PHÊ DUYỆT
                </button>
              </div>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-gray-300">
              <Eye size={64} strokeWidth={1} />
              <p className="font-black uppercase tracking-[0.2em] text-sm">Chọn một bài thi để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
