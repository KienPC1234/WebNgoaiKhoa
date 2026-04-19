import { useState, useEffect } from 'react'
import { Card, Button } from '../components/UI'
import { GraduationCap, Scale, Landmark, FileText, Gavel, BookOpen, ExternalLink, Download, ArrowRight } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const PhanMonKTPL = () => {
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(false)

  const categories = [
    { title: "Kinh tế học", icon: Landmark, color: "from-blue-400 to-blue-600", light: "bg-blue-50 text-blue-600 border-blue-100" },
    { title: "Pháp luật đại cương", icon: Scale, color: "from-emerald-400 to-emerald-600", light: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { title: "Khởi nghiệp", icon: GraduationCap, color: "from-purple-400 to-purple-600", light: "bg-purple-50 text-purple-600 border-purple-100" }
  ]

  useEffect(() => {
    fetchPublications()
  }, [])

  const fetchPublications = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/public/publications?category=ktpl`)
      setPublications(response.data)
    } catch (error) {
      console.error('Error fetching publications:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-fpt-blue via-[#1a2d6c] to-blue-900 text-white py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-400 opacity-20 blur-3xl rounded-full"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-400 opacity-20 blur-3xl rounded-full"></div>
        
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/20 shadow-lg">
              <Scale size={16} className="text-emerald-400" />
              <span>Chuyên môn & Học thuật</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black italic leading-tight drop-shadow-xl">
              KINH TẾ <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 not-italic gradient-text-fix">PHÁP LUẬT</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-xl font-medium leading-relaxed">
              Kiến tạo nền tảng tư duy kinh tế và ý thức pháp luật vững vàng cho thế hệ công dân số FPT trong kỷ nguyên công nghệ.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white px-8 py-5 font-black rounded-2xl shadow-[0_10px_30px_-10px_rgba(52,211,153,0.5)] hover:scale-105 transition-all flex items-center gap-2 border-none">
                <FileText size={20} /> HỌC LIỆU MỚI
              </Button>
              <Button className="bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white px-8 py-5 font-black rounded-2xl hover:bg-white/20 transition-all flex items-center gap-2">
                <Scale size={20} /> THƯ VIỆN LUẬT
              </Button>
            </div>
          </div>
          
          <div className="hidden lg:block relative" data-aos="fade-left">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
            <Scale size={350} className="relative z-10 text-white/90 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] mx-auto transform -rotate-12 hover:rotate-0 transition-transform duration-700" strokeWidth={1} />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-20">
        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {categories.map((cat, i) => (
            <Card key={i} data-aos="fade-up" data-aos-delay={i * 100} className="p-8 border-none bg-white hover:shadow-2xl transition-all duration-500 group rounded-[32px] overflow-hidden relative hover:-translate-y-2">
              <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${cat.color}`}></div>
              <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:scale-150 transition-transform duration-700">
                <cat.icon size={150} />
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 ${cat.light} shadow-sm border`}>
                <cat.icon size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-3 relative z-10">{cat.title}</h3>
              <p className="text-gray-500 text-sm font-medium mb-6 italic leading-relaxed relative z-10">
                Khám phá chuyên đề chuyên sâu về {cat.title.toLowerCase()} cùng các bài giảng thực tế và tình huống điển hình.
              </p>
              <button className={`font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-4 transition-all relative z-10 text-gray-400 group-hover:text-fpt-blue`}>
                KHÁM PHÁ <ArrowRight size={16} />
              </button>
            </Card>
          ))}
        </div>

        {/* Resources & Case Studies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8" data-aos="fade-right">
            <div className="flex justify-between items-end border-b-2 border-gray-200 pb-4">
              <h2 className="text-3xl font-black text-fpt-blue flex items-center gap-3 italic uppercase tracking-tighter">
                <div className="p-2 bg-blue-50 rounded-xl text-fpt-blue"><FileText size={24} /></div>
                Học liệu mới nhất
              </h2>
              <button onClick={fetchPublications} className="text-[10px] font-black text-gray-400 hover:text-fpt-blue uppercase tracking-widest transition-colors bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">Làm mới</button>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-[28px] animate-pulse shadow-sm"></div>)}
                </div>
              ) : publications.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-200 shadow-sm">
                  <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Hiện chưa có học liệu nào.</p>
                </div>
              ) : (
                publications.map((pub, idx) => (
                  <div key={pub.id} data-aos="fade-up" data-aos-delay={idx * 100} className="flex gap-5 p-5 rounded-[28px] border border-gray-100 bg-white hover:shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1">
                    <div className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors shadow-inner overflow-hidden border border-gray-100">
                      {pub.image_url ? (
                        <img src={pub.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <BookOpen className="text-gray-300 group-hover:text-fpt-blue transition-colors" size={32} />
                      )}
                    </div>
                    <div className="flex-1 space-y-3 py-1">
                      <h4 className="font-black text-lg text-gray-800 group-hover:text-fpt-blue transition-colors leading-snug line-clamp-2">{pub.title}</h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[9px] text-white bg-gradient-to-r from-emerald-400 to-teal-500 font-black px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-sm">
                          <Download size={10} /> TÀI LIỆU PDF
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    <div className="self-center pr-2">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-fpt-blue group-hover:text-white text-gray-400 transition-colors">
                        <ExternalLink size={18} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-8" data-aos="fade-left">
            <div className="border-b-2 border-gray-200 pb-4">
              <h2 className="text-3xl font-black text-fpt-blue flex items-center gap-3 italic uppercase tracking-tighter">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500"><Gavel size={24} /></div>
                Pháp luật & Đời sống
              </h2>
            </div>
            
            <Card className="p-10 border-none bg-gradient-to-br from-emerald-500 to-teal-700 shadow-xl shadow-emerald-200/50 rounded-[40px] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
              <div className="relative z-10 space-y-6">
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg border border-white/20">TIÊU ĐIỂM 2026</span>
                <h3 className="text-3xl md:text-4xl font-black text-white leading-tight italic drop-shadow-md">Phân tích Luật Giáo dục & <br/>Quyền lợi Sinh viên</h3>
                <p className="text-emerald-50 font-medium leading-relaxed text-lg max-w-md">
                  Cập nhật trọng tâm về quy chế học tập, quyền lợi nội trú và các quy định chuyển đổi số trong giáo dục đại học.
                </p>
                <Button className="bg-white text-emerald-600 px-8 py-4 text-sm font-black rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 border-none">
                  ĐỌC CHI TIẾT <ExternalLink size={18} />
                </Button>
              </div>
              <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12 transition-transform hover:rotate-0 duration-700">
                <Scale size={250} className="text-white" />
              </div>
            </Card>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group space-y-4">
                <div className="w-12 h-12 bg-blue-50 text-fpt-blue rounded-2xl flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform border border-blue-100">?</div>
                <div>
                  <h5 className="font-black text-gray-800 text-sm uppercase mb-1">Hỏi đáp pháp luật</h5>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">Giải đáp nhanh các thắc mắc về quy định nhà trường.</p>
                </div>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group space-y-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center font-black text-xl group-hover:scale-110 transition-transform border border-purple-100">!</div>
                <div>
                  <h5 className="font-black text-gray-800 text-sm uppercase mb-1">Tư vấn kinh tế</h5>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">Góc nhìn chuyên gia về khởi nghiệp sinh viên.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
