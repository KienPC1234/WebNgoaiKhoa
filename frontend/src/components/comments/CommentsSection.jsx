import { memo, useEffect, useState } from 'react'
import { Card } from '@/components/ui/core'
import { apiClient } from '@/lib/apiClient'
import { confirmAction, toastSuccess, showApiError } from '@/lib/notify'
import { CornerDownRight, MessageSquare, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import CommentComposer from './CommentComposer'

const sanitizeCommentHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
}

const parseMentionUserId = (rawValue) => {
  const raw = String(rawValue || '').trim()
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'number' && Number.isInteger(parsed)) return parsed
    if (typeof parsed === 'string') return parseMentionUserId(parsed)
    if (parsed && typeof parsed === 'object') {
      const uid = parsed.id ?? parsed.user ?? parsed.user_id
      if (typeof uid === 'number' && Number.isInteger(uid)) return uid
      if (typeof uid === 'string' && /^\d+$/.test(uid)) return Number(uid)
    }
  } catch {
    // Non-JSON mention payloads are handled below.
  }

  if (/^\d+$/.test(raw)) return Number(raw)
  const tokenMatch = raw.match(/^@u:(\d+)(?::.*)?$/)
  if (tokenMatch) return Number(tokenMatch[1])
  return null
}

const buildMentionTooltip = (profile) => {
  if (!profile) return 'Xem hồ sơ người được nhắc'
  const parts = []
  if (profile.full_name) parts.push(profile.full_name)
  if (profile.role) parts.push(profile.role)
  return parts.join(' • ') || 'Xem hồ sơ người được nhắc'
}

const humanizeRole = (role) => {
  const map = {
    admin: 'Quản trị viên',
    website_manager: 'Quản lý website',
    submission_judge: 'Giám khảo',
    teacher: 'Giáo viên',
    student: 'Học sinh',
  }
  return map[String(role || '').toLowerCase()] || (role || 'Người dùng')
}

const enhanceMentionHtml = (html, mentionIds = [], mentionProfiles = {}) => {
  const safeHtml = sanitizeCommentHtml(html)
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return safeHtml

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${safeHtml}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return safeHtml

  const mentionNodes = Array.from(root.querySelectorAll('[data-mention], .mention'))
  let mentionFallbackIndex = 0

  for (const node of mentionNodes) {
    let mentionUserId = parseMentionUserId(node.getAttribute('data-mention'))
    if (!mentionUserId && mentionFallbackIndex < mentionIds.length) {
      mentionUserId = mentionIds[mentionFallbackIndex]
      mentionFallbackIndex += 1
    }
    if (!mentionUserId) continue

    const profile = mentionProfiles[mentionUserId]
    const tooltip = buildMentionTooltip(profile)
    const href = `/profile/public/${mentionUserId}`

    let anchor = null
    if (node.tagName.toLowerCase() === 'a') {
      anchor = node
    } else {
      anchor = doc.createElement('a')
      anchor.innerHTML = node.innerHTML || node.textContent || ''
      node.replaceWith(anchor)
    }

    anchor.setAttribute('href', href)
    anchor.setAttribute('title', tooltip)
    anchor.setAttribute('data-mention-id', String(mentionUserId))
    anchor.classList.add('comment-mention-link')

    const wrap = doc.createElement('span')
    wrap.classList.add('comment-mention-wrap')

    const tooltipCard = doc.createElement('span')
    tooltipCard.classList.add('comment-mention-tooltip-card')

    const nameEl = doc.createElement('span')
    nameEl.classList.add('comment-mention-tooltip-name')
    nameEl.textContent = profile?.full_name || `Người dùng #${mentionUserId}`
    tooltipCard.appendChild(nameEl)

    const roleEl = doc.createElement('span')
    roleEl.classList.add('comment-mention-tooltip-meta')
    roleEl.textContent = `Vai trò: ${humanizeRole(profile?.role)}`
    tooltipCard.appendChild(roleEl)

    const postCountEl = doc.createElement('span')
    postCountEl.classList.add('comment-mention-tooltip-meta')
    const submissionsCount = Number.isInteger(profile?.submissions_count) ? profile.submissions_count : 0
    postCountEl.textContent = `Bài viết: ${submissionsCount}`
    tooltipCard.appendChild(postCountEl)

    if (profile?.email) {
      const emailEl = doc.createElement('span')
      emailEl.classList.add('comment-mention-tooltip-meta')
      emailEl.textContent = `Email: ${profile.email}`
      tooltipCard.appendChild(emailEl)
    }

    const ctaEl = doc.createElement('span')
    ctaEl.classList.add('comment-mention-tooltip-cta')
    ctaEl.textContent = 'Mở hồ sơ công khai'
    tooltipCard.appendChild(ctaEl)

    anchor.replaceWith(wrap)
    wrap.appendChild(anchor)
    wrap.appendChild(tooltipCard)
  }

  return root.innerHTML
}

const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw)?.id : null
  } catch {
    return null
  }
}

const getInitials = (name) => {
  const normalized = String(name || '').trim()
  if (!normalized) return '?'
  const parts = normalized.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase()
}

const getAvatarTone = (seed) => {
  const tones = [
    'from-orange-200 to-orange-300 text-orange-800',
    'from-blue-200 to-blue-300 text-blue-800',
    'from-emerald-200 to-emerald-300 text-emerald-800',
    'from-purple-200 to-purple-300 text-purple-800',
    'from-amber-200 to-amber-300 text-amber-800',
    'from-rose-200 to-rose-300 text-rose-800',
  ]
  const source = String(seed || '')
  let hash = 0
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) % 997
  return tones[Math.abs(hash) % tones.length]
}

const CommentAvatar = memo(({ name, imageUrl, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm'
  const initials = getInitials(name)
  const tone = getAvatarTone(name)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'avatar'}
        className={`${sizeClass} rounded-full border border-white/80 object-cover shadow-sm`}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <div className={`${sizeClass} inline-flex items-center justify-center rounded-full border border-white/80 bg-gradient-to-br font-black shadow-sm ${tone}`}>
      {initials}
    </div>
  )
})

export const CommentsSection = memo(({ publicationId, commentsEnabled }) => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [composerAutoFocus, setComposerAutoFocus] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [replyingToId, setReplyingToId] = useState(null)
  const [reactingById, setReactingById] = useState({})
  const [mentionProfiles, setMentionProfiles] = useState({})

  const currentUserId = getCurrentUserId()

  const fetchComments = async () => {
    setLoading(true)
    try {
      const resp = await apiClient.get(`/public/publications/${publicationId}/comments`)
      setComments(resp.data || [])
    } catch (err) {
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (publicationId) fetchComments()
  }, [publicationId])

  useEffect(() => {
    const mentionIds = Array.from(
      new Set(
        comments
          .flatMap((item) => (Array.isArray(item.mentions) ? item.mentions : []))
          .filter((id) => Number.isInteger(id) && !mentionProfiles[id])
      )
    )

    if (!mentionIds.length) return

    let cancelled = false
    ;(async () => {
      const loaded = await Promise.all(
        mentionIds.map(async (id) => {
          try {
            const resp = await apiClient.get(`/public/users/${id}`)
            const user = resp.data?.user
            const submissionsCount = Array.isArray(resp.data?.submissions) ? resp.data.submissions.length : 0
            if (!user) return null
            return [
              id,
              {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
                email: user.email,
                image_url: user.image_url,
                submissions_count: submissionsCount,
              },
            ]
          } catch {
            return null
          }
        })
      )
      if (cancelled) return

      const entries = loaded.filter(Boolean)
      if (!entries.length) return
      setMentionProfiles((prev) => {
        const next = { ...prev }
        for (const [id, profile] of entries) {
          next[id] = profile
        }
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [comments, mentionProfiles])

  useEffect(() => {
    if (composerAutoFocus) {
      const t = setTimeout(() => setComposerAutoFocus(false), 300)
      return () => clearTimeout(t)
    }
  }, [composerAutoFocus])

  const handleDeleteComment = async (comment) => {
    const confirmed = await confirmAction({
      title: 'Xóa bình luận?',
      text: 'Bình luận này sẽ bị xóa vĩnh viễn.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return

    setDeletingId(comment.id)
    try {
      await apiClient.delete(`/public/publications/${publicationId}/comments/${comment.id}`)
      await fetchComments()
      toastSuccess('Đã xóa bình luận.')
    } catch (err) {
      showApiError(err, 'Không thể xóa bình luận.')
    } finally {
      setDeletingId(null)
    }
  }

  const applyReactionPayload = (commentId, payload) => {
    setComments((prev) => prev.map((item) => {
      if (item.id !== commentId) return item
      return {
        ...item,
        like_count: payload.like_count,
        dislike_count: payload.dislike_count,
        user_reaction: payload.user_reaction,
      }
    }))
  }

  const handleReact = async (comment, reactionType) => {
    const existing = comment.user_reaction
    setReactingById((prev) => ({ ...prev, [comment.id]: true }))
    try {
      if (existing === reactionType) {
        const resp = await apiClient.delete(`/public/publications/${publicationId}/comments/${comment.id}/react`)
        applyReactionPayload(comment.id, resp.data || { like_count: 0, dislike_count: 0, user_reaction: null })
      } else {
        const resp = await apiClient.post(`/public/publications/${publicationId}/comments/${comment.id}/react`, { reaction_type: reactionType })
        applyReactionPayload(comment.id, resp.data || { like_count: 0, dislike_count: 0, user_reaction: reactionType })
      }
    } catch (err) {
      showApiError(err, 'Không thể cập nhật cảm xúc bình luận.')
    } finally {
      setReactingById((prev) => ({ ...prev, [comment.id]: false }))
    }
  }

  const roots = comments
    .filter((item) => !item.parent_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const repliesByParent = comments.reduce((acc, item) => {
    if (!item.parent_id) return acc
    if (!acc[item.parent_id]) acc[item.parent_id] = []
    acc[item.parent_id].push(item)
    return acc
  }, {})

  Object.keys(repliesByParent).forEach((key) => {
    repliesByParent[key].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })

  const renderCommentActions = (comment, isReply = false) => {
    const isReacting = !!reactingById[comment.id]
    const activeLike = comment.user_reaction === 'like'
    const activeDislike = comment.user_reaction === 'dislike'
    const canReply = !isReply

    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleReact(comment, 'like')}
          disabled={isReacting}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${activeLike ? 'border-blue-200 bg-blue-50 text-fpt-blue' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'} disabled:opacity-50`}
        >
          <ThumbsUp size={12} /> {comment.like_count || 0}
        </button>
        <button
          type="button"
          onClick={() => handleReact(comment, 'dislike')}
          disabled={isReacting}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${activeDislike ? 'border-red-200 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'} disabled:opacity-50`}
        >
          <ThumbsDown size={12} /> {comment.dislike_count || 0}
        </button>
        {canReply && (
          <button
            type="button"
            onClick={() => setReplyingToId((prev) => (prev === comment.id ? null : comment.id))}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${replyingToId === comment.id ? 'border-orange-200 bg-orange-50 text-fpt-orange' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
          >
            <CornerDownRight size={12} /> Trả lời
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="m-0 inline-flex items-center gap-2 text-lg font-black text-slate-800">
          <MessageSquare size={18} className="text-fpt-orange" />
          Bình luận
          {comments.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{comments.length}</span>}
        </h3>
        {commentsEnabled && (
          <button
            type="button"
            onClick={() => {
              const willOpen = !showComposer
              setShowComposer(willOpen)
              if (willOpen) setComposerAutoFocus(true)
            }}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          >
            {showComposer ? 'Đóng' : 'Viết bình luận'}
          </button>
        )}
      </div>

      {!commentsEnabled ? (
        <Card className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">Bình luận đã bị tắt cho bài này.</Card>
      ) : (
        <div className="mt-0">
          {showComposer && (
            <div className="mt-3">
              <CommentComposer publicationId={publicationId} autoFocus={composerAutoFocus} onCreated={(c) => setComments((prev) => [c, ...prev])} />
            </div>
          )}

          {loading ? (
            <Card className="mt-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">Đang tải bình luận...</Card>
          ) : comments.length === 0 ? (
            <Card className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">Chưa có bình luận nào. Hãy là người đầu tiên!</Card>
          ) : (
            <div className="mt-4 space-y-3">
              {roots.map((c) => {
                const isOwner = currentUserId && c.user_id === currentUserId
                const childReplies = repliesByParent[c.id] || []
                return (
                  <Card key={`comment-${c.id}`} id={`comment-${c.id}`} className="rounded-2xl border border-slate-100 bg-white p-0 shadow-sm">
                    <div className="flex items-start gap-3 p-4">
                      <CommentAvatar name={c.author_name || 'Người dùng'} imageUrl={c.author_image_url} />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <div className="text-sm font-semibold text-slate-800">{c.author_name || 'Người dùng'}</div>
                          {isOwner && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fpt-blue">Bạn</span>}
                          <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString('vi-VN')}</span>
                        </div>

                        <div
                          className="mt-2 break-words rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700"
                          dangerouslySetInnerHTML={{ __html: enhanceMentionHtml(c.content, c.mentions || [], mentionProfiles) }}
                        />

                        {renderCommentActions(c)}

                        {replyingToId === c.id && (
                          <div className="mt-3">
                            <CommentComposer
                              publicationId={publicationId}
                              parentId={c.id}
                              compact
                              autoFocus
                              onCancel={() => setReplyingToId(null)}
                              submitLabel="Gửi trả lời"
                              onCreated={(newComment) => {
                                setComments((prev) => [newComment, ...prev])
                                setReplyingToId(null)
                              }}
                            />
                          </div>
                        )}

                        {childReplies.length > 0 && (
                          <div className="mt-3 space-y-2 border-l-2 border-slate-100 pl-3">
                            {childReplies.map((reply) => {
                              const isReplyOwner = currentUserId && reply.user_id === currentUserId
                              return (
                                <div key={`reply-${reply.id}`} id={`comment-${reply.id}`} className="rounded-xl border border-slate-100 bg-white p-3">
                                  <div className="flex items-start gap-2.5">
                                    <CommentAvatar name={reply.author_name || 'Người dùng'} imageUrl={reply.author_image_url} size="sm" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <div className="text-xs font-semibold text-slate-800">{reply.author_name || 'Người dùng'}</div>
                                        {isReplyOwner && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fpt-blue">Bạn</span>}
                                        <span className="text-[11px] text-slate-400">{new Date(reply.created_at).toLocaleString('vi-VN')}</span>
                                      </div>
                                      <div
                                        className="mt-1.5 break-words rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-sm leading-relaxed text-slate-700"
                                        dangerouslySetInnerHTML={{ __html: enhanceMentionHtml(reply.content, reply.mentions || [], mentionProfiles) }}
                                      />
                                      {renderCommentActions(reply, true)}
                                    </div>
                                    {isReplyOwner && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(reply)}
                                        disabled={deletingId === reply.id}
                                        className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                        title="Xóa bình luận"
                                      >
                                        <Trash2 size={13} />
                                        {deletingId === reply.id ? 'Đang xóa...' : 'Xóa'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c)}
                          disabled={deletingId === c.id}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          title="Xóa bình luận"
                        >
                          <Trash2 size={13} />
                          {deletingId === c.id ? 'Đang xóa...' : 'Xóa'}
                        </button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default CommentsSection
