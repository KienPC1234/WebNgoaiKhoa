import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronRight, Clock3, PlayCircle, Sparkles } from 'lucide-react'
import { Button, Card } from '@/components/ui/core'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/apiClient'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const toPlainText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const looksLikeLowQualityShortDescription = (value, item) => {
  const text = toPlainText(value)
  if (!text) return true
  if (text.length < 20) return true

  const title = toPlainText(item?.title || '').toLowerCase()
  const subject = String(item?.subject || '').toLowerCase()
  const contentType = String(item?.content_type || '').toLowerCase()
  const normalized = text.toLowerCase()

  if (title && subject && contentType && normalized === `${title} ${subject} ${contentType}`.trim()) {
    return true
  }

  return false
}

const getPublicationCardDescription = (item) => {
  const primary = item?.short_description || ''
  if (!looksLikeLowQualityShortDescription(primary, item)) {
    return toPlainText(primary)
  }

  const layoutMeta = item?.layout_metadata || {}
  const metadata = layoutMeta?.metadata || {}
  const candidate =
    metadata?.short_description ||
    layoutMeta?.short_description ||
    metadata?.summary ||
    layoutMeta?.summary ||
    metadata?.description ||
    layoutMeta?.description ||
    item?.content ||
    item?.snippet ||
    ''

  return toPlainText(candidate)
}

/** Returns an embeddable iframe src if the URL is a known embeddable source, otherwise null. */
const getEmbedUrl = (url) => {
  if (!url) return null
  // Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/)
  if (driveOpenMatch) return `https://drive.google.com/file/d/${driveOpenMatch[1]}/preview`
  // YouTube
  if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/')
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/')
  return null
}

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

const getCountdown = (eventDate, nowTs) => {
  const target = new Date(eventDate).getTime()
  if (!Number.isFinite(target)) return null
  const diff = Math.max(0, target - nowTs)

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return {
    expired: target <= nowTs,
    days,
    hours,
    minutes,
    seconds,
  }
}

const getEventHref = (event) => {
  if (event?.linked_post_id) return `/posts/${event.linked_post_id}`
  return '/events/upcoming'
}

const EventCountdown = memo(({ eventDate, nowTs, compact = false }) => {
  const countdown = getCountdown(eventDate, nowTs)
  if (!countdown) return null

  return (
    <div className={`mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <span className="inline-flex items-center gap-1 font-black uppercase tracking-[0.12em] text-fpt-orange">
        <Clock3 size={compact ? 11 : 12} /> {countdown.expired ? 'Đang diễn ra' : 'Đếm ngược'}
      </span>
      {!countdown.expired ? (
        <>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-black text-slate-700">{countdown.days}N</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-black text-slate-700">{countdown.hours}G</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-black text-slate-700">{countdown.minutes}P</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-black text-slate-700">{countdown.seconds}S</span>
        </>
      ) : null}
    </div>
  )
})

export const Home = () => {
  const [siteTexts, setSiteTexts] = useState(null)
  const [newsItems, setNewsItems] = useState([])
  const [eventItems, setEventItems] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [heroIndex, setHeroIndex] = useState(0)
  const [prevHeroIndex, setPrevHeroIndex] = useState(null)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      setLoadingNews(true)
      setLoadingEvents(true)
      try {
        const [textsResp, contestResp, eventsResp] = await Promise.all([
          apiClient.get('/public/site-texts', { signal: controller.signal }),
          apiClient.get('/public/publications?content_type=cuoc-thi&limit=8', { signal: controller.signal }),
          apiClient.get('/public/events/upcoming', { signal: controller.signal }),
        ])

        setSiteTexts(textsResp.data || {})
        setNewsItems(Array.isArray(contestResp.data) ? contestResp.data.slice(0, 8) : [])
        setEventItems(Array.isArray(eventsResp.data) ? eventsResp.data : [])
      } catch (err) {
        if (!apiClient.isCancel(err)) console.error('Error fetching site info:', err)
      } finally {
        setLoadingNews(false)
        setLoadingEvents(false)
      }
    }

    fetchData()
    return () => controller.abort()
  }, [])

  const hero = siteTexts?.hero || {}
  const newsSection = siteTexts?.news_section || {}
  const eventsSection = siteTexts?.events_section || {}
  const videosSection = siteTexts?.videos_section || {}

  const heroImages = useMemo(() => {
    const list = Array.isArray(hero.background_images) ? hero.background_images.filter(Boolean) : []
    if (list.length > 0) return list
    if (hero.background_image_url) return [hero.background_image_url]
    return []
  }, [hero.background_images, hero.background_image_url])

  const transitionTimeoutRef = useRef(null)

  const goToHeroIndex = useCallback((newIndex) => {
    setHeroIndex((prev) => {
      setPrevHeroIndex(prev)
      return newIndex
    })
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    transitionTimeoutRef.current = setTimeout(() => setPrevHeroIndex(null), 900)
  }, [])

  useEffect(() => {
    if (heroImages.length <= 1) return undefined
    const interval = hero.background_transition_interval_ms || 6500
    const timer = setInterval(() => {
      goToHeroIndex((heroIndex + 1) % heroImages.length)
    }, interval)
    return () => clearInterval(timer)
  }, [heroImages.length, hero.background_transition_interval_ms, heroIndex, goToHeroIndex])

  useEffect(() => {
    if (heroIndex >= heroImages.length) goToHeroIndex(0)
  }, [heroImages.length, heroIndex, goToHeroIndex])

  useEffect(() => () => { if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current) }, [])

  useEffect(() => {
    if (heroImages.length <= 1) return
    const nextIndex = (heroIndex + 1) % heroImages.length
    const nextSrc = heroImages[nextIndex]
    if (!nextSrc) return

    const img = new Image()
    img.src = nextSrc
  }, [heroImages, heroIndex])

  const currentHeroImage = heroImages[heroIndex] || ''

  const videos = Array.isArray(videosSection.items) ? videosSection.items.filter((v) => v?.url) : []
  const nextEvent = eventItems.length > 0 ? eventItems[0] : null
  const nextEventCountdown = nextEvent ? getCountdown(nextEvent.event_date, nowTs) : null

  return (
    <div className="space-y-24 pb-24">
      <section className="relative min-h-[85vh] overflow-hidden pt-20 md:pt-24">
        {/* Full-bleed background image carousel */}
        <div className="pointer-events-none absolute inset-0 z-0">
          {heroImages.length > 0 ? (
            <>
              {/* Exiting image — slides out to left or fades out */}
              {prevHeroIndex !== null && heroImages[prevHeroIndex] && (
                <img
                  key={`prev-${heroImages[prevHeroIndex]}`}
                  src={heroImages[prevHeroIndex]}
                  alt=""
                  aria-hidden="true"
                  className={`absolute inset-0 h-full w-full object-cover ${
                    hero.background_transition_effect === 'fade'
                      ? 'animate-[fadeOut_0.9s_ease-in-out_forwards]'
                      : 'animate-[slideOut_0.9s_ease-in-out_forwards]'
                  }`}
                  decoding="async"
                />
              )}
              {/* Entering image — slides in from right or fades in */}
              <img
                key={`hero-${currentHeroImage}`}
                src={currentHeroImage}
                alt="Hero background"
                className={`absolute inset-0 h-full w-full object-cover ${
                  prevHeroIndex !== null
                    ? hero.background_transition_effect === 'fade'
                      ? 'animate-[fadeIn_0.9s_ease-in-out_forwards]'
                      : 'animate-[slideIn_0.9s_ease-in-out_forwards]'
                    : ''
                }`}
                fetchpriority="high"
                decoding="async"
              />
              {/* Dark overlay for text readability - lighter on left where text is */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/30 via-slate-900/20 to-slate-900/5" />
              <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0">
              <div className="absolute -right-32 -top-40 h-[680px] w-[680px] rounded-full bg-fpt-orange/12 blur-[100px]" />
              <div className="absolute -bottom-32 -left-24 h-[500px] w-[500px] rounded-full bg-fpt-blue/8 blur-[100px]" />
              <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-orange-200/20 blur-[80px]" />
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #F27024 1px, transparent 0)', backgroundSize: '32px 32px' }} />
              <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/30 to-white/90" />
            </div>
          )}
        </div>

        <div className="app-section relative z-10 flex min-h-[calc(85vh-5rem)] flex-col justify-center pb-16">
          <div className="max-w-2xl">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200/60 bg-white/70 px-4 py-1.5 backdrop-blur-sm shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-fpt-orange animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-fpt-orange">Tổ xã hội FSC Hoà Lạc</span>
            </div>
            <h1
              className={`mt-6 text-balance text-4xl font-black uppercase leading-[0.92] sm:text-6xl md:text-7xl ${heroImages.length > 0 ? 'text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]' : 'text-fpt-blue'}`}
            >
              <span className="block">{hero.line1 || 'Trải nghiệm'}</span>
              <span className="mt-3 block pb-3 md:pb-6">
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-fpt-orange to-orange-400 bg-clip-text text-transparent italic gradient-text-fix pr-2 md:pr-2">
                    {hero.line2 || 'Sáng tạo'}
                  </span>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-1 left-1 right-1 z-0 h-3 -rotate-1 rounded-full bg-fpt-orange/25 motion-safe:animate-[waveFloat_2.6s_ease-in-out_infinite]"
                    style={{
                      transformOrigin: 'center',
                      animationName: 'waveFloat',
                    }}
                  />
                </span>
              </span>
            </h1>
            <style>{`@keyframes waveFloat { 0%, 100% { transform: translateY(0) scaleX(1) rotate(-1deg); } 25% { transform: translateY(-2px) scaleX(1.03) rotate(-0.2deg); } 50% { transform: translateY(1px) scaleX(0.98) rotate(-1.4deg); } 75% { transform: translateY(-1px) scaleX(1.02) rotate(-0.6deg); } } @keyframes slideIn { 0% { transform: translateX(100%); } 100% { transform: translateX(0); } } @keyframes slideOut { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } } @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } } @keyframes fadeOut { 0% { opacity: 1; } 100% { opacity: 0; } }`}</style>
            <p
              className={`mt-6 max-w-xl text-base font-semibold leading-relaxed md:text-lg ${heroImages.length > 0 ? 'text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]' : 'text-slate-600'}`}
            >
              {hero.description || 'Tôn trọng cá nhân, đề cao sự tự lập và phát triển con người toàn diện.'}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/news">
                <Button className="rounded-2xl bg-fpt-orange px-7 py-4 text-sm font-black uppercase tracking-widest text-white shadow-[0_18px_40px_-16px_rgba(242,112,36,0.75)] hover:bg-[#de631d] hover:shadow-[0_20px_46px_-16px_rgba(242,112,36,0.85)] transition-all">
                  {hero.cta_primary || 'Khám phá ngay'}
                </Button>
              </Link>
              <Link to="/doingu/scale" className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3.5 text-xs font-black uppercase tracking-widest backdrop-blur-sm transition-all ${heroImages.length > 0 ? 'border-white/30 bg-white/10 text-white hover:bg-white/20' : 'border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-fpt-blue'}`}>
                Giới thiệu <ChevronRight size={14} />
              </Link>
            </div>

            {/* Carousel dot indicators */}
            {heroImages.length > 1 ? (
              <div className="mt-8 flex items-center gap-2">
                {heroImages.map((_, idx) => (
                  <button
                    key={`dot-${idx}`}
                    type="button"
                    aria-label={`Chuyển ảnh nền ${idx + 1}`}
                    onClick={() => goToHeroIndex(idx)}
                    className={`h-2 rounded-full transition-all ${heroIndex === idx ? 'w-8 bg-fpt-orange' : `w-2 ${heroImages.length > 0 ? 'bg-white/50' : 'bg-slate-400/60'}`}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="app-section" data-ai-anchor="home-news-contest">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-fpt-orange">
              <Sparkles size={14} /> Cuộc thi
            </p>
            <h2 className="text-3xl font-black uppercase text-fpt-blue md:text-5xl">{newsSection.title || 'Tin tức cập nhật'}</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-500 md:text-base">
              {newsSection.subtitle || 'Bài viết cuộc thi mới nhất từ học sinh và giáo viên.'}
            </p>
          </div>
          <Link to="/phanmon/van?tab=sang-tac" className="hidden items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200 md:inline-flex">
            Tin tức <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loadingNews ? (
            [1, 2, 3].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)
          ) : newsItems.length === 0 ? (
            <Card className="col-span-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center md:col-span-2 xl:col-span-3">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Chưa có bài viết cuộc thi mới.</p>
            </Card>
          ) : (
            newsItems.map((item, idx) => (
              <Link key={item.id || idx} to={item.id ? `/posts/${item.id}` : '/events/upcoming'} className="block">
                <Card className="overflow-hidden rounded-2xl border border-slate-100 p-0 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative h-44 bg-slate-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-blue-100" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span>Cuộc thi</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <h3 className="line-clamp-2 pt-2 md:pt-2 text-xl font-black leading-tight text-slate-800">{item.title}</h3>
                    <p className="mt-3 line-clamp-4 text-sm font-medium leading-relaxed text-slate-500">{getPublicationCardDescription(item)}</p>
                    <div className="mt-5 border-t border-slate-100 pt-3 text-[11px] font-bold uppercase tracking-wider text-fpt-orange">
                      Bài viết cuộc thi
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="app-section" data-ai-anchor="home-events-dynamic">
        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-fpt-blue">
            <CalendarDays size={14} /> Sự kiện
          </p>
          <h2 className="text-3xl font-black uppercase text-fpt-blue md:text-5xl">{eventsSection.title || 'Lịch sự kiện'}</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-500 md:text-base">
            {eventsSection.subtitle || 'Theo dõi các sự kiện quan trọng trong thời gian tới.'}
          </p>
          {nextEventCountdown ? (
            <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-fpt-orange">
                <Clock3 size={13} /> {nextEventCountdown.expired ? 'Đang diễn ra' : 'Đếm ngược'}
              </span>
              {!nextEventCountdown.expired ? (
                <>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{nextEventCountdown.days}N</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{nextEventCountdown.hours}G</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{nextEventCountdown.minutes}P</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{nextEventCountdown.seconds}S</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {loadingEvents ? (
          <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        ) : eventItems.length === 0 ? (
          <Card className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Chưa có sự kiện sắp diễn ra.</p>
          </Card>
        ) : eventItems.length === 1 ? (
          <Link to={getEventHref(eventItems[0])} className="block">
            <Card className="overflow-hidden rounded-3xl border border-orange-100 p-0 shadow-[0_24px_50px_-28px_rgba(242,112,36,0.65)] transition-all hover:-translate-y-1 hover:shadow-[0_26px_58px_-30px_rgba(242,112,36,0.7)]">
              <div className="grid gap-0 md:grid-cols-2">
                <div className="relative min-h-[260px] bg-slate-100">
                  {eventItems[0].image_url ? (
                    <img src={eventItems[0].image_url} alt={eventItems[0].title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-fpt-orange/20 to-fpt-blue/20" />
                  )}
                </div>
                <div className="flex flex-col justify-center p-8">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-fpt-orange">Sự kiện nổi bật</p>
                  <h3 className="mt-2 text-3xl font-black leading-tight text-slate-900">{eventItems[0].title}</h3>
                  <p className="mt-3 text-sm font-medium text-slate-600">{toPlainText(eventItems[0].description || '')}</p>
                  <div className="mt-5 inline-flex w-fit items-center rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                    {formatDate(eventItems[0].event_date)} • {eventItems[0].location}
                  </div>
                  <EventCountdown eventDate={eventItems[0].event_date} nowTs={nowTs} />
                </div>
              </div>
            </Card>
          </Link>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            <Link to={getEventHref(eventItems[0])} className="block lg:col-span-2">
              <Card className="rounded-3xl border border-slate-100 p-0 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="relative min-h-[220px] bg-slate-100">
                    {eventItems[0].image_url ? (
                      <img src={eventItems[0].image_url} alt={eventItems[0].title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-fpt-blue/15 to-fpt-orange/15" />
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-fpt-blue">Sắp diễn ra gần nhất</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">{eventItems[0].title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm text-slate-600">{toPlainText(eventItems[0].description || '')}</p>
                    <div className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{formatDate(eventItems[0].event_date)} • {eventItems[0].location}</div>
                    <EventCountdown eventDate={eventItems[0].event_date} nowTs={nowTs} />
                  </div>
                </div>
              </Card>
            </Link>

            <div className="space-y-4">
              {eventItems.slice(1, 5).map((event, idx) => (
                <Link key={event.id || idx} to={getEventHref(event)} className="block">
                  <Card className="rounded-2xl border border-slate-100 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <h4 className="line-clamp-2 text-base font-black leading-tight text-slate-900">{event.title}</h4>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{toPlainText(event.description || '')}</p>
                    <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-fpt-orange">{formatDate(event.event_date)} • {event.location}</div>
                    <EventCountdown eventDate={event.event_date} nowTs={nowTs} compact />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="app-section" data-ai-anchor="home-intro-videos">
        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-fpt-orange">
            <PlayCircle size={14} /> Media
          </p>
          <h2 className="text-3xl font-black uppercase text-fpt-blue md:text-5xl">{videosSection.title || 'Video giới thiệu'}</h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-500 md:text-base">
            {videosSection.subtitle || 'Khám phá hoạt động và tinh thần học tập qua những thước phim ngắn.'}
          </p>
        </div>

        {videos.length === 0 ? (
          <Card className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Chưa có video giới thiệu.</p>
          </Card>
        ) : (
          <div className="custom-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3">
            {videos.map((video, idx) => {
              const embedUrl = getEmbedUrl(video.url)
              return (
                <Card key={`${video.url}-${idx}`} className="min-w-[380px] max-w-[480px] snap-start rounded-2xl border border-slate-100 p-0 shadow-sm overflow-hidden">
                  <div className="relative w-full aspect-video bg-slate-900">
                    {embedUrl ? (
                      <iframe
                        src={embedUrl}
                        title={video.title || 'Video giới thiệu'}
                        className="absolute inset-0 h-full w-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={video.url}
                        poster={video.thumbnail_url || undefined}
                        controls
                        preload="metadata"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="line-clamp-2 text-base font-black text-slate-900">{video.title || 'Video giới thiệu'}</h4>
                    <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{video.description || 'Nội dung giới thiệu về hoạt động nổi bật.'}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}