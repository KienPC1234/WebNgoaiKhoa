import { useState, useEffect } from 'react'
import { Card, Button } from '../components/UI'
import { GraduationCap, Scale, Landmark, FileText, Gavel, BookOpen, ExternalLink, Download } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const PhanMonKTPL = () => {
  const [publications, setPublications] = useState([])
  const [loading, setLoading] = useState(false)

  const categories = [
    { title: "Kinh tế học", icon: Landmark, color: "bg-blue-100 text-blue-600" },
    { title: "Pháp luật đại cương", icon: Scale, color: "bg-orange-100 text-orange-600" },
    { title: "Kinh doanh & Khởi nghiệp", icon: GraduationCap, color: "bg-green-100 text-green-600" }
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
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12 animate-fadeIn">
      {/* Hero Section */}
      <section className="bg-fpt-blue text-white rounded-[40px] p-12 md:p-20 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/20">
            <Scale size={16} className="text-fpt-orange" />
            <span>Chuyên môn & Học thuật</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black italic leading-tight">KINH TẾ <br/><span className="text-fpt-orange not-italic">PHÁP LUẬT</span></h1>
          <p className="text-xl text-blue-100 max-w-2xl font-medium leading-relaxed">
            Kiến tạo nền tảng tư duy kinh tế và ý thức pháp luật vững vàng cho thế hệ công dân số FPT trong kỷ nguyên mới.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Button className="bg-fpt-orange text-white px-8 py-4 font-black rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2">
              <FileText size={20} /> HỌC LIỆU MỚI
            </Button>
            <Button className="bg-white/10 border-2 border-white/20 text-white px-8 py-4 font-black rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
              <Scale size={20} /> THƯ VIỆN LUẬT
            </Button>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-10 animate-pulse">
          <Scale size={400} />
        </div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-fpt-orange opacity-20 blur-[100px]"></div>
      </section>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {categories.map((cat, i) => (
          <Card key={i} className="p-8 border-none bg-gray-50 hover:bg-white hover:shadow-2xl transition-all group rounded-[32px]">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12 group-hover:scale-110 ${cat.color} shadow-sm`}>
              <cat.icon size={32} />
            </div>
            <h3 className="text-2xl font-black text-fpt-blue mb-3">{cat.title}</h3>
            <p className="text-gray-500 text-sm font-medium mb-6 italic leading-relaxed">
              Khám phá các chuyên đề chuyên sâu về {cat.title.toLowerCase()} cùng các bài giảng thực tế và tình huống điển hình.
            </p>
            <button className="text-fpt-orange font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-4 transition-all">
              KHÁM PHÁ NGAY <span className="text-xl">→</span>
            </button>
          </Card>
        ))}
      </div>

      {/* Resources & Case Studies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="flex justify-between items-end border-b-4 border-fpt-orange/10 pb-4">
            <h2 className="text-3xl font-black text-fpt-blue flex items-center gap-3 italic">
              <FileText className="text-fpt-orange" /> HỌC LIỆU MỚI NHẤT
            </h2>
            <button onClick={fetchPublications} className="text-[10px] font-black text-gray-400 hover:text-fpt-blue uppercase tracking-widest transition-colors">Làm mới</button>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse"></div>)}
              </div>
            ) : publications.length === 0 ? (
              <div className="p-12 text-center bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                <FileText size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Hiện chưa có học liệu nào.</p>
              </div>
            ) : (
              publications.map((pub) => (
                <div key={pub.id} className="flex gap-5 p-5 rounded-[28px] border-2 border-transparent hover:border-fpt-blue/10 hover:bg-white hover:shadow-xl transition-all group cursor-pointer bg-gray-50/50">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-fpt-blue/5 transition-colors shadow-sm">
                    {pub.image_url ? (
                      <img src={pub.image_url} alt="" className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <BookOpen className="text-gray-300 group-hover:text-fpt-blue transition-colors" size={32} />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-black text-lg text-gray-800 group-hover:text-fpt-blue transition-colors leading-snug">{pub.title}</h4>
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] text-fpt-orange font-black uppercase tracking-widest flex items-center gap-1">
                        <Download size={12} /> TÀI LIỆU PDF
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="self-center">
                    <ExternalLink size={20} className="text-gray-200 group-hover:text-fpt-orange transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="border-b-4 border-fpt-blue/10 pb-4">
            <h2 className="text-3xl font-black text-fpt-blue flex items-center gap-3 italic">
              <Gavel className="text-fpt-orange" /> PHÁP LUẬT & ĐỜI SỐNG
            </h2>
          </div>
          <Card className="p-10 border-none bg-gradient-to-br from-orange-50 to-white shadow-xl shadow-orange-100/50 rounded-[40px] relative overflow-hidden border-2 border-orange-100">
            <div className="relative z-10 space-y-6">
              <span className="bg-fpt-orange text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg shadow-orange-200">TIÊU ĐIỂM 2026</span>
              <h3 className="text-3xl font-black text-fpt-blue leading-tight italic">Phân tích Luật Giáo dục & <br/>Quyền lợi Sinh viên</h3>
              <p className="text-gray-600 font-medium leading-relaxed text-lg">
                Những cập nhật trọng tâm về quy chế học tập, quyền lợi nội trú và các quy định về chuyển đổi số trong giáo dục đại học.
              </p>
              <Button className="bg-fpt-blue text-white px-10 py-4 text-sm font-black rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                ĐỌC CHI TIẾT <ExternalLink size={18} />
              </Button>
            </div>
            <div className="absolute -bottom-20 -right-20 opacity-5 -rotate-12 transition-transform hover:rotate-0 duration-700">
              <Scale size={300} />
            </div>
          </Card>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-fpt-blue/5 p-6 rounded-3xl border border-fpt-blue/10 space-y-3">
              <div className="w-10 h-10 bg-fpt-blue text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-100">?</div>
              <h5 className="font-black text-fpt-blue text-sm uppercase">Hỏi đáp pháp luật</h5>
              <p className="text-xs text-gray-500 font-medium">Giải đáp nhanh các thắc mắc về quy định nhà trường.</p>
            </div>
            <div className="bg-fpt-orange/5 p-6 rounded-3xl border border-fpt-orange/10 space-y-3">
              <div className="w-10 h-10 bg-fpt-orange text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-orange-100">!</div>
              <h5 className="font-black text-fpt-orange text-sm uppercase">Tư vấn kinh tế</h5>
              <p className="text-xs text-gray-500 font-medium">Góc nhìn chuyên gia về khởi nghiệp sinh viên.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
