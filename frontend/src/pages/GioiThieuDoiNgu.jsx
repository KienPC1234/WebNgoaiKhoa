import { useEffect, useState, useMemo, useCallback } from 'react'
import { showToast } from '@/lib/notify'
import { apiClient } from '@/lib/apiClient'
import { Card } from '@/components/UI'
import { tierGradientClass, tierLabel } from '@/lib/tierGradients'
import { Users, BookOpen, GraduationCap, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
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
  const [selectedTier, setSelectedTier] = useState('')
  const [reactionCounts, setReactionCounts] = useState({})
  const [pageScale, setPageScale] = useState(null)

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
        if (error?.name === 'CanceledError' || error?.message === 'canceled') {
          // request aborted
        } else {
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
    { value: 'management', label: 'Tổ trưởng' },
    { value: 'senior', label: 'Trưởng bộ môn' },
    { value: 'instructor', label: 'Giảng viên' },
  ], [])

  const filtered = useMemo(() => staff.filter(p => !selectedTier || p.tier === selectedTier), [staff, selectedTier])

  // Determine a small set of eager-loaded staff ids (first N by display_order)
  const eagerCount = 8
  const eagerIds = useMemo(() => {
    return staff.slice(0, eagerCount).map(s => s.id)
  }, [staff])

  const renderCards = useCallback((profiles) => (
    <div className="flex flex-wrap justify-center gap-8">
      {profiles.map((p) => (
        <StaffCardPublic key={p.id} person={p} reaction={reactionCounts[p.id]} onReact={reactToStaff} eager={eagerIds.includes(p.id)} />
      ))}
    </div>
  ), [reactionCounts, reactToStaff, eagerIds])

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
              className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-200 not-italic gradient-text-fix pt-3 pb-3 md:pt-6 md:pb-6"
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
              {pageScale && (pageScale.staff_hero || pageScale.hero_subtitle) ? (
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageScale.staff_hero || pageScale.hero_subtitle) }} />
              ) : (
                'Hội tụ những chuyên gia giàu kinh nghiệm, không ngừng sáng tạo và truyền lửa đam mê cho thế hệ học sinh.'
              )}
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
          </Card>
        )}

        

        {selectedTier ? (
          (() => {
            const label = tierLabel(selectedTier)
            const profiles = filtered
            return profiles.length ? (
              <section className="mt-12">
                <h3 className="text-4xl md:text-5xl font-black text-center mb-8">
                  <span className={`text-transparent bg-clip-text gradient-text-fix inline-block bg-gradient-to-r ${tierGradientClass(selectedTier)} inline-block pt-3 pb-3 md:pt-6 md:pb-6`}>
                    {label}
                  </span>
                </h3>
                {renderCards(profiles)}
              </section>
            ) : null
          })()
        ) : (
          <>
            {TIER_ORDER.map((t) => {
              const profiles = staff.filter(p => p.tier === t.value)
              return profiles.length ? (
                <section key={t.value} className="mt-12">
                  <h3 className="text-4xl md:text-6xl font-black text-center mb-8">
                    <span className={`text-transparent bg-clip-text gradient-text-fix inline-block bg-gradient-to-r ${tierGradientClass(t.value)} inline-block pt-3 pb-3 md:pt-6 md:pb-6`}>
                      {tierLabel(t.value)}
                    </span>
                  </h3>
                  {renderCards(profiles)}
                </section>
              ) : null
            })}

            {(() => {
              const unassigned = staff.filter(p => !p.tier || !TIER_ORDER.some(t => t.value === p.tier))
              return unassigned.length ? (
                <section className="mt-12">
                  <h3 className="text-3xl md:text-4xl font-black text-center uppercase mb-8">Khác</h3>
                  {renderCards(unassigned)}
                </section>
              ) : null
            })()}
          </>
        )}
      </div>
    </div>
  )
}

export default GioiThieuDoiNgu
