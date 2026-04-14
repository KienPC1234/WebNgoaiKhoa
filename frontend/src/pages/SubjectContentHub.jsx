import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Award, BookOpen, Compass, ExternalLink, RefreshCw } from 'lucide-react'
import { Card } from '@/components/UI'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const toPlainText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const SUBJECT_LABELS = {
  van: 'Ngữ Văn',
  ktpl: 'Kinh tế pháp luật',
  'lich-su': 'Lịch sử',
  'dia-li': 'Địa lí',
  vovinam: 'Vovinam',
}

const CONTENT_TYPE_LABELS = {
  'an-pham': 'Ấn phẩm/sp học tập',
  'tai-lieu': 'Tài liệu tham khảo',
  'vinh-danh': 'Vinh danh năm học',
}

const CONTENT_TYPE_ICON = {
  'an-pham': BookOpen,
  'tai-lieu': Compass,
  'vinh-danh': Award,
}

export const SubjectContentHub = () => {
  const { subject, contentType } = useParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const subjectLabel = useMemo(() => SUBJECT_LABELS[subject] || subject, [subject])
  const typeLabel = useMemo(() => CONTENT_TYPE_LABELS[contentType] || contentType, [contentType])
  const TypeIcon = CONTENT_TYPE_ICON[contentType] || BookOpen

  const loadItems = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API_URL}/public/publications`, {
        params: {
          subject,
          content_type: contentType,
        },
      })
      setItems(res.data || [])
    } catch (e) {
      setError('Không tải được dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [subject, contentType])

  return (
    <div className="page-shell-public bg-gray-50/50">
      <section className="page-hero page-hero-caro text-slate-700">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-orange-200 text-fpt-blue">
            <TypeIcon size={16} />
            {subjectLabel}
          </div>
          <h1 className="text-4xl md:text-6xl font-black mt-6 italic uppercase tracking-tight text-fpt-blue">{typeLabel}</h1>
          <p className="text-slate-500 mt-4 font-medium">Danh sách nội dung được xuất bản chính thức cho chuyên môn {subjectLabel}.</p>
        </div>
      </section>

      <div className="page-content-wrap space-y-6">
        <div className="flex justify-end">
          <button
            onClick={loadItems}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:text-fpt-orange px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest"
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-white animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <Card className="p-8 rounded-3xl bg-red-50 border-red-100 text-red-600 font-bold">{error}</Card>
        )}

        {!loading && !error && items.length === 0 && (
          <Card className="p-12 rounded-3xl text-center bg-white border-dashed border-2 border-gray-200">
            <TypeIcon size={42} className="mx-auto text-gray-300 mb-4" />
            <p className="font-black text-gray-500 uppercase tracking-widest text-sm">Chưa có nội dung cho mục này.</p>
          </Card>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="rounded-3xl p-0 overflow-hidden border-none shadow-lg bg-white">
                <div className="h-44 bg-gray-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <TypeIcon size={44} />
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-black text-lg text-fpt-blue line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 font-medium line-clamp-4">{toPlainText(item.content)}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    <Link to={`/posts/${item.id}`} className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 hover:text-fpt-orange flex items-center justify-center">
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
