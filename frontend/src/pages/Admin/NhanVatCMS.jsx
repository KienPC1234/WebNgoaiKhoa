import { useEffect, useState } from 'react'
import { Button, Card, RichTextEditor } from '@/components/UI'
import { Plus, Save, Trash2, Users, Building2 } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

const emptyStaff = {
  full_name: '',
  title: '',
  bio: '',
  email: '',
  image_url: '',
  expertise: '',
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

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [scaleRes, staffRes] = await Promise.all([
        cmsService.getSocialScale(),
        cmsService.getStaffProfiles(),
      ])
      setScale(scaleRes)
      setStaffList(staffRes)
    } catch (err) {
      console.error('Error fetching CMS data:', err)
      showApiError(err, 'Không tải được dữ liệu CMS đội ngũ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const saveScale = async () => {
    setSavingScale(true)
    try {
      await cmsService.updateSocialScale({
        hero_title: scale.hero_title,
        hero_subtitle: scale.hero_subtitle,
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

  if (loading) {
    return <div className="py-20 text-center text-gray-500 font-black uppercase tracking-widest">Đang tải CMS đội ngũ...</div>
  }

  return (
    <div className="space-y-8">
      <Card className="p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-fpt-blue" size={24} />
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Quy mô Tổ xã hội</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Tiêu đề (hero)</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Tiêu đề"
              value={scale.hero_title || ''}
              onChange={(e) => setScale({ ...scale, hero_title: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Tiêu đề lớn hiển thị ở đầu trang giới thiệu đội ngũ.</p>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Sứ mệnh / Vision</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Vision"
              value={scale.vision || ''}
              onChange={(e) => setScale({ ...scale, vision: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Câu ngắn mô tả định hướng của tổ xã hội.</p>
          </div>

          <div className="md:col-span-2 flex flex-col">
            <label className="text-sm font-medium text-slate-700">Mô tả ngắn (subtitle)</label>
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

          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Roadmap"
            value={scale.roadmap || ''}
            onChange={(value) => setScale({ ...scale, roadmap: value })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveScale} className="bg-fpt-blue text-white rounded-xl px-6 py-3 font-black">
            <Save size={16} className="mr-2" /> {savingScale ? 'Đang lưu...' : 'Lưu quy mô'}
          </Button>
        </div>
      </Card>

      <Card className="p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-fpt-orange" size={24} />
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Đội ngũ giáo viên</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Họ tên</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Họ tên"
              value={newStaff.full_name}
              onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Chức danh</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Chức danh"
              value={newStaff.title}
              onChange={(e) => setNewStaff({ ...newStaff, title: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Email"
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-700">Chuyên môn</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Chuyên môn"
              value={newStaff.expertise}
              onChange={(e) => setNewStaff({ ...newStaff, expertise: e.target.value })}
            />
          </div>

          <div className="flex flex-col md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Ảnh URL</label>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              placeholder="Ảnh URL"
              value={newStaff.image_url}
              onChange={(e) => setNewStaff({ ...newStaff, image_url: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">Dùng ảnh vuông (ví dụ 400x400). URL phải là public và có thể truy cập.</p>
          </div>

          <div className="md:col-span-1 flex items-center justify-center">
            {newStaff.image_url ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img
                src={newStaff.image_url}
                alt="preview"
                className="h-24 w-24 object-cover rounded-lg border"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="h-24 w-24 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">Preview</div>
            )}
          </div>

          <RichTextEditor
            className="md:col-span-3"
            size="compact"
            placeholder="Tiểu sử"
            value={newStaff.bio}
            onChange={(value) => setNewStaff({ ...newStaff, bio: value })}
          />
        </div>
        <div className="flex justify-end mb-8">
          <Button onClick={addStaff} className="bg-fpt-orange text-white rounded-xl px-6 py-3 font-black" disabled={staffLoading}>
            <Plus size={16} className="mr-2" /> Thêm giáo viên
          </Button>
        </div>

        <div className="space-y-4">
          {staffList.map((item) => (
            <div
              key={item.id}
              className="p-4 border border-gray-100 rounded-2xl"
              onClick={(e) => {
                // ignore clicks on interactive elements so users can type/click controls without toggling
                if (e.target.closest('input,button,textarea,select,a')) return
                setExpandedId(expandedId === item.id ? null : item.id)
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-3 flex items-center gap-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt="avatar" className="h-20 w-20 object-cover rounded-lg border" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="h-20 w-20 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                  <div className="flex-1">
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" value={item.full_name || ''} onChange={(e) => patchStaff(item.id, 'full_name', e.target.value)} />
                    <input className="w-full mt-2 px-3 py-1 rounded-lg border border-slate-200 text-sm text-gray-500" value={item.title || ''} onChange={(e) => patchStaff(item.id, 'title', e.target.value)} />
                  </div>
                </div>

                <input className="md:col-span-3 px-3 py-2 rounded-lg border border-slate-200 text-sm" value={item.expertise || ''} onChange={(e) => patchStaff(item.id, 'expertise', e.target.value)} />

                <input type="number" className="md:col-span-1 px-3 py-2 rounded-lg border border-slate-200 text-sm" value={item.display_order || 0} onChange={(e) => patchStaff(item.id, 'display_order', e.target.value)} />

                <div className="md:col-span-2 flex items-center">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input type="checkbox" checked={!!item.is_active} onChange={(e) => patchStaff(item.id, 'is_active', e.target.checked)} />
                    Hiển thị
                  </label>
                </div>

                <div className="md:col-span-1 flex gap-2 justify-end items-start">
                  <Button onClick={(e) => { e.stopPropagation(); updateStaff(item) }} className="bg-fpt-blue text-white px-3 py-2 rounded-lg font-black">Lưu</Button>
                  <Button onClick={(e) => { e.stopPropagation(); deleteStaff(item.id) }} className="bg-red-500 text-white px-3 py-2 rounded-lg font-black">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-3 flex flex-col">
                    <label className="text-sm font-medium text-slate-700">Ảnh URL</label>
                    <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" value={item.image_url || ''} onChange={(e) => patchStaff(item.id, 'image_url', e.target.value)} />
                    <p className="text-xs text-gray-400 mt-1">URL phải public. Có thể thay bằng link CDN.</p>
                    <div className="mt-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt="preview" className="h-36 w-36 object-cover rounded-lg border" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="h-36 w-36 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">Preview</div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-9 flex flex-col">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm mb-3" value={item.email || ''} onChange={(e) => patchStaff(item.id, 'email', e.target.value)} />

                    <label className="text-sm font-medium text-slate-700">Tiểu sử (description)</label>
                    <RichTextEditor className="w-full" size="compact" placeholder="Tiểu sử" value={item.bio || ''} onChange={(value) => patchStaff(item.id, 'bio', value)} />

                    <div className="mt-3 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={!!item.is_active} onChange={(e) => patchStaff(item.id, 'is_active', e.target.checked)} />
                        Hiển thị
                      </label>

                      <Button onClick={async (e) => { e.stopPropagation(); await updateStaff(item) }} className="bg-fpt-blue text-white px-3 py-2 rounded-lg font-black">Lưu</Button>
                      <Button onClick={(e) => { e.stopPropagation(); fetchAll(); setExpandedId(null) }} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg">Hủy</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
