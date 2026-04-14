import type { CMSBlock } from '../../core/types'

export const normalizeLayoutTree = (blocks: CMSBlock[]): CMSBlock[] =>
  blocks.map((block) => {
    const next = { ...block, props: { ...block.props }, children: normalizeLayoutTree(block.children) }

    if (block.type === 'columns' || block.type === 'grid' || block.type === 'sidebar' || block.type === 'section') {
      const colSpan = Number(next.props.colSpan || 12)
      const rowSpan = Number(next.props.rowSpan || 1)
      next.props.colSpan = Math.max(1, Math.min(12, colSpan))
      next.props.rowSpan = Math.max(1, Math.min(6, rowSpan))
    }

    return next
  })
