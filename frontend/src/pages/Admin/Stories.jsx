import { useEffect, useState } from 'react'
import { Card, Button, RichTextEditor } from '@/components/UI'
import { BookHeart, Plus, Save, Trash2 } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastError, toastSuccess } from '@/lib/notify'

const emptyForm = {
  title: '',
  content: '',
  snippet: '',
  author: '',
  category: '',
  image_url: '',
  read_time_minutes: 5,
  is_published: true,
}

export const AdminStories = () => {
  const [loading, setLoading] = useState(true)
  const [stories, setStories] = useState([])
  const [form, setForm] = useState(emptyForm)

  const fetchStories = async () => {
    setLoading(true)
    try {
      const data = await cmsService.getStories()
      setStories(data || [])
    } catch (error) {
      console.error('Error fetching stories:', error)
      showApiError(error, 'Không tải được danh sách câu chuyện.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStories()
  }, [])

  const createStory = async () => {
    if (!form.title || !form.content || !form.author) {
      toastError('Vui lòng điền đầy đủ thông tin.')
      return
    }
    try {
      await cmsService.createStory(form)
      setForm(emptyForm)
      toastSuccess('Tạo câu chuyện thành công.')
      fetchStories()
    } catch (error) {
      console.error('Error creating story:', error)
      showApiError(error, 'Tạo câu chuyện thất bại.')
    }
  }

  const patchStory = (id, key, value) => {
    setStories((prev) => prev.map((x) => (x.id === id ? { ...x, [key]: value } : x)))
  }

  const saveStory = async (item) => {
    try {
      await cmsService.updateStory(item.id, item)
      toastSuccess('Đã cập nhật câu chuyện.')
      fetchStories()
    } catch (error) {
      console.error('Error updating story:', error)
      showApiError(error, 'Cập nhật câu chuyện thất bại.')
    }
  }

  const removeStory = async (id) => {
    const confirmed = await confirmAction({
      title: 'Xóa câu chuyện này?',
      text: 'Nội dung sẽ bị xóa khỏi hệ thống.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return
    try {
      await cmsService.deleteStory(id)
      toastSuccess('Đã xóa câu chuyện.')
      fetchStories()
    } catch (error) {
      console.error('Error deleting story:', error)
      showApiError(error, 'Xóa câu chuyện thất bại.')
    }
  }

  return (
    <div className="space-y-8">
      <Card className="p-8 rounded-[32px] border-none shadow-xl bg-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600"><BookHeart size={20} /></div>
          <h2 className="text-2xl font-black text-fpt-blue uppercase tracking-tight">CMS Câu chuyện truyền cảm hứng</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Tác giả" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Chuyên mục" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input type="number" className="px-4 py-3 rounded-xl bg-gray-50 font-bold" placeholder="Phút đọc" value={form.read_time_minutes} onChange={(e) => setForm({ ...form, read_time_minutes: Number(e.target.value) || 5 })} />
          <input className="px-4 py-3 rounded-xl bg-gray-50 font-bold md:col-span-2" placeholder="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <RichTextEditor
            className="md:col-span-2"
            size="compact"
            placeholder="Tóm tắt"
            value={form.snippet}
            onChange={(value) => setForm({ ...form, snippet: value })}
          />
          <RichTextEditor
            className="md:col-span-2"
            placeholder="Nội dung"
            value={form.content}
            onChange={(value) => setForm({ ...form, content: value })}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={createStory} className="bg-fpt-orange text-white px-6 py-3 rounded-xl font-black inline-flex items-center gap-2 border-none">
            <Plus size={16} /> Thêm câu chuyện
          </Button>
        </div>
      </Card>

      <Card className="p-8 rounded-[32px] border-none shadow-xl bg-white">
        {loading ? (
          <div className="py-16 text-center text-gray-400 font-black uppercase tracking-widest">Đang tải...</div>
        ) : (
          <div className="space-y-4">
            {stories.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-3">
                <input className="md:col-span-3 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.title || ''} onChange={(e) => patchStory(item.id, 'title', e.target.value)} />
                <input className="md:col-span-2 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.author || ''} onChange={(e) => patchStory(item.id, 'author', e.target.value)} />
                <input className="md:col-span-2 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.category || ''} onChange={(e) => patchStory(item.id, 'category', e.target.value)} />
                <input type="number" className="md:col-span-1 px-3 py-2 rounded-lg bg-gray-50 font-bold" value={item.read_time_minutes || 5} onChange={(e) => patchStory(item.id, 'read_time_minutes', Number(e.target.value) || 5)} />
                <div className="md:col-span-4 flex justify-end gap-2">
                  <Button onClick={() => saveStory(item)} className="bg-fpt-blue text-white px-3 py-2 rounded-lg font-black border-none inline-flex items-center gap-1"><Save size={14} />Lưu</Button>
                  <Button onClick={() => removeStory(item.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg font-black border-none inline-flex items-center gap-1"><Trash2 size={14} />Xóa</Button>
                </div>
                <RichTextEditor
                  className="md:col-span-12"
                  size="compact"
                  value={item.snippet || ''}
                  onChange={(value) => patchStory(item.id, 'snippet', value)}
                />
                <RichTextEditor
                  className="md:col-span-12"
                  value={item.content || ''}
                  onChange={(value) => patchStory(item.id, 'content', value)}
                />
              </div>
            ))}
            {stories.length === 0 && <div className="py-12 text-center text-gray-400 font-black uppercase tracking-widest">Chưa có câu chuyện.</div>}
          </div>
        )}
      </Card>
    </div>
  )
}
