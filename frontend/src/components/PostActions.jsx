import { useEffect, useState } from 'react'
import { Eye, Heart, ThumbsUp } from 'lucide-react'
import { apiClient } from '@/lib/apiClient'

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

const PostActions = ({ publicationId }) => {
  const [viewCount, setViewCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [votesCount, setVotesCount] = useState(0)
  const [favorited, setFavorited] = useState(false)
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    try {
      if (favorited) {
        const resp = await apiClient.delete(`/public/publications/${publicationId}/favorite`)
        setFavorited(false)
        setFavoritesCount(resp.data.favorites_count ?? Math.max(0, favoritesCount - 1))
      } else {
        const resp = await apiClient.post(`/public/publications/${publicationId}/favorite`)
        setFavorited(true)
        setFavoritesCount(resp.data.favorites_count ?? (favoritesCount + 1))
      }
    } catch (err) {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const toggleVote = async () => {
    setLoading(true)
    try {
      if (voted) {
        const resp = await apiClient.delete(`/public/publications/${publicationId}/vote`)
        setVoted(false)
        setVotesCount(resp.data.votes_count ?? Math.max(0, votesCount - 1))
      } else {
        const resp = await apiClient.post(`/public/publications/${publicationId}/vote`)
        setVoted(true)
        setVotesCount(resp.data.votes_count ?? (votesCount + 1))
      }
    } catch (err) {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 mt-4">
      <div className="inline-flex items-center gap-2 text-sm text-slate-600">
        <Eye size={16} />
        <span className="font-black text-slate-700">{viewCount}</span>
      </div>

      <button
        type="button"
        onClick={toggleFavorite}
        disabled={loading}
        className={`tap-target inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-black transition ${favorited ? 'bg-fpt-orange text-white border-transparent' : 'bg-white text-slate-700'}`}
      >
        <Heart size={16} />
        <span>{favoritesCount}</span>
      </button>

      <button
        type="button"
        onClick={toggleVote}
        disabled={loading}
        className={`tap-target inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-black transition ${voted ? 'bg-fpt-blue text-white border-transparent' : 'bg-white text-slate-700'}`}
      >
        <ThumbsUp size={16} />
        <span>{votesCount}</span>
      </button>
    </div>
  )
}

export default PostActions
