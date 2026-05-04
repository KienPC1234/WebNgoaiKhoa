import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { Card } from '@/components/UI'
import { Sparkles, Users, Target, Shield, Award } from 'lucide-react'
import { motion } from 'framer-motion'

export const GioiThieuQuyMo = () => {
  const [scale, setScale] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchScale = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get('/public/doingu/scale')
        setScale(res.data)
      } catch (error) {
        console.error('Error fetching social scale:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScale()
  }, [])

  const stats = [
    { title: 'Giáo viên', count: scale?.staff_count ?? 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: 'Sinh viên', count: scale?.student_count ?? 0, icon: Target, color: 'text-orange-500', bg: 'bg-orange-50' },
    { title: 'Dự án', count: scale?.projects_count ?? 0, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { title: 'Giải thưởng', count: scale?.awards_count ?? 0, icon: Award, color: 'text-purple-500', bg: 'bg-purple-50' },
  ]

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <section className="bg-gradient-to-br from-fpt-orange via-[#f5821f] to-orange-700 text-white py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] border border-white/20 shadow-xl"
          >
            <Sparkles size={16} />
            <span>Tầm nhìn và sứ mệnh</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black leading-tight uppercase pt-3 md:pt-6 bg-clip-text text-transparent bg-gradient-to-r from-orange-200 to-yellow-100"
            style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }}
          >
            {scale?.hero_title} <br />
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-orange-50 max-w-3xl mx-auto font-medium leading-relaxed italic"
          >
            {scale?.hero_subtitle || 'Deep learning with love'}
          </motion.p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 bg-white rounded-[32px] animate-pulse" />)}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="p-8 text-center border-none shadow-xl rounded-[32px] hover:-translate-y-2 transition-transform">
              <div className={`${stat.bg} ${stat.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                <stat.icon size={32} />
              </div>
              <div className="text-4xl font-black text-gray-800 mb-2">{stat.count}+</div>
              <div className="text-xs font-black uppercase tracking-widest text-gray-400">{stat.title}</div>
            </Card>
          ))}
        </div>

        <section className="mt-24 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-left">
              <h2 className="text-4xl font-black text-fpt-blue uppercase italic tracking-tighter border-l-8 border-fpt-orange pl-6">
                Sứ mệnh & Thông tin chính thức
              </h2>

              <div className="prose prose-lg max-w-none text-gray-700">
                <h3>1. Triết lý Giáo dục</h3>
                <ul>
                  <li>Triết lý chính: “Giáo dục đào tạo là việc tổ chức và quản lý việc tự học của người học”.</li>
                  <li>Định hướng: “Trải nghiệm để trưởng thành”.</li>
                  <li>Trọng tâm: Tôn trọng cá nhân, đề cao sự tự lập và phát triển con người toàn diện. [1, 2, 3, 4]</li>
                </ul>

                <h3 className="mt-4">2. Sứ mệnh</h3>
                <p>"Cung cấp Năng lực Cạnh tranh Toàn cầu cho người học, góp phần mở mang bờ cõi trí tuệ đất nước". [1, 2]</p>

                <h3 className="mt-4">3. Slogan & Thông điệp</h3>
                <ul>
                  <li>Slogan phổ biến: "Trải nghiệm để trưởng thành".</li>
                  <li>Thông điệp khác: "Học thật, thi thật, thành công thật", "Làm khác để làm tốt". [1, 2, 3]</li>
                </ul>

                <h3 className="mt-4">4. Chương trình Đào tạo</h3>
                <p>Chương trình đào tạo tại THPT FPT được thiết kế dựa trên tiêu chí iGSM (Industry Relevant - Global - Smart Education - Mega), cụ thể: [1]</p>
                <ul>
                  <li>Chương trình của Bộ GD&ĐT: Đảm bảo kiến thức nền tảng vững chắc theo quy định.</li>
                  <li>Tăng cường Tiếng Anh: Chú trọng năng lực ngôn ngữ, hướng tới tiêu chuẩn quốc tế để học sinh có thể sử dụng tiếng Anh như công cụ học tập.</li>
                  <li>Công nghệ & Kỹ năng số: Đưa Tin học/Công nghệ vào chương trình chính khóa (phù hợp với xu thế công nghệ 4.0).</li>
                  <li>Phát triển cá nhân: Chú trọng kỹ năng mềm, phát triển thể chất và thẩm mỹ qua các hoạt động trải nghiệm, CLB, sự kiện.</li>
                  <li>Mô hình Nội trú: Học sinh học tập và sinh hoạt tại trường từ thứ 2 đến thứ 6, rèn luyện tính tự lập và kỷ luật. [1, 2, 3]</li>
                </ul>

                <h3 className="mt-4">5. Giá trị cốt lõi (Theo bộ Gen FPT)</h3>
                <p>Tôn - Đổi - Đồng - Chí - Gương - Sáng (Tôn trọng - Đổi mới - Đồng đội - Chí công - Gương mẫu - Sáng suốt). [1, 2]</p>
              </div>
            </div>
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl aspect-video rotate-2 hover:rotate-0 transition-transform duration-700 bg-gray-200">
              <div className="absolute inset-0 bg-gradient-to-tr from-fpt-orange/20 to-transparent"></div>
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1000" alt="Students" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
