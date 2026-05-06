import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/UI'
import { RichTextEditor } from '@/components/UI'
import { toastError } from '@/lib/notify'
import { Image as ImageIcon, X as XIcon } from 'lucide-react'

const StaffEditorModal = ({ open, item, onClose, onSave, onDelete, onUploadImage }) => {
  const [form, setForm] = useState(item || {})
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState(null)
  const fileInputRef = useRef(null)

  // Initialize local form when modal opens or when the item object changes.
  // Be defensive: only set the form if `open` is true and `item` is defined.
  // This prevents transient parent updates from wiping the modal fields
  // while a user is actively editing (CKEditor keeps its own state so
  // a blind overwrite can leave only the editor content visible).
  useEffect(() => {
    console.log('[StaffEditorModal] open:', open, 'item id:', item?.id)
    if (!open) return
    if (!item) return
    setForm({ ...item })
    // safely clear any previously-created object URL
    setLocalPreview((prev) => {
      if (prev) {
        try { URL.revokeObjectURL(prev) } catch (e) {}
      }
      return null
    })
  }, [open, item])

  useEffect(() => {
    console.log('[StaffEditorModal] form state changed', { id: form?.id, full_name: form?.full_name })
  }, [form])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (localPreview) {
        try { URL.revokeObjectURL(localPreview) } catch (e) {}
      }
    }
  }, [localPreview])

  if (!open) return null

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!onUploadImage) return

    // Limit to 40MB by default, align with AdminNhanVatCMS.jsx
    const MAX_SIZE = Number(import.meta.env.VITE_IMAGE_MAX_UPLOAD_BYTES) || 40 * 1024 * 1024
    if (f.size > MAX_SIZE) {
      toastError(`Ảnh vượt quá dung lượng tối đa ${Math.round(MAX_SIZE / 1024 / 1024)}MB`)
      return
    }

    // show local preview while uploading
    const previewUrl = URL.createObjectURL(f)
    console.log('[StaffEditorModal] handleFile start', f.name, f.size)
    setLocalPreview(previewUrl)
    setUploading(true)
    try {
      const url = await onUploadImage(f)
      console.log('[StaffEditorModal] handleFile uploaded url', url)
      if (url) {
        setForm((s) => ({ ...s, image_url: url }))
        // clear preview only on success to avoid flickering if it fails fast
        setLocalPreview(null)
      }
    } catch (err) {
      console.error('Image upload failed', err)
      // notify is handled by hook/service
    } finally {
      setUploading(false)
      try { URL.revokeObjectURL(previewUrl) } catch (err) {}
    }
  }

  const handleRemoveImage = () => {
    console.log('[StaffEditorModal] remove image')
    setLocalPreview((prev) => {
      if (prev) {
        try { URL.revokeObjectURL(prev) } catch (e) {}
      }
      return null
    })
    setForm((s) => ({ ...s, image_url: '' }))
  }

  const handleSave = async () => {
    if (uploading) {
      toastError('Ảnh vẫn đang tải lên — vui lòng đợi cho đến khi tải xong rồi lưu.')
      return
    }
    if (!form.full_name || !form.title) {
      toastError('Vui lòng nhập tên và chức danh.')
      return
    }
    console.log('[StaffEditorModal] save', { id: form.id, full_name: form.full_name })
    await onSave(form)
    onClose()
  }

  const handleDelete = async () => {
    if (!item || !item.id) return
    await onDelete(item.id)
    onClose()
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-auto rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{item && item.id ? 'Chỉnh sửa hồ sơ' : 'Thêm hồ sơ'}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">Đóng</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="px-3 py-2 rounded-lg border md:col-span-2" placeholder="Họ tên" value={form.full_name || ''} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="px-3 py-2 rounded-lg border" placeholder="Chức danh" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />

          <input className="px-3 py-2 rounded-lg border md:col-span-3" placeholder="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="px-3 py-2 rounded-lg border md:col-span-3" placeholder="Chuyên môn" value={form.expertise || ''} onChange={(e) => setForm({ ...form, expertise: e.target.value })} />

          <div className="md:col-span-3">
            <label className="text-xs text-gray-500">Vị trí</label>
              <select className="w-full px-3 py-2 rounded-lg border" value={form.tier || ''} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
              <option value="">— Chọn vị trí —</option>
              <option value="management">Tổ trưởng</option>
              <option value="senior">Trưởng bộ môn</option>
              <option value="instructor">Giáo viên</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Chọn vị trí để phân loại hiển thị (tùy chọn).</p>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-500">Ảnh URL</label>
            <input className="w-full px-3 py-2 rounded-lg border" value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <p className="text-xs text-gray-400 mt-1">Dùng ảnh vuông (ví dụ 400x400). URL public hoặc tải lên từ máy của bạn.</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <Button size="sm" variant="outline" className="flex items-center gap-2" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                <ImageIcon size={14} /> Tải ảnh
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setForm((s) => ({ ...s, image_url: '' }))}>Dùng URL</Button>
            </div>
            {uploading && <span className="text-sm text-gray-500">Đang tải...</span>}

            <div className="mt-2">
              {(localPreview || form.image_url) ? (
                <div className="relative">
                  <img src={localPreview || form.image_url} alt="preview" className="h-36 w-36 object-cover rounded-lg border" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  <button type="button" onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow">
                    <XIcon size={14} />
                  </button>
                </div>
              ) : (
                <div className="h-36 w-36 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">Preview</div>
              )}
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="text-xs text-gray-500">Tiểu sử</label>
            <RichTextEditor value={form.bio || ''} onChange={(v) => setForm({ ...form, bio: v })} size="compact" />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {item && item.id && <Button variant="danger" onClick={handleDelete}>Xóa</Button>}
          <Button onClick={onClose} className="bg-slate-100 text-slate-700">Hủy</Button>
          <Button onClick={handleSave} className="bg-fpt-blue text-white" disabled={uploading || !form.full_name || !form.title}>
            {uploading ? 'Đang tải ảnh...' : 'Lưu'}
          </Button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}

export default StaffEditorModal
