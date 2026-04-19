import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card } from '@/components/UI'
import { Users, BookOpen, GraduationCap, Heart, Star, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const GioiThieuDoiNgu = () => {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`${API_URL}/public/doingu/staff`)
        setStaff(res.data || [])
      } catch (error) {
        console.error('Error fetching staff profiles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStaff()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <section className="bg-gradient-to-br from-[#1a2d6c] via-[#283593] to-blue-900 text-white py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] border border-white/20 shadow-xl"
          >
            <Users size={16} className="text-blue-400" />
            <span>Gương mặt tiêu biểu</span>
          </motion.div>
            <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black italic leading-tight"
          >
            ĐỘI NGŨ <br />
            <span
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-200 not-italic gradient-text-fix pt-3 md:pt-6"
              style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              GIÁO VIÊN TÂM HUYẾT
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-blue-50 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            Hội tụ những chuyên gia giàu kinh nghiệm, không ngừng sáng tạo và truyền lửa đam mê cho thế hệ sinh viên.
          </motion.p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 mt-20">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-96 rounded-[40px] bg-white animate-pulse" />)}
          </div>
        )}

        {!loading && staff.length === 0 && (
          <Card className="p-12 text-center rounded-[40px] border-dashed border-2 border-gray-200 bg-white mb-8">
            <Users size={42} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400 font-black uppercase tracking-widest">Chưa có hồ sơ đội ngũ giáo viên.</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {staff.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-0 border-none bg-white shadow-xl rounded-[40px] overflow-hidden group hover:-translate-y-4 transition-all duration-500">
                <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-fpt-blue/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                  <img src={p.image_url} alt={p.full_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute bottom-6 left-6 right-6 z-20 translate-y-10 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-fpt-orange transition-colors cursor-pointer border border-white/30">
                        <Heart size={18} />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-fpt-orange transition-colors cursor-pointer border border-white/30">
                        <Star size={18} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-8 space-y-3">
                  <h4 className="text-xl font-black text-gray-800 tracking-tight group-hover:text-fpt-blue transition-colors">{p.full_name}</h4>
                  <div className="text-[10px] font-black uppercase tracking-widest text-fpt-orange bg-orange-50 inline-block px-3 py-1 rounded-md">
                    {p.title}
                  </div>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed italic line-clamp-3">
                    {p.bio}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <section className="mt-24 bg-gradient-to-br from-fpt-blue to-[#0d1b4a] rounded-[50px] p-12 lg:p-20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fpt-orange opacity-10 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-400 opacity-10 rounded-full blur-[80px]"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight">
                Triết lý giáo dục <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpt-orange to-yellow-400 not-italic inline-block pt-1 md:pt-2 gradient-text-fix">SÁNG TẠO & NHÂN VĂN</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex-shrink-0 flex items-center justify-center text-fpt-orange border border-white/10">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h5 className="font-black text-lg uppercase tracking-widest mb-2">Đội ngũ tinh hoa</h5>
                    <p className="text-blue-100 opacity-80 font-medium">100% giáo viên đạt chuẩn chuyên môn, tâm huyết và không ngừng cải tiến phương pháp giảng dạy.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex-shrink-0 flex items-center justify-center text-emerald-400 border border-white/10">
                    <Heart size={24} />
                  </div>
                  <div>
                    <h5 className="font-black text-lg uppercase tracking-widest mb-2">Trái tim nhân hậu</h5>
                    <p className="text-blue-100 opacity-80 font-medium">Giáo dục bằng tình yêu thương, thấu hiểu tâm lý sinh viên để cùng phát triển.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card className="aspect-square bg-white/5 border-white/10 flex flex-col items-center justify-center text-center p-6 space-y-4 hover:bg-white/10 transition-colors">
                <GraduationCap size={40} className="text-fpt-orange" />
                <div className="text-3xl font-black">20+</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Giảng viên ưu tú</div>
              </Card>
              <Card className="aspect-square bg-white/5 border-white/10 flex flex-col items-center justify-center text-center p-6 space-y-4 hover:bg-white/10 transition-colors">
                <BookOpen size={40} className="text-emerald-400" />
                <div className="text-3xl font-black">150+</div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Khoá học</div>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
