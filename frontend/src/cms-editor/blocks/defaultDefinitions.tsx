import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { BlockDefinition, CMSBlock } from '../core/types'
import { blockRegistry } from '../core/registry'
import { createBlock } from '../core/model'
import { createTableModel } from '../plugins/table/model'
import { TableReadonlyView } from '../plugins/table/TableCanvasEditor'

const baseValidate = (block: CMSBlock) => ({
  valid: typeof block.id === 'string' && typeof block.type === 'string',
  errors: typeof block.id === 'string' && typeof block.type === 'string' ? [] : ['Missing block id/type'],
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

const CanvasPreviewShell: React.FC<{
  block: CMSBlock
  selected: boolean
  onSelect: () => void
  children: React.ReactNode
}> = ({ block, selected, onSelect, children }) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={`Select block ${block.type}`}
    onClick={onSelect}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') onSelect()
    }}
    className={`rounded-xl border bg-white p-2 transition ${selected ? 'border-fpt-blue ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
  >
    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">{block.type}</div>
    {children}
  </div>
)

const MinimalRenderer: React.FC<{ block: CMSBlock }> = ({ block }) => {
  const text = String(block.props.text || '')
  const url = String(block.props.url || '')
  const src = String(block.props.src || '')

  if (block.type === 'paragraph') {
    return (
      <div className="rounded-lg bg-gray-50 px-3 py-2">
        <div className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown>{text || 'Text content'}</ReactMarkdown>
        </div>
      </div>
    )
  }

  if (block.type === 'list') {
    const items = Array.isArray(block.props.items)
      ? block.props.items.map((item) => String(item || '')).filter(Boolean)
      : text.split('\n').map((item) => item.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    return (
      <div className="rounded-lg bg-gray-50 p-3">
        <ul className="list-disc pl-4 text-sm text-gray-700">
          {(items.length > 0 ? items : ['List item']).map((item, index) => (
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
      <div className="rounded-lg bg-gray-50 px-3 py-2">
        <Tag className="font-bold text-gray-800">{text || 'Heading'}</Tag>
      </div>
    )
  }

  if (block.type === 'image') {
    return src ? (
      <img src={src} alt={text || 'image'} className="h-36 w-full rounded-lg object-cover" />
    ) : (
      <div className="flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">Image URL</div>
    )
  }

  if (block.type === 'gallery') {
    const images = Array.isArray(block.props.images) ? block.props.images.map((item) => String(item || '')).filter(Boolean) : []
    const preview = images[0] || src
    return preview ? (
      <img src={preview} alt="gallery" className="h-36 w-full rounded-lg object-cover" />
    ) : (
      <div className="flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">Gallery URL</div>
    )
  }

  if (block.type === 'video') {
    const videoUrl = normalizeVideoUrl(url || src)
    if (!videoUrl) {
      return <div className="flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">Video URL</div>
    }
    if (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.ogg')) {
      return <video controls src={videoUrl} className="h-40 w-full rounded-lg bg-black" />
    }
    return <iframe src={videoUrl} title="Video preview" className="h-40 w-full rounded-lg border border-gray-100" />
  }

  if (block.type === 'iframe' || block.type === 'embed') {
    const frameUrl = normalizeVideoUrl(url)
    if (!frameUrl) {
      return <div className="flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">IFrame URL</div>
    }
    return <iframe src={frameUrl} title="Embedded content" className="h-40 w-full rounded-lg border border-gray-100" />
  }

  if (block.type === 'link') {
    return (
      <a href={url || '#'} className="inline-flex rounded-lg bg-fpt-blue px-3 py-2 text-xs font-semibold text-white">
        {text || 'Link'}
      </a>
    )
  }

  if (block.type === 'document') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-sm font-semibold text-gray-700">{text || 'Document'}</p>
        <p className="mt-1 truncate text-xs text-gray-500">{url || 'Document URL'}</p>
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
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{String(block.props.title || text || 'Grid layout')}</p>
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
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{String(block.props.title || text || 'Related posts')}</p>
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={`related-${idx}`} className="h-7 rounded border border-gray-200 bg-white" />
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'toc') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{String(block.props.title || text || 'Mục lục')}</p>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>1. Mở đầu</li>
          <li>2. Nội dung chính</li>
          <li>3. Kết luận</li>
        </ul>
      </div>
    )
  }

  if (block.type === 'columns') {
    const cols = clamp(toNumber(block.props.cols, 2), 1, 4)
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">{text || 'Columns layout'}</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, idx) => (
            <div key={`col-${idx}`} className="h-8 rounded border border-gray-200 bg-white" />
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'section') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-sm font-semibold text-gray-700">{String(block.props.title || text || 'Section')}</p>
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{String(block.props.description || '') || 'Section description'}</p>
      </div>
    )
  }

  if (block.type === 'sidebar') {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-sm font-semibold text-gray-700">{String(block.props.title || text || 'Sidebar')}</p>
        <p className="mt-1 text-xs text-gray-500">Position: {String(block.props.position || 'right')}</p>
      </div>
    )
  }

  if (block.type === 'spacer') {
    return <div className="h-10 rounded-lg bg-gray-100" />
  }

  if (block.type === 'divider') {
    return <div className="border-t border-gray-300" />
  }

  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="line-clamp-4 whitespace-pre-wrap text-sm text-gray-700">{text || 'Text content'}</p>
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
  create: () => createBlock(type, { colSpan: 6, rowSpan: 1, ...defaults }),
  validate: baseValidate,
  EditorComponent: ({ block, selected, onSelect }) => (
    <CanvasPreviewShell block={block} selected={selected} onSelect={onSelect}>
      <MinimalRenderer block={block} />
    </CanvasPreviewShell>
  ),
  RendererComponent: ({ block }) => <MinimalRenderer block={block} />,
})

export const registerDefaultBlocks = () => {
  const definitions: BlockDefinition[] = [
    makeDefinition('paragraph', 'text', 'Paragraph', { colSpan: 12, text: '' }),
    makeDefinition('heading', 'text', 'Heading', { colSpan: 12, text: 'Heading', level: 2 }, { insertable: false }),
    makeDefinition('list', 'text', 'List', { colSpan: 12, items: ['item 1', 'item 2'], text: 'item 1\nitem 2' }, { insertable: false }),
    makeDefinition('quote', 'text', 'Quote', { colSpan: 12, text: 'Quote...' }, { insertable: false }),
    makeDefinition('code', 'text', 'Code', { colSpan: 12, text: 'const x = 1;' }, { insertable: false }),
    makeDefinition('image', 'media', 'Image', { colSpan: 6, src: '', text: '' }),
    makeDefinition('gallery', 'media', 'Gallery', { colSpan: 6, images: [] }),
    makeDefinition('video', 'media', 'Video', { colSpan: 6, url: '' }),
    makeDefinition('embed', 'media', 'Embed', { colSpan: 6, url: '' }),
    makeDefinition('link', 'media', 'Link', { colSpan: 4, text: 'Nội dung liên kết', url: '', newTab: true }),
    makeDefinition('document', 'media', 'Document', { colSpan: 6, text: 'Tài liệu mới', url: '', description: '' }),
    makeDefinition('iframe', 'media', 'IFrame', { colSpan: 12, rowSpan: 2, text: 'Khối nhúng', url: '', height: 320 }),
    makeDefinition('section', 'layout', 'Section', { colSpan: 12, title: 'Section', description: '' }),
    makeDefinition('columns', 'layout', 'Columns', { colSpan: 12, cols: 2, text: 'Columns' }),
    makeDefinition('grid', 'layout', 'Grid', { colSpan: 6, title: 'Grid layout', cols: 3, gap: 12 }),
    makeDefinition('spacer', 'layout', 'Spacer', { colSpan: 12, height: 24 }),
    makeDefinition('divider', 'layout', 'Divider', { colSpan: 12, style: 'solid' }),
    makeDefinition('sidebar', 'layout', 'Sidebar', { colSpan: 4, title: 'Sidebar', position: 'right' }),
    makeDefinition('hero', 'article', 'Hero', { colSpan: 12, text: 'Hero title', subtitle: '' }),
    makeDefinition('author-box', 'article', 'Author Box', { colSpan: 12, text: 'Author bio', name: '' }),
    makeDefinition('toc', 'article', 'Table of Contents', { colSpan: 12, title: 'Mục lục' }),
    makeDefinition('related-posts', 'article', 'Related Posts', { colSpan: 12, title: 'Bài viết liên quan', count: 3, category: '' }),
    makeDefinition('callout', 'decor', 'Callout', { colSpan: 12, text: 'Callout text', tone: 'info' }),
    makeDefinition('badge', 'decor', 'Badge', { colSpan: 4, text: 'Badge', tone: 'neutral' }),
    makeDefinition('pullquote', 'decor', 'Pullquote', { colSpan: 12, text: 'Pullquote...' }),
    makeDefinition('highlight', 'decor', 'Highlight', { colSpan: 12, text: 'Highlight text' }),
    makeDefinition('table', 'table', 'Table', { colSpan: 12, rowSpan: 2, table: createTableModel(3, 3) }),
  ]

  definitions.forEach((definition) => blockRegistry.register(definition))
}

let defaultBlocksRegistered = false

export const ensureDefaultBlocksRegistered = () => {
  if (defaultBlocksRegistered) return
  registerDefaultBlocks()
  defaultBlocksRegistered = true
}
