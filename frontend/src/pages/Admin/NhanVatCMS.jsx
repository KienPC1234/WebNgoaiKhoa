import { useEffect, useState } from 'react'
import { Button, Card, RichTextEditor } from '@/components/UI'
import { Plus, Save, Trash2, Users, Building2, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'
import StaffListContainer from '@/components/Admin/StaffList/StaffListContainer'
import StaffReactionsSummaryBlock from '@/components/Admin/StaffList/StaffReactionsSummaryBlock'
import StaffReactionsChart from '@/components/Admin/StaffList/StaffReactionsChart'

const emptyStaff = {
  full_name: '',
  title: '',
  bio: '',
  email: '',
  image_url: '',
  expertise: '',
  tier: '',
  display_order: 0,
  is_active: true,
}

export const AdminNhanVatCMS = () => {
  const [loading, setLoading] = useState(true)
  const [savingScale, setSavingScale] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)

  const [scale, setScale] = useState({
    hero_title: '',
    hero_subtitle: '',
    staff_hero: '',
    vision: '',
    subjects_overview: '',
    staff_count: 20,
    student_count: 5000,
    projects_count: 100,
    awards_count: 25,
    roadmap: '',
    is_active: true,
  })

  const [staffList, setStaffList] = useState([])
  const [newStaff, setNewStaff] = useState(emptyStaff)
  const [expandedId, setExpandedId] = useState(null)
  const [reactionsSummary, setReactionsSummary] = useState([])
  const [reactionsError, setReactionsError] = useState(null)
  const [reactionsLoading, setReactionsLoading] = useState(false)
  const [reactionsCollapsed, setReactionsCollapsed] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        cmsService.getSocialScale(),
        cmsService.getStaffProfiles(),
      ])

      const [scaleRes, staffRes] = results

      if (scaleRes && scaleRes.status === 'fulfilled') {
        setScale(scaleRes.value)
      } else if (scaleRes && scaleRes.status === 'rejected') {
        console.error('Error fetching social scale:', scaleRes.reason)
        showApiError(scaleRes.reason, 'Không tải được thông tin quy mô.')
      }

      if (staffRes && staffRes.status === 'fulfilled') {
        setStaffList(staffRes.value)
      } else if (staffRes && staffRes.status === 'rejected') {
        console.error('Error fetching staff list:', staffRes.reason)
        showApiError(staffRes.reason, 'Không tải được danh sách đội ngũ.')
      }
    } catch (err) {
      console.error('Unexpected error fetching CMS data (scale/staff):', err)
      showApiError(err, 'Không tải được dữ liệu CMS đội ngũ.')
    }

    // Fetch reactions separately so failures don't block the rest of the page
    setReactionsLoading(true)
    try {
      const reactionsRes = await cmsService.getStaffReactionsSummary()
      setReactionsSummary(reactionsRes || [])
      setReactionsError(null)
    } catch (err) {
      console.error('Error fetching reactions summary:', err)
      setReactionsSummary([])
      setReactionsError(err)
    } finally {
      setReactionsLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const reloadReactions = async () => {
    setReactionsLoading(true)
    try {
      const reactionsRes = await cmsService.getStaffReactionsSummary()
      setReactionsSummary(reactionsRes || [])
      setReactionsError(null)
    } catch (err) {
      console.error('Error reloading reactions summary:', err)
      setReactionsSummary([])
      setReactionsError(err)
      showApiError(err, 'Không tải được dữ liệu phản ứng.')
    } finally {
      setReactionsLoading(false)
    }
  }

  const saveScale = async () => {
    setSavingScale(true)
    try {
      await cmsService.updateSocialScale({
        hero_title: scale.hero_title,
        hero_subtitle: scale.hero_subtitle,
        staff_hero: scale.staff_hero,
        vision: scale.vision,
        subjects_overview: scale.subjects_overview,
        staff_count: Number(scale.staff_count || 0),
        student_count: Number(scale.student_count || 0),
        projects_count: Number(scale.projects_count || 0),
        awards_count: Number(scale.awards_count || 0),
        roadmap: scale.roadmap,
        is_active: !!scale.is_active,
      })
      toastSuccess('Đã lưu thông tin quy mô.')
      fetchAll()
    } catch (err) {
      console.error('Error saving scale:', err)
      showApiError(err, 'Lưu thông tin quy mô thất bại.')
    } finally {
      setSavingScale(false)
    }
  }

  const addStaff = async () => {
    if (!newStaff.full_name || !newStaff.title) {
      toastError('Vui lòng nhập tên và chức danh.')
      return
    }
    setStaffLoading(true)
    try {
      await cmsService.createStaffProfile({
        ...newStaff,
        display_order: Number(newStaff.display_order || 0),
        is_active: !!newStaff.is_active,
      })
      setNewStaff(emptyStaff)
      toastSuccess('Đã thêm hồ sơ giáo viên.')
      fetchAll()
    } catch (err) {
      console.error('Error adding staff:', err)
      showApiError(err, 'Thêm hồ sơ giáo viên thất bại.')
    } finally {
      setStaffLoading(false)
    }
  }

  const updateStaff = async (item) => {
    try {
      await cmsService.updateStaffProfile(item.id, {
        ...item,
        display_order: Number(item.display_order || 0),
        is_active: !!item.is_active,
      })
      toastSuccess(`Đã cập nhật: ${item.full_name}`)
      await fetchAll()
      setExpandedId(null)
    } catch (err) {
      console.error('Error updating staff:', err)
      showApiError(err, 'Cập nhật giáo viên thất bại.')
    }
  }

  const deleteStaff = async (id) => {
    const confirmed = await confirmAction({
      title: 'Bạn chắc chắn muốn xóa hồ sơ này?',
      text: 'Hồ sơ giáo viên sẽ bị xóa khỏi hệ thống.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return
    try {
      await cmsService.deleteStaffProfile(id)
      toastSuccess('Đã xóa hồ sơ giáo viên.')
      await fetchAll()
      setExpandedId(null)
    } catch (err) {
      console.error('Error deleting staff:', err)
      showApiError(err, 'Xóa giáo viên thất bại.')
    }
  }

  const patchStaff = (id, key, value) => {
    setStaffList((prev) => prev.map((x) => (x.id === id ? { ...x, [key]: value } : x)))
  }
  const [newStaffUploading, setNewStaffUploading] = useState(false)
  const [uploadingStaffId, setUploadingStaffId] = useState(null)
  const [newStaffLocalPreview, setNewStaffLocalPreview] = useState(null)
  const [staffLocalPreviews, setStaffLocalPreviews] = useState({})

  const MAX_IMAGE_BYTES = Number(import.meta.env.VITE_IMAGE_MAX_UPLOAD_BYTES) || 40 * 1024 * 1024 // default 40MB, override with VITE_IMAGE_MAX_UPLOAD_BYTES

  const uploadImageFile = async (file) => {
    try {
      const res = await cmsService.uploadImage(file, 'doingu')
      return res?.url
    } catch (err) {
      showApiError(err, 'Tải ảnh thất bại')
      return null
    }
  }

  const handleNewStaffFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toastError(`Ảnh vượt quá dung lượng tối đa ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`)
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setNewStaffLocalPreview(previewUrl)
    setNewStaffUploading(true)
    try {
      const url = await uploadImageFile(file)
      if (url) {
        setNewStaff((s) => ({ ...s, image_url: url }))
        toastSuccess('Đã tải ảnh lên')
      }
    } finally {
      setNewStaffUploading(false)
      try { URL.revokeObjectURL(previewUrl) } catch (err) {}
      setNewStaffLocalPreview(null)
    }
  }

  const handleStaffFileChange = async (id, e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      toastError(`Ảnh vượt quá dung lượng tối đa ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB`)
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setStaffLocalPreviews((prev) => ({ ...prev, [id]: previewUrl }))
    setUploadingStaffId(id)
    try {
      const url = await uploadImageFile(file)
      if (url) {
        patchStaff(id, 'image_url', url)
        toastSuccess('Đã tải ảnh lên')
      }
    } finally {
      setUploadingStaffId(null)
      try { URL.revokeObjectURL(previewUrl) } catch (err) {}
      setStaffLocalPreviews((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-500 font-black uppercase tracking-widest">Đang tải CMS đội ngũ...</div>
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-fpt-blue" size={24} />
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Quy mô</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Tiêu đề</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Tiêu đề"
              value={scale.hero_title || ''}
              onChange={(e) => setScale({ ...scale, hero_title: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Tiêu đề lớn hiển thị ở đầu trang giới thiệu đội ngũ.</p>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Sứ mệnh</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Vision"
              value={scale.vision || ''}
              onChange={(e) => setScale({ ...scale, vision: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Câu ngắn mô tả định hướng của tổ xã hội.</p>
          </div>

          <div className="md:col-span-2 flex flex-col">
            <label className="text-sm font-medium text-slate-700">Mô tả ngắn</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Mô tả ngắn"
              value={scale.hero_subtitle || ''}
              onChange={(e) => setScale({ ...scale, hero_subtitle: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Văn bản ngắn hiển thị ngay dưới tiêu đề chính.</p>
          </div>

          <div className="md:col-span-2 flex flex-col">
            <label className="text-sm font-medium text-slate-700">Tổng quan phân môn</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Tổng quan phân môn"
              value={scale.subjects_overview || ''}
              onChange={(e) => setScale({ ...scale, subjects_overview: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Nội dung ngắn tóm tắt các phân môn để hiển thị trên trang.</p>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Số giáo viên</label>
            <input
              type="number"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Số giáo viên"
              value={scale.staff_count ?? 0}
              onChange={(e) => setScale({ ...scale, staff_count: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Số sinh viên</label>
            <input
              type="number"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Số sinh viên"
              value={scale.student_count ?? 0}
              onChange={(e) => setScale({ ...scale, student_count: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Số dự án</label>
            <input
              type="number"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Số dự án"
              value={scale.projects_count ?? 0}
              onChange={(e) => setScale({ ...scale, projects_count: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Số giải thưởng</label>
            <input
              type="number"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Số giải thưởng"
              value={scale.awards_count ?? 0}
              onChange={(e) => setScale({ ...scale, awards_count: e.target.value })}
            />
          </div>

          <div className="rich-editor space-y-2 rich-editor-compact md:col-span-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-2">
              <RichTextEditor
                className="w-full"
                size="compact"
                placeholder="Roadmap"
                value={scale.roadmap || ''}
                onChange={(value) => setScale({ ...scale, roadmap: value })}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={saveScale} className="tap-target inline-flex items-center justify-center transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange/35 focus-visible:ring-offset-2 hover:bg-fpt-blue/90 shadow-lg shadow-blue-100 text-sm uppercase tracking-widest bg-fpt-blue text-white rounded-xl px-6 py-3 font-black">
            <Save size={16} className="mr-2" /> {savingScale ? 'Đang lưu...' : 'Lưu quy mô'}
          </button>
        </div>
      </div>

      <Card className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-fpt-blue" size={24} />
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS ĐỘI NGŨ</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex flex-col">
            <label className="text-sm font-medium text-slate-700">Câu hero (Dòng ngắn)</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Câu giới thiệu ngắn cho trang ĐỘI NGŨ"
              value={scale.staff_hero || ''}
              onChange={(e) => setScale({ ...scale, staff_hero: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Câu ngắn xuất hiện ngay dưới tiêu đề ĐỘI NGŨ trên trang công khai.</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button onClick={saveScale} className="bg-fpt-blue text-white rounded-xl px-6 py-3 font-black">
            <Save size={16} className="mr-2" /> {savingScale ? 'Đang lưu...' : 'Lưu đội ngũ'}
          </Button>
        </div>
      </Card>

      <Card className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="text-fpt-blue" size={24} />
            <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">Phản ứng đội ngũ</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-expanded={!reactionsCollapsed}
              onClick={() => setReactionsCollapsed((s) => !s)}
              className="p-2 bg-white border border-gray-100 rounded-full shadow-sm hover:shadow-md transition-transform"
              title={reactionsCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              <ChevronDown className="text-fpt-blue" size={16} style={{ transform: reactionsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.18s' }} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!reactionsCollapsed && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
              {reactionsLoading ? (
                <div className="py-8 text-center text-gray-500">Đang tải dữ liệu phản ứng...</div>
              ) : reactionsError ? (
                <div className="py-4 text-sm text-red-600">
                  Lỗi khi tải dữ liệu phản ứng. <button onClick={reloadReactions} className="ml-2 underline">Tải lại</button>
                </div>
              ) : (
                <>
                  {(!reactionsSummary || reactionsSummary.length === 0) ? (
                    <div className="py-4 text-sm text-gray-500">Chưa có dữ liệu phản ứng. <button onClick={reloadReactions} className="ml-2 underline">Tải lại</button></div>
                  ) : (
                    <>
                      <StaffReactionsSummaryBlock data={reactionsSummary} />
                      <StaffReactionsChart data={reactionsSummary} />
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <StaffListContainer />
    </div>
  )
}
