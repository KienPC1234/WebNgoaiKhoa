import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/core'
import { Heart, User, Clock, ArrowRight, Quote, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const toPlainText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export const StoriesInspiring = () => {
    const [stories, setStories] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const controller = new AbortController()

        const fetchStories = async () => {
            setLoading(true)
            try {
                const response = await fetch(`${API_URL}/public/stories/inspiring`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                    },
                })
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const data = await response.json()
                setStories(data || [])
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    console.error('Error fetching stories:', error)
                }
            } finally {
                setLoading(false)
            }
        }
        fetchStories()

        return () => controller.abort()
    }, [])

    return (
        <div className="page-shell-public bg-gray-50/50">
            <section className="page-hero page-hero-caro text-slate-700">
                <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 bg-white/90 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] border border-orange-200 shadow-xl"
                    >
                        <Heart size={16} className="text-fpt-orange fill-fpt-orange" />
                        <span>Chạm tới trái tim</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-black italic leading-tight uppercase text-fpt-blue"
                    >
                        CÂU CHUYỆN <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpt-orange to-orange-500 not-italic inline-block pt-1 md:pt-2 gradient-text-fix">TRUYỀN CẢM HỨNG</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed italic"
                    >
                        Lắng nghe những chia sẻ thật chân thành về hành trình trưởng thành và khám phá bản thân tại Tổ Xã hội.
                    </motion.p>
                </div>
            </section>

            <div className="page-content-wrap cv-auto">
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-10">
                        {[1, 2, 3].map((i) => <div key={i} className="h-96 bg-white rounded-[40px] animate-pulse" />)}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {!loading && stories.map((story, i) => (
                        <motion.div
                            key={story.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Card className="p-0 border border-white/60 bg-white/95 backdrop-blur shadow-[0_22px_60px_-35px_rgba(15,23,42,0.35)] rounded-[32px] overflow-hidden group hover:-translate-y-2 transition-all duration-500 flex flex-col h-full">
                                <div className="relative aspect-video overflow-hidden">
                                    <img src={story.image_url} alt={story.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-6 right-6">
                                        <span className="bg-white/90 backdrop-blur-md text-red-500 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg">
                                            {story.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-8 space-y-5 flex-1 flex flex-col justify-between">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <User size={14} className="text-red-400" />
                                                {story.author}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={14} className="text-red-400" />
                                                {story.read_time_minutes} phút đọc
                                            </div>
                                        </div>
                                        <h3 className="text-[1.35rem] font-black text-gray-800 leading-tight group-hover:text-red-500 transition-colors duration-300">{story.title}</h3>
                                        <p className="text-gray-500 font-medium leading-relaxed line-clamp-3">{toPlainText(story.snippet)}</p>
                                    </div>
                                    <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                                        <Link to={`/stories/inspiring/${story.id}`} className="tap-target flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-500 transition-all group-hover:gap-3">
                                            Đọc câu chuyện <ArrowRight size={16} />
                                        </Link>
                                        <Heart aria-hidden="true" size={20} className="text-gray-200 transition-all group-hover:fill-red-400 group-hover:text-red-400" />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {!loading && stories.length === 0 && (
                    <Card className="p-12 rounded-[40px] text-center bg-white border-2 border-dashed border-gray-200 mt-10">
                        <Heart size={42} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-400 font-black uppercase tracking-widest">Hiện chưa có câu chuyện truyền cảm hứng.</p>
                    </Card>
                )}

                {/* Highlight Quote */}
                <section className="cv-auto relative mt-28 px-10 py-20 text-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-red-500 rounded-[32px] text-white flex items-center justify-center shadow-2xl shadow-red-200 rotate-12">
                        <Quote size={48} />
                    </div>
                    <div className="max-w-4xl mx-auto space-y-8">
                        <h2 className="text-4xl md:text-5xl font-black text-gray-800 leading-tight italic">"Chúng tôi không chỉ dạy sinh viên học, chúng tôi cùng sinh viên viết tiếp những câu chuyện rực rỡ nhất của tuổi trẻ."</h2>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-12 h-1 bg-red-500 rounded-full"></div>
                            <p className="text-sm font-black uppercase tracking-widest text-gray-400">TẬP THỂ GIÁO VIÊN TỔ XÃ HỘI</p>
                            <div className="w-12 h-1 bg-red-500 rounded-full"></div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
