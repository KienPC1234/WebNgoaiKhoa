import type { CMSBlock } from '../../core/types'

export const resolveResponsiveSpan = (block: CMSBlock, viewport: 'mobile' | 'desktop') => {
  const colSpan = Number(block.props.colSpan || 12)
  const rowSpan = Number(block.props.rowSpan || 1)

  if (viewport === 'mobile') {
    return {
      colSpan: 12,
      rowSpan: Math.max(1, rowSpan),
    }
  }

  return {
    colSpan: Math.min(12, Math.max(1, colSpan)),
    rowSpan: Math.max(1, rowSpan),
  }
}
