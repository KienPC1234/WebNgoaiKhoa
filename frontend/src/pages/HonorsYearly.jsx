import { useEffect, useState } from 'react'
import axios from 'axios'
import { Award } from 'lucide-react'
import { Card } from '@/components/UI'
import { Link } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const toPlainText = (value) => (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export const HonorsYearly = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchHonors = async () => {
      setLoading(true)
      try {
        const subjects = ['van', 'ktpl', 'lich-su', 'dia-li', 'vovinam']
        const requests = subjects.map((subject) =>
          axios.get(`${API_URL}/public/publications`, {
            params: { subject, content_type: 'vinh-danh' },
          })
        )
        const responses = await Promise.all(requests)
        const merged = responses.flatMap((r) => r.data || [])
        merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setItems(merged)
      } catch (error) {
        console.error('Error fetching honors:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHonors()
  }, [])

  return (
    <div className="page-shell-public bg-gray-50/50">
      <section className="page-hero page-hero-caro text-slate-700">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight text-fpt-blue">Vinh danh năm học</h1>
          <p className="text-slate-500 mt-3 font-medium">Tổng hợp danh sách vinh danh từ các phân môn thuộc Tổ xã hội.</p>
        </div>
      </section>

      <div className="page-content-wrap">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-56 bg-white rounded-3xl animate-pulse" />)}
          </div>
        )}

        {!loading && items.length === 0 && (
          <Card className="p-12 rounded-3xl text-center bg-white border-dashed border-2 border-gray-200">
            <Award size={44} className="mx-auto text-gray-300 mb-4" />
            <p className="font-black text-gray-400 uppercase tracking-widest">Chưa có danh sách vinh danh.</p>
          </Card>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="p-6 rounded-3xl bg-white border-none shadow-lg space-y-3">
                <div className="inline-flex items-center gap-2 bg-orange-50 text-fpt-orange px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <Award size={12} /> {item.subject}
                </div>
                <h3 className="text-lg font-black text-fpt-blue line-clamp-2">{item.title}</h3>
                <p className="text-sm text-gray-500 font-medium line-clamp-3">{toPlainText(item.content)}</p>
                <div className="pt-2">
                  <Link to={`/posts/${item.id}`} className="text-xs font-black uppercase tracking-widest text-fpt-orange hover:text-orange-600">
                    Đọc toàn văn
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
