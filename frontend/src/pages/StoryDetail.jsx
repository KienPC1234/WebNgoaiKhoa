import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, User } from 'lucide-react'
import { Card } from '@/components/ui/core'
import { PublicDocumentView } from '@/cms-editor/renderer/PublicDocumentView'
import { normalizeLayoutMetadataToDocument } from '@/cms-editor/core/legacy'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const StoryDetail = () => {
  const { storyId } = useParams()
  const [story, setStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadStory = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_URL}/public/stories/inspiring/${storyId}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        setStory(data)
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setError('Không tìm thấy câu chuyện hoặc câu chuyện đã bị ẩn.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadStory()

    return () => controller.abort()
  }, [storyId])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400 font-black">Đang tải câu chuyện...</div>
  }

  if (!story || error) {
    return (
      <div className="min-h-screen bg-gray-50/50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 rounded-3xl bg-white border border-red-100">
            <p className="font-black text-red-500">{error || 'Không thể tải câu chuyện.'}</p>
            <Link to="/stories/inspiring" className="inline-flex mt-4 items-center gap-2 text-fpt-blue font-black">
              <ArrowLeft size={16} /> Quay lại danh sách câu chuyện
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  const document = normalizeLayoutMetadataToDocument(story.layout_metadata, story.title || 'Story')

  return (
    <div className="page-shell-public bg-gray-50/50">
      <section className="page-hero page-hero-caro text-slate-700">
        <div className="max-w-5xl mx-auto space-y-5">
          <Link to="/stories/inspiring" className="tap-target inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-widest text-fpt-blue">
            <ArrowLeft size={14} /> Quay lại
          </Link>
          <h1 className="text-4xl md:text-6xl font-black italic leading-tight text-fpt-blue">{story.title}</h1>
          <div className="flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest text-slate-500">
            <span className="inline-flex items-center gap-1.5"><User size={14} /> {story.author}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {story.read_time_minutes} phút đọc</span>
            {story.category && <span>{story.category}</span>}
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 max-w-5xl space-y-8 px-4 cv-auto">
        {story.image_url && (
          <Card className="overflow-hidden rounded-[28px] border-none shadow-xl">
            <img src={story.image_url} alt={story.title} loading="lazy" decoding="async" className="h-[360px] w-full object-cover" />
          </Card>
        )}

        {story.snippet && (
          <Card className="p-6 rounded-3xl border-none shadow-lg bg-red-50 text-red-700 font-semibold italic">
            <div dangerouslySetInnerHTML={{ __html: story.snippet }} />
          </Card>
        )}

        {document?.blocks?.length > 0 && (
          <Card className="p-6 rounded-3xl border-none shadow-lg space-y-4">
            <h3 className="text-lg font-black text-red-500 uppercase tracking-widest">Bố cục câu chuyện</h3>
            <PublicDocumentView document={document} />
          </Card>
        )}

        <Card className="p-8 rounded-3xl border-none shadow-lg prose prose-slate max-w-none">
          <div dangerouslySetInnerHTML={{ __html: story.content || '' }} />
        </Card>
      </div>
    </div>
  )
}
