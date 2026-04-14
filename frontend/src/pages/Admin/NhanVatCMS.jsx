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
      showApiError(err, 'Không tải được dữ liệu CMS nhân vật.')
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
      fetchAll()
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
      fetchAll()
    } catch (err) {
      console.error('Error deleting staff:', err)
      showApiError(err, 'Xóa giáo viên thất bại.')
    }
  }

  const patchStaff = (id, key, value) => {
    setStaffList((prev) => prev.map((x) => (x.id === id ? { ...x, [key]: value } : x)))
  }

  if (loading) {
    return <div className="py-20 text-center text-gray-500 font-black uppercase tracking-widest">Đang tải CMS nhân vật...</div>
  }

  return (
    <div className="space-y-8">
      <Card className="p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="text-fpt-blue" size={24} />
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Quy mô Tổ xã hội</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Tiêu đề" value={scale.hero_title || ''} onChange={(e) => setScale({ ...scale, hero_title: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Vision" value={scale.vision || ''} onChange={(e) => setScale({ ...scale, vision: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 md:col-span-2" placeholder="Mô tả ngắn" value={scale.hero_subtitle || ''} onChange={(e) => setScale({ ...scale, hero_subtitle: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 md:col-span-2" placeholder="Tổng quan phân môn" value={scale.subjects_overview || ''} onChange={(e) => setScale({ ...scale, subjects_overview: e.target.value })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Số giáo viên" value={scale.staff_count ?? 0} onChange={(e) => setScale({ ...scale, staff_count: e.target.value })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Số sinh viên" value={scale.student_count ?? 0} onChange={(e) => setScale({ ...scale, student_count: e.target.value })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Số dự án" value={scale.projects_count ?? 0} onChange={(e) => setScale({ ...scale, projects_count: e.target.value })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Số giải thưởng" value={scale.awards_count ?? 0} onChange={(e) => setScale({ ...scale, awards_count: e.target.value })} />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Họ tên" value={newStaff.full_name} onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Chức danh" value={newStaff.title} onChange={(e) => setNewStaff({ ...newStaff, title: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50" placeholder="Chuyên môn" value={newStaff.expertise} onChange={(e) => setNewStaff({ ...newStaff, expertise: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 md:col-span-2" placeholder="Ảnh URL" value={newStaff.image_url} onChange={(e) => setNewStaff({ ...newStaff, image_url: e.target.value })} />
          <RichTextEditor
            className="md:col-span-2"
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
            <div key={item.id} className="p-4 border border-gray-100 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <input className="md:col-span-3 px-3 py-2 rounded-lg bg-gray-50" value={item.full_name || ''} onChange={(e) => patchStaff(item.id, 'full_name', e.target.value)} />
              <input className="md:col-span-3 px-3 py-2 rounded-lg bg-gray-50" value={item.title || ''} onChange={(e) => patchStaff(item.id, 'title', e.target.value)} />
              <input className="md:col-span-2 px-3 py-2 rounded-lg bg-gray-50" value={item.email || ''} onChange={(e) => patchStaff(item.id, 'email', e.target.value)} />
              <input type="number" className="md:col-span-1 px-3 py-2 rounded-lg bg-gray-50" value={item.display_order || 0} onChange={(e) => patchStaff(item.id, 'display_order', e.target.value)} />
              <div className="md:col-span-3 flex gap-2 justify-end">
                <Button onClick={() => updateStaff(item)} className="bg-fpt-blue text-white px-3 py-2 rounded-lg font-black">Lưu</Button>
                <Button onClick={() => deleteStaff(item.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg font-black">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
