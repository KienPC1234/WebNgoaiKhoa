import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Newspaper } from 'lucide-react'
import { Card } from '@/components/ui/core'
import { getPublicationCardDescription } from '@/lib/publicationSummary'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

export const News = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState('all')

  useEffect(() => {
    const controller = new AbortController()

    const fetchNews = async () => {
      setLoading(true)
      try {
        const resp = await fetch(`${API_URL}/public/news?limit=80`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Failed to load /news', err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
    return () => controller.abort()
  }, [])

  const availableTags = useMemo(() => {
    const set = new Set()
    for (const item of items) {
      for (const tag of item?.tags || []) {
        const cleaned = String(tag || '').trim()
        if (cleaned) set.add(cleaned)
      }
    }
    return ['all', ...Array.from(set)]
  }, [items])

  const filteredItems = useMemo(() => {
    if (activeTag === 'all') return items
    return items.filter((item) => (item?.tags || []).some((tag) => String(tag).toLowerCase() === activeTag.toLowerCase()))
  }, [items, activeTag])

  return (
    <div className="app-section space-y-8 pb-16 pt-10 md:pt-14">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-fpt-orange">
          <Newspaper size={14} /> Tin tức tổng hợp
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase text-fpt-blue md:text-5xl">Bản tin tổ xã hội</h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold text-slate-600 md:text-base">
          Nơi cập nhật các thông tin nổi bật về cuộc thi, sự kiện và hoạt động học tập dành cho học sinh, giáo viên.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {availableTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                activeTag === tag
                  ? 'border-fpt-orange bg-orange-100 text-fpt-orange'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50'
              }`}
            >
              {tag === 'all' ? 'Tất cả' : tag}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />)
          ) : filteredItems.length === 0 ? (
            <Card className="col-span-1 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-14 text-center md:col-span-2 xl:col-span-3">
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Không có bài viết phù hợp với tag đã chọn.</p>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Link key={item.id} to={`/posts/${item.id}`} className="block">
                <Card className="h-full overflow-hidden rounded-2xl border border-slate-100 p-0 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative h-44 bg-slate-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-blue-100" />
                    )}
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{item.content_type === 'cuoc-thi' ? 'Cuộc thi' : 'Tin tức'}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {formatDate(item.created_at)}</span>
                    </div>

                    <h3 className="line-clamp-2 pt-2 md:pt-2 text-xl font-black leading-tight text-slate-800">{item.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm font-medium leading-relaxed text-slate-500">{getPublicationCardDescription(item, 180)}</p>

                    {(item.tags || []).length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {(item.tags || []).slice(0, 4).map((tag) => (
                          <span key={`${item.id}-${tag}`} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-fpt-orange">
                      Xem chi tiết <ChevronRight size={14} />
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default News
