import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card } from '@/components/UI'
import { Calendar, MapPin, ArrowRight, Bell, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const EventsUpcoming = () => {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(null)

    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const startWeekday = monthStart.getDay()
    const dayCount = monthEnd.getDate()

    const monthLabel = monthStart.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

    const formatDateKey = (dateValue) => {
        const d = new Date(dateValue)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    const eventMap = events.reduce((acc, item) => {
        const key = formatDateKey(item.event_date)
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
    }, {})

    const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null
    const selectedDateEvents = selectedDateKey ? (eventMap[selectedDateKey] || []) : []

    const calendarCells = []
    for (let i = 0; i < startWeekday; i += 1) {
        calendarCells.push(null)
    }
    for (let d = 1; d <= dayCount; d += 1) {
        calendarCells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    }
    while (calendarCells.length % 7 !== 0) {
        calendarCells.push(null)
    }

    const weekRows = []
    for (let i = 0; i < calendarCells.length; i += 7) {
        weekRows.push(calendarCells.slice(i, i + 7))
    }

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true)
            try {
                const res = await axios.get(`${API_URL}/public/events/upcoming`)
                const fetched = res.data || []
                setEvents(fetched)

                if (fetched.length > 0) {
                    const firstDate = new Date(fetched[0].event_date)
                    setCurrentMonth(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1))
                    setSelectedDate(firstDate)
                } else {
                    setSelectedDate(new Date())
                }
            } catch (error) {
                console.error('Error fetching upcoming events:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
    }, [])

    const goPrevMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const goNextMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

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
                <section className="mb-16">
                    <Card className="p-8 rounded-[32px] border border-white/60 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] bg-white/90 backdrop-blur">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <h2 className="text-2xl md:text-3xl font-black text-fpt-blue uppercase italic">Lịch sự kiện theo tháng</h2>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={goPrevMonth}
                                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest"
                                >
                                    Tháng trước
                                </button>
                                <span className="px-4 py-2 rounded-xl bg-fpt-blue text-white font-black text-xs uppercase tracking-widest">
                                    {monthLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={goNextMonth}
                                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-widest"
                                >
                                    Tháng sau
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-gray-100">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr>
                                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
                                            <th key={day} className="p-3 text-left text-[11px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-100">{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {weekRows.map((row, rowIdx) => (
                                        <tr key={rowIdx}>
                                            {row.map((cell, cellIdx) => {
                                                if (!cell) {
                                                    return <td key={`${rowIdx}-${cellIdx}`} className="h-24 border-b border-gray-50" />
                                                }

                                                const cellKey = formatDateKey(cell)
                                                const hasEvents = Boolean(eventMap[cellKey]?.length)
                                                const isSelected = selectedDateKey === cellKey

                                                return (
                                                    <td key={cellKey} className="h-24 align-top border-b border-gray-50">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDate(cell)}
                                                            className={`w-full h-full rounded-xl text-left p-2 transition-all ${isSelected ? 'bg-blue-50 ring-2 ring-fpt-blue/20 shadow-sm' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <span className={`text-sm font-black ${isSelected ? 'text-fpt-blue' : 'text-gray-700'}`}>
                                                                    {cell.getDate()}
                                                                </span>
                                                                {hasEvents && (
                                                                    <span className="inline-flex items-center justify-center min-w-6 h-6 px-1 rounded-full bg-fpt-orange text-white text-[10px] font-black">
                                                                        {eventMap[cellKey].length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {hasEvents && (
                                                                <p className="mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">
                                                                    {eventMap[cellKey][0].title}
                                                                </p>
                                                            )}
                                                        </button>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                                {selectedDate ? `Sự kiện ngày ${new Date(selectedDate).toLocaleDateString('vi-VN')}` : 'Chọn một ngày trong lịch'}
                            </p>
                            {selectedDate && selectedDateEvents.length > 0 ? (
                                <ul className="space-y-2">
                                    {selectedDateEvents.map((ev) => (
                                        <li key={ev.id} className="text-sm text-gray-700 font-semibold">• {ev.title}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 font-semibold">Không có sự kiện trong ngày này.</p>
                            )}
                        </div>
                    </Card>
                </section>

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
                            <Card className="p-0 border border-white/60 bg-white/95 backdrop-blur shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] rounded-[36px] overflow-hidden group flex flex-col lg:flex-row gap-0 transition-all duration-500 hover:-translate-y-1">
                                <div className="lg:w-2/5 relative overflow-hidden aspect-video lg:aspect-auto">
                                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute top-6 left-6">
                                        <span className="bg-black/65 backdrop-blur text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-white/20">
                                            {event.status === 'registration' ? 'Mở đăng ký' : 'Sắp diễn ra'}
                                        </span>
                                    </div>
                                </div>
                                <div className="lg:w-3/5 p-10 lg:p-12 space-y-6 flex flex-col justify-center">
                                    <div className="space-y-4">
                                        <h3 className="text-3xl lg:text-[2rem] font-black text-gray-800 tracking-tight group-hover:text-fpt-orange transition-colors duration-300">{event.title}</h3>
                                        <p className="text-gray-500 leading-relaxed font-medium line-clamp-3">{event.description}</p>
                                        <div className="flex flex-wrap gap-6 text-gray-400">
                                            <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest">
                                                <Calendar size={18} className="text-fpt-blue" />
                                                {new Date(event.event_date).toLocaleDateString('vi-VN')}
                                            </div>
                                            <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest">
                                                <MapPin size={18} className="text-fpt-blue" />
                                                {event.location}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest">Tổ xã hội</span>
                                        <button className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-fpt-orange group-hover:text-white text-fpt-blue transition-all duration-300 shadow-inner group-hover:translate-x-2">
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
