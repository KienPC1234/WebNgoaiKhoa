import { useEffect, useState, useMemo, useCallback } from 'react'
import { showToast } from '@/lib/notify'
import { apiClient } from '@/lib/apiClient'
import { Card } from '@/components/UI'
import { tierGradientClass } from '@/lib/tierGradients'
import { Users, BookOpen, GraduationCap, Sparkles } from 'lucide-react'
import StaffCardPublic from '@/components/Staff/StaffCardPublic'

// Use `apiClient` which attaches auth token from localStorage

const sanitizeHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
}

export const GioiThieuDoiNgu = () => {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [reactionCounts, setReactionCounts] = useState({})
  const [pageScale, setPageScale] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mediaQuery.matches)
    update()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update)
      return () => mediaQuery.removeEventListener('change', update)
    }

    mediaQuery.addListener(update)
    return () => mediaQuery.removeListener(update)
  }, [])

  // Fetch staff profiles with cancellation support
  useEffect(() => {
    const controller = new AbortController()
    let canceled = false

    const fetchStaff = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get('/public/doingu/staff', { signal: controller.signal })
        if (!canceled) setStaff(res.data || [])
      } catch (error) {
        if (!apiClient.isCancel(error)) {
          console.error('Error fetching staff profiles:', error)
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    fetchStaff()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [])


  // Fetch public social-scale (hero subtitle) so admin can configure hero paragraph
  useEffect(() => {
    const controller = new AbortController()
    let canceled = false

    const fetchScale = async () => {
      try {
        const res = await apiClient.get('/public/doingu/scale', { signal: controller.signal })
        if (!canceled) setPageScale(res.data || null)
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.message === 'canceled') {
          // aborted
        } else {
          console.error('Error fetching public social scale:', err)
        }
      }
    }

    fetchScale()

    return () => {
      canceled = true
      controller.abort()
    }
  }, [])


  useEffect(() => {
    // fetch per-user reaction state for all staff in a single request with cancellation
    if (!staff || staff.length === 0) return
    const token = (typeof window !== 'undefined' && window.localStorage)
      ? window.localStorage.getItem('access_token')
      : null
    if (!token) return
    const controller = new AbortController()
    let canceled = false

    const loadCounts = async () => {
      try {
        const ids = staff.map((s) => s.id).join(',')
        const res = await apiClient.get(`/public/doingu/staff/reactions?ids=${ids}`, { signal: controller.signal })
        const newCounts = res.data || {}
        setReactionCounts((prev) => {
          try {
            if (JSON.stringify(prev) === JSON.stringify(newCounts)) return prev
          } catch (e) {}
          return newCounts
        })
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.message === 'canceled') {
          // aborted
        } else {
          // ignore other reaction fetch errors for now
        }
      }
    }

    loadCounts()

    return () => {
      canceled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff])

  useEffect(() => {
    if (!Array.isArray(staff) || staff.length === 0 || typeof window === 'undefined') return
    const topImageUrls = staff
      .filter((s) => !!(s.image_optimized_url || s.image_url))
      .slice(0, 2)
      .map((s) => s.image_optimized_url || s.image_url)

    const preloads = topImageUrls.map((url) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      return img
    })

    return () => {
      preloads.forEach((img) => {
        img.src = ''
      })
    }
  }, [staff])

  const reactToStaff = useCallback(async (staffId, type) => {
    try {
      const res = await apiClient.post(`/public/doingu/staff/${staffId}/react`, { reaction_type: type })
      // server returns { reacted: true, reaction_type: "love" }
      const updated = res.data || { reacted: true, reaction_type: type }
      setReactionCounts((prev) => {
        const prevFor = prev[staffId] || {}
        if (prevFor.reacted === updated.reacted && prevFor.reaction_type === updated.reaction_type) return prev
        return { ...prev, [staffId]: updated }
      })
    } catch (err) {
      if (err && err.response && err.response.status === 401) {
        alert('Vui lòng đăng nhập để phản ứng')
      } else if (err && err.response && err.response.status === 409) {
        showToast('warning', 'Bạn đã phản ứng với nhân viên này rồi')
      } else {
        console.error('Reaction error', err)
      }
    }
  }, [])

  // Top-level derived values and memoized renderers
  const TIER_ORDER = useMemo(() => [
    {
      value: 'management',
      label: 'Tổ trưởng',
      subtitle: 'Điều phối chiến lược và định hướng chuyên môn toàn tổ',
      tone: 'from-amber-400 via-orange-400 to-fpt-orange',
      texture: "https://www.transparenttextures.com/patterns/axiom-pattern.png",
      decorIcon: Sparkles,
    },
    {
      value: 'senior',
      label: 'Trưởng bộ môn',
      subtitle: 'Dẫn dắt học thuật theo từng phân môn trọng điểm',
      tone: 'from-indigo-500 via-blue-500 to-cyan-400',
      texture: "https://www.transparenttextures.com/patterns/diamond-upholstery.png",
      decorIcon: BookOpen,
    },
    {
      value: 'instructor',
      label: 'Giáo viên',
      subtitle: 'Trực tiếp giảng dạy, cố vấn và truyền cảm hứng cho học sinh',
      tone: 'from-emerald-500 via-teal-400 to-cyan-400',
      texture: "https://www.transparenttextures.com/patterns/gplay.png",
      decorIcon: GraduationCap,
    },
  ], [])

  const baseProfiles = staff

  // Determine a small set of eager-loaded staff ids (first N by display_order)
  const eagerCount = isMobile ? 2 : 3
  const eagerIds = useMemo(() => {
    return baseProfiles
      .filter((s) => !!s.image_url)
      .slice(0, eagerCount)
      .map((s) => s.id)
  }, [baseProfiles, eagerCount])

  const sections = useMemo(() => {
    const blocks = TIER_ORDER.map((t) => ({
      key: t.value,
      label: t.label,
      subtitle: t.subtitle,
      tone: t.tone,
      profiles: staff.filter((p) => p.tier === t.value),
    }))
    const others = staff.filter((p) => !p.tier || !TIER_ORDER.some((t) => t.value === p.tier))
    if (others.length) {
      blocks.push({
        key: 'other',
        label: 'Thành viên khác',
        subtitle: 'Nhân sự hỗ trợ và cộng tác theo chuyên đề',
        tone: 'from-slate-500 via-slate-400 to-slate-300',
        texture: 'https://www.transparenttextures.com/patterns/graphy.png',
        decorIcon: Users,
        profiles: others,
      })
    }
    return blocks.filter((b) => b.profiles.length > 0)
  }, [staff, TIER_ORDER])

  const renderCards = useCallback((profiles) => (
    <div className="flex flex-wrap justify-center gap-5 sm:gap-7">
      {profiles.map((p) => (
        <StaffCardPublic key={p.id} person={p} reaction={reactionCounts[p.id]} onReact={reactToStaff} eager={eagerIds.includes(p.id)} />
      ))}
    </div>
  ), [reactionCounts, reactToStaff, eagerIds])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.14),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(16,185,129,0.11),transparent_30%),#f8fafc] pb-20">
      <section className="bg-gradient-to-br from-[#14235a] via-[#253680] to-[#0b3f78] text-white py-14 sm:py-20 md:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/clean-gray-paper.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl animate-[staffOrb_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-20 -right-8 h-60 w-60 rounded-full bg-amber-300/20 blur-3xl animate-[staffOrb_10s_ease-in-out_infinite]" />
        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-5 sm:space-y-7 md:space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-[0.16em] sm:tracking-[0.3em] border border-white/20 shadow-xl animate-[fadeInStaff_260ms_ease-out]">
            <Users size={16} className="text-blue-400" />
            <span>Gương mặt tiêu biểu</span>
          </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black italic leading-tight animate-[fadeInStaff_360ms_ease-out]">
            ĐỘI NGŨ <br />
            <span
              className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-blue-300 to-amber-200 not-italic gradient-text-fix pt-2 pb-2 sm:pt-3 sm:pb-3 md:pt-6 md:pb-6"
              style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              GIÁO VIÊN TÂM HUYẾT
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-blue-50 max-w-3xl mx-auto font-medium leading-relaxed px-2 animate-[fadeInStaff_460ms_ease-out]">
              {pageScale && (pageScale.staff_hero || pageScale.hero_subtitle) ? (
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageScale.staff_hero || pageScale.hero_subtitle) }} />
              ) : (
                'Hội tụ những chuyên gia giàu kinh nghiệm, không ngừng sáng tạo và truyền lửa đam mê cho thế hệ học sinh.'
              )}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 mt-10 sm:mt-14 md:mt-20">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-96 rounded-[40px] bg-white animate-pulse" />)}
          </div>
        )}

        {!loading && staff.length === 0 && (
          <Card className="p-12 text-center rounded-[40px] border-dashed border-2 border-gray-200 bg-white mb-8">
            <Users size={42} className="mx-auto text-gray-300 mb-4" />
          </Card>
        )}

        

        {!loading && sections.map((section, index) => (
          <section
            key={section.key}
            className="mt-10 sm:mt-12 rounded-[28px] sm:rounded-[36px] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/75 to-blue-50/45 p-5 sm:p-7 md:p-9 shadow-[0_22px_46px_-30px_rgba(15,23,42,0.45)] overflow-hidden relative"
          >
            {(() => {
              const DecorIcon = section.decorIcon || Sparkles
              return (
                <>
                  <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ backgroundImage: `url('${section.texture}')` }} />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent" />
                  <div className={`absolute -right-24 -top-24 h-48 w-48 rounded-full bg-gradient-to-br ${section.tone} opacity-15 blur-3xl`} />
                  <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 text-slate-300/60">
                    <DecorIcon size={56} strokeWidth={1.4} />
                  </div>
                  <div className="absolute top-5 right-20 hidden md:block text-slate-300/50 rotate-[-12deg]">
                    <DecorIcon size={26} strokeWidth={1.8} />
                  </div>
                </>
              )
            })()}
            <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${section.key === 'other' ? 'from-slate-400 to-slate-600' : tierGradientClass(section.key)} text-white grid place-items-center shadow-lg`}>
                  {index === 0 ? <Sparkles size={18} /> : index === 1 ? <BookOpen size={18} /> : <GraduationCap size={18} />}
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                    {section.label}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
                    {section.subtitle}
                  </p>
                </div>
              </div>
              <div className="rounded-full bg-white/90 px-4 py-2 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-600 border border-slate-200">
                {section.profiles.length} hồ sơ
              </div>
            </div>
            {renderCards(section.profiles)}
          </section>
        ))}
      </div>
      <style>{`
        @keyframes fadeInStaff { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes staffOrb { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(8px,-10px,0); } }
      `}</style>
    </div>
  )
}

export default GioiThieuDoiNgu
