import { useState, useEffect } from 'react'
import { Card, Button, cn } from '../components/UI'
import { Send, ThumbsUp, MessageCircle, Edit3, ShieldCheck, PenTool, BookOpen, User, Calendar } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const PhanMonVan = () => {
  const [activeTab, setActiveTab] = useState('sang-tac')
  const [submissionStatus, setSubmissionStatus] = useState(null)
  const [approvedSubmissions, setApprovedSubmissions] = useState([])
  const [loading, setLoading] = useState(false)

  // Form states
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')

  useEffect(() => {
    if (activeTab === 'bai-thi') {
      fetchApprovedSubmissions()
    }
  }, [activeTab])

  const fetchApprovedSubmissions = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/public/submissions`)
      setApprovedSubmissions(response.data)
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendToBGK = async () => {
    if (!title || !content || !studentName || !studentEmail) {
      alert('Vui lòng điền đầy đủ thông tin!')
      return
    }

    setSubmissionStatus('loading')
    try {
      await axios.post(`${API_URL}/public/submissions`, {
        title,
        content,
        student_name: studentName,
        student_email: studentEmail
      })
      setSubmissionStatus('success')
      // Reset form
      setTitle('')
      setContent('')
    } catch (error) {
      console.error('Submission error:', error)
      setSubmissionStatus('error')
    }
  }

  const handleVote = async (id) => {
    try {
      const response = await axios.post(`${API_URL}/public/submissions/${id}/vote`)
      setApprovedSubmissions(prev => prev.map(s => s.id === id ? { ...s, votes: response.data.votes } : s))
    } catch (error) {
      console.error('Vote error:', error)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-12 animate-fadeIn">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-fpt-orange px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest">
          <BookOpen size={14} />
          Ấn phẩm chuyên san
        </div>
        <h1 className="text-5xl font-black text-fpt-blue italic">"NHÁI BÉN"</h1>
        <p className="text-gray-500 font-medium max-w-xl mx-auto">
          Không gian sáng tạo dành riêng cho những tâm hồn yêu văn chương. Nơi những nét bút trẻ được bay bổng và lan tỏa.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center border-b border-gray-100">
        <div className="flex gap-8">
          {[
            { id: 'sang-tac', label: 'TRANG SÁNG TÁC', icon: PenTool },
            { id: 'the-le', label: 'THỂ LỆ', icon: ShieldCheck },
            { id: 'bai-thi', label: 'BÀI DỰ THI', icon: Send },
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-4 font-black text-sm transition-all border-b-4",
                activeTab === tab.id 
                  ? "border-fpt-orange text-fpt-orange translate-y-1" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Sections */}
      <div className="min-h-[400px]">
        {activeTab === 'sang-tac' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <Card className="p-8 border-2 border-orange-50 shadow-xl shadow-orange-50/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-fpt-blue flex items-center gap-2">
                  <Edit3 className="text-fpt-orange" /> SOẠN THẢO TÁC PHẨM
                </h2>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bản nháp tự động lưu</span>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Họ và tên tác giả..." 
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full text-sm font-bold text-gray-800 outline-none border-b-2 border-gray-50 focus:border-fpt-orange transition-colors py-2 bg-transparent"
                  />
                  <input 
                    type="email" 
                    placeholder="Email liên hệ..." 
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="w-full text-sm font-bold text-gray-800 outline-none border-b-2 border-gray-50 focus:border-fpt-orange transition-colors py-2 bg-transparent"
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Tiêu đề tác phẩm..." 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-black text-gray-800 outline-none border-b-2 border-gray-50 focus:border-fpt-orange transition-colors py-2 bg-transparent"
                />
                <textarea 
                  className="w-full h-80 p-0 rounded-lg outline-none bg-white text-gray-700 leading-relaxed resize-none font-medium"
                  placeholder="Hãy để cảm hứng của bạn bắt đầu tại đây..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                ></textarea>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-50 pt-6">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold italic">
                  <ShieldCheck size={14} />
                  Bài dự thi sẽ được gửi trực tiếp đến Ban giám khảo
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button 
                    className="flex-1 sm:flex-none bg-white text-fpt-blue border-2 border-fpt-blue hover:bg-gray-50 px-6 font-black"
                    onClick={() => {setTitle(''); setContent('');}}
                  >XÓA TRỐNG</Button>
                  <Button 
                    onClick={handleSendToBGK}
                    disabled={submissionStatus === 'loading' || submissionStatus === 'success'}
                    className="flex-1 sm:flex-none bg-fpt-orange shadow-lg shadow-orange-200 px-8 font-black flex items-center gap-2"
                  >
                    {submissionStatus === 'loading' ? 'ĐANG GỬI...' : submissionStatus === 'success' ? 'ĐÃ GỬI!' : 'GỬI BÀI THI'}
                    <Send size={18} />
                  </Button>
                </div>
              </div>

              {submissionStatus === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm font-bold flex items-center gap-2 animate-bounce">
                  <ShieldCheck size={18} />
                  Chúc mừng! Bài thi đã được gửi trực tiếp đến Ban giám khảo thành công.
                </div>
              )}
              {submissionStatus === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-bold flex items-center gap-2">
                  <X size={18} />
                  Lỗi: Không thể gửi bài. Vui lòng kiểm tra lại kết nối server.
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'the-le' && (
          <div className="max-w-3xl mx-auto animate-fadeIn">
            <Card className="p-10 border-2 border-fpt-blue/5 shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-black text-fpt-blue mb-8 flex items-center gap-3">
                <ShieldCheck size={32} className="text-fpt-orange" />
                THỂ LỆ "NHÁI BÉN" 2026
              </h2>
              
              <div className="space-y-6 text-gray-600 font-medium leading-relaxed">
                <div className="flex gap-4">
                  <div className="bg-fpt-orange text-white w-8 h-8 rounded-lg flex items-center justify-center font-black flex-shrink-0">01</div>
                  <p>Tác phẩm phải là sáng tác mới, chưa từng công bố trên bất kỳ phương tiện thông tin đại chúng nào.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-fpt-orange text-white w-8 h-8 rounded-lg flex items-center justify-center font-black flex-shrink-0">02</div>
                  <p>Chủ đề năm nay: <span className="text-fpt-blue font-black uppercase">"Nhịp đập số - Khát vọng vươn tầm"</span>.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-fpt-orange text-white w-8 h-8 rounded-lg flex items-center justify-center font-black flex-shrink-0">03</div>
                  <p>Thể loại: Truyện ngắn (tối đa 3000 chữ), Tản văn, Thơ.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-fpt-orange text-white w-8 h-8 rounded-lg flex items-center justify-center font-black flex-shrink-0">04</div>
                  <p>Đối tượng tham gia: Toàn thể học sinh, sinh viên yêu văn chương.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'bai-thi' && (
          <div className="space-y-8 animate-fadeIn">
            {loading ? (
              <div className="text-center py-20 font-black text-fpt-blue animate-pulse uppercase tracking-[0.2em]">Đang tải bài dự thi...</div>
            ) : approvedSubmissions.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest">Chưa có bài dự thi nào được phê duyệt.</p>
                <p className="text-xs text-gray-400 mt-2 font-medium">Hãy là người đầu tiên gửi bài sáng tác!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {approvedSubmissions.map((sub) => (
                  <Card key={sub.id} className="group hover:shadow-2xl transition-all duration-300 border-none bg-gray-50/50 p-6 overflow-hidden flex flex-col">
                    <div className="bg-fpt-blue/5 h-40 rounded-2xl mb-6 flex items-center justify-center text-fpt-blue/20 relative group-hover:bg-fpt-orange/5 transition-colors">
                      <BookOpen size={64} />
                      <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black text-fpt-blue border border-fpt-blue/10">
                        BÀI DỰ THI #{sub.id}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-black text-fpt-blue mb-1 group-hover:text-fpt-orange transition-colors line-clamp-1">{sub.title}</h3>
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-tighter mb-4">
                      <User size={12} /> {sub.student_name}
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <Calendar size={12} /> {new Date(sub.created_at).toLocaleDateString('vi-VN')}
                    </div>
                    
                    <p className="text-gray-500 text-sm font-medium mb-6 flex-1 line-clamp-3 leading-relaxed italic">
                      "{sub.content}"
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                      <div className="flex gap-4">
                        <button 
                          onClick={() => handleVote(sub.id)}
                          className="flex items-center gap-1.5 text-gray-400 hover:text-fpt-orange transition-colors group/vote"
                        >
                          <ThumbsUp size={18} className="group-active/vote:scale-125 transition-transform" />
                          <span className="text-xs font-black">{sub.votes}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-gray-400 hover:text-fpt-blue transition-colors">
                          <MessageCircle size={18} />
                          <span className="text-xs font-black">0</span>
                        </button>
                      </div>
                      <Button className="bg-fpt-blue text-white px-4 py-1.5 text-xs font-black rounded-lg">CHI TIẾT</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
