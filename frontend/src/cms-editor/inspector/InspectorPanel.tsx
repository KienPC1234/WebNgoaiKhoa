import React from 'react'
import type { CMSBlock } from '../core/types'
import { createTableModel } from '../plugins/table/model'
import { TableCanvasEditor } from '../plugins/table/TableCanvasEditor'
import { CmsParagraphRichTextEditor } from '../editor/CmsParagraphRichTextEditor'

interface InspectorPanelProps {
  selectedBlock: CMSBlock | null
  onChange: (next: CMSBlock) => void
  onDelete: (blockId: string) => void
}

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ selectedBlock, onChange, onDelete }) => {
  if (!selectedBlock) {
    return <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-400">Chọn khối trên canvas để chỉnh nội dung.</div>
  }

  const updateProp = (key: string, value: unknown) => {
    onChange({
      ...selectedBlock,
      props: {
        ...selectedBlock.props,
        [key]: value,
      },
    })
  }

  const type = selectedBlock.type

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 xl:sticky xl:top-4 max-h-[78vh] overflow-auto" aria-label="Trình chỉnh nội dung khối">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Chỉnh khối: {type}</p>
        <button
          type="button"
          onClick={() => onDelete(selectedBlock.id)}
          className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-600"
          aria-label="Xóa khối"
        >
          Xóa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center justify-center text-center text-xs font-semibold text-gray-500">Rộng (colSpan)</label>
        <input
          type="number"
          min={1}
          max={12}
          value={toNumber(selectedBlock.props.colSpan, 6)}
          onChange={(event) => updateProp('colSpan', Number(event.target.value) || 1)}
          className="px-3 py-2 rounded-lg bg-gray-50 text-xs"
          aria-label="Độ rộng khối"
        />

        <label className="flex items-center justify-center text-center text-xs font-semibold text-gray-500">Cao (rowSpan)</label>
        <input
          type="number"
          min={1}
          max={6}
          value={toNumber(selectedBlock.props.rowSpan, 1)}
          onChange={(event) => updateProp('rowSpan', Number(event.target.value) || 1)}
          className="px-3 py-2 rounded-lg bg-gray-50 text-xs"
          aria-label="Chiều cao khối"
        />
      </div>

      {type === 'heading' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Nội dung tiêu đề</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Nội dung tiêu đề" />
          <label className="block text-xs font-semibold text-gray-500">Cấp độ tiêu đề</label>
          <select value={String(selectedBlock.props.level || 2)} onChange={(event) => updateProp('level', Number(event.target.value))} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Cấp độ tiêu đề">
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
          </select>
        </>
      )}

      {type === 'paragraph' && (
        <>
          <CmsParagraphRichTextEditor
            label="Nội dung đoạn văn"
            value={String(selectedBlock.props.text || '')}
            onChange={(value) => updateProp('text', value)}
            placeholder="Nhập nội dung đoạn văn..."
          />
          <p className="text-[10px] text-gray-400">Đoạn văn dùng CKEditor (rich text HTML).</p>
        </>
      )}

      {type === 'list' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Mục danh sách (mỗi dòng 1 mục)</label>
          <textarea
            value={Array.isArray(selectedBlock.props.items) ? selectedBlock.props.items.map((item) => String(item || '')).join('\n') : String(selectedBlock.props.text || '')}
            onChange={(event) => {
              const items = event.target.value.split('\n').map((item) => item.trim()).filter(Boolean)
              updateProp('items', items)
              updateProp('text', items.join('\n'))
            }}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs"
            rows={6}
            aria-label="Mục danh sách"
          />
        </>
      )}

      {type === 'quote' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Trích dẫn</label>
          <textarea value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={4} aria-label="Trích dẫn" />
          <label className="block text-xs font-semibold text-gray-500">Tác giả</label>
          <input value={String(selectedBlock.props.author || '')} onChange={(event) => updateProp('author', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tác giả trích dẫn" />
        </>
      )}

      {type === 'code' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Mã nguồn</label>
          <textarea value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs font-mono" rows={6} aria-label="Nội dung mã nguồn" />
          <label className="block text-xs font-semibold text-gray-500">Ngôn ngữ</label>
          <input value={String(selectedBlock.props.language || '')} onChange={(event) => updateProp('language', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="javascript / python / ..." aria-label="Ngôn ngữ mã nguồn" />
        </>
      )}

      {type === 'image' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">URL ảnh</label>
          <input value={String(selectedBlock.props.src || '')} onChange={(event) => updateProp('src', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="https://..." aria-label="URL ảnh" />
          <label className="block text-xs font-semibold text-gray-500">Chú thích</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Chú thích ảnh" />
        </>
      )}

      {type === 'gallery' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">URL thư viện ảnh (mỗi dòng 1 ảnh)</label>
          <textarea
            value={Array.isArray(selectedBlock.props.images) ? selectedBlock.props.images.map((item) => String(item || '')).join('\n') : ''}
            onChange={(event) => updateProp('images', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs"
            rows={6}
            aria-label="URL thư viện ảnh"
          />
        </>
      )}

      {type === 'video' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">URL video</label>
          <input
            value={String(selectedBlock.props.url || selectedBlock.props.src || '')}
            onChange={(event) => {
              updateProp('url', event.target.value)
              updateProp('src', event.target.value)
            }}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs"
            placeholder="YouTube / MP4 URL"
            aria-label="URL video"
          />
        </>
      )}

      {type === 'embed' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">URL nhúng</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="https://..." aria-label="URL nhúng" />
        </>
      )}

      {type === 'iframe' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">URL iFrame</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="https://..." aria-label="URL iFrame" />
          <label className="block text-xs font-semibold text-gray-500">Tiêu đề</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tiêu đề iFrame" />
          <label className="block text-xs font-semibold text-gray-500">Chiều cao</label>
          <input type="number" min={120} max={1200} value={toNumber(selectedBlock.props.height, 320)} onChange={(event) => updateProp('height', Number(event.target.value) || 320)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Chiều cao iFrame" />
        </>
      )}

      {type === 'link' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Nội dung liên kết</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Nội dung liên kết" />
          <label className="block text-xs font-semibold text-gray-500">URL liên kết</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="URL liên kết" />
        </>
      )}

      {type === 'document' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Tiêu đề tài liệu</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tiêu đề tài liệu" />
          <label className="block text-xs font-semibold text-gray-500">URL tài liệu</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="URL tài liệu" />
          <label className="block text-xs font-semibold text-gray-500">Mô tả</label>
          <textarea value={String(selectedBlock.props.description || '')} onChange={(event) => updateProp('description', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={3} aria-label="Mô tả tài liệu" />
        </>
      )}

      {type === 'grid' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Tiêu đề lưới</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tiêu đề lưới" />
          <label className="block text-xs font-semibold text-gray-500">Số cột</label>
          <input type="number" min={1} max={12} value={toNumber(selectedBlock.props.cols, 3)} onChange={(event) => updateProp('cols', Number(event.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Số cột lưới" />
          <label className="block text-xs font-semibold text-gray-500">Khoảng cách</label>
          <input type="number" min={0} max={64} value={toNumber(selectedBlock.props.gap, 12)} onChange={(event) => updateProp('gap', Number(event.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Khoảng cách lưới" />
        </>
      )}

      {type === 'related-posts' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Tiêu đề mục</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tiêu đề bài liên quan" />
          <label className="block text-xs font-semibold text-gray-500">Số bài</label>
          <input type="number" min={1} max={12} value={toNumber(selectedBlock.props.count, 3)} onChange={(event) => updateProp('count', Number(event.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Số bài liên quan" />
          <label className="block text-xs font-semibold text-gray-500">Lọc theo danh mục</label>
          <input value={String(selectedBlock.props.category || '')} onChange={(event) => updateProp('category', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="van / ktpl / ..." aria-label="Danh mục bài liên quan" />
        </>
      )}

      {type === 'toc' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Tiêu đề mục lục</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || 'Mục lục')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tiêu đề mục lục" />
        </>
      )}

      {type === 'columns' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Số cột</label>
          <input type="number" min={1} max={6} value={toNumber(selectedBlock.props.cols, 2)} onChange={(event) => updateProp('cols', Number(event.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Số cột" />
          <label className="block text-xs font-semibold text-gray-500">Nội dung tiêu đề</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Nội dung cột" />
        </>
      )}

      {type === 'section' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Tiêu đề mục</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tiêu đề mục" />
          <label className="block text-xs font-semibold text-gray-500">Mô tả mục</label>
          <textarea value={String(selectedBlock.props.description || '')} onChange={(event) => updateProp('description', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={3} aria-label="Mô tả mục" />
        </>
      )}

      {type === 'sidebar' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Tiêu đề thanh bên</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Tiêu đề thanh bên" />
          <label className="block text-xs font-semibold text-gray-500">Vị trí</label>
          <select value={String(selectedBlock.props.position || 'right')} onChange={(event) => updateProp('position', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Vị trí thanh bên">
            <option value="left">Trái</option>
            <option value="right">Phải</option>
          </select>
        </>
      )}

      {type === 'spacer' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Chiều cao khoảng đệm</label>
          <input type="number" min={4} max={400} value={toNumber(selectedBlock.props.height, 24)} onChange={(event) => updateProp('height', Number(event.target.value) || 24)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Chiều cao khoảng đệm" />
        </>
      )}

      {type === 'divider' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Kiểu đường phân cách</label>
          <select value={String(selectedBlock.props.style || 'solid')} onChange={(event) => updateProp('style', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Kiểu đường phân cách">
            <option value="solid">Liền</option>
            <option value="dashed">Nét đứt</option>
            <option value="dotted">Chấm</option>
          </select>
        </>
      )}

      {['hero', 'author-box', 'callout', 'badge', 'pullquote', 'highlight'].includes(type) && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Nội dung chính</label>
          <textarea value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={4} aria-label="Nội dung chính" />
        </>
      )}

      {type === 'table' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">Nội dung bảng</p>
          <TableCanvasEditor
            table={(selectedBlock.props.table as ReturnType<typeof createTableModel>) || createTableModel(3, 3)}
            onChange={(nextTable) => updateProp('table', nextTable)}
          />
        </div>
      )}
    </div>
  )
}
