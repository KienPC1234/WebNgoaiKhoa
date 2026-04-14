import React from 'react'
import type { CMSBlock } from '../core/types'
import { createTableModel } from '../plugins/table/model'
import { TableCanvasEditor } from '../plugins/table/TableCanvasEditor'

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
    return <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-400">Chọn block trên canvas để chỉnh nội dung.</div>
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
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3" aria-label="Block content editor">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Edit Block: {type}</p>
        <button
          type="button"
          onClick={() => onDelete(selectedBlock.id)}
          className="rounded-lg bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-red-600"
          aria-label="Delete block"
        >
          Xóa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-gray-500">Width (colSpan)</label>
        <input
          type="number"
          min={1}
          max={12}
          value={toNumber(selectedBlock.props.colSpan, 6)}
          onChange={(event) => updateProp('colSpan', Number(event.target.value) || 1)}
          className="px-3 py-2 rounded-lg bg-gray-50 text-xs"
          aria-label="Block width"
        />

        <label className="text-xs font-semibold text-gray-500">Height (rowSpan)</label>
        <input
          type="number"
          min={1}
          max={6}
          value={toNumber(selectedBlock.props.rowSpan, 1)}
          onChange={(event) => updateProp('rowSpan', Number(event.target.value) || 1)}
          className="px-3 py-2 rounded-lg bg-gray-50 text-xs"
          aria-label="Block height"
        />
      </div>

      {type === 'heading' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Heading text</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Heading text" />
          <label className="block text-xs font-semibold text-gray-500">Heading level</label>
          <select value={String(selectedBlock.props.level || 2)} onChange={(event) => updateProp('level', Number(event.target.value))} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Heading level">
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="3">H3</option>
            <option value="4">H4</option>
          </select>
        </>
      )}

      {type === 'paragraph' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Paragraph content</label>
          <textarea value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={5} aria-label="Paragraph content" />
        </>
      )}

      {type === 'list' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">List items (mỗi dòng 1 item)</label>
          <textarea
            value={Array.isArray(selectedBlock.props.items) ? selectedBlock.props.items.map((item) => String(item || '')).join('\n') : String(selectedBlock.props.text || '')}
            onChange={(event) => {
              const items = event.target.value.split('\n').map((item) => item.trim()).filter(Boolean)
              updateProp('items', items)
              updateProp('text', items.join('\n'))
            }}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs"
            rows={6}
            aria-label="List items"
          />
        </>
      )}

      {type === 'quote' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Quote</label>
          <textarea value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={4} aria-label="Quote" />
          <label className="block text-xs font-semibold text-gray-500">Author</label>
          <input value={String(selectedBlock.props.author || '')} onChange={(event) => updateProp('author', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Quote author" />
        </>
      )}

      {type === 'code' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Code</label>
          <textarea value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs font-mono" rows={6} aria-label="Code content" />
          <label className="block text-xs font-semibold text-gray-500">Language</label>
          <input value={String(selectedBlock.props.language || '')} onChange={(event) => updateProp('language', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="javascript / python / ..." aria-label="Code language" />
        </>
      )}

      {type === 'image' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Image URL</label>
          <input value={String(selectedBlock.props.src || '')} onChange={(event) => updateProp('src', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="https://..." aria-label="Image URL" />
          <label className="block text-xs font-semibold text-gray-500">Caption</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Image caption" />
        </>
      )}

      {type === 'gallery' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Gallery URLs (mỗi dòng 1 ảnh)</label>
          <textarea
            value={Array.isArray(selectedBlock.props.images) ? selectedBlock.props.images.map((item) => String(item || '')).join('\n') : ''}
            onChange={(event) => updateProp('images', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs"
            rows={6}
            aria-label="Gallery URLs"
          />
        </>
      )}

      {type === 'video' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Video URL</label>
          <input
            value={String(selectedBlock.props.url || selectedBlock.props.src || '')}
            onChange={(event) => {
              updateProp('url', event.target.value)
              updateProp('src', event.target.value)
            }}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs"
            placeholder="YouTube / MP4 URL"
            aria-label="Video URL"
          />
        </>
      )}

      {type === 'embed' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Embed URL</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="https://..." aria-label="Embed URL" />
        </>
      )}

      {type === 'iframe' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">IFrame URL</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="https://..." aria-label="IFrame URL" />
          <label className="block text-xs font-semibold text-gray-500">Title</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="IFrame title" />
          <label className="block text-xs font-semibold text-gray-500">Height</label>
          <input type="number" min={120} max={1200} value={toNumber(selectedBlock.props.height, 320)} onChange={(event) => updateProp('height', Number(event.target.value) || 320)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="IFrame height" />
        </>
      )}

      {type === 'link' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Link text</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Link text" />
          <label className="block text-xs font-semibold text-gray-500">Link URL</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Link URL" />
        </>
      )}

      {type === 'document' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Document title</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Document title" />
          <label className="block text-xs font-semibold text-gray-500">Document URL</label>
          <input value={String(selectedBlock.props.url || '')} onChange={(event) => updateProp('url', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Document URL" />
          <label className="block text-xs font-semibold text-gray-500">Description</label>
          <textarea value={String(selectedBlock.props.description || '')} onChange={(event) => updateProp('description', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={3} aria-label="Document description" />
        </>
      )}

      {type === 'grid' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Grid title</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Grid title" />
          <label className="block text-xs font-semibold text-gray-500">Columns</label>
          <input type="number" min={1} max={12} value={toNumber(selectedBlock.props.cols, 3)} onChange={(event) => updateProp('cols', Number(event.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Grid columns" />
          <label className="block text-xs font-semibold text-gray-500">Gap</label>
          <input type="number" min={0} max={64} value={toNumber(selectedBlock.props.gap, 12)} onChange={(event) => updateProp('gap', Number(event.target.value) || 0)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Grid gap" />
        </>
      )}

      {type === 'related-posts' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Section title</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Related posts title" />
          <label className="block text-xs font-semibold text-gray-500">Post count</label>
          <input type="number" min={1} max={12} value={toNumber(selectedBlock.props.count, 3)} onChange={(event) => updateProp('count', Number(event.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Related posts count" />
          <label className="block text-xs font-semibold text-gray-500">Filter category</label>
          <input value={String(selectedBlock.props.category || '')} onChange={(event) => updateProp('category', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" placeholder="van / ktpl / ..." aria-label="Related posts category" />
        </>
      )}

      {type === 'toc' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">TOC title</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || 'Mục lục')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="TOC title" />
        </>
      )}

      {type === 'columns' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Columns count</label>
          <input type="number" min={1} max={6} value={toNumber(selectedBlock.props.cols, 2)} onChange={(event) => updateProp('cols', Number(event.target.value) || 1)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Columns count" />
          <label className="block text-xs font-semibold text-gray-500">Header text</label>
          <input value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Columns text" />
        </>
      )}

      {type === 'section' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Section title</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Section title" />
          <label className="block text-xs font-semibold text-gray-500">Section description</label>
          <textarea value={String(selectedBlock.props.description || '')} onChange={(event) => updateProp('description', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={3} aria-label="Section description" />
        </>
      )}

      {type === 'sidebar' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Sidebar title</label>
          <input value={String(selectedBlock.props.title || selectedBlock.props.text || '')} onChange={(event) => { updateProp('title', event.target.value); updateProp('text', event.target.value) }} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Sidebar title" />
          <label className="block text-xs font-semibold text-gray-500">Position</label>
          <select value={String(selectedBlock.props.position || 'right')} onChange={(event) => updateProp('position', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Sidebar position">
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </>
      )}

      {type === 'spacer' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Spacer height</label>
          <input type="number" min={4} max={400} value={toNumber(selectedBlock.props.height, 24)} onChange={(event) => updateProp('height', Number(event.target.value) || 24)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Spacer height" />
        </>
      )}

      {type === 'divider' && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Divider style</label>
          <select value={String(selectedBlock.props.style || 'solid')} onChange={(event) => updateProp('style', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" aria-label="Divider style">
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </>
      )}

      {['hero', 'author-box', 'callout', 'badge', 'pullquote', 'highlight'].includes(type) && (
        <>
          <label className="block text-xs font-semibold text-gray-500">Main text</label>
          <textarea value={String(selectedBlock.props.text || '')} onChange={(event) => updateProp('text', event.target.value)} className="w-full px-3 py-2 rounded-lg bg-gray-50 text-xs" rows={4} aria-label="Main text" />
        </>
      )}

      {type === 'table' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">Table content</p>
          <TableCanvasEditor
            table={(selectedBlock.props.table as ReturnType<typeof createTableModel>) || createTableModel(3, 3)}
            onChange={(nextTable) => updateProp('table', nextTable)}
          />
        </div>
      )}
    </div>
  )
}
