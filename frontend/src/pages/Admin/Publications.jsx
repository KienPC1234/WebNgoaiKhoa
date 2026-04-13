import { useState, useEffect } from 'react'
import axios from 'axios'
import { Card, Button } from '../../components/UI'
import { Plus, Trash2, Edit, Search, FileText, Image as ImageIcon, X, Check, Newspaper, Calendar, ArrowRight, ExternalLink } from 'lucide-react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'

const API_URL = import.meta.env.VITE_API_URL || '/api'

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
    setLoading(true)
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
        await axios.put(`${API_URL}/admin/publications/${editingPub.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await axios.post(`${API_URL}/admin/publications`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setShowModal(false)
      setFormData({ title: '', content: '', category: 'van', image_url: '' })
      setEditingPub(null)
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
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[40px] shadow-2xl shadow-gray-100/50 border border-gray-50">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-fpt-blue italic uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl text-fpt-orange"><Newspaper size={28} /></div>
            QUẢN LÝ NỘI DUNG
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-12">Bài viết & Học liệu trên hệ thống</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm nội dung..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-fpt-orange/20 transition-all font-bold text-sm"
            />
          </div>
          <Button 
            onClick={() => {setEditingPub(null); setFormData({title: '', content: '', category: 'van', image_url: ''}); setShowModal(true);}}
            className="bg-fpt-orange hover:bg-orange-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl shadow-orange-100 hover:scale-105 transition-all border-none"
          >
            <Plus size={20} /> THÊM MỚI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-32 bg-white rounded-[40px] shadow-xl shadow-gray-100/50">
             <div className="w-16 h-16 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
             <p className="font-black text-fpt-blue uppercase tracking-[0.2em] animate-pulse">Đang đồng bộ hóa bài viết...</p>
          </div>
        ) : pubs.length === 0 ? (
          <Card className="p-32 text-center border-4 border-dashed border-gray-100 rounded-[60px] bg-white">
            <FileText size={80} className="mx-auto text-gray-100 mb-8" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-xl">Kho lưu trữ đang trống</p>
            <Button 
              onClick={() => setShowModal(true)}
              className="mt-8 bg-fpt-blue text-white font-black px-10 py-4 rounded-2xl"
            >BẮT ĐẦU VIẾT BÀI ĐẦU TIÊN</Button>
          </Card>
        ) : (
          pubs.map((pub) => (
            <Card key={pub.id} className="p-8 border-none shadow-xl shadow-gray-100/50 flex flex-col md:flex-row items-center gap-8 group hover:bg-orange-50/20 transition-all rounded-[48px] bg-white border border-transparent hover:border-orange-100">
              <div className="w-full md:w-48 h-48 bg-gray-50 rounded-[32px] flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-gray-50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                {pub.image_url ? (
                  <img src={pub.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-gray-200" size={48} />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
                    pub.category === 'van' ? 'bg-orange-500 text-white' : 
                    pub.category === 'ktpl' ? 'bg-blue-500 text-white' :
                    'bg-emerald-500 text-white'
                  }`}>
                    {pub.category === 'van' ? 'Văn học (Nhái Bén)' : pub.category === 'ktpl' ? 'Kinh tế Pháp luật' : 'Tin tức'}
                  </span>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-fpt-blue group-hover:text-fpt-orange transition-colors truncate">{pub.title}</h3>
                <div className="text-gray-500 text-sm font-medium line-clamp-2 prose-sm leading-relaxed" dangerouslySetInnerHTML={{__html: pub.content.substring(0, 300)}}></div>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-fpt-blue">
                    <ArrowRight size={14} />
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Đã hiển thị trên giao diện người dùng</span>
                </div>
              </div>
              <div className="flex md:flex-col items-center gap-3 w-full md:w-auto">
                <button 
                    onClick={() => {setEditingPub(pub); setFormData({title: pub.title, content: pub.content, category: pub.category, image_url: pub.image_url || ''}); setShowModal(true);}}
                    className="flex-1 md:flex-none p-5 text-gray-400 bg-gray-50 hover:bg-fpt-blue hover:text-white rounded-2xl transition-all shadow-sm group/btn"
                >
                  <Edit size={22} className="group-hover/btn:rotate-12 transition-transform" />
                </button>
                <button 
                  onClick={() => handleDelete(pub.id)}
                  className="flex-1 md:flex-none p-5 text-gray-400 bg-gray-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm group/btn"
                >
                  <Trash2 size={22} className="group-hover/btn:scale-110 transition-transform" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-fpt-blue/40 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-6xl p-0 border-none shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] rounded-[60px] bg-white overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-gradient-to-r from-fpt-blue to-blue-800 p-10 flex justify-between items-center text-white shrink-0 relative">
              <div className="absolute top-0 right-0 w-64 h-full bg-white opacity-5 skew-x-12 translate-x-32"></div>
              <div className="relative z-10 space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                  {editingPub ? <div className="p-2 bg-white/20 rounded-xl"><Edit size={28} /></div> : <div className="p-2 bg-white/20 rounded-xl"><Plus size={28} /></div>}
                  {editingPub ? 'Hiệu chỉnh tác phẩm' : 'Sáng tạo nội dung mới'}
                </h2>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.3em]">Hệ thống xuất bản FPT WebNgoaiKhoa v2.0</p>
              </div>
              <button onClick={() => setShowModal(false)} className="relative z-10 p-4 hover:bg-white/10 rounded-full transition-all group">
                <X size={32} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-10">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                          <Check size={12} className="text-fpt-orange" /> Tiêu đề bài viết
                        </label>
                        <input 
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-8 py-6 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-[32px] outline-none font-black transition-all text-2xl shadow-inner"
                        placeholder="Nhập tiêu đề thu hút người đọc..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                          <Check size={12} className="text-fpt-orange" /> Nội dung chi tiết
                        </label>
                        <div className="rounded-[32px] overflow-hidden border-2 border-gray-50 focus-within:border-fpt-orange transition-all shadow-inner">
                            <CKEditor
                                editor={ ClassicEditor }
                                data={formData.content}
                                onChange={ ( event, editor ) => {
                                    const data = editor.getData();
                                    setFormData({...formData, content: data});
                                } }
                                config={{
                                    placeholder: 'Bắt đầu viết những điều tuyệt vời tại đây...',
                                    toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'insertTable', 'undo', 'redo' ]
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Chuyên mục xuất bản</label>
                        <select 
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-black transition-all appearance-none cursor-pointer shadow-inner text-fpt-blue uppercase text-xs tracking-widest"
                        >
                            <option value="van">Văn học (Nhái Bén)</option>
                            <option value="ktpl">Kinh tế Pháp luật</option>
                            <option value="ngoaikhoa">Tin tức Ngoại khoá</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Ảnh bìa (URL)</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                          <input 
                              value={formData.image_url}
                              onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                              className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-bold transition-all text-xs shadow-inner"
                              placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                        {formData.image_url && (
                            <div className="mt-6 rounded-[32px] overflow-hidden border-4 border-white shadow-2xl aspect-video relative group/preview">
                                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                  <ExternalLink size={32} className="text-white" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-gradient-to-br from-orange-50 to-orange-100 rounded-[40px] border border-orange-200/50 space-y-4 shadow-inner">
                        <h4 className="text-xs font-black text-fpt-orange uppercase tracking-[0.2em] flex items-center gap-2">
                            <Zap size={16} fill="currentColor" /> Metadata
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            <span>Ký tự</span>
                            <span className="text-fpt-blue">{formData.content.length}</span>
                          </div>
                          <div className="h-1 w-full bg-white/50 rounded-full overflow-hidden">
                            <div className="h-full bg-fpt-orange w-1/2"></div>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed italic mt-4">
                            "Nội dung sẽ được tối ưu hóa cho SEO và hiển thị tốt nhất trên thiết bị di động."
                          </p>
                        </div>
                    </div>
                </div>
              </div>

              <div className="flex gap-6 pt-10 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-6 font-black uppercase tracking-[0.3em] text-gray-400 hover:text-red-500 transition-all bg-gray-50 hover:bg-red-50 rounded-3xl"
                >
                  HỦY BỎ
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-fpt-blue text-white py-6 rounded-3xl font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 border-none"
                >
                  <Check size={24} strokeWidth={3} /> {editingPub ? 'CẬP NHẬT THAY ĐỔI' : 'XUẤT BẢN NGAY'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
