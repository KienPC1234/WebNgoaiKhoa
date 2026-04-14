import type { TableCell, TableModel } from '../../core/types'
import { createId } from '../../core/model'

export const createTableCell = (content = ''): TableCell => ({
  id: createId('cell'),
  content,
  rowSpan: 1,
  colSpan: 1,
  hidden: false,
  isHeader: false,
})

export const createTableModel = (rows = 3, cols = 3): TableModel => ({
  columns: Array.from({ length: cols }, () => 1),
  rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => createTableCell())),
  hasHeaderRow: false,
  hasHeaderColumn: false,
})
