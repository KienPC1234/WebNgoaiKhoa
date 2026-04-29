import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/core'
import { apiClient } from '@/lib/apiClient'
import CommentComposer from './CommentComposer'

const sanitizeCommentHtml = (html) => {
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
}

export const CommentsSection = ({ publicationId, commentsEnabled }) => {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [showComposer, setShowComposer] = useState(false) // collapsed by default
  const [composerAutoFocus, setComposerAutoFocus] = useState(false)

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
    if (composerAutoFocus) {
      const t = setTimeout(() => setComposerAutoFocus(false), 300)
      return () => clearTimeout(t)
    }
  }, [composerAutoFocus])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black m-0">Bình luận</h3>
        {commentsEnabled && (
          <button
            type="button"
            onClick={() => {
              const willOpen = !showComposer
              setShowComposer(willOpen)
              if (willOpen) setComposerAutoFocus(true)
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            {showComposer ? 'Đóng' : 'Viết bình luận'}
          </button>
        )}
      </div>

      {!commentsEnabled ? (
        <Card className="p-4 mt-2">Bình luận đã bị tắt cho bài này.</Card>
      ) : (
        <div className="mt-0">
          <div
            className="mt-0"
            style={!showComposer ? { position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', zIndex: -1 } : undefined}
            aria-hidden={!showComposer}
          >
            <CommentComposer publicationId={publicationId} autoFocus={composerAutoFocus} onCreated={(c) => setComments((prev) => [c, ...prev])} />
          </div>

          {/* composerAutoFocus resets automatically via effect so subsequent opens re-trigger focus */}

          {loading ? (
            <Card className="p-4 mt-3">Đang tải bình luận...</Card>
          ) : comments.length === 0 ? (
            <Card className="p-4 mt-3">Chưa có bình luận nào — hãy là người đầu tiên!</Card>
          ) : (
            <div className="space-y-3 mt-3">
              {comments.map((c) => (
                <Card key={`comment-${c.id}`} className="p-3">
                  <div className="text-sm font-semibold text-slate-700">{c.author_name || 'Người dùng'}</div>
                  <div className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString('vi-VN')}</div>
                  <div className="mt-2 text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(c.content) }} />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CommentsSection
