import { useState, useEffect } from 'react'
import { ArrowRight, BookOpen, ShieldCheck, Sparkles, Calendar, ChevronRight, CheckCircle, Activity, Globe, Send } from 'lucide-react'
import { Button, Card, cn } from '../components/UI'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const FeatureCard = ({ icon: Icon, title, description, colorClass, aosDelay }) => (
  <Card data-aos="fade-up" data-aos-delay={aosDelay} className={cn("hover:shadow-2xl transition-all hover:-translate-y-3 border-gray-100 group p-8 rounded-[32px] overflow-hidden relative", colorClass)}>
    <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-150 transition-transform duration-700">
      <Icon size={150} />
    </div>
    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:rotate-6 shadow-md relative z-10">
      <Icon size={32} className="text-gray-800" />
    </div>
    <h3 className="text-2xl font-black mb-3 text-white relative z-10">{title}</h3>
    <p className="text-white/80 text-sm font-medium leading-relaxed relative z-10">{description}</p>
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
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-orange-50/30 to-blue-50/30 px-4 pt-20 pb-20 border-b border-gray-100">
        <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 space-y-8" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-400 to-fpt-orange text-white px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-200">
              <Sparkles size={16} className="animate-pulse" />
              <span>Sức mạnh AI tại FPT Education</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-tight text-fpt-blue italic drop-shadow-sm">
              TỔ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpt-orange to-orange-400 not-italic">XÃ HỘI</span>
            </h1>
            <p className="text-xl text-gray-600 font-medium leading-relaxed max-w-xl">
              Deep learning with love — Nơi khơi nguồn sáng tạo và kết nối tri thức. Trải nghiệm không gian ngoại khóa đầy màu sắc, năng động cùng trợ lý AI thông minh 24/7.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/phanmon/van">
                <Button className="bg-fpt-orange text-white px-10 py-5 text-lg font-black rounded-2xl shadow-xl shadow-orange-200 hover:-translate-y-1 transition-all flex items-center gap-2">
                  KHÁM PHÁ NHÁI BÉN <ArrowRight size={20} />
                </Button>
              </Link>
              <Link to="/phanmon/ktpl">
                <Button className="bg-fpt-blue text-white px-10 py-5 text-lg font-black rounded-2xl shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all">
                  GÓC KTPL
                </Button>
              </Link>
            </div>
            
            <div className="flex gap-8 pt-8 border-t border-gray-200/60 mt-8">
              <div className="space-y-1">
                <h4 className="font-black text-3xl text-fpt-blue">500+</h4>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Thành viên</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-3xl text-fpt-orange">3+</h4>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Phân môn</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-3xl text-fpt-green">24/7</h4>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">AI Support</p>
              </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block" data-aos="fade-left">
            <div className="bg-gradient-to-br from-fpt-orange to-fpt-blue w-full aspect-square rounded-[80px] rotate-6 opacity-10 absolute inset-0 mix-blend-multiply"></div>
            <div className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-[60px] shadow-2xl p-12 relative overflow-hidden transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-fpt-orange to-orange-400 rounded-full flex items-center justify-center text-white shadow-lg"><Activity size={24} /></div>
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-gray-200 rounded-full"></div>
                    <div className="h-3 w-32 bg-gray-100 rounded-full"></div>
                  </div>
                </div>
                <div className="h-4 w-full bg-gradient-to-r from-gray-100 to-gray-50 rounded-full"></div>
                <div className="h-4 w-3/4 bg-gray-100 rounded-full"></div>
                <div className="grid grid-cols-2 gap-4 pt-8">
                  <div className="h-32 bg-orange-50/50 rounded-3xl border-2 border-orange-100 border-dashed flex items-center justify-center group hover:bg-orange-100 transition-colors">
                    <BookOpen className="text-fpt-orange/40 group-hover:text-fpt-orange transition-colors" size={48} />
                  </div>
                  <div className="h-32 bg-blue-50/50 rounded-3xl border-2 border-blue-100 border-dashed flex items-center justify-center group hover:bg-blue-100 transition-colors">
                    <Globe className="text-fpt-blue/40 group-hover:text-fpt-blue transition-colors" size={48} />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-fpt-orange opacity-10 blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Publications Section */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-16" data-aos="fade-up">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-fpt-blue italic uppercase tracking-tighter">Bản tin mới nhất</h2>
            <div className="w-24 h-2 bg-gradient-to-r from-fpt-orange to-orange-400 rounded-full"></div>
          </div>
          <Link to="/ngoaikhoa" className="hidden sm:flex text-fpt-blue font-black items-center gap-2 hover:gap-4 transition-all bg-blue-50 px-6 py-3 rounded-full hover:bg-blue-100">
            XEM TẤT CẢ <ChevronRight size={20} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-96 bg-gray-100 rounded-[40px] animate-pulse"></div>)
          ) : latestPubs.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 bg-gray-50 rounded-[40px] text-center border-2 border-dashed border-gray-200" data-aos="zoom-in">
              <Calendar size={64} className="mx-auto text-gray-300 mb-6" />
              <p className="text-gray-400 font-black uppercase tracking-widest text-lg">Chưa có bản tin nào được cập nhật.</p>
            </div>
          ) : (
            latestPubs.map((pub, idx) => (
              <Card key={pub.id} data-aos="fade-up" data-aos-delay={idx * 100} className="group p-0 overflow-hidden border border-gray-100 shadow-xl hover:shadow-2xl transition-all rounded-[40px] flex flex-col h-full bg-white hover:-translate-y-2">
                <div className="h-56 bg-gray-100 overflow-hidden relative">
                  {pub.image_url ? (
                    <img src={pub.image_url} alt={pub.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                      <BookOpen size={80} className="opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm text-fpt-blue text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg">
                    {pub.category === 'van' ? 'Văn học' : pub.category === 'ktpl' ? 'KT-PL' : 'Khác'}
                  </div>
                </div>
                <div className="p-8 space-y-4 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-gray-800 group-hover:text-fpt-orange transition-colors line-clamp-2 leading-snug">{pub.title}</h3>
                  <div className="text-gray-500 text-sm font-medium line-clamp-3 flex-1 leading-relaxed prose-sm" dangerouslySetInnerHTML={{__html: pub.content.substring(0, 150) + '...'}}></div>
                  <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} /> {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-fpt-blue group-hover:bg-fpt-orange group-hover:text-white transition-colors">
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-6" data-aos="fade-up">
          <h2 className="text-4xl md:text-5xl font-black text-fpt-blue italic">GIÁ TRỊ CỐT LÕI</h2>
          <div className="w-24 h-2 bg-gradient-to-r from-fpt-orange to-fpt-blue mx-auto rounded-full"></div>
          <p className="text-gray-500 font-medium text-lg italic">"Cùng học sinh, sinh viên FPT kiến tạo tương lai số bằng sự thấu hiểu và công nghệ."</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={BookOpen}
            title="Nhái Bén"
            colorClass="bg-gradient-to-br from-orange-400 to-fpt-orange shadow-orange-200"
            description="Ấn phẩm văn chương chuyên sâu, nơi lưu giữ những tâm hồn mộng mơ và nét bút trẻ rực cháy đam mê."
            aosDelay={0}
          />
          <FeatureCard 
            icon={Sparkles}
            title="FPT AI Live"
            colorClass="bg-gradient-to-br from-blue-400 to-fpt-blue shadow-blue-200"
            description="Trợ lý AI hỗ trợ giải đáp mọi thắc mắc 24/7, tối ưu hóa việc tìm kiếm thông tin và học liệu."
            aosDelay={100}
          />
          <FeatureCard 
            icon={ShieldCheck}
            title="Minh bạch & Uy tín"
            colorClass="bg-gradient-to-br from-emerald-400 to-green-600 shadow-green-200"
            description="Quy trình nộp bài trực tiếp tới Ban giám khảo, chấm điểm công bằng và hiển thị công khai các tác phẩm đạt giải."
            aosDelay={200}
          />
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4" data-aos="zoom-in">
        <div className="bg-gradient-to-r from-fpt-blue via-[#1a2d6c] to-fpt-blue rounded-[60px] p-12 md:p-24 text-center space-y-10 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-8">
            <h2 className="text-4xl md:text-6xl font-black text-white italic drop-shadow-lg">BẮT ĐẦU HÀNH TRÌNH CỦA BẠN</h2>
            <p className="text-blue-100 max-w-2xl mx-auto font-medium text-xl leading-relaxed">
              Trở thành một phần của cộng đồng năng động, đăng bài sáng tác đầu tay hoặc theo dõi các tin tức mới nhất ngay hôm nay!
            </p>
            <div className="flex flex-wrap justify-center gap-6 pt-4">
              <Link to="/phanmon/van">
                <Button className="bg-fpt-orange text-white px-12 py-5 text-xl font-black rounded-full shadow-[0_10px_40px_-10px_rgba(242,112,36,0.5)] hover:scale-105 transition-all border-4 border-orange-400 flex items-center gap-3">
                  <Send size={24} /> GỬI BÀI NGAY
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-fpt-orange opacity-20 blur-[120px] rounded-full mix-blend-screen"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400 opacity-20 blur-[120px] rounded-full mix-blend-screen"></div>
        </div>
      </section>
    </div>
  )
}
