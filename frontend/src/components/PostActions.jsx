import { memo, useEffect, useState, useRef } from 'react'
import { Eye, Heart, ThumbsUp } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'
import { showApiError } from '@/lib/notify'

const SESSION_KEY = 'anon_session_id'

const ensureSession = () => {
  try {
    let s = localStorage.getItem(SESSION_KEY)
    if (!s) {
      s = `anon_${Math.random().toString(36).slice(2)}`
      localStorage.setItem(SESSION_KEY, s)
    }
    return s
  } catch (e) {
    return null
  }
}

// Animated count that briefly scales up when value changes
const AnimatedCount = memo(({ value, active }) => {
  const [animate, setAnimate] = useState(false)
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      setAnimate(true)
      const timer = setTimeout(() => setAnimate(false), 400)
      prevRef.current = value
      return () => clearTimeout(timer)
    }
  }, [value])

  return (
    <span
      className={`inline-block tabular-nums transition-transform duration-300 ${
        animate ? 'scale-125' : 'scale-100'
      } ${active ? 'text-white' : 'text-slate-700'}`}
    >
      {value}
    </span>
  )
})

const PostActions = memo(({ publicationId }) => {
  const [viewCount, setViewCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [votesCount, setVotesCount] = useState(0)
  const [favorited, setFavorited] = useState(false)
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [heartBurst, setHeartBurst] = useState(false)
  const [thumbBurst, setThumbBurst] = useState(false)

  useEffect(() => {
    let mounted = true
    const session = ensureSession()

    const recordAndFetch = async () => {
      try {
        await apiClient.post(`/public/publications/${publicationId}/view`, null, { params: { session } })
      } catch (err) {
        // ignore view failures
      }

      try {
        const resp = await apiClient.get(`/public/publications/${publicationId}/engagement`)
        if (!mounted) return
        const data = resp.data || {}
        setViewCount(data.view_count || 0)
        setFavoritesCount(data.favorites_count || 0)
        setVotesCount(data.votes_count || 0)
        setFavorited(Boolean(data.favorited))
        setVoted(Boolean(data.voted))
      } catch (err) {
        // ignore
      }
    }

    if (publicationId) recordAndFetch()
    return () => { mounted = false }
  }, [publicationId])

  const toggleFavorite = async () => {
    if (loading) return
    setLoading(true)
    const wasFavorited = favorited
    try {
      if (wasFavorited) {
        const resp = await apiClient.delete(`/public/publications/${publicationId}/favorite`)
        setFavorited(false)
        setFavoritesCount(resp.data.favorites_count ?? Math.max(0, favoritesCount - 1))
      } else {
        setHeartBurst(true)
        setTimeout(() => setHeartBurst(false), 600)
        const resp = await apiClient.post(`/public/publications/${publicationId}/favorite`)
        setFavorited(true)
        setFavoritesCount(resp.data.favorites_count ?? (favoritesCount + 1))
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        const detail = err.response.data?.detail
        setFavorited(true)
        if (detail && typeof detail.favorites === 'number') {
          setFavoritesCount(detail.favorites)
        }
      } else if (err?.response?.status !== 401) {
        showApiError(err, 'Không thể thực hiện thao tác yêu thích.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleVote = async () => {
    if (loading) return
    setLoading(true)
    const wasVoted = voted
    try {
      if (wasVoted) {
        const resp = await apiClient.delete(`/public/publications/${publicationId}/vote`)
        setVoted(false)
        setVotesCount(resp.data.votes_count ?? Math.max(0, votesCount - 1))
      } else {
        setThumbBurst(true)
        setTimeout(() => setThumbBurst(false), 600)
        const resp = await apiClient.post(`/public/publications/${publicationId}/vote`)
        setVoted(true)
        setVotesCount(resp.data.votes_count ?? (votesCount + 1))
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        const detail = err.response.data?.detail
        setVoted(true)
        if (detail && typeof detail.votes === 'number') {
          setVotesCount(detail.votes)
        }
      } else if (err?.response?.status !== 401) {
        showApiError(err, 'Không thể thực hiện thao tác bình chọn.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
      {/* View count */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Eye size={16} className="text-slate-400" />
        <span className="font-semibold text-slate-600">{viewCount}</span>
        <span className="text-slate-400">lượt xem</span>
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center gap-3">
        {/* Favorite / Heart button */}
        <button
          type="button"
          onClick={toggleFavorite}
          disabled={loading}
          className={`group relative inline-flex items-center gap-2.5 rounded-2xl border px-5 py-2.5 text-sm font-bold transition-all duration-300 ease-out active:scale-95 ${
            favorited
              ? 'border-transparent bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30'
              : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 hover:shadow-md'
          } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {/* Burst particles on activate */}
          {heartBurst && (
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-[heartBurst_0.6s_ease-out_forwards] rounded-full bg-white/60" />
            </span>
          )}
          <Heart
            size={18}
            className={`transition-all duration-300 ${
              favorited
                ? 'fill-current scale-110'
                : 'group-hover:scale-110 group-hover:text-rose-500'
            } ${heartBurst ? 'animate-[heartPop_0.4s_ease-out]' : ''}`}
          />
          <AnimatedCount value={favoritesCount} active={favorited} />
          <span className={`text-xs font-medium ${favorited ? 'text-white/80' : 'text-slate-400'}`}>
            Yêu thích
          </span>
        </button>

        {/* Vote / ThumbsUp button */}
        <button
          type="button"
          onClick={toggleVote}
          disabled={loading}
          className={`group relative inline-flex items-center gap-2.5 rounded-2xl border px-5 py-2.5 text-sm font-bold transition-all duration-300 ease-out active:scale-95 ${
            voted
              ? 'border-transparent bg-gradient-to-r from-fpt-blue to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md'
          } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {/* Burst particles on activate */}
          {thumbBurst && (
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-[heartBurst_0.6s_ease-out_forwards] rounded-full bg-white/60" />
            </span>
          )}
          <ThumbsUp
            size={18}
            className={`transition-all duration-300 ${
              voted
                ? 'fill-current scale-110'
                : 'group-hover:scale-110 group-hover:text-blue-500'
            } ${thumbBurst ? 'animate-[heartPop_0.4s_ease-out]' : ''}`}
          />
          <AnimatedCount value={votesCount} active={voted} />
          <span className={`text-xs font-medium ${voted ? 'text-white/80' : 'text-slate-400'}`}>
            Bình chọn
          </span>
        </button>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes heartPop {
          0% { transform: scale(1); }
          30% { transform: scale(1.4); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1.1); }
        }
        @keyframes heartBurst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(8); opacity: 0; }
        }
      `}</style>
    </div>
  )
})

export default PostActions
