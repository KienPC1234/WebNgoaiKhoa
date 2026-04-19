import type { TableModel } from '../../core/types'
import { createTableCell } from './model'

const normalize = (model: TableModel): TableModel => {
  const colCount = model.columns.length
  model.rows = model.rows.map((row) => {
    const next = [...row]
    while (next.length < colCount) {
      next.push(createTableCell())
    }
    return next.slice(0, colCount)
  })
  return model
}

export const mergeCells = (
  table: TableModel,
  rowStart: number,
  colStart: number,
  rowEnd: number,
  colEnd: number
): TableModel => {
  const next = structuredClone(table) as TableModel
  const anchor = next.rows[rowStart]?.[colStart]
  if (!anchor) return table

  anchor.rowSpan = rowEnd - rowStart + 1
  anchor.colSpan = colEnd - colStart + 1

  for (let r = rowStart; r <= rowEnd; r += 1) {
    for (let c = colStart; c <= colEnd; c += 1) {
      if (r === rowStart && c === colStart) continue
      next.rows[r][c] = { ...next.rows[r][c], hidden: true, rowSpan: 1, colSpan: 1 }
    }
  }

  return normalize(next)
}

export const splitCell = (table: TableModel, row: number, col: number): TableModel => {
  const next = structuredClone(table) as TableModel
  const anchor = next.rows[row]?.[col]
  if (!anchor) return table

  const { rowSpan, colSpan } = anchor
  anchor.rowSpan = 1
  anchor.colSpan = 1

  for (let r = row; r < row + rowSpan; r += 1) {
    for (let c = col; c < col + colSpan; c += 1) {
      next.rows[r][c] = { ...next.rows[r][c], hidden: false }
    }
  }

  return normalize(next)
}

export const addRow = (table: TableModel, afterRowIndex: number): TableModel => {
  const next = structuredClone(table) as TableModel
  const newRow = Array.from({ length: next.columns.length }, () => createTableCell())
  next.rows.splice(afterRowIndex + 1, 0, newRow)
  return normalize(next)
}

export const deleteRow = (table: TableModel, rowIndex: number): TableModel => {
  if (table.rows.length <= 1) return table
  const next = structuredClone(table) as TableModel
  next.rows.splice(rowIndex, 1)
  return normalize(next)
}

export const addColumn = (table: TableModel, afterColIndex: number): TableModel => {
  const next = structuredClone(table) as TableModel
  next.columns.splice(afterColIndex + 1, 0, 1) // default weight 1
  next.rows.forEach((row) => {
    row.splice(afterColIndex + 1, 0, createTableCell())
  })
  return normalize(next)
}

export const deleteColumn = (table: TableModel, colIndex: number): TableModel => {
  if (table.columns.length <= 1) return table
  const next = structuredClone(table) as TableModel
  next.columns.splice(colIndex, 1)
  next.rows.forEach((row) => {
    row.splice(colIndex, 1)
  })
  return normalize(next)
}

export const resizeColumn = (table: TableModel, col: number, weight: number): TableModel => {
  const next = structuredClone(table) as TableModel
  if (col < 0 || col >= next.columns.length) return table
  next.columns[col] = Math.max(0.25, weight)
  return next
}
