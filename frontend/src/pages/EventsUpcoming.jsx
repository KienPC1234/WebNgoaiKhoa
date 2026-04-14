import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card } from '@/components/UI'
import { Calendar, MapPin, ArrowRight, Bell, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const EventsUpcoming = () => {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true)
            try {
                const res = await axios.get(`${API_URL}/public/events/upcoming`)
                setEvents(res.data || [])
            } catch (error) {
                console.error('Error fetching upcoming events:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
    }, [])

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-blue-900 text-white py-24 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20 mix-blend-overlay"></div>
                <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] border border-white/20 shadow-xl"
                    >
                        <Bell size={16} className="text-fpt-orange animate-bounce" />
                        <span>Thông báo mới nhất</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-black italic leading-tight uppercase"
                    >
                        SỰ KIỆN <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpt-orange to-red-500 not-italic">SẮP DIỄN RA</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed"
                    >
                        Cập nhật những hoạt động học thuật, ngoại khóa và giao lưu văn hóa sôi nổi nhất của Tổ Xã hội.
                    </motion.p>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-4 mt-20">
                <div className="space-y-12">
                    {loading && (
                        <div className="grid grid-cols-1 gap-8">
                            {[1, 2].map((i) => <div key={i} className="h-72 bg-white rounded-[40px] animate-pulse" />)}
                        </div>
                    )}

                    {!loading && events.map((event, i) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Card className="p-0 border-none bg-white shadow-2xl rounded-[40px] overflow-hidden group flex flex-col lg:flex-row gap-0 hover:shadow-fpt-orange/10 transition-all duration-500">
                                <div className="lg:w-2/5 relative overflow-hidden aspect-video lg:aspect-auto">
                                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute top-6 left-6">
                                        <span className="bg-fpt-orange text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-lg">
                                            {event.status === 'registration' ? 'Mở đăng ký' : 'Sắp diễn ra'}
                                        </span>
                                    </div>
                                </div>
                                <div className="lg:w-3/5 p-10 lg:p-14 space-y-8 flex flex-col justify-center">
                                    <div className="space-y-4">
                                        <h3 className="text-3xl lg:text-4xl font-black text-gray-800 tracking-tight group-hover:text-fpt-orange transition-colors duration-300 italic">{event.title}</h3>
                                        <div className="flex flex-wrap gap-8 text-gray-400">
                                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                                                <Calendar size={18} className="text-fpt-blue" />
                                                {new Date(event.event_date).toLocaleDateString('vi-VN')}
                                            </div>
                                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                                                <MapPin size={18} className="text-fpt-blue" />
                                                {event.location}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <p className="text-gray-500 font-medium max-w-md italic">Tham gia cùng chúng tôi để kết nối tri thức và mở rộng mạng lưới quan hệ học thuật của bạn.</p>
                                        <button className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-fpt-orange group-hover:text-white text-fpt-blue transition-all duration-300 shadow-inner group-hover:translate-x-2">
                                            <ArrowRight size={24} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}

                    {!loading && events.length === 0 && (
                        <Card className="p-14 rounded-[40px] text-center bg-white border-dashed border-2 border-gray-200">
                            <Calendar size={44} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-400 font-black uppercase tracking-widest">Hiện chưa có sự kiện sắp tới.</p>
                        </Card>
                    )}
                </div>

                <section className="mt-24 p-12 bg-gray-100 rounded-[50px] border-4 border-dashed border-gray-200 flex flex-col items-center text-center space-y-8">
                    <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl flex items-center justify-center text-fpt-orange">
                        <Sparkles size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-800 uppercase italic tracking-tighter">Bạn đang ấp ủ một ý tưởng sự kiện?</h2>
                    <p className="text-gray-500 font-medium max-w-xl text-lg">Đừng ngần ngại chia sẻ với chúng tôi. Tổ Xã hội luôn sẵn sàng hỗ trợ và hiện thực hóa những sáng kiến sáng tạo từ sinh viên.</p>
                    <button className="bg-fpt-blue text-white px-10 py-5 font-black rounded-2xl shadow-xl hover:scale-105 transition-all text-sm tracking-widest uppercase">Gửi đề xuất ngay</button>
                </section>
            </div>
        </div>
    )
}
