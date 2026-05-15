import React, { useEffect, useState } from 'react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/UI'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

const SortableRow = ({ item, editing, patchLocal, save, onDelete, onEdit, reordering, lastDragged }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: String(item.id) })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 60 : 'auto',
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-12 p-2 text-center">
        <button ref={setActivatorNodeRef} {...attributes} {...listeners} className="p-2 rounded-md hover:bg-gray-100">
          {reordering && String(item.id) === String(lastDragged) ? (
            <div className="w-4 h-4 border-2 border-t-transparent border-gray-400 rounded-full animate-spin" aria-hidden />
          ) : (
            <GripVertical size={16} />
          )}
        </button>
      </TableCell>

      <TableCell>
        <input className="w-full px-2 py-1 rounded border" value={(editing[item.id]?.full_name ?? item.full_name) || ''} onChange={(e) => patchLocal(item.id, 'full_name', e.target.value)} />
      </TableCell>
      <TableCell>
        <input className="w-full px-2 py-1 rounded border" value={(editing[item.id]?.title ?? item.title) || ''} onChange={(e) => patchLocal(item.id, 'title', e.target.value)} />
      </TableCell>
      <TableCell>
          <select className="w-full px-2 py-1 rounded border" value={(editing[item.id]?.tier ?? item.tier) || ''} onChange={(e) => patchLocal(item.id, 'tier', e.target.value)}>
          <option value="">—</option>
          <option value="management">Tổ trưởng</option>
          <option value="senior">Trưởng bộ môn</option>
          <option value="instructor">Giáo viên</option>
        </select>
      </TableCell>
      <TableCell>
        <input className="w-full px-2 py-1 rounded border" value={(editing[item.id]?.expertise ?? item.expertise) || ''} onChange={(e) => patchLocal(item.id, 'expertise', e.target.value)} />
      </TableCell>

      <TableCell>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={(editing[item.id]?.is_active ?? item.is_active) || false} onChange={(e) => patchLocal(item.id, 'is_active', e.target.checked)} />
        </label>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => onEdit && onEdit(item)} className="px-3 py-1">Sửa</Button>
          <Button size="sm" onClick={() => save(item.id)} className="px-3 py-1">Lưu</Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(item.id)} className="px-3 py-1">Xóa</Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

const StaffTable = ({ staff = [], loading, onUpdate, onDelete, onEdit, onReorder, reordering = false }) => {
  const [editing, setEditing] = useState({})
  const [items, setItems] = useState(staff || [])
  const [lastDragged, setLastDragged] = useState(null)

  useEffect(() => setItems(staff || []), [staff])

  const patchLocal = (id, key, value) => {
    setEditing((prev) => ({ ...(prev || {}), [id]: { ...(prev[id] || {}), [key]: value } }))
  }

  const save = async (id) => {
    const item = { ...(items.find((s) => s.id === id) || {}), ...(editing[id] || {}) }
    await onUpdate(item)
    setEditing((prev) => { const c = { ...(prev || {}) }; delete c[id]; return c })
  }

  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => String(i.id) === String(active.id))
    const newIndex = items.findIndex((i) => String(i.id) === String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    setLastDragged(active.id)
    if (typeof onReorder === 'function') onReorder(next)
  }

  if (loading) return <div className="py-6 text-sm text-gray-500">Đang tải...</div>

  return (
    <div className="mt-6">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => String(i.id))} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Họ tên</TableHead>
                <TableHead>Chức danh</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Chuyên môn</TableHead>
                <TableHead>Hiển thị</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.map((s) => (
                <SortableRow key={s.id} item={s} editing={editing} patchLocal={patchLocal} save={save} onDelete={onDelete} onEdit={onEdit} reordering={reordering} lastDragged={lastDragged} />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default StaffTable
