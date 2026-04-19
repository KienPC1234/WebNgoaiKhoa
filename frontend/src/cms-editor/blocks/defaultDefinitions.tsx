import React from 'react'
const API_URL = import.meta.env.VITE_API_URL || '/api'
import ReactMarkdown from 'react-markdown'
import { CmsParagraphRichTextEditor } from '../editor/CmsParagraphRichTextEditor'
import type { BlockDefinition, CMSBlock } from '../core/types'
import { blockRegistry } from '../core/registry'
import { createBlock } from '../core/model'
import { createTableModel } from '../plugins/table/model'
import { TableReadonlyView, TableCanvasEditor } from '../plugins/table/TableCanvasEditor'

const baseValidate = (block: CMSBlock) => ({
  valid: typeof block.id === 'string' && typeof block.type === 'string',
  errors: typeof block.id === 'string' && typeof block.type === 'string' ? [] : ['Thiếu mã hoặc loại khối'],
})

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const normalizeVideoUrl = (value: string) => {
  if (!value) return ''
  if (value.includes('youtube.com/watch?v=')) return value.replace('watch?v=', 'embed/')
  if (value.includes('youtu.be/')) return value.replace('youtu.be/', 'youtube.com/embed/')
  return value
}

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value)

interface TocItem {
  id: string
  title: string
  children: TocItem[]
}

interface MinimalRendererContext {
  tocItems?: TocItem[]
  sectionDepth?: number
}

const CanvasPreviewShell: React.FC<{
  block: CMSBlock
  selected: boolean
  onSelect: () => void
  onUpdate: (next: CMSBlock) => void
  children: React.ReactNode
}> = ({ block, selected, onSelect, onUpdate, children }) => {
  const blockLabel = blockRegistry.get(block.type)?.label ?? block.type
  const currentColSpan = clamp(toNumber(block.props.colSpan, 6), 1, 12)
  const [colSpanDraft, setColSpanDraft] = React.useState(String(currentColSpan))

  const updateProp = (key: string, value: unknown) => {
    onUpdate({
      ...block,
      props: {
        ...block.props,
        [key]: value,
      },
    })
  }

  React.useEffect(() => {
    setColSpanDraft(String(currentColSpan))
  }, [block.id, currentColSpan])

  React.useEffect(() => {
    if (!selected) return

    const next = clamp(toNumber(colSpanDraft, currentColSpan), 1, 12)
    if (next === currentColSpan) return

    const timer = window.setTimeout(() => {
      updateProp('colSpan', next)
    }, 500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [selected, colSpanDraft, currentColSpan, block.id])

  return (
  <div
    role="button"
    tabIndex={0}
    aria-label={`Chọn khối ${blockLabel}`}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') onSelect()
    }}
    className={`flex flex-col rounded-xl border bg-white p-4 transition ${selected ? 'border-fpt-blue ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
  >
    <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">{blockLabel}</div>
    {selected && (
      <div
        className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <label className="flex items-center justify-center text-center text-[10px] font-black uppercase tracking-widest text-blue-500">Rộng</label>
        <input
          type="number"
          min={1}
          max={12}
          value={colSpanDraft}
          onChange={(event) => setColSpanDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setColSpanDraft(String(currentColSpan))
            }
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-1 text-xs"
          aria-label="Độ rộng khối"
        />
      </div>
    )}
    {children}
  </div>
)
}

const InlineSelectedEditor: React.FC<{
  block: CMSBlock
  selected: boolean
  onUpdate: (next: CMSBlock) => void
}> = ({ block, selected, onUpdate }) => {
  if (!selected) return null

  const updateProp = (key: string, value: unknown) => {
    onUpdate({
      ...block,
      props: {
        ...block.props,
        [key]: value,
      },
    })
  }

  if (block.type === 'paragraph') {
    return (
      <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-500">Trình sửa đoạn văn</p>
        <CmsParagraphRichTextEditor
          value={String(block.props.text || '')}
          onChange={(value) => updateProp('text', value)}
          placeholder="Nhập nội dung đoạn văn..."
          size="compact"
        />
      </div>
    )
  }

  if (block.type === 'image') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập ảnh</p>
        <input
          value={String(block.props.src || '')}
          onChange={(event) => updateProp('src', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="URL ảnh"
          aria-label="URL ảnh"
        />
        <input
          type="text"
          value={String(block.props.width || '')}
          onChange={(event) => updateProp('width', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Rộng (px, tùy chọn)"
          aria-label="Độ rộng ảnh"
        />
        <input
          type="text"
          value={String(block.props.height || '')}
          onChange={(event) => updateProp('height', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Cao (px, tùy chọn)"
          aria-label="Chiều cao ảnh"
        />
        <input
          value={String(block.props.text || '')}
          onChange={(event) => updateProp('text', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Chú thích"
          aria-label="Chú thích ảnh"
        />
      </div>
    )
  }

  if (block.type === 'gallery') {
    const galleryValue = Array.isArray(block.props.images)
      ? block.props.images.map((item) => String(item || '')).join('\n')
      : ''

    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập thư viện ảnh</p>
        <textarea
          value={galleryValue}
          onChange={(event) => {
            const images = event.target.value.split('\n').map((item) => item.trim()).filter(Boolean)
            updateProp('images', images)
            if (images[0]) updateProp('src', images[0])
          }}
          className="min-h-[120px] rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Mỗi dòng một URL ảnh"
          aria-label="URL thư viện ảnh"
        />
      </div>
    )
  }

  if (block.type === 'heading') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập tiêu đề</p>
        <input
          value={String(block.props.text || '')}
          onChange={(event) => updateProp('text', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Nội dung tiêu đề"
          aria-label="Nội dung tiêu đề"
        />
        <select
          value={String(block.props.level || 2)}
          onChange={(event) => updateProp('level', Number(event.target.value))}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Cấp độ tiêu đề"
        >
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option value="4">H4</option>
        </select>
      </div>
    )
  }

  if (block.type === 'list') {
    const listValue = Array.isArray(block.props.items)
      ? block.props.items.map((item) => String(item || '')).join('\n')
      : String(block.props.text || '')

    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập danh sách</p>
        <textarea
          value={listValue}
          onChange={(event) => {
            const items = event.target.value.split('\n').map((item) => item.trim()).filter(Boolean)
            updateProp('items', items)
            updateProp('text', items.join('\n'))
          }}
          className="min-h-[120px] rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Mỗi dòng một mục danh sách"
          aria-label="Mục danh sách"
        />
      </div>
    )
  }

  if (block.type === 'video' || block.type === 'embed') {
    const label = block.type === 'video' ? 'Video' : 'Nhúng'
    const currentValue = String(block.props.url || block.props.src || '')
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập {label.toLowerCase()}</p>
        <input
          value={currentValue}
          onChange={(event) => {
            updateProp('url', event.target.value)
            if (block.type === 'video') updateProp('src', event.target.value)
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="https://..."
          aria-label={`URL ${label.toLowerCase()}`}
        />
        <input
          type="text"
          value={String(block.props.width || '')}
          onChange={(event) => updateProp('width', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Rộng (px, tùy chọn)"
          aria-label={`Độ rộng ${label.toLowerCase()}`}
        />
        <input
          type="text"
          value={String(block.props.height || '')}
          onChange={(event) => updateProp('height', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Cao (px, tùy chọn)"
          aria-label={`Chiều cao ${label.toLowerCase()}`}
        />
      </div>
    )
  }

  if (block.type === 'iframe') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập iFrame</p>
        <input
          value={String(block.props.url || '')}
          onChange={(event) => updateProp('url', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="https://..."
          aria-label="URL iFrame"
        />
        <input
          value={String(block.props.text || '')}
          onChange={(event) => updateProp('text', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Tiêu đề iFrame"
          aria-label="Tiêu đề iFrame"
        />
        <input
          type="number"
          min={120}
          max={1200}
          value={clamp(toNumber(block.props.height, 320), 120, 1200)}
          onChange={(event) => updateProp('height', clamp(Number(event.target.value) || 320, 120, 1200))}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Chiều cao iFrame"
        />
      </div>
    )
  }

  if (block.type === 'link') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập liên kết</p>
        <input
          value={String(block.props.text || '')}
          onChange={(event) => updateProp('text', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Nội dung liên kết"
          aria-label="Nội dung liên kết"
        />
        <input
          value={String(block.props.url || '')}
          onChange={(event) => updateProp('url', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="https://..."
          aria-label="URL liên kết"
        />
      </div>
    )
  }

  if (block.type === 'document') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập tài liệu</p>
        <input
          value={String(block.props.text || '')}
          onChange={(event) => updateProp('text', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Tiêu đề tài liệu"
          aria-label="Tiêu đề tài liệu"
        />
        <input
          value={String(block.props.url || '')}
          onChange={(event) => updateProp('url', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="https://..."
          aria-label="URL tài liệu"
        />
        <textarea
          value={String(block.props.description || '')}
          onChange={(event) => updateProp('description', event.target.value)}
          className="min-h-[88px] rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Mô tả"
          aria-label="Mô tả tài liệu"
        />
      </div>
    )
  }

  if (block.type === 'grid') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập lưới</p>
        <input
          value={String(block.props.title || block.props.text || '')}
          onChange={(event) => {
            updateProp('title', event.target.value)
            updateProp('text', event.target.value)
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Tiêu đề lưới"
          aria-label="Tiêu đề lưới"
        />
        <input
          type="number"
          min={1}
          max={12}
          value={clamp(toNumber(block.props.cols, 3), 1, 12)}
          onChange={(event) => updateProp('cols', clamp(Number(event.target.value) || 1, 1, 12))}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Số cột lưới"
        />
        <input
          type="number"
          min={0}
          max={64}
          value={clamp(toNumber(block.props.gap, 12), 0, 64)}
          onChange={(event) => updateProp('gap', clamp(Number(event.target.value) || 0, 0, 64))}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Khoảng cách lưới"
        />
      </div>
    )
  }

  if (block.type === 'related-posts') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập bài liên quan</p>
        <input
          value={String(block.props.title || block.props.text || '')}
          onChange={(event) => {
            updateProp('title', event.target.value)
            updateProp('text', event.target.value)
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Tiêu đề mục"
          aria-label="Tiêu đề bài liên quan"
        />
        <input
          type="number"
          min={1}
          max={12}
          value={clamp(toNumber(block.props.count, 3), 1, 12)}
          onChange={(event) => updateProp('count', clamp(Number(event.target.value) || 1, 1, 12))}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Số lượng bài liên quan"
        />
        <input
          value={String(block.props.category || '')}
          onChange={(event) => updateProp('category', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Danh mục"
          aria-label="Danh mục bài liên quan"
        />
      </div>
    )
  }

  if (block.type === 'toc') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập mục lục</p>
        <input
          value={String(block.props.title || block.props.text || 'Mục lục')}
          onChange={(event) => {
            updateProp('title', event.target.value)
            updateProp('text', event.target.value)
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Tiêu đề mục lục"
          aria-label="Tiêu đề mục lục"
        />
      </div>
    )
  }

  if (block.type === 'columns') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập cột</p>
        <input
          type="number"
          min={1}
          max={6}
          value={clamp(toNumber(block.props.cols, 2), 1, 6)}
          onChange={(event) => updateProp('cols', clamp(Number(event.target.value) || 1, 1, 6))}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Số cột"
        />
        <input
          value={String(block.props.text || '')}
          onChange={(event) => updateProp('text', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Nội dung tiêu đề"
          aria-label="Nội dung cột"
        />
      </div>
    )
  }

  if (block.type === 'section') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập mục</p>
        <input
          value={String(block.props.title || block.props.text || '')}
          onChange={(event) => {
            updateProp('title', event.target.value)
            updateProp('text', event.target.value)
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Tiêu đề mục"
          aria-label="Tiêu đề mục"
        />
        <textarea
          value={String(block.props.description || '')}
          onChange={(event) => updateProp('description', event.target.value)}
          className="min-h-[88px] rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Mô tả mục"
          aria-label="Mô tả mục"
        />
      </div>
    )
  }

  if (block.type === 'sidebar') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập thanh bên</p>
        <input
          value={String(block.props.title || block.props.text || '')}
          onChange={(event) => {
            updateProp('title', event.target.value)
            updateProp('text', event.target.value)
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Tiêu đề thanh bên"
          aria-label="Tiêu đề thanh bên"
        />
        <select
          value={String(block.props.position || 'right')}
          onChange={(event) => updateProp('position', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Vị trí thanh bên"
        >
          <option value="left">Trái</option>
          <option value="right">Phải</option>
        </select>
      </div>
    )
  }

  if (block.type === 'spacer') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập khoảng đệm</p>
        <input
          type="number"
          min={4}
          max={400}
          value={clamp(toNumber(block.props.height, 24), 4, 400)}
          onChange={(event) => updateProp('height', clamp(Number(event.target.value) || 24, 4, 400))}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Chiều cao khoảng đệm"
        />
      </div>
    )
  }

  if (block.type === 'divider') {
    return (
      <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Thiết lập đường phân cách</p>
        <select
          value={String(block.props.style || 'solid')}
          onChange={(event) => updateProp('style', event.target.value)}
          className="rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          aria-label="Kiểu đường phân cách"
        >
          <option value="solid">Liền</option>
          <option value="dashed">Nét đứt</option>
          <option value="dotted">Chấm</option>
        </select>
      </div>
    )
  }

  if (block.type === 'table') {
    return (
      <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-blue-500">Công cụ bảng</p>
        <TableCanvasEditor 
          table={(block.props.table as any) || createTableModel(3, 3)} 
          onChange={(table) => updateProp('table', table)}
        />
      </div>
    )
  }

  if (['quote', 'code', 'hero', 'author-box', 'callout', 'badge', 'pullquote', 'highlight'].includes(block.type)) {
    return (
      <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Chỉnh nhanh</p>
        <textarea
          value={String(block.props.text || '')}
          onChange={(event) => updateProp('text', event.target.value)}
          className="mt-2 min-h-[100px] w-full rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
          placeholder="Nội dung khối"
          aria-label="Nội dung khối"
        />
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3" onClick={(event) => event.stopPropagation()}>
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Chỉnh nhanh</p>
      <input
        value={String(block.props.text || '')}
        onChange={(event) => updateProp('text', event.target.value)}
        className="mt-2 w-full rounded-md border border-blue-100 bg-white px-2 py-2 text-xs"
        placeholder="Nội dung khối"
        aria-label="Nội dung khối"
      />
    </div>
  )
}

const renderTocItems = (items: TocItem[], level = 0) => {
  if (items.length === 0) return null

  return (
    <ul className={`space-y-1 ${level > 0 ? 'ml-4 border-l border-gray-100 pl-3' : ''}`}>
      {items.map((item) => {
        const targetId = `cms-section-${item.id}`

        return (
          <li key={item.id} className="space-y-1">
            <a
              href={`#${targetId}`}
              className="text-xs font-medium text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline"
              onClick={(event) => {
                event.preventDefault()
                const el = document.getElementById(targetId)
                if (!el) return
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              {item.title}
            </a>
            {renderTocItems(item.children, level + 1)}
          </li>
        )
      })}
    </ul>
  )
}

const MinimalRenderer: React.FC<{ block: CMSBlock; renderContext?: MinimalRendererContext; mode?: 'preview' | 'publish' }> = ({ block, renderContext, mode = 'preview' }) => {
  const text = String(block.props.text || '')
  const url = String(block.props.url || '')
  const src = String(block.props.src || '')

  // State for related-posts (hooks must be declared unconditionally)
  const [relatedItems, setRelatedItems] = React.useState<any[] | null>(null)
  const [relatedLoading, setRelatedLoading] = React.useState(false)
  const [relatedError, setRelatedError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false

    const loadRelated = async () => {
      if (block.type !== 'related-posts' || mode !== 'publish') {
        setRelatedItems(null)
        setRelatedLoading(false)
        setRelatedError(null)
        return
      }

      setRelatedLoading(true)
      setRelatedError(null)

      try {
        const count = clamp(toNumber(block.props.count, 3), 1, 6)
        const overrideCategory = String(block.props.category || '').trim()
        const publication = (renderContext as any)?.publication
        const resolvedSubject = overrideCategory || publication?.subject || publication?.category || ''

        if (!resolvedSubject) {
          setRelatedItems([])
          setRelatedLoading(false)
          return
        }

        const resp = await fetch(`${API_URL}/public/publications?subject=${encodeURIComponent(resolvedSubject)}`, {
          headers: { Accept: 'application/json' },
        })

        if (!resp.ok) {
          setRelatedItems([])
          setRelatedLoading(false)
          return
        }

        const list = await resp.json()
        const filtered = Array.isArray(list)
          ? list.filter((p) => !(publication && p.id === publication.id))
          : []

        if (!cancelled) setRelatedItems(filtered.slice(0, count))
      } catch (err) {
        if (!cancelled) setRelatedError('error')
        if (!cancelled) setRelatedItems([])
      } finally {
        if (!cancelled) setRelatedLoading(false)
      }
    }

    loadRelated()

    return () => {
      cancelled = true
    }
  }, [block.id, block.props.count, block.props.category, (renderContext as any)?.publication?.id, (renderContext as any)?.publication?.subject, mode])

  if (block.type === 'paragraph') {
    const isHtml = looksLikeHtml(text)
    return (
      <div className="w-full">
        {isHtml ? (
          <div className="cms-ckeditor-content overflow-x-auto rounded-lg px-2 py-2" dangerouslySetInnerHTML={{ __html: text || '<p>Nội dung văn bản</p>' }} />
        ) : (
          <div className="cms-ckeditor-content rounded-lg px-2 py-2">
            <ReactMarkdown>{text || 'Nội dung văn bản'}</ReactMarkdown>
          </div>
        )}
      </div>
    )
  }

  if (block.type === 'list') {
    const items = Array.isArray(block.props.items)
      ? block.props.items.map((item) => String(item || '')).filter(Boolean)
      : text.split('\n').map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    return (
      <div className="rounded-lg bg-transparent p-3">
        <ul className="list-disc pl-4 text-sm text-gray-700">
          {(items.length > 0 ? items : ['Mục danh sách']).map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      </div>
    )
  }

  if (block.type === 'heading') {
    const level = clamp(toNumber(block.props.level, 2), 1, 4)
    const Tag = `h${level}` as keyof JSX.IntrinsicElements
    return (
      <div className="rounded-lg bg-transparent px-3 py-2">
        <Tag className="font-bold text-gray-800">{text || 'Tiêu đề'}</Tag>
      </div>
    )
  }

  if (block.type === 'image') {
    const style: React.CSSProperties = {}
    if (block.props.width) style.width = String(block.props.width).match(/^\d+$/) ? `${block.props.width}px` : String(block.props.width)
    if (block.props.height) style.height = String(block.props.height).match(/^\d+$/) ? `${block.props.height}px` : String(block.props.height)
    return src ? (
      <div className="flex justify-center w-full">
        <img src={src} alt={text || 'Ảnh'} className="block rounded-lg object-contain" style={{ maxWidth: '100%', ...style }} />
      </div>
    ) : (
      <div className="flex h-24 items-center justify-center rounded-lg bg-transparent text-xs text-gray-400">URL ảnh</div>
    )
  }

  if (block.type === 'gallery') {
    const images = Array.isArray(block.props.images) ? block.props.images.map((item) => String(item || '')).filter(Boolean) : []
    const preview = images[0] || src
    return preview ? (
      <img src={preview} alt="Thư viện ảnh" className="block h-auto w-full rounded-lg object-contain bg-transparent" />
    ) : (
      <div className="flex h-24 items-center justify-center rounded-lg bg-transparent text-xs text-gray-400">URL thư viện ảnh</div>
    )
  }

  if (block.type === 'video') {
    const videoUrl = normalizeVideoUrl(url || src)
    if (!videoUrl) {
      return <div className="flex h-24 items-center justify-center rounded-lg bg-transparent text-xs text-gray-400">URL video</div>
    }
    
    const style: React.CSSProperties = {}
    if (block.props.width) style.width = String(block.props.width).match(/^\d+$/) ? `${block.props.width}px` : String(block.props.width)
    if (block.props.height) style.height = String(block.props.height).match(/^\d+$/) ? `${block.props.height}px` : String(block.props.height)
    
    if (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.ogg')) {
      return (
        <div className="flex justify-center w-full">
          <video controls src={videoUrl} className="rounded-lg bg-black object-contain w-full" style={{ maxHeight: block.props.height ? undefined : '320px', ...style }} />
        </div>
      )
    }
    return (
      <div className="flex justify-center w-full">
         <iframe src={videoUrl} title="Xem trước video" className="rounded-lg border border-gray-100" style={{ width: block.props.width ? (String(block.props.width).match(/^\d+$/) ? `${block.props.width}px` : String(block.props.width)) : '100%', height: block.props.height ? (String(block.props.height).match(/^\d+$/) ? `${block.props.height}px` : String(block.props.height)) : '320px' }} allowFullScreen />
      </div>
    )
  }

  if (block.type === 'iframe' || block.type === 'embed') {
    const frameUrl = normalizeVideoUrl(url)
    if (!frameUrl) {
      return <div className="flex h-24 items-center justify-center rounded-lg bg-transparent text-xs text-gray-400">URL iFrame</div>
    }
    
    const style: React.CSSProperties = {}
    if (block.props.width) style.width = String(block.props.width).match(/^\d+$/) ? `${block.props.width}px` : String(block.props.width)
    if (block.props.height) style.height = String(block.props.height).match(/^\d+$/) ? `${block.props.height}px` : String(block.props.height)
    
    return (
      <div className="flex justify-center w-full">
        <iframe src={frameUrl} title="Nội dung nhúng" className="w-full rounded-lg border border-gray-100" style={{ height: block.props.height ? (String(block.props.height).match(/^\d+$/) ? `${block.props.height}px` : String(block.props.height)) : '320px', ...style }} allowFullScreen />
      </div>
    )
  }

  if (block.type === 'link') {
    return (
      <a href={url || '#'} className="inline-flex rounded-lg bg-fpt-blue px-3 py-2 text-xs font-semibold text-white">
        {text || 'Liên kết'}
      </a>
    )
  }

  if (block.type === 'document') {
    return (
      <div className="rounded-lg border border-gray-200 bg-transparent p-3">
        <p className="text-sm font-semibold text-gray-700">{text || 'Tài liệu'}</p>
        <p className="mt-1 truncate text-xs text-gray-500">{url || 'URL tài liệu'}</p>
      </div>
    )
  }

  if (block.type === 'table') {
    return <TableReadonlyView table={(block.props.table as ReturnType<typeof createTableModel>) || createTableModel(3, 3)} />
  }

  if (block.type === 'grid') {
    const cols = clamp(toNumber(block.props.cols, 3), 1, 6)
    const gap = clamp(toNumber(block.props.gap, 12), 0, 24)
    return (
      <div className="rounded-lg border border-gray-200 bg-transparent p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{String(block.props.title || text || 'Bố cục lưới')}</p>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: `${gap}px` }}>
          {Array.from({ length: cols }).map((_, idx) => (
            <div key={`grid-col-${idx}`} className="h-8 rounded bg-white border border-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'related-posts') {
    const count = clamp(toNumber(block.props.count, 3), 1, 6)

    // Editor preview: show placeholders
    if (mode !== 'publish') {
      return (
        <div className="rounded-lg border border-gray-200 bg-transparent p-3">
          <p className="mb-2 text-xs font-semibold text-gray-500">{String(block.props.title || text || 'Bài viết liên quan')}</p>
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, idx) => (
              <div key={`related-${idx}`} className="h-7 rounded border border-gray-200 bg-white" />
            ))}
          </div>
        </div>
      )
    }

    // Publish mode: render fetched related items
    return (
      <div className="rounded-lg border border-gray-200 bg-transparent p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{String(block.props.title || text || 'Bài viết liên quan')}</p>
        {relatedLoading ? (
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, idx) => (
              <div key={`related-loading-${idx}`} className="h-7 rounded border border-gray-200 bg-white" />
            ))}
          </div>
        ) : relatedItems && relatedItems.length > 0 ? (
          <ul className="space-y-3">
            {relatedItems.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-12 w-20 rounded object-cover" />
                ) : (
                  <div className="h-12 w-20 rounded bg-gray-100" />
                )}
                <div className="flex-1">
                  <a href={`/posts/${item.id}`} className="font-semibold text-sm text-slate-800 hover:underline">{item.title}</a>
                  <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">Không tìm thấy bài liên quan.</p>
        )}
      </div>
    )
  }

  if (block.type === 'toc') {
    const tocItems = renderContext?.tocItems || []
    return (
      <div className="rounded-lg border border-gray-200 bg-transparent p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{String(block.props.title || text || 'Mục lục')}</p>
        {tocItems.length > 0 ? (
          renderTocItems(tocItems)
        ) : (
          <p className="text-xs text-gray-500">Chưa có mục nào để hiển thị trong mục lục.</p>
        )}
      </div>
    )
  }

  if (block.type === 'columns') {
    const cols = clamp(toNumber(block.props.cols, 2), 1, 4)
    return (
      <div className="rounded-lg border border-gray-200 bg-transparent p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{text || 'Bố cục cột'}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, idx) => (
            <div key={`col-${idx}`} className="h-8 rounded border border-gray-200 bg-white" />
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'section') {
    const sectionTitle = String(block.props.title || text || 'Mục')
    return (
      <div id={`cms-section-${block.id}`} data-cms-section-id={block.id} className="scroll-mt-28 rounded-lg border border-gray-200 bg-transparent p-3">
        <p className="text-sm font-semibold text-gray-700">{sectionTitle}</p>
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{String(block.props.description || '') || 'Mô tả mục'}</p>
      </div>
    )
  }

  if (block.type === 'sidebar') {
    const position = String(block.props.position || 'right')
    const positionLabel = position === 'left' ? 'trái' : 'phải'
    return (
      <div className="rounded-lg border border-gray-200 bg-transparent p-3">
        <p className="text-sm font-semibold text-gray-700">{String(block.props.title || text || 'Thanh bên')}</p>
        <p className="mt-1 text-xs text-gray-500">Vị trí: {positionLabel}</p>
      </div>
    )
  }

  if (block.type === 'spacer') {
    return <div className="h-10 rounded-lg bg-transparent" />
  }

  if (block.type === 'divider') {
    return <div className="border-t border-gray-300" />
  }

  return (
    <div className="rounded-lg bg-transparent px-3 py-2">
      <p className="line-clamp-4 whitespace-pre-wrap text-sm text-gray-700">{text || 'Nội dung văn bản'}</p>
    </div>
  )
}

const makeDefinition = (
  type: BlockDefinition['type'],
  category: BlockDefinition['category'],
  label: string,
  defaults: Record<string, unknown> = {},
  options: { insertable?: boolean } = {},
): BlockDefinition => ({
  type,
  category,
  label,
  insertable: options.insertable,
  create: () => createBlock(type, { colSpan: 6, ...defaults }),
  validate: baseValidate,
  EditorComponent: ({ block, selected, onSelect, onUpdate }) => (
    <CanvasPreviewShell block={block} selected={selected} onSelect={onSelect} onUpdate={onUpdate}>
      <div className="flex-1">
        <MinimalRenderer block={block} />
      </div>
      <InlineSelectedEditor block={block} selected={selected} onUpdate={onUpdate} />
    </CanvasPreviewShell>
  ),
  RendererComponent: ({ block, mode, ...rest }) => <MinimalRenderer block={block} mode={mode as any} renderContext={(rest as { renderContext?: MinimalRendererContext }).renderContext} />,
})

export const registerDefaultBlocks = () => {
  const definitions: BlockDefinition[] = [
    makeDefinition('paragraph', 'text', 'Đoạn văn', { colSpan: 12, text: '<p></p>' }),
    makeDefinition('heading', 'text', 'Tiêu đề', { colSpan: 12, text: 'Tiêu đề', level: 2 }, { insertable: false }),
    makeDefinition('list', 'text', 'Danh sách', { colSpan: 12, items: ['Mục 1', 'Mục 2'], text: 'Mục 1\nMục 2' }, { insertable: false }),
    makeDefinition('quote', 'text', 'Trích dẫn', { colSpan: 12, text: 'Trích dẫn...' }, { insertable: false }),
    makeDefinition('code', 'text', 'Mã nguồn', { colSpan: 12, text: 'const x = 1;' }, { insertable: false }),
    makeDefinition('image', 'media', 'Ảnh', { colSpan: 6, src: '', text: '' }),
    makeDefinition('gallery', 'media', 'Thư viện ảnh', { colSpan: 6, images: [] }),
    makeDefinition('video', 'media', 'Video', { colSpan: 6, url: '' }),
    makeDefinition('embed', 'media', 'Nhúng', { colSpan: 6, url: '' }),
    makeDefinition('link', 'media', 'Liên kết', { colSpan: 4, text: 'Nội dung liên kết', url: '', newTab: true }),
    makeDefinition('document', 'media', 'Tài liệu', { colSpan: 6, text: 'Tài liệu mới', url: '', description: '' }),
    makeDefinition('iframe', 'media', 'iFrame', { colSpan: 12, text: 'Khối nhúng', url: '', height: 320 }),
    makeDefinition('section', 'layout', 'Mục', { colSpan: 12, title: 'Mục', description: '' }),
    makeDefinition('columns', 'layout', 'Cột', { colSpan: 12, cols: 2, text: 'Bố cục cột' }),
    makeDefinition('grid', 'layout', 'Lưới', { colSpan: 6, title: 'Bố cục lưới', cols: 3, gap: 12 }),
    makeDefinition('spacer', 'layout', 'Khoảng đệm', { colSpan: 12, height: 24 }),
    makeDefinition('divider', 'layout', 'Đường phân cách', { colSpan: 12, style: 'solid' }),
    makeDefinition('sidebar', 'layout', 'Thanh bên', { colSpan: 4, title: 'Thanh bên', position: 'right' }),
    makeDefinition('hero', 'article', 'Mở đầu nổi bật', { colSpan: 12, text: 'Tiêu đề mở đầu', subtitle: '' }),
    makeDefinition('author-box', 'article', 'Hộp tác giả', { colSpan: 12, text: 'Giới thiệu tác giả', name: '' }),
    makeDefinition('toc', 'article', 'Mục lục', { colSpan: 12, title: 'Mục lục' }),
    makeDefinition('related-posts', 'article', 'Bài liên quan', { colSpan: 12, title: 'Bài viết liên quan', count: 3, category: '' }),
    makeDefinition('callout', 'decor', 'Khối nhấn mạnh', { colSpan: 12, text: 'Nội dung nhấn mạnh', tone: 'info' }, { insertable: false }),
    makeDefinition('badge', 'decor', 'Nhãn', { colSpan: 4, text: 'Nhãn', tone: 'neutral' }, { insertable: false }),
    makeDefinition('pullquote', 'decor', 'Trích dẫn nổi bật', { colSpan: 12, text: 'Trích dẫn nổi bật...' }, { insertable: false }),
    makeDefinition('highlight', 'decor', 'Làm nổi bật', { colSpan: 12, text: 'Nội dung nổi bật' }, { insertable: false }),
    makeDefinition('table', 'table', 'Bảng', { colSpan: 12, table: createTableModel(3, 3) }),
  ]

  definitions.forEach((definition) => blockRegistry.register(definition))
}

let defaultBlocksRegistered = false

export const ensureDefaultBlocksRegistered = () => {
  if (defaultBlocksRegistered) return
  registerDefaultBlocks()
  defaultBlocksRegistered = true
}
