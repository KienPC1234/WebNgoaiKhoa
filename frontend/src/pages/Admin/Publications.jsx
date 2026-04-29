import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Button } from '@/components/UI'
import { Plus, Trash2, Edit, Search, Calendar, BookHeart, Award, ExternalLink, SlidersHorizontal } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastSuccess } from '@/lib/notify'

const SUBJECT_CONFIG = [
  { value: 'van', label: 'Ngữ văn' },
  { value: 'ktpl', label: 'KTPL' },
  { value: 'lich-su', label: 'Lịch sử' },
  { value: 'dia-li', label: 'Địa lí' },
  { value: 'vovinam', label: 'Vovinam' },
]

const CONTENT_TYPE_CONFIG = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'an-pham', label: 'Ấn phẩm' },
  { value: 'tai-lieu', label: 'Tài liệu' },
  { value: 'cuoc-thi', label: 'Cuộc thi' },
]

// Unified type selector options (hierarchical): publication subtypes and other entities
const TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'publication:all', label: 'Bài viết (Tất cả)' },
  { value: 'publication:an-pham', label: 'Ấn phẩm' },
  { value: 'publication:tai-lieu', label: 'Tài liệu' },
  { value: 'publication:cuoc-thi', label: 'Cuộc thi' },
  { value: 'vinh-danh', label: 'Vinh danh' },
  { value: 'story', label: 'Câu chuyện' },
  { value: 'event', label: 'Sự kiện' },
]

const ENTITY_LABELS = {
  all: 'Tất cả',
  publication: 'Bài viết',
  'vinh-danh': 'Vinh danh',
  story: 'Câu chuyện',
  event: 'Sự kiện',
}

const SUBJECT_LABELS = SUBJECT_CONFIG.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

const toSubjectLabel = (subject) => {
  if (!subject) return '-'
  return SUBJECT_LABELS[subject] || subject
}

// Multi-select combobox for subjects (tags/chips style)
const MultiSubjectSelector = ({ value = [], onChange }) => {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const suggestions = SUBJECT_CONFIG.filter((s) => !value.includes(s.value) && (s.label.toLowerCase().includes(input.toLowerCase()) || s.value.includes(input.toLowerCase())))

  const add = (val) => {
    if (!val) return
    if (value.includes(val)) return
    onChange([...value, val])
    setInput('')
    setOpen(false)
  }

  const remove = (val) => {
    onChange(value.filter((v) => v !== val))
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 min-w-0">
        <div className="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
          {value.map((v) => (
            <button key={v} onClick={() => remove(v)} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 flex-shrink-0">
              <span className="font-medium">{toSubjectLabel(v)}</span>
              <span className="text-slate-400">×</span>
            </button>
          ))}
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                // if there's an exact suggestion match, add it; otherwise ignore
                const match = suggestions[0]
                if (match) add(match.value)
              } else if (e.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder={value.length ? '' : 'Chọn danh mục...'}
            className="flex-1 min-w-[80px] bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-40 mt-1 w-full max-w-[320px] overflow-auto rounded border border-slate-100 bg-white shadow-lg max-h-44">
          {suggestions.map((s) => (
            <div key={s.value} onMouseDown={(e) => { e.preventDefault(); add(s.value) }} className="px-3 py-2 text-xs cursor-pointer hover:bg-slate-50">
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const mapPublication = (item) => ({
  id: item.id,
  entityType: item.content_type === 'vinh-danh' ? 'vinh-danh' : 'publication',
  title: item.title,
  content: item.content,
  image_url: item.image_url,
  created_at: item.created_at,
  subject: item.subject,
  content_type: item.content_type,
  featured_year: item.featured_year,
  layout_metadata: item.layout_metadata,
})

const mapStory = (item) => ({
  id: item.id,
  entityType: 'story',
  title: item.title,
  snippet: item.snippet,
  content: item.content,
  image_url: item.image_url,
  created_at: item.created_at,
  subject: item.category || 'story',
  content_type: 'story',
  featured_year: '',
  layout_metadata: item.layout_metadata,
})

const mapEvent = (item) => ({
  id: item.id,
  entityType: 'event',
  title: item.title,
  content: item.description,
  image_url: item.image_url,
  created_at: item.created_at,
  subject: 'event',
  content_type: 'event',
  featured_year: item.event_date,
  linked_post_id: item.linked_post_id || null,
  layout_metadata: null,
})

const getPublicUrl = (item) => {
  if (!item) return '/'
  if (item.entityType === 'story') return `/stories/inspiring/${item.id}`
  if (item.entityType === 'publication' || item.entityType === 'vinh-danh') return `/posts/${item.id}`
  if (item.entityType === 'event') return `/events/upcoming`
  return `/posts/${item.id}`
}

export const AdminPublications = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [entityFilter, setEntityFilter] = useState(() => {
    try {
      return searchParams.get('entity') || 'publication'
    } catch (e) {
      return 'publication'
    }
  })

  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersRef = useRef(null)

  const filterButtonRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (!filtersOpen) return
      const tgt = e.target
      if (filtersRef.current && filtersRef.current.contains(tgt)) return
      if (filterButtonRef.current && filterButtonRef.current.contains(tgt)) return
      setFiltersOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [filtersOpen])
  
  const subjectFilter = searchParams.get('subject') || 'all'
  const subjectsFilter = searchParams.getAll('subjects') || []
  const contentTypeFilter = searchParams.get('content_type') || 'all'
  const [createdFrom, setCreatedFrom] = useState(() => searchParams.get('created_from') || '')
  const [createdTo, setCreatedTo] = useState(() => searchParams.get('created_to') || '')

  const updateSubjectFilter = (val) => {
    const next = new URLSearchParams(searchParams.toString())
    if (val === 'all') next.delete('subject')
    else next.set('subject', val)
    setSearchParams(next)
  }

  const updateSubjectsFilter = (vals) => {
    // remove legacy single subject to avoid conflict
    const next = new URLSearchParams(searchParams.toString())
    next.delete('subject')
    next.delete('subjects')
    ;(vals || []).forEach((s) => next.append('subjects', s))
    setSearchParams(next)
  }

  const updateContentTypeFilter = (val) => {
    const next = new URLSearchParams(searchParams.toString())
    if (val === 'all') next.delete('content_type')
    else next.set('content_type', val)
    setSearchParams(next)
  }

  const updateEntityFilter = (val) => {
    const next = new URLSearchParams(searchParams.toString())
    if (val === 'all') next.delete('entity')
    else next.set('entity', val)
    setSearchParams(next)
    setEntityFilter(val)
  }

  const updateCreatedFrom = (val) => {
    const next = new URLSearchParams(searchParams.toString())
    if (!val) next.delete('created_from')
    else next.set('created_from', val)
    setSearchParams(next)
    setCreatedFrom(val)
  }

  const updateCreatedTo = (val) => {
    const next = new URLSearchParams(searchParams.toString())
    if (!val) next.delete('created_to')
    else next.set('created_to', val)
    setSearchParams(next)
    setCreatedTo(val)
  }

  const buildQueryParams = () => {
    const params = {}
    // copy single-valued params
    for (const key of new Set(Array.from(searchParams.keys()))) {
      if (key === 'subjects') {
        const vals = searchParams.getAll('subjects')
        if (vals && vals.length > 0) params.subjects = vals
      } else {
        const v = searchParams.get(key)
        if (v != null) params[key] = v
      }
    }
    return params
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = buildQueryParams()
      // remove entity from params — we'll use entityFilter to pick the endpoint
      const queryParams = { ...params }
      delete queryParams.entity

      let data = []
      if (entityFilter === 'story') {
        // stories are a separate table; backend /admin/stories doesn't accept date/subject filters,
        // so fetch all and apply date filtering client-side below.
        data = await cmsService.getStories()
      } else if (entityFilter === 'event') {
        data = await cmsService.getEvents()
      } else if (entityFilter === 'all') {
        // fetch publications + stories + events and merge them so "Tất cả loại" shows everything
        // respect publication content type filter when present
        if (contentTypeFilter && contentTypeFilter !== 'all') queryParams.content_type = contentTypeFilter
        const [pubs, stories, events] = await Promise.all([
          cmsService.getPublications(queryParams),
          cmsService.getStories(),
          cmsService.getEvents(),
        ])

        // map each source explicitly to avoid relying on heuristics
        const mappedPubs = (pubs || []).map(mapPublication)
        const mappedStories = (stories || []).map(mapStory)
        const mappedEvents = (events || []).map(mapEvent)

        // combine and sort by created_at desc
        const combined = [...mappedPubs, ...mappedStories, ...mappedEvents]
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        // apply client-side created_from/created_to filtering if present
        try {
          const parseDate = (v) => (v ? new Date(v) : null)
          const from = parseDate(queryParams.created_from || searchParams.get('created_from'))
          const to = parseDate(queryParams.created_to || searchParams.get('created_to'))
          let finalCombined = combined
          if (from || to) {
            finalCombined = combined.filter((it) => {
              try {
                const d = new Date(it.created_at)
                if (from && d < from) return false
                if (to && d > to) return false
                return true
              } catch (e) {
                return true
              }
            })
          }

          setItems(finalCombined)
          setLoading(false)
          return
        } catch (e) {
          // fallback to raw combined
          setItems(combined)
          setLoading(false)
          return
        }
      } else {
        // publications endpoint
        // if entityFilter explicitly requests vinh-danh, set content_type accordingly
        if (entityFilter === 'vinh-danh') queryParams.content_type = 'vinh-danh'
        // respect contentTypeFilter when present
        if (contentTypeFilter && contentTypeFilter !== 'all') queryParams.content_type = contentTypeFilter
        data = await cmsService.getPublications(queryParams)
      }

      // debug: show what the API returned
      try {
        console.debug('Publications.fetchItems: params=', queryParams, 'entityFilter=', entityFilter, 'apiCount=', (data || []).length)
      } catch (e) {
        // ignore
      }

      const mapped = (data || []).map((it) => {
        // prefer mapping by requested entity when we fetched a specific endpoint
        if (entityFilter === 'story') return mapStory(it)
        if (entityFilter === 'event') return mapEvent(it)
        // otherwise, fallback to heuristics for mixed publication responses
        if (it && (it.entityType === 'story' || it.type === 'story' || it.content_type === 'story')) return mapStory(it)
        if (it && (it.entityType === 'event' || it.type === 'event' || it.content_type === 'event')) return mapEvent(it)
        return mapPublication(it)
      })

      try {
        console.debug('Publications.fetchItems.mappedTypes=', mapped.map((m) => m.entityType))
        console.debug('Publications.fetchItems.mappedSample=', mapped[0])
      } catch (e) {
        // ignore
      }

      // If we fetched stories/events (separate endpoints), apply created_from/created_to filtering client-side
      let finalItems = mapped
      try {
        const parseDate = (v) => (v ? new Date(v) : null)
        const from = parseDate(queryParams.created_from || searchParams.get('created_from'))
        const to = parseDate(queryParams.created_to || searchParams.get('created_to'))
        if ((entityFilter === 'story' || entityFilter === 'event') && (from || to)) {
          finalItems = finalItems.filter((it) => {
            try {
              const d = new Date(it.created_at)
              if (from && d < from) return false
              if (to && d > to) return false
              return true
            } catch (e) {
              return true
            }
          })
        }
      } catch (e) {
        // ignore
      }

      setItems(finalItems)
    } catch (err) {
      showApiError(err, 'Không tải được danh sách nội dung.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Refresh local state for createdFrom/To when URL changes externally
    try {
      setCreatedFrom(searchParams.get('created_from') || '')
      setCreatedTo(searchParams.get('created_to') || '')
    } catch (e) {
      // ignore
    }
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()])

  // Sync entity filter from query param when the URL changes (so links like ?entity=story work)
  useEffect(() => {
    try {
      const qEntity = searchParams.get('entity')
      if (qEntity) setEntityFilter(qEntity)
    } catch (e) {
      // ignore
    }
  }, [searchParams])

  useEffect(() => {
    const fetchPushConfig = async () => {
      try {
        const data = await cmsService.getPushConfig()
        // keep for potential future use
        // setPushConfig(data)
      } catch {
        // ignore
      }
    }
    fetchPushConfig()
  }, [])

  const handleDelete = async (item) => {
    let deleteMessage = 'Xóa bài viết?'
    if (item.entityType === 'story') deleteMessage = 'Xóa câu chuyện?'
    if (item.entityType === 'event') deleteMessage = 'Xóa sự kiện?'

    const confirmed = await confirmAction({
      title: deleteMessage,
      text: 'Thao tác này không thể hoàn tác.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return

    try {
      if (item.entityType === 'story') {
        await cmsService.deleteStory(item.id)
      } else if (item.entityType === 'event') {
        await cmsService.deleteEvent(item.id)
      } else {
        await cmsService.deletePublication(item.id)
      }
      const successMsg = item.entityType === 'story' ? 'Đã xóa câu chuyện.' : item.entityType === 'event' ? 'Đã xóa sự kiện.' : 'Đã xóa bài viết.'
      toastSuccess(successMsg)
      fetchItems()
    } catch (err) {
      showApiError(err, 'Xóa nội dung thất bại.')
    }
  }

  const handleEditItem = (item) => {
    if (!item) return
    if (item.entityType === 'event') {
      // If event already has a linked post, open that post for editing
      if (item.linked_post_id) {
        navigate(`/admin/publications/${item.linked_post_id}/edit?linked_event=${item.id}`)
        return
      }
      // Otherwise, create a new post flow pre-linked to this event (linking occurs on save)
      navigate(`/admin/publications/new?linked_event=${item.id}`)
      return
    }

    // Default: open the CMS editor for the detected entity/publication
    navigate(`/admin/publications/${item.id}/edit?entity=${item.entityType}`)
  }

  const filteredItems = useMemo(() => {
    const scopedByEntity = entityFilter === 'all' ? items : items.filter((x) => x.entityType === entityFilter)
    let scoped = []
    if (subjectsFilter && subjectsFilter.length > 0) {
      scoped = scopedByEntity.filter((x) => x.entityType !== 'publication' || subjectsFilter.includes(x.subject))
    } else if (subjectFilter === 'all') {
      scoped = scopedByEntity
    } else {
      scoped = scopedByEntity.filter((x) => x.entityType !== 'publication' || x.subject === subjectFilter)
    }

    if (!searchTerm.trim()) return scoped
    const keyword = searchTerm.toLowerCase()
    return scoped.filter((p) =>
      [p.title, p.subject, p.content_type, p.featured_year, p.entityType, p.snippet]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [items, searchTerm, entityFilter, subjectFilter])

  // Source items for building subject buckets: when searching, apply the
  // search across all items so buckets reflect the search results; otherwise
  // use the full items list.
  const searchSourceItems = useMemo(() => {
    if (!searchTerm.trim()) return items
    const keyword = searchTerm.toLowerCase()
    return items.filter((p) =>
      [p.title, p.subject, p.content_type, p.featured_year, p.entityType, p.snippet]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [items, searchTerm])

  const subjectBuckets = useMemo(() => {
    if ((entityFilter !== 'publication' && entityFilter !== 'vinh-danh') || subjectFilter !== 'all' || (subjectsFilter && subjectsFilter.length > 0)) return []

    // Build buckets for the selected entity type (publication or vinh-danh)
    const publicationBuckets = SUBJECT_CONFIG.map((config) => ({
      ...config,
      items: searchSourceItems.filter((item) => item.entityType === entityFilter && item.subject === config.value),
    })).filter((bucket) => bucket.items.length > 0)

    // When viewing publications, also show a combined "Câu chuyện" bucket containing matching stories
    const buckets = [...publicationBuckets]
    if (entityFilter === 'publication') {
      const storyItems = searchSourceItems.filter((it) => it.entityType === 'story')
      if (storyItems.length > 0) {
        buckets.push({ value: 'story', label: 'Câu chuyện', items: storyItems })
      }
    }

    return buckets
  }, [entityFilter, subjectFilter, subjectsFilter, searchSourceItems])

  const resultsCount = useMemo(() => {
    if (subjectBuckets.length > 0) {
      return subjectBuckets.reduce((s, b) => s + (b.items ? b.items.length : 0), 0)
    }
    return filteredItems.length
  }, [subjectBuckets, filteredItems])

  useEffect(() => {
    // debug summary to help diagnose missing UI results
    try {
      console.debug('Publications.debug', {
        search: searchParams.toString(),
        entityFilter,
        subjectFilter,
        subjectsFilter,
        contentTypeFilter,
        itemsCount: items.length,
        filteredCount: filteredItems.length,
        bucketsCount: subjectBuckets.length,
        resultsCount,
      })
    } catch (e) {
      // ignore
    }
  }, [searchParams.toString(), entityFilter, subjectFilter, subjectsFilter.length, contentTypeFilter, items.length, filteredItems.length, subjectBuckets.length, resultsCount])

  // newsletter sending removed from Publications view

  

  return (
    <div className="space-y-6 pb-8">
      <Card className="rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm nội dung"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-slate-400"
              />
            </div>

            <select
              value={entityFilter}
              onChange={(e) => updateEntityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="all">Tất cả loại</option>
              <option value="publication">Bài viết</option>
              <option value="vinh-danh">Vinh danh</option>
              <option value="story">Câu chuyện</option>
              <option value="event">Sự kiện</option>
            </select>

            <div className="relative flex items-center gap-2">
            

              <button ref={filterButtonRef} type="button" onClick={() => setFiltersOpen((s) => !s)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                <SlidersHorizontal size={16} /> Bộ lọc
              </button>

              {filtersOpen && (
                <div ref={filtersRef} className="absolute top-full right-0 mt-2 z-50 w-[320px] p-4 rounded-lg bg-white border border-slate-100 shadow-lg">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">Danh mục</label>
                      <div className="mt-1">
                        <MultiSubjectSelector
                          value={subjectsFilter && subjectsFilter.length > 0 ? subjectsFilter : (subjectFilter !== 'all' ? [subjectFilter] : [])}
                          onChange={(vals) => updateSubjectsFilter(vals)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500">Loại ấn phẩm</label>
                      <select value={contentTypeFilter} onChange={(e) => updateContentTypeFilter(e.target.value)} className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        {CONTENT_TYPE_CONFIG.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Từ ngày</label>
                        <input type="date" value={createdFrom} onChange={(e) => updateCreatedFrom(e.target.value)} className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Đến ngày</label>
                        <input type="date" value={createdTo} onChange={(e) => updateCreatedTo(e.target.value)} className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                      </div>
                    </div>

                    <div className="flex justify-between mt-2">
                      <button type="button" onClick={() => {
                        // clear relevant filter params (use clone to avoid mutating current instance)
                        const next = new URLSearchParams(searchParams.toString())
                        next.delete('entity')
                        next.delete('content_type')
                        next.delete('subject')
                        next.delete('subjects')
                        next.delete('created_from')
                        next.delete('created_to')
                        setSearchParams(next)
                        setFiltersOpen(false)
                      }} className="text-xs text-slate-600">Xóa bộ lọc</button>
                      <button type="button" onClick={() => setFiltersOpen(false)} className="rounded bg-fpt-blue text-white px-3 py-1 text-sm">Đóng</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            
            <Button
              onClick={() => navigate('/admin/publications/new')}
              className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700"
            >
              <Plus size={14} className="mr-1" /> Bài viết
            </Button>
            <Button
              onClick={() => navigate('/admin/publications/new?entity=story')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50"
            >
              <BookHeart size={14} className="mr-1" /> Câu chuyện
            </Button>
            <Button
              onClick={() => navigate('/admin/publications/new?entity=event')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50"
            >
              <Calendar size={14} className="mr-1" /> Sự kiện
            </Button>
            <Button
              onClick={() => navigate('/admin/publications/new?entity=vinh-danh')}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50"
            >
              <Award size={14} className="mr-1" /> Vinh danh
            </Button>
          </div>
        </div>
      </Card>

      

      <Card className="rounded-2xl border border-slate-200 p-0 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Đang tải danh sách nội dung...</p>
          </div>
        ) : resultsCount === 0 ? (
          <div className="py-14 text-center text-slate-500">Không có dữ liệu phù hợp.</div>
        ) : subjectBuckets.length > 0 ? (
          <div className="space-y-4 p-4">
            {subjectBuckets.map((bucket) => (
              <div key={bucket.value} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <h4 className="text-sm font-semibold text-slate-800">{bucket.label}</h4>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600">{bucket.items.length} bài</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tiêu đề</th>
                        <th className="px-4 py-3 font-medium">Danh mục</th>
                        <th className="px-4 py-3 font-medium">Ngày tạo</th>
                        <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bucket.items.map((item) => {
                        const previewHtml = item.content || ''

                        return (
                          <tr key={`${item.entityType}-${item.id}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <p className="max-w-[420px] truncate font-medium text-slate-800">{item.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-1" dangerouslySetInnerHTML={{ __html: previewHtml.slice(0, 140) }} />
                            </td>
                            <td className="px-4 py-3 text-slate-600">{toSubjectLabel(item.subject)} · {item.content_type || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  onClick={() => window.open(getPublicUrl(item), '_blank')}
                                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                                  title="Xem public"
                                >
                                  <ExternalLink size={14} />
                                </button>
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="rounded-md border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Tiêu đề</th>
                  <th className="px-4 py-3 font-medium">Loại</th>
                  <th className="px-4 py-3 font-medium">Danh mục</th>
                  <th className="px-4 py-3 font-medium">Ngày tạo</th>
                  <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isEvent = item.entityType === 'event'
                  const previewHtml = item.entityType === 'story' ? item.snippet || item.content || '' : item.content || ''

                  return (
                    <tr key={`${item.entityType}-${item.id}`} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="max-w-[420px] truncate font-medium text-slate-800">{item.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1" dangerouslySetInnerHTML={{ __html: previewHtml.slice(0, 140) }} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{item.entityType}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{toSubjectLabel(item.subject) || item.content_type || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1"><Calendar size={13} /> {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => window.open(getPublicUrl(item), '_blank')}
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                            title="Xem public"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
