import { useState, useEffect } from 'react'
import { Card, Button } from '../components/UI'
import { Globe, Map, Compass, FileText, BookOpen, ExternalLink, Download, ArrowRight, Mountain } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const PhanMonDiaLi = () => {
    const [publications, setPublications] = useState([])
    const [loading, setLoading] = useState(false)

    const categories = [
        { title: "Địa lí Tự nhiên", icon: Mountain, color: "from-blue-400 to-emerald-600", light: "bg-blue-50 text-blue-600 border-blue-100" },
        { title: "Địa lí Kinh tế - Xã hội", icon: Globe, color: "from-emerald-400 to-teal-600", light: "bg-emerald-50 text-emerald-600 border-emerald-100" },
        { title: "Bản đồ & GIS", icon: Map, color: "from-cyan-400 to-cyan-600", light: "bg-cyan-50 text-cyan-600 border-cyan-100" }
    ]

    useEffect(() => {
        fetchPublications()
    }, [])

    const fetchPublications = async () => {
        setLoading(true)
        try {
            const response = await axios.get(`${API_URL}/public/publications?category=dia-li`)
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
            <section className="bg-gradient-to-br from-[#004d40] via-[#00695c] to-[#00796b] text-white py-20 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-400 opacity-20 blur-3xl rounded-full"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-400 opacity-20 blur-3xl rounded-full"></div>

                <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8" data-aos="fade-right">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] border border-white/20 shadow-lg">
                            <Compass size={16} className="text-emerald-400" />
                            <span>Khám phá thế giới</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black italic leading-tight drop-shadow-xl uppercase">
                            Địa lí <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-200 not-italic inline-block pt-1 md:pt-2 gradient-text-fix">TOÀN CẦU</span>
                        </h1>
                        <p className="text-xl text-emerald-50 max-w-xl font-medium leading-relaxed">
                            Mở rộng nhãn quan về không gian sống, hiểu biết về tài nguyên và quy luật phát triển bền vững của Trái Đất.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-4">
                            <Button className="bg-gradient-to-r from-emerald-400 to-teal-600 text-white px-8 py-5 font-black rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] hover:scale-105 transition-all flex items-center gap-2 border-none">
                                <Map size={20} /> BẢN ĐỒ TƯƠNG TÁC
                            </Button>
                            <Button className="bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white px-8 py-5 font-black rounded-2xl hover:bg-white/20 transition-all flex items-center gap-2">
                                <Globe size={20} /> CỔNG DỮ LIỆU GIS
                            </Button>
                        </div>
                    </div>

                    <div className="hidden lg:block relative" data-aos="fade-left">
                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-emerald-400 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
                        <Globe size={350} className="relative z-10 text-white/90 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] mx-auto transform hover:scale-110 transition-transform duration-700" strokeWidth={1} />
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
                                Tìm hiểu chi tiết về {cat.title.toLowerCase()} thông qua các báo cáo phân tích và dữ liệu thực tế.
                            </p>
                            <button className={`font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-4 transition-all relative z-10 text-gray-400 group-hover:text-fpt-blue`}>
                                XEM CHI TIẾT <ArrowRight size={16} />
                            </button>
                        </Card>
                    ))}
                </div>

                {/* Resources */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8" data-aos="fade-right">
                        <div className="flex justify-between items-end border-b-2 border-gray-200 pb-4">
                            <h2 className="text-3xl font-black text-[#004d40] flex items-center gap-3 italic uppercase tracking-tighter">
                                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><FileText size={24} /></div>
                                Học liệu & Ấn phẩm
                            </h2>
                            <button onClick={fetchPublications} className="text-[10px] font-black text-gray-400 hover:text-emerald-600 uppercase tracking-widest transition-colors bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">Làm mới</button>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-[28px] animate-pulse shadow-sm"></div>)}
                                </div>
                            ) : publications.length === 0 ? (
                                <div className="p-12 text-center bg-white rounded-[32px] border-2 border-dashed border-gray-200 shadow-sm">
                                    <Map size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Hiện chưa có học liệu nào.</p>
                                </div>
                            ) : (
                                publications.map((pub, idx) => (
                                    <div key={pub.id} data-aos="fade-up" data-aos-delay={idx * 100} className="flex gap-5 p-5 rounded-[28px] border border-gray-100 bg-white hover:shadow-xl transition-all duration-300 group cursor-pointer hover:-translate-y-1">
                                        <div className="w-24 h-24 bg-gray-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 transition-colors shadow-inner overflow-hidden border border-gray-100">
                                            {pub.image_url ? (
                                                <img src={pub.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <Globe className="text-gray-300 group-hover:text-emerald-600 transition-colors" size={32} />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3 py-1">
                                            <h4 className="font-black text-lg text-gray-800 group-hover:text-[#004d40] transition-colors leading-snug line-clamp-2">{pub.title}</h4>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="text-[9px] text-white bg-gradient-to-r from-emerald-400 to-teal-600 font-black px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                    <Download size={10} /> DỮ LIỆU ĐỊA LÍ
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                    {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="self-center pr-2">
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#004d40] group-hover:text-white text-gray-400 transition-colors">
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
                            <h2 className="text-3xl font-black text-[#004d40] flex items-center gap-3 italic uppercase tracking-tighter">
                                <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Compass size={24} /></div>
                                Dự án GIS & Cộng đồng
                            </h2>
                        </div>

                        <Card className="p-10 border-none bg-gradient-to-br from-[#00485a] to-[#001f2b] shadow-xl shadow-blue-200/50 rounded-[40px] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
                            <div className="relative z-10 space-y-6">
                                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg border border-white/20">CÔNG NGHỆ MỚI</span>
                                <h3 className="text-3xl md:text-4xl font-black text-white leading-tight italic drop-shadow-md">Ứng dụng GIS trong Quản lý <br />Môi trường Đô thị</h3>
                                <p className="text-blue-50 font-medium leading-relaxed text-lg max-w-md">
                                    Chủ động theo dõi và phân tích sự thay đổi của môi trường thông qua hệ thống thông tin địa lí hiện đại.
                                </p>
                                <Button className="bg-white text-[#00485a] px-8 py-4 text-sm font-black rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 border-none">
                                    KHÁM PHÁ NGAY <ExternalLink size={18} />
                                </Button>
                            </div>
                            <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12 transition-transform hover:rotate-0 duration-700">
                                <Map size={250} className="text-white" />
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
