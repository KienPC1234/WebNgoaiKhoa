import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/core'
import { Calendar, MapPin, ArrowRight, Bell, Sparkles, ChevronLeft, ChevronRight as ChevronRightIcon, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const toPlainText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export const EventsUpcoming = () => {
    const navigate = useNavigate()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(null)
    const [highlightedEventId, setHighlightedEventId] = useState(null)
    const eventCardRefs = useRef({})

    const today = new Date()
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const startWeekday = monthStart.getDay()
    const dayCount = monthEnd.getDate()

    const monthLabel = monthStart.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

    const formatDateKey = (dateValue) => {
        const d = new Date(dateValue)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    for (let i = 0; i < startWeekday; i += 1) calendarCells.push(null)
    for (let d = 1; d <= dayCount; d += 1) calendarCells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    while (calendarCells.length % 7 !== 0) calendarCells.push(null)

    const weekRows = []
    for (let i = 0; i < calendarCells.length; i += 7) weekRows.push(calendarCells.slice(i, i + 7))

    useEffect(() => {
        const controller = new AbortController()
        const fetchEvents = async () => {
            setLoading(true)
            try {
                const response = await fetch(`${API_URL}/public/events/upcoming`, { signal: controller.signal, headers: { Accept: 'application/json' } })
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
                if (error?.name !== 'AbortError') console.error('Error fetching upcoming events:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchEvents()
        return () => controller.abort()
    }, [])

    const goPrevMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    const goNextMonth = () => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))

    const scrollToEventCard = (eventId) => {
        const target = eventCardRefs.current[eventId]
        if (!target) return
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedEventId(eventId)
        window.setTimeout(() => setHighlightedEventId((prev) => (prev === eventId ? null : prev)), 1400)
    }

    const openEventPost = (linkedPostId) => {
        if (!linkedPostId) return
        navigate(`/posts/${linkedPostId}`)
    }

    return (
        <div className="page-shell-public">
            <section className="page-hero page-hero-caro">
                <div className="app-section relative z-10 mx-auto max-w-5xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-fpt-orange animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-fpt-orange">Tổ xã hội FSC Hoà Lạc</span>
                    </div>
                    <h1 className="mt-6 text-balance text-4xl font-black uppercase leading-[0.92] text-fpt-blue sm:text-5xl md:text-6xl">
                        <span className="block">Lịch sự kiện</span>
                        <span className="mt-2 block bg-gradient-to-r from-fpt-orange to-orange-400 bg-clip-text text-transparent italic gradient-text-fix pt-3 md:pt-6">Sắp diễn ra</span>
                    </h1>
                    <p className="mt-5 max-w-2xl mx-auto text-base font-medium leading-relaxed text-slate-600 md:text-lg">
                        Cập nhật những hoạt động học thuật, ngoại khóa và giao lưu văn hóa sôi nổi nhất.
                    </p>
                </div>
            </section>

            <div className="page-content-wrap">
                <section className="mb-16 cv-auto">
                    <Card className="page-panel overflow-hidden">
                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
                            <h2 className="text-lg font-black uppercase tracking-tight text-fpt-blue md:text-xl">Lịch sự kiện</h2>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={goPrevMonth} className="tap-target flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-fpt-blue">
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="min-w-[140px] text-center text-sm font-black capitalize text-slate-800">{monthLabel}</span>
                                <button type="button" onClick={goNextMonth} className="tap-target flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-fpt-blue">
                                    <ChevronRightIcon size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-slate-100">
                            <div className="grid grid-cols-7">
                                {WEEKDAY_LABELS.map((day, idx) => (
                                    <div key={day} className={`py-2.5 text-center text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 border-t border-slate-100">
                                {weekRows.flat().map((cell, idx) => {
                                    if (!cell) return <div key={`empty-${idx}`} className="min-h-[56px] border-b border-r border-slate-50 md:min-h-[72px]" />

                                    const cellKey = formatDateKey(cell)
                                    const hasEvents = Boolean(eventMap[cellKey]?.length)
                                    const isSelected = selectedDateKey === cellKey
                                    const isToday = cellKey === todayKey
                                    const isSunday = cell.getDay() === 0
                                    const eventCount = eventMap[cellKey]?.length || 0

                                    return (
                                        <div key={cellKey} className="min-h-[56px] border-b border-r border-slate-50 md:min-h-[72px]">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDate(cell)}
                                                className={`flex h-full w-full flex-col items-center gap-1 p-1.5 transition-all sm:p-2 ${isSelected ? 'bg-blue-50/80' : 'hover:bg-orange-50/40'}`}
                                            >
                                                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                                    isSelected ? 'bg-fpt-blue text-white' :
                                                    isToday ? 'bg-fpt-orange text-white' :
                                                    isSunday ? 'text-red-400' : 'text-slate-700'
                                                }`}>
                                                    {cell.getDate()}
                                                </span>
                                                {hasEvents && (
                                                    <div className="flex items-center gap-0.5">
                                                        {eventCount <= 3 ? (
                                                            Array.from({ length: eventCount }).map((_, i) => (
                                                                <span key={i} className={`h-1 w-1 rounded-full ${isSelected ? 'bg-fpt-blue' : 'bg-fpt-orange'}`} />
                                                            ))
                                                        ) : (
                                                            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${isSelected ? 'bg-fpt-blue/10 text-fpt-blue' : 'bg-fpt-orange/10 text-fpt-orange'}`}>
                                                                +{eventCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {selectedDate && (
                            <div className="border-t border-slate-100 p-4 md:p-5">
                                <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
                                    <Calendar size={12} className="mr-1.5 inline-block" />
                                    {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </p>
                                {selectedDateEvents.length > 0 ? (
                                    <ul className="space-y-2">
                                        {selectedDateEvents.map((ev) => (
                                            <li key={ev.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => scrollToEventCard(ev.id)}
                                                    className="tap-target w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition-all hover:border-fpt-orange/30 hover:shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-bold text-slate-800">{ev.title}</p>
                                                            <div className="mt-1 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                                                                <span className="inline-flex items-center gap-1"><Clock3 size={11} /> {new Date(ev.event_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                                {ev.location && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>}
                                                            </div>
                                                        </div>
                                                        <ArrowRight size={14} className="shrink-0 text-slate-300" />
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="py-4 text-center text-sm font-medium text-slate-300">Không có sự kiện trong ngày này</p>
                                )}
                            </div>
                        )}
                    </Card>
                </section>

                <div className="space-y-12 cv-auto">
                    {loading && (
                        <div className="grid grid-cols-1 gap-8">
                            {[1, 2].map((i) => <div key={i} className="h-72 bg-white rounded-[40px] animate-pulse" />)}
                        </div>
                    )}

                    {!loading && events.map((event, i) => (
                        <div
                            key={event.id}
                            id={`event-card-${event.id}`}
                            ref={(node) => {
                                eventCardRefs.current[event.id] = node
                            }}
                            className="animate-[fadeInEvents_260ms_ease-out]"
                            style={{ animationDelay: `${Math.min(i * 90, 450)}ms` }}
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
                        </div>
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
            <style>{`@keyframes fadeInEvents { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    )
}
