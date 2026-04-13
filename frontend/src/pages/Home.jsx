import { useState, useEffect } from 'react'
import { ArrowRight, BookOpen, MessageSquare, ShieldCheck, Sparkles, Calendar, ChevronRight } from 'lucide-react'
import { Button, Card, cn } from '../components/UI'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

const FeatureCard = ({ icon: Icon, title, description, colorClass }) => (
  <Card className="hover:shadow-2xl transition-all hover:-translate-y-2 border-gray-100 group p-8 rounded-[32px]">
    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:rotate-6 shadow-sm", colorClass)}>
      <Icon size={32} className="text-white" />
    </div>
    <h3 className="text-2xl font-black mb-3 text-fpt-blue">{title}</h3>
    <p className="text-gray-500 text-sm font-medium leading-relaxed">{description}</p>
  </Card>
)

export const Home = () => {
  const [latestPubs, setLatestPubs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchLatest = async () => {
      setLoading(true)
      try {
        const response = await axios.get(`${API_URL}/public/publications`)
        setLatestPubs(response.data.slice(0, 3))
      } catch (error) {
        console.error('Error fetching latest pubs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLatest()
  }, [])

  return (
    <div className="space-y-32 pb-32">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white px-4 pt-20">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 space-y-8 animate-fadeIn">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-fpt-orange px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-orange-200">
              <Sparkles size={16} />
              <span>Sức mạnh AI tại FPT Education</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-tight text-fpt-blue italic">
              NGOẠI KHOÁ <br />
              <span className="text-fpt-orange not-italic">NHỊP ĐẬP</span>
            </h1>
            <p className="text-xl text-gray-500 font-medium leading-relaxed max-w-xl">
              Nơi khơi nguồn sáng tạo và kết nối tri thức. Trải nghiệm không gian ngoại khóa hiện đại cùng trợ lý AI thông minh.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/phanmon/van">
                <Button className="bg-fpt-orange text-white px-10 py-5 text-lg font-black rounded-2xl shadow-2xl shadow-orange-200 hover:scale-105 transition-all flex items-center gap-2">
                  KHÁM PHÁ NHÁI BÉN <ArrowRight size={20} />
                </Button>
              </Link>
              <Link to="/ngoaikhoa">
                <Button className="bg-white text-fpt-blue border-4 border-fpt-blue px-10 py-5 text-lg font-black rounded-2xl hover:bg-fpt-blue hover:text-white transition-all">
                  XEM HOẠT ĐỘNG
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="relative animate-fadeInRight hidden lg:block">
            <div className="bg-gradient-to-br from-fpt-orange to-fpt-blue w-full aspect-square rounded-[60px] rotate-3 opacity-10 absolute inset-0"></div>
            <div className="bg-white border-8 border-gray-50 rounded-[60px] shadow-2xl p-12 relative overflow-hidden">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-fpt-orange rounded-full animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-100 rounded-full"></div>
                </div>
                <div className="h-4 w-full bg-gray-50 rounded-full"></div>
                <div className="h-4 w-3/4 bg-gray-50 rounded-full"></div>
                <div className="grid grid-cols-2 gap-4 pt-8">
                  <div className="h-32 bg-orange-50 rounded-3xl border-2 border-orange-100 border-dashed flex items-center justify-center">
                    <BookOpen className="text-fpt-orange/20" size={48} />
                  </div>
                  <div className="h-32 bg-blue-50 rounded-3xl border-2 border-blue-100 border-dashed flex items-center justify-center">
                    <Sparkles className="text-fpt-blue/20" size={48} />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-fpt-orange opacity-20 blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Publications Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-fpt-blue italic uppercase tracking-tighter">Bản tin mới nhất</h2>
            <div className="w-20 h-2 bg-fpt-orange rounded-full"></div>
          </div>
          <Link to="/ngoaikhoa" className="text-fpt-blue font-black flex items-center gap-1 hover:gap-3 transition-all">
            XEM TẤT CẢ <ChevronRight size={20} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-80 bg-gray-50 rounded-[40px] animate-pulse"></div>)
          ) : latestPubs.length === 0 ? (
            <div className="col-span-3 py-20 bg-gray-50 rounded-[40px] text-center border-4 border-dashed border-gray-100">
              <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-widest">Chưa có bản tin nào được cập nhật.</p>
            </div>
          ) : (
            latestPubs.map((pub) => (
              <Card key={pub.id} className="group p-0 overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all rounded-[40px] flex flex-col h-full bg-white">
                <div className="h-48 bg-gray-100 overflow-hidden relative">
                  {pub.image_url ? (
                    <img src={pub.image_url} alt={pub.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-fpt-blue/5 text-fpt-blue/10">
                      <BookOpen size={80} />
                    </div>
                  )}
                  <div className="absolute top-6 left-6 bg-fpt-orange text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg">
                    {pub.category}
                  </div>
                </div>
                <div className="p-8 space-y-4 flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-fpt-blue group-hover:text-fpt-orange transition-colors line-clamp-2">{pub.title}</h3>
                  <p className="text-gray-500 text-sm font-medium line-clamp-3 flex-1 leading-relaxed italic">
                    {pub.content.substring(0, 150)}...
                  </p>
                  <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <button className="text-fpt-blue font-black text-xs hover:text-fpt-orange transition-colors">CHI TIẾT →</button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
          <h2 className="text-4xl md:text-5xl font-black text-fpt-blue italic">GIÁ TRỊ CỐT LÕI</h2>
          <div className="w-24 h-2 bg-fpt-orange mx-auto rounded-full"></div>
          <p className="text-gray-500 font-medium text-lg italic">"Cùng học sinh, sinh viên FPT kiến tạo tương lai số bằng sự thấu hiểu và công nghệ."</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <FeatureCard 
            icon={BookOpen}
            title="Nhái Bén"
            colorClass="bg-fpt-orange shadow-orange-200"
            description="Ấn phẩm văn chương chuyên sâu, nơi lưu giữ những tâm hồn mộng mơ và những nét bút trẻ rực cháy đam mê."
          />
          <FeatureCard 
            icon={Sparkles}
            title="FPT AI Live"
            colorClass="bg-fpt-blue shadow-blue-200"
            description="Trợ lý AI hỗ trợ giải đáp mọi thắc mắc 24/7, render Markdown và LaTeX chuẩn xác cho học tập."
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Duyệt bài uy tín"
            colorClass="bg-fpt-green shadow-green-200"
            description="Quy trình gửi bài trực tiếp tới Ban giám khảo chuyên môn, đảm bảo sự công bằng và tính học thuật cao."
          />
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4">
        <div className="bg-gradient-to-r from-fpt-blue to-fpt-blue/90 rounded-[60px] p-12 md:p-24 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl md:text-6xl font-black text-white italic">BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</h2>
            <p className="text-blue-100 max-w-2xl mx-auto font-medium text-lg">Đăng ký tham gia các câu lạc bộ ngoại khóa hoặc bắt đầu sáng tác tác phẩm đầu tay của mình ngay hôm nay!</p>
            <div className="flex flex-wrap justify-center gap-6 pt-4">
              <Link to="/phanmon/van">
                <Button className="bg-fpt-orange text-white px-12 py-5 text-xl font-black rounded-2xl shadow-xl hover:scale-105 transition-all">
                  SÁNG TÁC NGAY
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-fpt-orange opacity-20 blur-[100px]"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-fpt-orange opacity-10 blur-[100px]"></div>
        </div>
      </section>
    </div>
  )
}
