import { useEffect, useState } from 'react'
import axios from 'axios'
import { Card, Button, RichTextEditor } from '@/components/UI'
import { Plus, Save, Trash2, Users, Building2 } from 'lucide-react'
import { confirmAction, showApiError, toastSuccess } from '@/lib/notify'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const defaultScale = {
  hero_title: '',
  hero_subtitle: '',
  vision: '',
  subjects_overview: '',
  staff_count: 0,
  student_count: 0,
  projects_count: 0,
  awards_count: 0,
  roadmap: '',
  is_active: true,
}

const defaultStaff = {
  full_name: '',
  title: '',
  bio: '',
  email: '',
  image_url: '',
  expertise: '',
  display_order: 0,
  is_active: true,
}

export const AdminNhanVat = () => {
  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(defaultScale)
  const [staff, setStaff] = useState([])
  const [staffForm, setStaffForm] = useState(defaultStaff)
  const [editingId, setEditingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [scaleRes, staffRes] = await Promise.all([
        axios.get(`${API_URL}/admin/social-scale`, { headers }),
        axios.get(`${API_URL}/admin/staff`, { headers }),
      ])
      setScale(scaleRes.data)
      setStaff(staffRes.data || [])
    } catch (error) {
      console.error('Error loading CMS data:', error)
      showApiError(error, 'Không tải được dữ liệu nhân vật.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const saveScale = async () => {
    try {
      await axios.put(`${API_URL}/admin/social-scale`, scale, { headers })
      toastSuccess('Đã lưu thông tin quy mô.')
    } catch (error) {
      console.error('Error saving social scale:', error)
      showApiError(error, 'Lưu dữ liệu thất bại.')
    }
  }

  const resetStaffForm = () => {
    setStaffForm(defaultStaff)
    setEditingId(null)
  }

  const saveStaff = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await axios.put(`${API_URL}/admin/staff/${editingId}`, staffForm, { headers })
      } else {
        await axios.post(`${API_URL}/admin/staff`, staffForm, { headers })
      }
      resetStaffForm()
      toastSuccess(editingId ? 'Đã cập nhật hồ sơ giáo viên.' : 'Đã thêm hồ sơ giáo viên.')
      loadData()
    } catch (error) {
      console.error('Error saving staff profile:', error)
      showApiError(error, 'Lưu hồ sơ giáo viên thất bại.')
    }
  }

  const editStaff = (item) => {
    setEditingId(item.id)
    setStaffForm({
      full_name: item.full_name || '',
      title: item.title || '',
      bio: item.bio || '',
      email: item.email || '',
      image_url: item.image_url || '',
      expertise: item.expertise || '',
      display_order: item.display_order ?? 0,
      is_active: item.is_active ?? true,
    })
  }

  const removeStaff = async (id) => {
    const confirmed = await confirmAction({
      title: 'Xóa hồ sơ này?',
      text: 'Hồ sơ giáo viên sẽ bị xóa khỏi danh sách.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return
    try {
      await axios.delete(`${API_URL}/admin/staff/${id}`, { headers })
      toastSuccess('Đã xóa hồ sơ giáo viên.')
      loadData()
    } catch (error) {
      console.error('Error deleting staff profile:', error)
      showApiError(error, 'Xóa thất bại.')
    }
  }

  if (loading) {
    return <div className="py-20 text-center font-black text-gray-400 uppercase tracking-widest">Đang tải dữ liệu...</div>
  }

  return (
    <div className="space-y-8 pb-10">
      <Card className="p-8 rounded-[32px] border-none shadow-xl bg-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-50 text-fpt-blue"><Building2 size={20} /></div>
          <h3 className="text-xl font-black text-fpt-blue uppercase tracking-tight">CMS Quy mô Tổ xã hội</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Tiêu đề" value={scale.hero_title || ''} onChange={(e) => setScale({ ...scale, hero_title: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Tổng quan chuyên môn" value={scale.subjects_overview || ''} onChange={(e) => setScale({ ...scale, subjects_overview: e.target.value })} />
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Hero subtitle"
            value={scale.hero_subtitle || ''}
            onChange={(value) => setScale({ ...scale, hero_subtitle: value })}
          />
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Vision"
            value={scale.vision || ''}
            onChange={(value) => setScale({ ...scale, vision: value })}
          />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Số giáo viên" value={scale.staff_count ?? 0} onChange={(e) => setScale({ ...scale, staff_count: Number(e.target.value) || 0 })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Số sinh viên" value={scale.student_count ?? 0} onChange={(e) => setScale({ ...scale, student_count: Number(e.target.value) || 0 })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Số dự án" value={scale.projects_count ?? 0} onChange={(e) => setScale({ ...scale, projects_count: Number(e.target.value) || 0 })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Số giải thưởng" value={scale.awards_count ?? 0} onChange={(e) => setScale({ ...scale, awards_count: Number(e.target.value) || 0 })} />
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Roadmap"
            value={scale.roadmap || ''}
            onChange={(value) => setScale({ ...scale, roadmap: value })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveScale} className="bg-fpt-blue text-white px-6 py-3 rounded-xl font-black inline-flex items-center gap-2 border-none">
            <Save size={16} /> Lưu quy mô
          </Button>
        </div>
      </Card>

      <Card className="p-8 rounded-[32px] border-none shadow-xl bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-50 text-fpt-orange"><Users size={20} /></div>
            <h3 className="text-xl font-black text-fpt-blue uppercase tracking-tight">CMS Đội ngũ giáo viên</h3>
          </div>
          <Button onClick={resetStaffForm} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-black inline-flex items-center gap-2 border-none">
            <Plus size={14} /> Mới
          </Button>
        </div>

        <form onSubmit={saveStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <input required className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Họ tên" value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} />
          <input required className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Chức danh" value={staffForm.title} onChange={(e) => setStaffForm({ ...staffForm, title: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Chuyên môn" value={staffForm.expertise} onChange={(e) => setStaffForm({ ...staffForm, expertise: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold md:col-span-2" placeholder="Image URL" value={staffForm.image_url} onChange={(e) => setStaffForm({ ...staffForm, image_url: e.target.value })} />
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Bio"
            value={staffForm.bio}
            onChange={(value) => setStaffForm({ ...staffForm, bio: value })}
          />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Thứ tự hiển thị" value={staffForm.display_order} onChange={(e) => setStaffForm({ ...staffForm, display_order: Number(e.target.value) || 0 })} />
          <select className="px-4 py-3 rounded-xl bg-gray-50 font-bold" value={staffForm.is_active ? '1' : '0'} onChange={(e) => setStaffForm({ ...staffForm, is_active: e.target.value === '1' })}>
            <option value="1">Đang hiển thị</option>
            <option value="0">Tạm ẩn</option>
          </select>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" className="bg-fpt-orange text-white px-6 py-3 rounded-xl font-black inline-flex items-center gap-2 border-none">
              <Save size={16} /> {editingId ? 'Cập nhật giáo viên' : 'Thêm giáo viên'}
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          {staff.map((item) => (
            <div key={item.id} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-black text-fpt-blue truncate">{item.full_name}</div>
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{item.title}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={() => editStaff(item)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-black border-none">Sửa</Button>
                <Button onClick={() => removeStaff(item.id)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-black inline-flex items-center gap-1 border-none">
                  <Trash2 size={14} /> Xóa
                </Button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="p-10 text-center text-gray-400 font-black uppercase tracking-widest">Chưa có hồ sơ giáo viên.</div>
          )}
        </div>
      </Card>
    </div>
  )
}
