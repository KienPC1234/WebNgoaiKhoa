import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@/components/UI'
import { Plus, Trash2, Edit, Search, FileText, Image as ImageIcon, Newspaper, Calendar, ArrowRight, BookHeart } from 'lucide-react'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastSuccess } from '@/lib/notify'

const parseLayoutMetadata = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const mapPublication = (item) => ({
  id: item.id,
  entityType: 'publication',
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
  content: item.content,
  image_url: item.image_url,
  created_at: item.created_at,
  subject: item.category || 'story',
  content_type: 'story',
  featured_year: '',
  layout_metadata: item.layout_metadata,
})

export const AdminPublications = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchItems = async () => {
    setLoading(true)
    try {
      const [publications, stories] = await Promise.all([
        cmsService.getPublications(),
        cmsService.getStories(),
      ])
      const merged = [
        ...(publications || []).map(mapPublication),
        ...(stories || []).map(mapStory),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setItems(merged)
    } catch (err) {
      showApiError(err, 'Không tải được danh sách nội dung.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleDelete = async (item) => {
    const confirmed = await confirmAction({
      title: item.entityType === 'story' ? 'Xóa câu chuyện?' : 'Xóa bài viết?',
      text: 'Thao tác này không thể hoàn tác.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return

    try {
      if (item.entityType === 'story') {
        await cmsService.deleteStory(item.id)
      } else {
        await cmsService.deletePublication(item.id)
      }
      toastSuccess(item.entityType === 'story' ? 'Đã xóa câu chuyện.' : 'Đã xóa bài viết.')
      fetchItems()
    } catch (err) {
      showApiError(err, 'Xóa nội dung thất bại.')
    }
  }

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items
    const keyword = searchTerm.toLowerCase()
    return items.filter((p) =>
      [p.title, p.subject, p.content_type, p.featured_year, p.entityType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [items, searchTerm])

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[40px] shadow-2xl shadow-gray-100/50 border border-gray-50">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-fpt-blue italic uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl text-fpt-orange"><Newspaper size={28} /></div>
            QUẢN LÝ NỘI DUNG
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-12">Publication + Story trong cùng module</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nội dung..."
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-fpt-orange/20 transition-all font-bold text-sm"
            />
          </div>
          <Button
            onClick={() => navigate('/admin/publications/new')}
            className="bg-fpt-orange hover:bg-orange-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-orange-100 border-none"
          >
            <Plus size={18} /> BÀI VIẾT
          </Button>
          <Button
            onClick={() => navigate('/admin/publications/new?entity=story')}
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-rose-100 border-none"
          >
            <BookHeart size={18} /> CÂU CHUYỆN
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-32 bg-white rounded-[40px] shadow-xl shadow-gray-100/50">
            <div className="w-16 h-16 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
            <p className="font-black text-fpt-blue uppercase tracking-[0.2em] animate-pulse">Đang đồng bộ hóa nội dung...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-32 text-center border-4 border-dashed border-gray-100 rounded-[60px] bg-white">
            <FileText size={80} className="mx-auto text-gray-100 mb-8" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-xl">Kho lưu trữ đang trống</p>
            <Button onClick={() => navigate('/admin/publications/new')} className="mt-8 bg-fpt-blue text-white font-black px-10 py-4 rounded-2xl">
              BẮT ĐẦU VỚI POST DESIGNER
            </Button>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const metadata = parseLayoutMetadata(item.layout_metadata)
            const blockCount = metadata?.blocks?.length || 0
            const isStory = item.entityType === 'story'
            return (
              <Card key={`${item.entityType}-${item.id}`} className="p-8 border-none shadow-xl shadow-gray-100/50 flex flex-col md:flex-row items-center gap-8 group hover:bg-orange-50/20 transition-all rounded-[48px] bg-white border border-transparent hover:border-orange-100">
                <div className="w-full md:w-48 h-48 bg-gray-50 rounded-[32px] flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-gray-50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                  {item.image_url ? (
                    <img src={item.image_url} alt="thumb" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-200" size={48} />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${isStory ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-700'}`}>
                      {isStory ? 'Story' : (item.subject || 'van')}
                    </span>
                    <span className="text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest bg-gray-100 text-gray-600">
                      {isStory ? 'story' : (item.content_type || 'an-pham')}
                    </span>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    {metadata?.template && (
                      <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-blue-50 text-fpt-blue">
                        Template: {metadata.template} · {blockCount} block
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-fpt-blue group-hover:text-fpt-orange transition-colors truncate">{item.title}</h3>
                  <div className="text-gray-500 text-sm font-medium line-clamp-2 prose-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: (item.content || '').substring(0, 260) }}></div>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-fpt-blue">
                      <ArrowRight size={14} />
                    </div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Chỉnh sửa bằng Post Designer</span>
                  </div>
                </div>
                <div className="flex md:flex-col items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => navigate(`/admin/publications/${item.id}/edit?entity=${item.entityType}`)}
                    className="flex-1 md:flex-none p-5 text-gray-400 bg-gray-50 hover:bg-fpt-blue hover:text-white rounded-2xl transition-all shadow-sm"
                  >
                    <Edit size={22} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex-1 md:flex-none p-5 text-gray-400 bg-gray-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
