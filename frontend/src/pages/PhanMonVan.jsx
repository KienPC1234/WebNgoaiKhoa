import { useState, useEffect } from 'react'
import { Card, Button, cn } from '../components/UI'
import { Send, ThumbsUp, MessageCircle, Edit3, ShieldCheck, PenTool, BookOpen, User, Calendar, X, Sparkles } from 'lucide-react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import { useRef } from 'react'
import { showApiError, toastError, toastInfo, toastSuccess } from '@/lib/notify'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''

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
  const navigate = useNavigate()
  const recaptchaRef = useRef(null)

  const token = localStorage.getItem('token')

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
    if (!token) {
      toastInfo('Vui lòng đăng nhập để gửi bài thi.')
      navigate('/login')
      return
    }

    if (!title || !content || !studentName || !studentEmail) {
      toastError('Vui lòng điền đầy đủ thông tin.')
      return
    }

    setSubmissionStatus('loading')
    try {
      let recaptchaToken = null
      if (RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        recaptchaToken = await recaptchaRef.current.executeAsync()
        recaptchaRef.current.reset()
      }

      await axios.post(`${API_URL}/public/submissions`, {
        title,
        content,
        student_name: studentName,
        student_email: studentEmail,
        recaptcha_token: recaptchaToken,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSubmissionStatus('success')
      setTitle('')
      setContent('')
      toastSuccess('Đã gửi bài thi thành công.')
    } catch (error) {
      console.error('Submission error:', error)
      setSubmissionStatus('error')
      showApiError(error, 'Gửi bài thi thất bại.')
    }
  }

  const handleVote = async (id) => {
    if (!token) {
      toastInfo('Vui lòng đăng nhập để bình chọn bài thi.')
      navigate('/login')
      return
    }

    try {
      let recaptchaToken = null
      if (RECAPTCHA_SITE_KEY && recaptchaRef.current) {
        recaptchaToken = await recaptchaRef.current.executeAsync()
        recaptchaRef.current.reset()
      }

      const response = await axios.post(`${API_URL}/public/submissions/${id}/vote`, {
        recaptcha_token: recaptchaToken,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setApprovedSubmissions(prev => prev.map(s => s.id === id ? { ...s, votes: response.data.votes } : s))
      toastSuccess('Đã bình chọn thành công.')
    } catch (error) {
      console.error('Vote error:', error)
      showApiError(error, 'Bình chọn thất bại.')
    }
  }

  return (
    <div className="min-h-screen bg-orange-50/30">
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-orange-400 via-fpt-orange to-red-500 py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10" data-aos="zoom-in">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-xl border border-white/30">
            <BookOpen size={16} />
            Ấn phẩm chuyên san
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic drop-shadow-lg">"NHÁI BÉN"</h1>
          <p className="text-orange-50 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
            Không gian sáng tạo dành riêng cho những tâm hồn yêu văn chương. Nơi nét bút trẻ được bay bổng, tôn vinh và lan tỏa.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-12 -mt-10 relative z-20">
        {/* Tabs Navigation */}
        <div className="flex justify-center mb-12" data-aos="fade-up">
          <div className="flex gap-4 p-2 bg-white rounded-full shadow-xl border border-gray-100">
            {[
              { id: 'sang-tac', label: 'SÁNG TÁC', icon: PenTool },
              { id: 'the-le', label: 'THỂ LỆ', icon: ShieldCheck },
              { id: 'bai-thi', label: 'BÀI DỰ THI', icon: Send },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-full font-black text-sm transition-all",
                  activeTab === tab.id 
                    ? "bg-gradient-to-r from-fpt-orange to-orange-500 text-white shadow-lg shadow-orange-200/50" 
                    : "bg-transparent text-gray-500 hover:bg-orange-50 hover:text-fpt-orange"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        <div className="min-h-[500px]">
          {activeTab === 'sang-tac' && (
            <div className="max-w-4xl mx-auto" data-aos="fade-up">
              <Card className="p-10 border-0 shadow-2xl rounded-[40px] bg-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-fpt-orange to-orange-400"></div>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-fpt-blue flex items-center gap-3">
                    <div className="p-3 bg-orange-50 rounded-2xl text-fpt-orange"><Edit3 size={24} /></div>
                    SOẠN THẢO TÁC PHẨM
                  </h2>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">Bản nháp tự động lưu</span>
                </div>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Họ và tên tác giả</label>
                      <input 
                        type="text" 
                        placeholder="Nguyễn Văn A..." 
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-bold transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email liên hệ (Email trường)</label>
                      <input 
                        type="email" 
                        placeholder="anv@fpt.edu.vn..." 
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-bold transition-all text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tên tác phẩm</label>
                    <input 
                      type="text" 
                      placeholder="Tiêu đề tác phẩm..." 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-2xl outline-none font-black transition-all text-xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nội dung sáng tác</label>
                    <textarea 
                      className="w-full h-96 px-6 py-6 bg-gray-50 border-2 border-transparent focus:border-fpt-orange focus:bg-white rounded-3xl outline-none text-gray-700 leading-relaxed resize-none font-medium custom-scrollbar transition-all"
                      placeholder="Hãy để cảm hứng của bạn bắt đầu tại đây..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-fpt-blue text-xs font-bold bg-blue-50 px-4 py-2 rounded-xl">
                    <ShieldCheck size={16} className="text-fpt-orange" />
                    Tác phẩm sẽ được mã hóa và gửi trực tiếp tới Ban Giám Khảo
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                    <Button 
                      className="flex-1 md:flex-none bg-white text-gray-500 border-2 border-gray-200 hover:bg-gray-50 hover:text-fpt-blue hover:border-fpt-blue px-8 font-black"
                      onClick={() => {setTitle(''); setContent('');}}
                    >XÓA TRỐNG</Button>
                    <Button 
                      onClick={handleSendToBGK}
                      disabled={submissionStatus === 'loading' || submissionStatus === 'success'}
                      className="flex-1 md:flex-none bg-gradient-to-r from-fpt-orange to-orange-500 hover:from-orange-500 hover:to-orange-600 shadow-[0_10px_30px_-10px_rgba(242,112,36,0.6)] px-10 font-black flex items-center gap-2 border-none"
                    >
                      {submissionStatus === 'loading' ? 'ĐANG XỬ LÝ...' : submissionStatus === 'success' ? 'THÀNH CÔNG!' : 'GỬI BÀI THI'}
                      <Sparkles size={18} />
                    </Button>
                  </div>
                </div>

                {submissionStatus === 'success' && (
                  <div className="mt-6 p-5 bg-green-50 border-2 border-green-100 rounded-2xl text-green-700 text-sm font-black flex items-center gap-3 animate-bounce">
                    <div className="bg-green-100 p-2 rounded-full"><ShieldCheck size={20} /></div>
                    Tuyệt vời! Tác phẩm của bạn đã nằm trên bàn của Ban Giám Khảo. Hãy theo dõi thông báo nhé.
                  </div>
                )}
                {submissionStatus === 'error' && (
                  <div className="mt-6 p-5 bg-red-50 border-2 border-red-100 rounded-2xl text-red-700 text-sm font-black flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-full"><X size={20} /></div>
                    Ối! Có lỗi xảy ra trong quá trình gửi. Vui lòng kiểm tra lại kết nối mạng.
                  </div>
                )}
                {RECAPTCHA_SITE_KEY && <ReCAPTCHA ref={recaptchaRef} size="invisible" sitekey={RECAPTCHA_SITE_KEY} />}
              </Card>
            </div>
          )}

          {activeTab === 'the-le' && (
            <div className="max-w-4xl mx-auto" data-aos="zoom-in">
              <Card className="p-12 border-0 shadow-2xl rounded-[40px] bg-white relative overflow-hidden">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-fpt-orange opacity-5 rounded-full"></div>
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-fpt-blue opacity-5 rounded-full"></div>
                
                <div className="relative z-10">
                  <h2 className="text-4xl font-black text-fpt-blue mb-10 flex items-center gap-4 border-b-4 border-orange-100 pb-6 inline-flex italic uppercase tracking-tighter">
                    <div className="p-3 bg-gradient-to-br from-fpt-orange to-orange-400 rounded-2xl text-white shadow-lg"><ShieldCheck size={32} /></div>
                    THỂ LỆ "NHÁI BÉN" 2026
                  </h2>
                  
                  <div className="space-y-8 text-gray-700 font-medium leading-relaxed text-lg">
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">01</div>
                      <p className="pt-2">Tác phẩm tham gia phải là <span className="font-black text-fpt-blue">sáng tác mới 100%</span>, chưa từng công bố trên bất kỳ phương tiện thông tin đại chúng hay mạng xã hội nào.</p>
                    </div>
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">02</div>
                      <p className="pt-2">Chủ đề xuyên suốt năm nay: <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpt-orange to-red-500 font-black uppercase text-2xl ml-2">"Nhịp đập số - Khát vọng vươn tầm"</span>.</p>
                    </div>
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">03</div>
                      <div>
                        <p className="pt-2 font-black text-fpt-blue">Thể loại được chấp nhận:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1 text-gray-500">
                          <li>Truyện ngắn (tối đa 3000 chữ)</li>
                          <li>Tản văn, Ghi chép (tối đa 1500 chữ)</li>
                          <li>Thơ tự do, Thơ có luật</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex gap-6 items-start group">
                      <div className="bg-orange-50 text-fpt-orange w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 group-hover:bg-fpt-orange group-hover:text-white transition-colors shadow-sm">04</div>
                      <p className="pt-2">Đối tượng tham gia mở rộng cho <span className="font-black text-fpt-blue">toàn thể học sinh, sinh viên</span> trong hệ thống giáo dục FPT yêu thích văn chương.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'bai-thi' && (
            <div className="space-y-8" data-aos="fade-up">
              {loading ? (
                <div className="text-center py-32">
                  <div className="w-16 h-16 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
                  <p className="font-black text-fpt-blue uppercase tracking-[0.2em] animate-pulse">Đang tải Thư viện Tác phẩm...</p>
                </div>
              ) : approvedSubmissions.length === 0 ? (
                <div className="max-w-2xl mx-auto text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-orange-100 shadow-xl shadow-orange-50">
                  <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen size={40} className="text-fpt-orange" />
                  </div>
                  <h3 className="text-2xl font-black text-fpt-blue mb-2 uppercase tracking-tighter">Kho tàng đang chờ mở</h3>
                  <p className="text-gray-500 font-medium">Chưa có tác phẩm nào được công bố. Hãy là ngòi bút đầu tiên khai bút!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {approvedSubmissions.map((sub, idx) => (
                    <Card key={sub.id} data-aos="fade-up" data-aos-delay={idx * 100} className="group hover:shadow-[0_20px_50px_-15px_rgba(242,112,36,0.3)] transition-all duration-500 border-none bg-white p-0 overflow-hidden flex flex-col rounded-[32px] hover:-translate-y-2">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 h-48 flex flex-col items-center justify-center relative overflow-hidden p-6 border-b border-orange-200/50">
                        <div className="absolute top-4 left-4 bg-white px-3 py-1.5 rounded-lg text-[10px] font-black text-fpt-orange shadow-sm uppercase tracking-widest border border-orange-100">
                          MS: {sub.id.toString().padStart(4, '0')}
                        </div>
                        <BookOpen size={48} className="text-fpt-orange/40 group-hover:scale-110 group-hover:text-fpt-orange transition-all duration-500" />
                      </div>
                      
                      <div className="p-8 flex-1 flex flex-col relative bg-white">
                        <h3 className="text-2xl font-black text-gray-800 mb-4 group-hover:text-fpt-orange transition-colors line-clamp-2 leading-snug">{sub.title}</h3>
                        
                        <p className="text-gray-500 text-sm font-medium mb-8 flex-1 line-clamp-4 leading-relaxed prose-sm">
                          {sub.content}
                        </p>

                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="flex items-center gap-2"><User size={14} className="text-fpt-blue" /> {sub.student_name}</span>
                            <span className="flex items-center gap-2"><Calendar size={14} className="text-fpt-orange" /> {new Date(sub.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                          
                          <div className="flex items-center justify-between pt-2">
                            <button 
                              onClick={() => handleVote(sub.id)}
                              className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-fpt-orange transition-colors group/vote bg-orange-50 px-4 py-2 rounded-xl"
                            >
                              <ThumbsUp size={18} className="group-active/vote:scale-125 group-hover/vote:text-white text-fpt-orange transition-transform" />
                              <span className="text-sm font-black text-fpt-orange group-hover/vote:text-white">{sub.votes} Lượt thích</span>
                            </button>
                            <Button className="bg-transparent border-2 border-gray-200 text-gray-500 hover:border-fpt-blue hover:text-fpt-blue hover:bg-white px-6 py-2 text-xs font-black rounded-xl">ĐỌC</Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
