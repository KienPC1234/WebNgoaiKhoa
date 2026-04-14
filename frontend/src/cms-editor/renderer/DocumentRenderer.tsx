import React from 'react'
import type { CMSDocument, CMSBlock } from '../core/types'
import { blockRegistry } from '../core/registry'

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const resolveSpan = (block: CMSBlock) => ({
  colSpan: clamp(toNumber(block.props.colSpan, 12), 1, 12),
  rowSpan: clamp(toNumber(block.props.rowSpan, 1), 1, 6),
})

const RenderBlock: React.FC<{ block: CMSBlock; mode: 'preview' | 'publish' }> = ({ block, mode }) => {
  const definition = blockRegistry.get(block.type)
  if (!definition) {
    return <div className="text-xs text-red-400">Unknown block: {block.type}</div>
  }

  const { colSpan, rowSpan } = resolveSpan(block)

  return (
    <div
      className="space-y-2"
      style={{
        gridColumn: `span ${colSpan} / span ${colSpan}`,
        gridRow: `span ${rowSpan} / span ${rowSpan}`,
      }}
      aria-label={`Rendered block ${block.type}`}
    >
      {definition.RendererComponent({ block, mode })}
      {block.children.length > 0 && (
        <div className="pl-4 border-l border-gray-100 grid grid-cols-12 gap-2">
          {block.children.map((child) => (
            <RenderBlock key={child.id} block={child} mode={mode} />
          ))}
        </div>
      )}
    </div>
  )
}

export const DocumentRenderer: React.FC<{ document: CMSDocument; mode?: 'preview' | 'publish' }> = ({ document, mode = 'preview' }) => (
  <article className="grid grid-cols-12 gap-3" aria-label="CMS document renderer">
    {document.blocks.map((block) => (
      <RenderBlock key={block.id} block={block} mode={mode} />
    ))}
  </article>
)
