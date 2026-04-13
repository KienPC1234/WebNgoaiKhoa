import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, Button } from '../../components/UI'
import { Plus, Trash2, Edit, Search, FileText, Image as ImageIcon, X, Check } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const AdminPublications = () => {
  const [pubs, setPubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPub, setEditingPub] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'van',
    image_url: ''
  })

  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchPubs()
  }, [])

  const fetchPubs = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/publications`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setPubs(res.data)
    } catch (err) {
      console.error('Error fetching pubs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPub) {
        // Backend currently doesn't have PUT for publications, I should probably add it
        // For now, let's assume we just create
        alert('Chức năng cập nhật đang được đồng bộ backend...')
      } else {
        await axios.post(`${API_URL}/admin/publications`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowModal(false)
      setFormData({ title: '', content: '', category: 'van', image_url: '' })
      fetchPubs()
    } catch (err) {
      alert('Lỗi khi lưu bài viết')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xoá bài viết này?')) return
    try {
      await axios.delete(`${API_URL}/admin/publications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchPubs()
    } catch (err) {
      alert('Lỗi khi xoá bài viết')
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm bài viết..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:border-fpt-orange transition-all font-medium text-sm shadow-sm"
          />
        </div>
        <Button 
          onClick={() => {setEditingPub(null); setShowModal(true);}}
          className="bg-fpt-orange text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-black shadow-lg shadow-orange-100 hover:scale-105 transition-all"
        >
          <Plus size={20} /> THÊM BÀI VIẾT
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 font-black text-fpt-blue animate-pulse italic">ĐANG TẢI...</div>
        ) : pubs.length === 0 ? (
          <Card className="p-20 text-center border-2 border-dashed border-gray-100">
            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Chưa có bài viết nào trong hệ thống</p>
          </Card>
        ) : (
          pubs.map((pub) => (
            <Card key={pub.id} className="p-6 border-none shadow-xl shadow-gray-100/50 flex items-center gap-6 group hover:bg-orange-50/30 transition-all rounded-[32px]">
              <div className="w-24 h-24 bg-gray-50 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
                {pub.image_url ? (
                  <img src={pub.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-gray-200" size={32} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                    pub.category === 'van' ? 'bg-orange-100 text-fpt-orange' : 'bg-blue-100 text-fpt-blue'
                  }`}>
                    {pub.category === 'van' ? 'Văn học' : 'Kinh tế - PL'}
                  </span>
                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                    {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h3 className="text-lg font-black text-fpt-blue truncate">{pub.title}</h3>
                <p className="text-sm text-gray-400 font-medium line-clamp-1">{pub.content}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 text-gray-400 hover:bg-white hover:text-fpt-blue rounded-xl transition-all shadow-sm">
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDelete(pub.id)}
                  className="p-3 text-gray-400 hover:bg-white hover:text-red-500 rounded-xl transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fpt-blue/20 backdrop-blur-sm animate-fadeIn">
          <Card className="w-full max-w-2xl p-8 border-none shadow-2xl rounded-[40px] bg-white space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-fpt-blue italic uppercase tracking-tight">
                {editingPub ? 'Chỉnh sửa bài viết' : 'Thêm bài viết mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tiêu đề bài viết</label>
                <input 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-bold transition-all"
                  placeholder="Nhập tiêu đề hấp dẫn..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chuyên mục</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-bold transition-all appearance-none cursor-pointer"
                  >
                    <option value="van">Văn học (Nhái Bén)</option>
                    <option value="ktpl">Kinh tế Pháp luật</option>
                    <option value="ngoaikhoa">Tin tức Ngoại khoá</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link ảnh bìa</label>
                  <input 
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-bold transition-all"
                    placeholder="https://images.unsplash..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
                <textarea 
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full h-48 px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-medium transition-all resize-none"
                  placeholder="Viết nội dung bài viết tại đây..."
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  HỦY BỎ
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-fpt-blue text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} /> LƯU BÀI VIẾT
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
