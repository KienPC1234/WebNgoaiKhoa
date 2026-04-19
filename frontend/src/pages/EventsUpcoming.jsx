import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/core'
import { Calendar, MapPin, ArrowRight, Bell, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const toPlainText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export const EventsUpcoming = () => {
    const navigate = useNavigate()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(null)
    const [highlightedEventId, setHighlightedEventId] = useState(null)
    const eventCardRefs = useRef({})

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

    const eventMap = useMemo(() => events.reduce((acc, item) => {
        const key = formatDateKey(item.event_date)
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
    }, {}), [events])

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
        const controller = new AbortController()

        const fetchEvents = async () => {
            setLoading(true)
            try {
                const response = await fetch(`${API_URL}/public/events/upcoming`, {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                    },
                })
                if (!response.ok) throw new Error(`HTTP ${response.status}`)
                const fetched = (await response.json()) || []
                setEvents(fetched)

                if (fetched.length > 0) {
                    const firstDate = new Date(fetched[0].event_date)
                    setCurrentMonth(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1))
                    setSelectedDate(firstDate)
                } else {
                    setSelectedDate(new Date())
                }
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    console.error('Error fetching upcoming events:', error)
                }
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()

        return () => controller.abort()
    }, [])

    const goPrevMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    }

    const goNextMonth = () => {
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    }

    const scrollToEventCard = (eventId) => {
        const target = eventCardRefs.current[eventId]
        if (!target) return
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedEventId(eventId)
        window.setTimeout(() => {
            setHighlightedEventId((prev) => (prev === eventId ? null : prev))
        }, 1400)
    }

    const openEventPost = (linkedPostId) => {
        if (!linkedPostId) return
        navigate(`/posts/${linkedPostId}`)
    }

    return (
        <div className="page-shell-public bg-gray-50/50">
            <section className="page-hero page-hero-caro text-slate-700">
                <div className="max-w-6xl mx-auto relative z-10 text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 bg-white/90 px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] border border-orange-200 shadow-xl"
                    >
                        <Bell size={16} className="text-fpt-orange" />
                        <span>Thông báo mới nhất</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-black italic leading-tight uppercase text-fpt-blue"
                    >
                        SỰ KIỆN <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-fpt-orange to-orange-500 not-italic inline-block pt-1 md:pt-2 gradient-text-fix">SẮP DIỄN RA</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed"
                    >
                        Cập nhật những hoạt động học thuật, ngoại khóa và giao lưu văn hóa sôi nổi nhất của Tổ Xã hội.
                    </motion.p>
                </div>
            </section>

            <div className="page-content-wrap">
                <section className="mb-16 cv-auto">
                    <Card className="page-panel p-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <h2 className="text-2xl md:text-3xl font-black text-fpt-blue uppercase italic">Lịch sự kiện theo tháng</h2>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={goPrevMonth}
                                    className="tap-target rounded-xl bg-gray-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-200"
                                >
                                    Tháng trước
                                </button>
                                <span className="px-4 py-2 rounded-xl bg-fpt-blue text-white font-black text-xs uppercase tracking-widest">
                                    {monthLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={goNextMonth}
                                    className="tap-target rounded-xl bg-gray-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-gray-200"
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
                                                            className={`tap-target h-full w-full rounded-xl p-2 text-left transition-all ${isSelected ? 'bg-blue-50 ring-2 ring-fpt-blue/20 shadow-sm' : 'hover:bg-gray-50'}`}
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
                                                                <div
                                                                    title={eventMap[cellKey].map((ev, idx) => `${idx + 1}. ${ev.title}`).join('\n')}
                                                                    aria-label={`${eventMap[cellKey].length} sự kiện`}
                                                                    className="mt-3 flex items-center gap-1.5"
                                                                >
                                                                    {eventMap[cellKey].slice(0, 3).map((ev, idx) => (
                                                                        <span
                                                                            key={`${cellKey}-${ev.id || idx}`}
                                                                            className={`inline-block h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-fpt-blue' : 'bg-fpt-orange'}`}
                                                                        />
                                                                    ))}
                                                                    {eventMap[cellKey].length > 3 && (
                                                                        <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                                                                            +{eventMap[cellKey].length - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
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

                        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-orange-50/70 via-white to-blue-50/70 border border-orange-100">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                                {selectedDate ? `Sự kiện ngày ${new Date(selectedDate).toLocaleDateString('vi-VN')}` : 'Chọn một ngày trong lịch'}
                            </p>
                            {selectedDate && selectedDateEvents.length > 0 ? (
                                <ul className="space-y-2.5">
                                    {selectedDateEvents.map((ev) => (
                                        <li key={ev.id}>
                                            <button
                                                type="button"
                                                onClick={() => scrollToEventCard(ev.id)}
                                                className="tap-target w-full rounded-xl border border-white bg-white/90 px-3 py-2.5 text-left transition-all hover:border-fpt-orange/40 hover:shadow-sm"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-black text-slate-700">{ev.title}</p>
                                                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                            {new Date(ev.event_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {ev.location}
                                                        </p>
                                                    </div>
                                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-fpt-orange">
                                                        <ArrowRight size={14} />
                                                    </span>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 font-semibold">Không có sự kiện trong ngày này.</p>
                            )}
                        </div>
                    </Card>
                </section>

                <div className="space-y-12 cv-auto">
                    {loading && (
                        <div className="grid grid-cols-1 gap-8">
                            {[1, 2].map((i) => <div key={i} className="h-72 bg-white rounded-[40px] animate-pulse" />)}
                        </div>
                    )}

                    {!loading && events.map((event, i) => (
                        <motion.div
                            key={event.id}
                            id={`event-card-${event.id}`}
                            ref={(node) => {
                                eventCardRefs.current[event.id] = node
                            }}
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Card
                                onClick={() => openEventPost(event.linked_post_id)}
                                onKeyDown={(e) => {
                                    if (!event.linked_post_id) return
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        openEventPost(event.linked_post_id)
                                    }
                                }}
                                role={event.linked_post_id ? 'button' : undefined}
                                tabIndex={event.linked_post_id ? 0 : undefined}
                                className={`group flex flex-col gap-0 overflow-hidden rounded-[36px] border bg-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.35)] transition-all duration-500 hover:-translate-y-1 lg:flex-row ${event.linked_post_id ? 'cursor-pointer border-white/60 hover:border-fpt-orange/40' : 'border-white/60'} ${highlightedEventId === event.id ? 'ring-2 ring-fpt-orange/40' : ''}`}
                            >
                                <div className="lg:w-2/5 relative overflow-hidden aspect-video lg:aspect-auto">
                                    <img src={event.image_url} alt={event.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-6 left-6">
                                        <span className="bg-black/65 backdrop-blur text-white text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest border border-white/20">
                                            {event.status === 'registration' ? 'Mở đăng ký' : 'Sắp diễn ra'}
                                        </span>
                                    </div>
                                    {event.linked_post_id && (
                                        <div className="absolute top-6 right-6">
                                            <span className="bg-white/95 text-fpt-blue text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">
                                                Xem chi tiết
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="lg:w-3/5 p-10 lg:p-12 space-y-6 flex flex-col justify-center">
                                    <div className="space-y-4">
                                        <h3 className="text-3xl lg:text-[2rem] font-black text-gray-800 tracking-tight group-hover:text-fpt-orange transition-colors duration-300">{event.title}</h3>
                                        <p className="text-gray-500 leading-relaxed font-medium line-clamp-3">{toPlainText(event.description)}</p>
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
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                openEventPost(event.linked_post_id)
                                            }}
                                            disabled={!event.linked_post_id}
                                            className={`tap-target flex h-14 w-14 items-center justify-center rounded-full text-fpt-blue shadow-inner transition-all duration-300 ${event.linked_post_id ? 'bg-gray-50 group-hover:translate-x-2 group-hover:bg-fpt-orange group-hover:text-white' : 'cursor-not-allowed bg-gray-100 text-gray-300'}`}
                                        >
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

                <section className="cv-auto mt-24 rounded-[40px] border border-orange-100 bg-gradient-to-r from-orange-50 via-white to-blue-50 p-8 md:p-12">
                    <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-orange-200 bg-white text-fpt-orange shadow-sm">
                            <Sparkles size={30} />
                        </div>
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-fpt-orange">Đề xuất hoạt động</p>
                        <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Bạn đang ấp ủ một ý tưởng sự kiện?</h2>
                        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
                            Đừng ngần ngại chia sẻ với chúng tôi. Tổ Xã hội luôn sẵn sàng đồng hành để hiện thực hóa những sáng kiến sáng tạo từ học sinh, sinh viên.
                        </p>
                        <button type="button" className="tap-target mt-7 rounded-xl bg-fpt-blue px-7 py-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-fpt-orange">
                            Gửi đề xuất ngay
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}
