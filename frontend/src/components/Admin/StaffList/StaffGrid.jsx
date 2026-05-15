import React, { useEffect, useState } from 'react'
import StaffCard from './StaffCard'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripHorizontal } from 'lucide-react'

const SortableCard = ({ person, onEdit, onDelete, reordering, lastDragged }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: String(person.id) })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 60 : 'auto' }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute left-2 top-2 z-20">
        <button ref={setActivatorNodeRef} {...attributes} {...listeners} className="p-2 rounded-md hover:bg-gray-100">
          {reordering && String(person.id) === String(lastDragged) ? (
            <div className="w-4 h-4 border-2 border-t-transparent border-gray-400 rounded-full animate-spin" aria-hidden />
          ) : (
            <GripHorizontal size={16} />
          )}
        </button>
      </div>
      <StaffCard person={person} onEdit={onEdit} onDelete={onDelete} />
    </div>
  )
}

const StaffGrid = ({ staff = [], loading, onEdit, onDelete, onReorder, reordering = false }) => {
  const [items, setItems] = useState(staff || [])
  const [lastDragged, setLastDragged] = useState(null)
  useEffect(() => setItems(staff || []), [staff])

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        {[1,2,3,4].map((i) => <div key={i} className="h-80 rounded-[20px] bg-white animate-pulse" />)}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => String(i.id))} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {items.map((p) => (
            <SortableCard key={p.id} person={p} onEdit={onEdit} onDelete={onDelete} reordering={reordering} lastDragged={lastDragged} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export default StaffGrid
