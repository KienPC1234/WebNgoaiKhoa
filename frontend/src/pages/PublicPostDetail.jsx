import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, Calendar, Layers3, User } from 'lucide-react'
import { Card } from '@/components/UI'
import { PublicDocumentView } from '@/cms-editor/renderer/PublicDocumentView'
import { normalizeLayoutMetadataToDocument } from '@/cms-editor/core/legacy'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const PublicPostDetail = () => {
  const { postId } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await axios.get(`${API_URL}/public/publications/${postId}`)
        setPost(res.data)
      } catch (err) {
        setError('Không tìm thấy bài viết hoặc bài viết đã bị gỡ.')
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }, [postId])

  const document = useMemo(() => normalizeLayoutMetadataToDocument(post?.layout_metadata, post?.title || 'Publication'), [post])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 font-black">Đang tải bài viết...</div>
  }

  if (!post || error) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 rounded-3xl bg-white border border-red-100">
            <p className="font-black text-red-500">{error || 'Không thể tải bài viết.'}</p>
            <Link to="/" className="inline-flex mt-4 items-center gap-2 text-fpt-blue font-black">
              <ArrowLeft size={16} /> Quay lại trang chủ
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <section className="bg-gradient-to-br from-fpt-blue via-[#1a2d6c] to-fpt-orange text-white py-16 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white/10 border border-white/20 px-4 py-2 rounded-full">
            <ArrowLeft size={14} /> Quay lại
          </Link>
          <h1 className="text-4xl md:text-6xl font-black italic leading-tight">{post.title}</h1>
          <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-blue-100">
            <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
            <span className="inline-flex items-center gap-1.5"><Layers3 size={14} /> {post.content_type || 'an-pham'}</span>
            <span className="inline-flex items-center gap-1.5"><User size={14} /> {post.subject || 'van'}</span>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 -mt-8 space-y-8">
        {post.image_url && (
          <Card className="overflow-hidden rounded-[28px] border-none shadow-xl">
            <img src={post.image_url} alt={post.title} className="w-full h-[360px] object-cover" />
          </Card>
        )}

        {document?.blocks?.length > 0 && (
          <Card className="p-6 rounded-3xl border-none shadow-lg space-y-4">
            <h3 className="text-lg font-black text-fpt-blue uppercase tracking-widest">Bố cục nội dung</h3>
            <PublicDocumentView document={document} />
          </Card>
        )}

        <Card className="p-8 rounded-3xl border-none shadow-lg prose prose-slate max-w-none">
          <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />
        </Card>
      </div>
    </div>
  )
}
