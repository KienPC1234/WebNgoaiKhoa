import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/UI'
import { cmsService } from '@/lib/cmsService'
import { showApiError, toastSuccess, toastError } from '@/lib/notify'
import { X } from 'lucide-react'

const MediaLibraryModal = ({ open, onClose, onSelect, multi = false, accept = 'image/*' }) => {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage] = useState(24)
  const [selected, setSelected] = useState([])
  const uploadInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
    console.log('[MediaLibraryModal] open=', open)
    if (!open) {
      setQ('')
      setResults([])
      setSelected([])
      setPage(1)
      return
    }

    // DOM/debug checks to help diagnose invisible modal
    try {
      console.log('[MediaLibraryModal] document.body present=', !!(typeof document !== 'undefined' && document.body), 'body.className=', typeof document !== 'undefined' && document.body ? document.body.className : null)
      // allow portal to mount first, then inspect
      setTimeout(() => {
        try {
          const el = document.getElementById('media-library-modal')
          console.log('[MediaLibraryModal] modal element on body=', el)
          if (el) {
            const cs = window.getComputedStyle(el)
            console.log('[MediaLibraryModal] modal computedStyle display=', cs.display, 'visibility=', cs.visibility, 'opacity=', cs.opacity, 'zIndex=', cs.zIndex, 'pointerEvents=', cs.pointerEvents)
            console.log('[MediaLibraryModal] modal rect=', el.getBoundingClientRect())
          } else {
            const found = document.querySelector('.media-library-modal-debug')
            console.log('[MediaLibraryModal] querySelector found=', found)
          }
        } catch (err) {
          console.error('[MediaLibraryModal] DOM inspect failed', err)
        }
      }, 60)
    } catch (err) {
      console.error('[MediaLibraryModal] debug DOM check failed', err)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      fetchResults()
    }, 200)
    return () => clearTimeout(t)
  }, [q, page, open])

  const fetchResults = async () => {
    setLoading(true)
    try {
      console.log('[MediaLibraryModal] fetchResults', { q, page, perPage })
      const params = { q, page, per_page: perPage }
      const data = await cmsService.listMediaAssets(params)
      setResults(data.items || [])
    } catch (err) {
      console.error('Failed to load media assets', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (event) => {
    const file = event?.target?.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const resp = await cmsService.uploadMediaAsset(file)
      console.log('[MediaLibraryModal] upload resp=', resp)
      toastSuccess('Tải lên thành công')
      // Refresh list to include uploaded asset
      await fetchResults()
      // Auto-select uploaded asset if returned
      if (resp?.asset_id) {
        setSelected([{ id: resp.asset_id, url: resp.url, original_name: resp.file_name, stored_name: resp.file_name, file_type: (file.name || '').split('.').pop() }])
      }
    } catch (err) {
      showApiError(err, 'Tải lên thất bại.')
      setUploadError('Upload failed')
    } finally {
      setUploading(false)
      // clear input
      try { uploadInputRef.current.value = null } catch (e) {}
    }
  }

  const toggleSelect = (asset) => {
    if (multi) {
      setSelected((prev) => {
        const found = prev.find((p) => p.id === asset.id)
        if (found) return prev.filter((p) => p.id !== asset.id)
        return [...prev, asset]
      })
    } else {
      setSelected([asset])
    }
  }

  const handleChoose = () => {
    if (multi) onSelect(selected)
    else onSelect(selected[0] || null)
    onClose()
  }

  if (!open) return null

  const modal = (
    <div id="media-library-modal" className="fixed inset-0 flex items-center justify-center p-6 media-library-modal-debug" style={{ zIndex: 99999, position: 'fixed' }}>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-auto rounded-lg bg-white p-4 shadow-lg" style={{ zIndex: 100000 }}>
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-lg font-semibold">Chọn tập tin / ảnh</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên file..." className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <Button onClick={fetchResults} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Tìm</Button>
          <input ref={uploadInputRef} type="file" accept={accept} className="hidden" onChange={handleUpload} />
          <Button onClick={() => uploadInputRef.current?.click()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">{uploading ? 'Đang tải...' : 'Tải lên'}</Button>
        </div>
        {uploadError ? <div className="mt-2 text-xs text-red-500">{uploadError}</div> : null}

        <div className="mt-3 grid grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-6 text-center text-slate-500">Đang tải...</div>
          ) : results.length === 0 ? (
            <div className="col-span-3 py-6 text-center text-slate-500">Chưa có tài nguyên.</div>
          ) : (
            results.map((r) => (
              <div key={r.id} className={`relative rounded-md border border-slate-100 p-2 ${selected.find((s) => s.id === r.id) ? 'ring-2 ring-blue-300' : ''}`}>
                <div className="h-36 w-full overflow-hidden rounded-md bg-slate-50">
                  {r.file_type && r.file_type.toLowerCase() === 'pdf' ? (
                    <div className="flex h-36 items-center justify-center text-sm font-bold text-slate-600">PDF: {r.original_name || r.stored_name}</div>
                  ) : (
                    <img src={r.url} alt={r.original_name || ''} className="h-36 w-full object-cover" />
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-600 truncate">{r.original_name || r.stored_name}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSelect(r)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">{selected.find((s) => s.id === r.id) ? 'Bỏ chọn' : 'Chọn'}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <div className="flex-1 text-sm text-slate-500">{results.length ? `${results.length} kết quả` : ''}</div>
          <Button onClick={handleChoose} className="rounded-md border-none bg-slate-900 px-3 py-2 text-xs normal-case tracking-normal text-white hover:bg-slate-700">Chọn</Button>
          <Button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs normal-case tracking-normal text-slate-700 hover:bg-slate-50">Đóng</Button>
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    try {
      return createPortal(modal, document.body)
    } catch (err) {
      console.error('[MediaLibraryModal] createPortal failed', err)
      // fallback: render inline to help debugging
      return modal
    }
  }

  return null
}

export default MediaLibraryModal
