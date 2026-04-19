import React, { useMemo, useState } from 'react'
import type { TableModel } from '../../core/types'
import { addColumn, addRow, deleteColumn, deleteRow, mergeCells, resizeColumn, splitCell } from './operations'

interface CellPos {
  row: number
  col: number
}

interface TableCanvasEditorProps {
  table: TableModel
  onChange: (next: TableModel) => void
}

const cellKey = (row: number, col: number) => `${row}:${col}`

const parseCellKey = (key: string): CellPos | null => {
  const [row, col] = key.split(':').map((value) => Number(value))
  if (Number.isNaN(row) || Number.isNaN(col)) return null
  return { row, col }
}

const normalizeRange = (a: CellPos, b: CellPos) => ({
  rowStart: Math.min(a.row, b.row),
  rowEnd: Math.max(a.row, b.row),
  colStart: Math.min(a.col, b.col),
  colEnd: Math.max(a.col, b.col),
})

const isInRange = (row: number, col: number, range: { rowStart: number; rowEnd: number; colStart: number; colEnd: number }) => (
  row >= range.rowStart && row <= range.rowEnd && col >= range.colStart && col <= range.colEnd
)

export const TableCanvasEditor: React.FC<TableCanvasEditorProps> = ({ table, onChange }) => {
  const [anchor, setAnchor] = useState<string | null>(null)
  const [focus, setFocus] = useState<string | null>(null)

  const selectedRange = useMemo(() => {
    if (!anchor || !focus) return null
    const a = parseCellKey(anchor)
    const b = parseCellKey(focus)
    if (!a || !b) return null
    return normalizeRange(a, b)
  }, [anchor, focus])

  const canMerge = Boolean(selectedRange)
  const canSplit = Boolean(anchor)
  
  const anchorPos = anchor ? parseCellKey(anchor) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg text-xs font-black bg-blue-50 text-fpt-blue disabled:opacity-50"
          disabled={!canMerge || !selectedRange}
          onClick={() => {
            if (!selectedRange) return
            onChange(mergeCells(table, selectedRange.rowStart, selectedRange.colStart, selectedRange.rowEnd, selectedRange.colEnd))
          }}
        >
          Gộp vùng chọn
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg text-xs font-black bg-orange-50 text-fpt-orange disabled:opacity-50"
          disabled={!canSplit || !anchorPos}
          onClick={() => {
            if (!anchorPos) return
            onChange(splitCell(table, anchorPos.row, anchorPos.col))
          }}
        >
          Tách ô gốc
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg text-xs font-black bg-green-50 text-green-600 disabled:opacity-50"
          disabled={!anchorPos}
          onClick={() => {
            if (!anchorPos) return
            onChange(addRow(table, anchorPos.row))
          }}
        >
          Thêm hàng (sau)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 text-red-600 disabled:opacity-50"
          disabled={!anchorPos || table.rows.length <= 1}
          onClick={() => {
            if (!anchorPos) return
            onChange(deleteRow(table, anchorPos.row))
            setAnchor(null)
            setFocus(null)
          }}
        >
          Xóa hàng
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg text-xs font-black bg-green-50 text-green-600 disabled:opacity-50"
          disabled={!anchorPos}
          onClick={() => {
            if (!anchorPos) return
            onChange(addColumn(table, anchorPos.col))
          }}
        >
          Thêm cột (sau)
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 text-red-600 disabled:opacity-50"
          disabled={!anchorPos || table.columns.length <= 1}
          onClick={() => {
            if (!anchorPos) return
            onChange(deleteColumn(table, anchorPos.col))
            setAnchor(null)
            setFocus(null)
          }}
        >
          Xóa cột
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Đổi kích thước cột</p>
        <div className="grid grid-cols-1 gap-2">
          {table.columns.map((weight, col) => (
            <div key={`col-${col}`} className="flex items-center gap-2">
              <span className="w-14 text-[10px] font-black text-gray-500">Cột {col + 1}</span>
              <input
                type="range"
                min={0.25}
                max={3}
                step={0.05}
                value={weight}
                onChange={(event) => onChange(resizeColumn(table, col, Number(event.target.value)))}
                className="flex-1"
                aria-label={`Đổi kích thước cột ${col + 1}`}
              />
              <span className="w-10 text-[10px] font-bold text-gray-400">{weight.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200">
        <table className="w-full border-collapse text-xs">
          <colgroup>
            {table.columns.map((weight, index) => (
              <col key={`colgroup-${index}`} style={{ width: `${(weight / table.columns.reduce((sum, item) => sum + item, 0)) * 100}%` }} />
            ))}
          </colgroup>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {row.map((cell, colIndex) => {
                  if (cell.hidden) return null
                  const currentKey = cellKey(rowIndex, colIndex)
                  const isAnchor = anchor === currentKey
                  const selected = selectedRange ? isInRange(rowIndex, colIndex, selectedRange) : false

                  return (
                    <td
                      key={cell.id}
                      rowSpan={cell.rowSpan}
                      colSpan={cell.colSpan}
                      className={`border border-gray-200 p-2 align-top transition ${selected ? 'bg-blue-50' : 'bg-white'} ${isAnchor ? 'ring-2 ring-fpt-blue ring-inset' : ''}`}
                      onClick={() => {
                        if (!anchor) {
                          setAnchor(currentKey)
                          setFocus(currentKey)
                          return
                        }
                        setFocus(currentKey)
                      }}
                    >
                      <textarea
                        value={cell.content}
                        onChange={(event) => {
                          const next = structuredClone(table) as TableModel
                          next.rows[rowIndex][colIndex] = {
                            ...next.rows[rowIndex][colIndex],
                            content: event.target.value,
                          }
                          onChange(next)
                        }}
                        className="w-full min-h-[52px] resize-y bg-transparent outline-none"
                        placeholder="Nội dung ô"
                        aria-label={`Ô ${rowIndex + 1}-${colIndex + 1}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const TableReadonlyView: React.FC<{ table: TableModel }> = ({ table }) => (
  <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
    <table className="w-full border-collapse text-sm">
      <colgroup>
        {table.columns.map((weight, index) => (
          <col key={`readonly-col-${index}`} style={{ width: `${(weight / table.columns.reduce((sum, item) => sum + item, 0)) * 100}%` }} />
        ))}
      </colgroup>
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={`readonly-row-${rowIndex}`}>
            {row.map((cell) => {
              if (cell.hidden) return null
              return (
                <td key={cell.id} rowSpan={cell.rowSpan} colSpan={cell.colSpan} className="border border-gray-200 p-2 align-top">
                  {cell.content}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
