import React from 'react'
import { blockRegistry } from '../core/registry'
import { ensureDefaultBlocksRegistered } from '../blocks/defaultDefinitions'

ensureDefaultBlocksRegistered()

const toNumber = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const resolveSpan = (block) => ({
  colSpan: clamp(toNumber(block.props.colSpan, 12), 1, 12),
  rowSpan: clamp(toNumber(block.props.rowSpan, 1), 1, 6),
})

const RenderPublicBlock = ({ block }) => {
  const definition = blockRegistry.get(block.type)
  if (!definition) {
    return null
  }

  const { colSpan, rowSpan } = resolveSpan(block)

  return (
    <article
      style={{
        gridColumn: `span ${colSpan} / span ${colSpan}`,
        gridRow: `span ${rowSpan} / span ${rowSpan}`,
      }}
      className="space-y-2"
    >
      {definition.RendererComponent({ block, mode: 'publish' })}
      {block.children.length > 0 && (
        <div className="grid grid-cols-12 gap-2 border-l border-gray-100 pl-4">
          {block.children.map((child) => (
            <RenderPublicBlock key={child.id} block={child} />
          ))}
        </div>
      )}
    </article>
  )
}

export const PublicDocumentView = ({ document }) => {
  if (!document || !Array.isArray(document.blocks) || document.blocks.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[120px] gap-4">
      {document.blocks.map((block) => (
        <RenderPublicBlock key={block.id} block={block} />
      ))}
    </div>
  )
}
