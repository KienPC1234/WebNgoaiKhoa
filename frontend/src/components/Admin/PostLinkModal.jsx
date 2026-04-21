import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/UI'
import { cmsService } from '@/lib/cmsService'
import { showApiError, toastError } from '@/lib/notify'
import { X } from 'lucide-react'

const PostLinkModal = ({ open, onClose, onSelect }) => {
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')
  const [subjects, setSubjects] = useState([])
  const [contentType, setContentType] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [manualId, setManualId] = useState('')

  useEffect(() => {
    if (!open) {
      setQ('')
      setSubject('')
      setContentType('')
      setResults([])
      setManualId('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    // load available subjects for dropdown
    ;(async () => {
      try {
        const s = await cmsService.getPublicSubjects()
        setSubjects(s || [])
      } catch (err) {
        console.error('Failed to load subjects', err)
      }
    })()
    const t = setTimeout(() => {
      if (!q || q.length < 2) return
      fetchResults()
    }, 250)
    return () => clearTimeout(t)
  }, [q, subject, contentType, open])

  const fetchResults = async () => {
    setLoading(true)
    try {
      const params = {}
      if (q) params.q = q
      if (subject) params.subject = subject
      if (contentType) params.content_type = contentType
      const data = await cmsService.getPublications(params)
      setResults(data || [])
    } catch (err) {
      showApiError(err, 'Tìm bài viết thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const handleUseManualId = async () => {
    if (!manualId) return toastError('Nhập ID hợp lệ.')
    try {
      const data = await cmsService.getPublicationById(manualId)
      if (!data) return toastError('Không tìm thấy bài viết.')
      onSelect(data)
      onClose()
    } catch (err) {
      showApiError(err, 'Lấy bài viết thất bại.')
    }
  }

  if (!open) return null

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-lg font-semibold">Link đến bài viết</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tiêu đề..." className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Tất cả môn</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())}</option>
            ))}
          </select>
          <input value={contentType} onChange={(e) => setContentType(e.target.value)} placeholder="Content type" className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <Button onClick={fetchResults} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Tìm</Button>
        </div>

        <div className="mt-3 max-h-72 overflow-auto">
          {loading ? (
            <div className="py-6 text-center text-slate-500">Đang tìm...</div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-slate-500">Chưa có kết quả.</div>
          ) : (
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-md border border-slate-100 p-2 hover:bg-slate-50">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="h-12 w-20 rounded-md object-cover" />
                  ) : (
                    <div className="h-12 w-20 rounded-md bg-slate-100" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">{r.title}</div>
                    <div className="mt-1 text-xs text-slate-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: (r.content || '').slice(0, 140) }} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-slate-500">ID {r.id}</div>
                    <Button onClick={() => { onSelect(r); onClose() }} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Chọn</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <input placeholder="Nhập ID thủ công" value={manualId} onChange={(e) => setManualId(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <Button onClick={handleUseManualId} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Dùng ID</Button>
          <Button onClick={onClose} className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700">Đóng</Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

export default PostLinkModal
