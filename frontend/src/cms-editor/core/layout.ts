import type { CMSBlock } from './types'

export const GRID_COLUMNS = 12
export const MAX_ROW_SPAN = 6

export interface BlockSpan {
  colSpan: number
  rowSpan: number
}

export interface BlockPlacement extends BlockSpan {
  colStart: number
  rowStart: number
}

export interface GridPlacementOptions {
  minRowByBlockId?: Record<string, number>
}

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const resolveSpan = (
  block: Pick<CMSBlock, 'props'>,
  defaults: BlockSpan = { colSpan: GRID_COLUMNS, rowSpan: 1 }
): BlockSpan => ({
  colSpan: clamp(toNumber(block.props?.colSpan, defaults.colSpan), 1, GRID_COLUMNS),
  rowSpan: clamp(toNumber(block.props?.rowSpan, defaults.rowSpan), 1, MAX_ROW_SPAN),
})

export const computeGridPlacements = (
  blocks: CMSBlock[],
  options: GridPlacementOptions = {}
): Record<string, BlockPlacement> => {
  const occupied: Record<number, boolean[]> = {}
  const result: Record<string, BlockPlacement> = {}

  const ensureRow = (row: number) => {
    if (!occupied[row]) occupied[row] = Array(GRID_COLUMNS).fill(false)
    return occupied[row]
  }

  const isFree = (rowStart: number, colStart: number, colSpan: number, rowSpan: number) => {
    for (let row = rowStart; row < rowStart + rowSpan; row += 1) {
      const cells = ensureRow(row)
      for (let col = colStart; col < colStart + colSpan; col += 1) {
        if (cells[col - 1]) return false
      }
    }
    return true
  }

  const occupy = (rowStart: number, colStart: number, colSpan: number, rowSpan: number) => {
    for (let row = rowStart; row < rowStart + rowSpan; row += 1) {
      const cells = ensureRow(row)
      for (let col = colStart; col < colStart + colSpan; col += 1) {
        cells[col - 1] = true
      }
    }
  }

  blocks.forEach((block) => {
    const span = resolveSpan(block)
    const anchoredRow = Math.max(1, Math.floor(toNumber(options.minRowByBlockId?.[block.id], 1)))
    let rowStart = anchoredRow
    let colStart = 1
    let found = false

    while (!found) {
      for (let col = 1; col <= GRID_COLUMNS + 1 - span.colSpan; col += 1) {
        if (isFree(rowStart, col, span.colSpan, span.rowSpan)) {
          colStart = col
          found = true
          break
        }
      }

      if (!found) rowStart += 1
    }

    occupy(rowStart, colStart, span.colSpan, span.rowSpan)

    result[block.id] = {
      colStart,
      rowStart,
      colSpan: span.colSpan,
      rowSpan: span.rowSpan,
    }
  })

  return result
}
