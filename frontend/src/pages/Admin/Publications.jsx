import { useMemo, useState, useEffect } from 'react'
import { Card, Button } from '@/components/UI'
import {
  ArrowRight,
  Calendar,
  Edit,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Laptop,
  LayoutTemplate,
  Newspaper,
  Plus,
  Quote,
  Search,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { cmsService } from '@/lib/cmsService'
import { confirmAction, showApiError, toastSuccess } from '@/lib/notify'

const emptyForm = {
  title: '',
  content: '',
  category: 'van',
  subject: 'van',
  content_type: 'an-pham',
  featured_year: '2025-2026',
  image_url: '',
}

const createBlock = (type = 'text') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  title: type === 'quote' ? 'Trích dẫn nổi bật' : 'Tiêu đề section',
  body: type === 'quote' ? 'Nhập nội dung trích dẫn...' : 'Nhập nội dung section...',
  image_url: '',
  image_secondary_url: '',
  accent_color: '#1d2a57',
  layout: 'image-left',
  cta_label: '',
  cta_link: '',
})

const PRESETS = {
  news: {
    label: 'Tin tức',
    blocks: [
      { ...createBlock('text'), title: 'Tổng quan sự kiện', body: 'Mô tả ngắn gọn về sự kiện, mục tiêu và bối cảnh.' },
      { ...createBlock('image'), title: 'Khoảnh khắc nổi bật', body: 'Mô tả hình ảnh và thông điệp chính.' },
    ],
  },
  feature: {
    label: 'Phóng sự',
    blocks: [
      { ...createBlock('text'), title: 'Bối cảnh', body: 'Đặt vấn đề, dẫn dắt câu chuyện từ thực tế.' },
      { ...createBlock('gallery'), title: 'Hình ảnh thực địa', body: 'Các góc chụp và ghi chú hiện trường.' },
      { ...createBlock('quote'), title: 'Nhân vật chia sẻ', body: '“Trích dẫn nhân vật hoặc chuyên gia.”' },
    ],
  },
  honors: {
    label: 'Vinh danh',
    blocks: [
      { ...createBlock('text'), title: 'Thành tích đạt được', body: 'Nêu rõ giải thưởng và thành tựu.' },
      { ...createBlock('quote'), title: 'Lời chia sẻ', body: '“Cảm nghĩ từ cá nhân hoặc tập thể được vinh danh.”' },
    ],
  },
  docs: {
    label: 'Tài liệu',
    blocks: [
      { ...createBlock('text'), title: 'Mục tiêu tài liệu', body: 'Nêu mục tiêu học tập và đối tượng sử dụng.' },
      { ...createBlock('text'), title: 'Nội dung chính', body: 'Tóm lược các phần quan trọng của tài liệu.' },
    ],
  },
}

const parseLayoutMetadata = (value) => {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const renderPreviewBlock = (block) => {
  if (block.type === 'quote') {
    return (
      <blockquote key={block.id} className="rounded-2xl bg-slate-50 border-l-4 px-4 py-3 text-sm italic" style={{ borderLeftColor: block.accent_color || '#1d2a57' }}>
        {block.body}
      </blockquote>
    )
  }

  const reverse = block.layout === 'image-right'
  return (
    <section key={block.id} className={`rounded-2xl border border-slate-100 p-4 grid gap-4 ${reverse ? 'md:grid-cols-[1.1fr,1fr]' : 'md:grid-cols-[1fr,1.1fr]'}`}>
      <div className={reverse ? 'md:order-2' : ''}>
        <h4 className="font-black text-base" style={{ color: block.accent_color || '#1d2a57' }}>{block.title || 'Section title'}</h4>
        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{block.body}</p>
        {block.cta_label && block.cta_link && (
          <a
            href={block.cta_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-xs font-black px-3 py-2 rounded-lg text-white"
            style={{ background: block.accent_color || '#1d2a57' }}
          >
            {block.cta_label}
          </a>
        )}
      </div>
      <div className={reverse ? 'md:order-1' : ''}>
        {block.image_url ? (
          <img src={block.image_url} alt="preview" className="w-full h-36 object-cover rounded-xl" />
        ) : (
          <div className="w-full h-36 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">Chưa có ảnh</div>
        )}
        {block.type === 'gallery' && block.image_secondary_url && (
          <img src={block.image_secondary_url} alt="preview-2" className="w-full h-28 object-cover rounded-xl mt-2" />
        )}
      </div>
    </section>
  )
}

export const AdminPublications = () => {
  const [pubs, setPubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPub, setEditingPub] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [searchTerm, setSearchTerm] = useState('')

  const [templateKey, setTemplateKey] = useState('news')
  const [previewMode, setPreviewMode] = useState('desktop')
  const [layoutBlocks, setLayoutBlocks] = useState(PRESETS.news.blocks)

  const fetchPubs = async () => {
    setLoading(true)
    try {
      const data = await cmsService.getPublications()
      setPubs(data || [])
    } catch (err) {
      showApiError(err, 'Không tải được danh sách bài viết.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPubs()
  }, [])

  const openCreateModal = () => {
    setEditingPub(null)
    setFormData(emptyForm)
    setTemplateKey('news')
    setPreviewMode('desktop')
    setLayoutBlocks(PRESETS.news.blocks.map((b) => ({ ...b, id: createBlock().id })))
    setShowModal(true)
  }

  const openEditModal = (pub) => {
    const metadata = parseLayoutMetadata(pub.layout_metadata)
    setEditingPub(pub)
    setFormData({
      title: pub.title,
      content: pub.content,
      category: pub.category || pub.subject || 'van',
      subject: pub.subject || pub.category || 'van',
      content_type: pub.content_type || 'an-pham',
      featured_year: pub.featured_year || '2025-2026',
      image_url: pub.image_url || '',
    })

    const nextTemplate = metadata?.template || 'news'
    const nextBlocks = Array.isArray(metadata?.blocks) && metadata.blocks.length > 0
      ? metadata.blocks.map((b) => ({ ...createBlock(b.type || 'text'), ...b, id: b.id || createBlock().id }))
      : PRESETS[nextTemplate]?.blocks?.map((b) => ({ ...b, id: createBlock().id })) || []

    setTemplateKey(nextTemplate)
    setPreviewMode(metadata?.preview_mode === 'mobile' ? 'mobile' : 'desktop')
    setLayoutBlocks(nextBlocks)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const payload = {
      ...formData,
      layout_metadata: {
        version: 1,
        template: templateKey,
        preview_mode: previewMode,
        blocks: layoutBlocks,
      },
    }

    try {
      if (editingPub) {
        await cmsService.updatePublication(editingPub.id, payload)
      } else {
        await cmsService.createPublication(payload)
      }
      toastSuccess(editingPub ? 'Đã cập nhật bài viết.' : 'Đã tạo bài viết mới.')
      setShowModal(false)
      setEditingPub(null)
      setFormData(emptyForm)
      fetchPubs()
    } catch (err) {
      showApiError(err, 'Lưu bài viết thất bại.')
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmAction({
      title: 'Xóa bài viết?',
      text: 'Thao tác này không thể hoàn tác.',
      confirmButtonText: 'Xóa',
    })
    if (!confirmed) return

    try {
      await cmsService.deletePublication(id)
      toastSuccess('Đã xóa bài viết.')
      fetchPubs()
    } catch (err) {
      showApiError(err, 'Xóa bài viết thất bại.')
    }
  }

  const addBlock = (type) => {
    setLayoutBlocks((prev) => [...prev, createBlock(type)])
  }

  const updateBlock = (id, key, value) => {
    setLayoutBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, [key]: value } : b)))
  }

  const removeBlock = (id) => {
    setLayoutBlocks((prev) => prev.filter((b) => b.id !== id))
  }

  const moveBlock = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return
    setLayoutBlocks((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const applyTemplate = (nextTemplate) => {
    setTemplateKey(nextTemplate)
    const blocks = PRESETS[nextTemplate]?.blocks?.map((b) => ({ ...b, id: createBlock().id })) || []
    setLayoutBlocks(blocks)
  }

  const filteredPubs = useMemo(() => {
    if (!searchTerm.trim()) return pubs
    const keyword = searchTerm.toLowerCase()
    return pubs.filter((p) =>
      [p.title, p.subject, p.content_type, p.featured_year]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [pubs, searchTerm])

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[40px] shadow-2xl shadow-gray-100/50 border border-gray-50">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-fpt-blue italic uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl text-fpt-orange"><Newspaper size={28} /></div>
            QUẢN LÝ NỘI DUNG
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-12">Bài viết và học liệu trên hệ thống</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
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
            onClick={openCreateModal}
            className="bg-fpt-orange hover:bg-orange-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl shadow-orange-100 hover:scale-105 transition-all border-none"
          >
            <Plus size={20} /> THÊM MỚI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-32 bg-white rounded-[40px] shadow-xl shadow-gray-100/50">
            <div className="w-16 h-16 border-4 border-fpt-orange border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
            <p className="font-black text-fpt-blue uppercase tracking-[0.2em] animate-pulse">Đang đồng bộ hóa bài viết...</p>
          </div>
        ) : filteredPubs.length === 0 ? (
          <Card className="p-32 text-center border-4 border-dashed border-gray-100 rounded-[60px] bg-white">
            <FileText size={80} className="mx-auto text-gray-100 mb-8" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-xl">Kho lưu trữ đang trống</p>
            <Button onClick={openCreateModal} className="mt-8 bg-fpt-blue text-white font-black px-10 py-4 rounded-2xl">
              BẮT ĐẦU VIẾT BÀI ĐẦU TIÊN
            </Button>
          </Card>
        ) : (
          filteredPubs.map((pub) => {
            const metadata = parseLayoutMetadata(pub.layout_metadata)
            return (
              <Card key={pub.id} className="p-8 border-none shadow-xl shadow-gray-100/50 flex flex-col md:flex-row items-center gap-8 group hover:bg-orange-50/20 transition-all rounded-[48px] bg-white border border-transparent hover:border-orange-100">
                <div className="w-full md:w-48 h-48 bg-gray-50 rounded-[32px] flex-shrink-0 flex items-center justify-center overflow-hidden border-2 border-gray-50 shadow-inner group-hover:scale-105 transition-transform duration-500">
                  {pub.image_url ? (
                    <img src={pub.image_url} alt="thumb" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-200" size={48} />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm bg-gray-100 text-gray-700">
                      {pub.subject || 'van'}
                    </span>
                    <span className="text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest bg-gray-100 text-gray-600">
                      {pub.content_type || 'an-pham'}
                    </span>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} />
                      {new Date(pub.created_at).toLocaleDateString('vi-VN')}
                    </span>
                    {metadata?.template && (
                      <span className="text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest bg-blue-50 text-fpt-blue">
                        Template: {metadata.template}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-fpt-blue group-hover:text-fpt-orange transition-colors truncate">{pub.title}</h3>
                  <div className="text-gray-500 text-sm font-medium line-clamp-2 prose-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: (pub.content || '').substring(0, 260) }}></div>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-fpt-blue">
                      <ArrowRight size={14} />
                    </div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Đã hiển thị trên giao diện người dùng</span>
                  </div>
                </div>
                <div className="flex md:flex-col items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => openEditModal(pub)}
                    className="flex-1 md:flex-none p-5 text-gray-400 bg-gray-50 hover:bg-fpt-blue hover:text-white rounded-2xl transition-all shadow-sm"
                  >
                    <Edit size={22} />
                  </button>
                  <button
                    onClick={() => handleDelete(pub.id)}
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

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-fpt-blue/40 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-[1400px] p-0 border-none shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] rounded-[36px] bg-white overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-gradient-to-r from-fpt-blue to-blue-800 p-8 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                  {editingPub ? 'Hiệu chỉnh tác phẩm' : 'Sáng tạo nội dung mới'}
                </h2>
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.3em]">Post Designer Production</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-all">
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-5 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tiêu đề bài viết</label>
                  <input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-fpt-orange rounded-2xl outline-none font-black text-xl"
                    placeholder="Nhập tiêu đề bài viết"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value, category: e.target.value })} className="px-4 py-3 bg-gray-50 rounded-xl font-black text-xs uppercase">
                    <option value="van">Ngữ Văn</option>
                    <option value="ktpl">Kinh tế pháp luật</option>
                    <option value="lich-su">Lịch sử</option>
                    <option value="dia-li">Địa lí</option>
                    <option value="vovinam">Vovinam</option>
                  </select>
                  <select value={formData.content_type} onChange={(e) => setFormData({ ...formData, content_type: e.target.value })} className="px-4 py-3 bg-gray-50 rounded-xl font-black text-xs uppercase">
                    <option value="an-pham">Ấn phẩm</option>
                    <option value="tai-lieu">Tài liệu</option>
                    <option value="vinh-danh">Vinh danh</option>
                  </select>
                </div>

                <input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl font-bold text-xs"
                  placeholder="URL ảnh bìa"
                />

                <div className="rounded-2xl overflow-hidden border border-gray-100">
                  <CKEditor
                    editor={ClassicEditor}
                    data={formData.content}
                    onChange={(event, editor) => setFormData({ ...formData, content: editor.getData() })}
                    config={{
                      placeholder: 'Nội dung bài viết chính...'
                    }}
                  />
                </div>
              </div>

              <div className="xl:col-span-3 space-y-4">
                <Card className="p-4 border border-gray-100 rounded-2xl space-y-4">
                  <h4 className="text-xs font-black text-fpt-blue uppercase tracking-widest flex items-center gap-2">
                    <LayoutTemplate size={14} /> Preset template
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PRESETS).map(([key, item]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyTemplate(key)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider ${templateKey === key ? 'bg-fpt-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 border border-gray-100 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-fpt-blue uppercase tracking-widest">Block editor kéo-thả</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="px-3 py-2 bg-orange-50 text-fpt-orange rounded-lg text-[10px] font-black" onClick={() => addBlock('text')}>+ Text</button>
                    <button type="button" className="px-3 py-2 bg-blue-50 text-fpt-blue rounded-lg text-[10px] font-black" onClick={() => addBlock('image')}>+ Image</button>
                    <button type="button" className="px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-[10px] font-black" onClick={() => addBlock('gallery')}>+ Gallery</button>
                    <button type="button" className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-black" onClick={() => addBlock('quote')}>+ Quote</button>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {layoutBlocks.map((block, index) => (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(index))}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const from = Number(e.dataTransfer.getData('text/plain'))
                          if (!Number.isNaN(from)) moveBlock(from, index)
                        }}
                        className="rounded-xl border border-gray-100 bg-white p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                            <GripVertical size={14} /> {block.type} block
                          </div>
                          <button type="button" onClick={() => removeBlock(block.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                        <input value={block.title} onChange={(e) => updateBlock(block.id, 'title', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold" placeholder="Tiêu đề section" />
                        <textarea rows={2} value={block.body} onChange={(e) => updateBlock(block.id, 'body', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="Nội dung section" />
                        <input value={block.image_url || ''} onChange={(e) => updateBlock(block.id, 'image_url', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="URL ảnh chính" />
                        {block.type === 'gallery' && (
                          <input value={block.image_secondary_url || ''} onChange={(e) => updateBlock(block.id, 'image_secondary_url', e.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="URL ảnh phụ" />
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <select value={block.layout || 'image-left'} onChange={(e) => updateBlock(block.id, 'layout', e.target.value)} className="px-3 py-2 rounded-lg bg-gray-50 text-xs font-bold">
                            <option value="image-left">Ảnh trái</option>
                            <option value="image-right">Ảnh phải</option>
                          </select>
                          <input type="color" value={block.accent_color || '#1d2a57'} onChange={(e) => updateBlock(block.id, 'accent_color', e.target.value)} className="h-9 w-full rounded-lg" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={block.cta_label || ''} onChange={(e) => updateBlock(block.id, 'cta_label', e.target.value)} className="px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="Nhãn CTA" />
                          <input value={block.cta_link || ''} onChange={(e) => updateBlock(block.id, 'cta_link', e.target.value)} className="px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="Link CTA" />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="xl:col-span-4 space-y-4">
                <Card className="p-4 border border-gray-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-fpt-blue uppercase tracking-widest">Preview responsive</h4>
                    <div className="inline-flex bg-gray-100 rounded-lg p-1">
                      <button type="button" onClick={() => setPreviewMode('desktop')} className={`px-2 py-1 rounded-md ${previewMode === 'desktop' ? 'bg-white text-fpt-blue' : 'text-gray-400'}`}><Laptop size={14} /></button>
                      <button type="button" onClick={() => setPreviewMode('mobile')} className={`px-2 py-1 rounded-md ${previewMode === 'mobile' ? 'bg-white text-fpt-blue' : 'text-gray-400'}`}><Smartphone size={14} /></button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className={`mx-auto bg-white rounded-xl border border-slate-100 p-3 space-y-3 ${previewMode === 'mobile' ? 'max-w-[360px]' : 'max-w-full'}`}>
                      <h3 className="font-black text-fpt-blue text-lg">{formData.title || 'Tiêu đề bài viết'}</h3>
                      {layoutBlocks.length === 0 ? (
                        <div className="text-xs text-slate-400 font-bold text-center py-8">Thêm block để xem preview</div>
                      ) : (
                        layoutBlocks.map((block) => renderPreviewBlock(block))
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              <div className="xl:col-span-12 flex gap-4 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 transition-all bg-gray-50 hover:bg-red-50 rounded-2xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-fpt-blue text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] hover:scale-[1.01] transition-all border-none"
                >
                  {editingPub ? 'Cập nhật bài viết' : 'Xuất bản bài viết'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
