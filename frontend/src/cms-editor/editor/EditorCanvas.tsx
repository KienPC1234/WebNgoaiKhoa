import React from 'react'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import type { BlockEditorProps, CMSBlock } from '../core/types'
import { blockRegistry } from '../core/registry'
import { canDropIntoParent } from './dragDrop'
import {
  fromContainerSortableId,
  toBlockSortableId,
  toContainerSortableId,
  useCmsBlockDnd,
} from './useCmsBlockDnd'

interface EditorCanvasProps {
  blocks: CMSBlock[]
  selectedBlockId: string | null
  onSelect: (blockId: string) => void
  onUpdate: (blockId: string, updater: (prev: CMSBlock) => CMSBlock) => void
  onMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
}

const GRID_COLUMNS = 12

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const resolveColSpan = (block: CMSBlock, fallback = 6) => clamp(toNumber(block.props.colSpan, fallback), 1, GRID_COLUMNS)

const CanvasList: React.FC<{
  blocks: CMSBlock[]
  rootBlocks: CMSBlock[]
  parentId: string | null
  selectedBlockId: string | null
  onSelect: (blockId: string) => void
  onUpdate: (blockId: string, updater: (prev: CMSBlock) => CMSBlock) => void
  onMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
  activeBlockId: string | null
  overSortableId: string | null
}> = ({
  blocks,
  rootBlocks,
  parentId,
  selectedBlockId,
  onSelect,
  onUpdate,
  onMove,
  activeBlockId,
  overSortableId,
}) => {
  const containerId = toContainerSortableId(parentId)
  const { setNodeRef, isOver } = useDroppable({ id: containerId })

  const canDropInContainer = Boolean(activeBlockId) && canDropIntoParent(rootBlocks, String(activeBlockId), parentId)
  const overContainerId = fromContainerSortableId(overSortableId)
  const isContainerOver = isOver || overContainerId === parentId

  return (
    <div className="space-y-2">
      <SortableContext items={blocks.map((block) => toBlockSortableId(block.id))} strategy={rectSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`grid grid-cols-12 gap-2 rounded-lg border border-transparent p-1 transition-colors ${
            isContainerOver && canDropInContainer ? 'border-blue-300 bg-blue-50/40' : ''
          }`}
          style={{ gridAutoFlow: 'row', gridAutoRows: 'auto' }}
        >
          {blocks.map((block) => (
            <CanvasBlock
              key={block.id}
              block={block}
              rootBlocks={rootBlocks}
              selectedBlockId={selectedBlockId}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onMove={onMove}
              activeBlockId={activeBlockId}
              overSortableId={overSortableId}
            />
          ))}

          {blocks.length === 0 && (
            <div className="col-span-12 flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/40 px-4 text-[11px] font-semibold text-blue-600">
              Kéo khối vào đây
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

const CanvasBlock: React.FC<{
  block: CMSBlock
  rootBlocks: CMSBlock[]
  selectedBlockId: string | null
  onSelect: (blockId: string) => void
  onUpdate: (blockId: string, updater: (prev: CMSBlock) => CMSBlock) => void
  onMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
  activeBlockId: string | null
  overSortableId: string | null
}> = ({
  block,
  rootBlocks,
  selectedBlockId,
  onSelect,
  onUpdate,
  onMove,
  activeBlockId,
  overSortableId,
}) => {
  const sortableId = toBlockSortableId(block.id)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: sortableId })

  const definition = blockRegistry.get(block.type)
  if (!definition) {
    return <div className="text-xs text-red-400">Không xác định được khối: {block.type}</div>
  }

  const colSpan = resolveColSpan(block)
  const showInsideDropZone = true
  const canDropInside = Boolean(activeBlockId) && canDropIntoParent(rootBlocks, String(activeBlockId), block.id)
  const insideContainerId = toContainerSortableId(block.id)
  const isInsideOver = overSortableId === insideContainerId
  const EditorComponent = definition.EditorComponent as unknown as React.ComponentType<BlockEditorProps>

  return (
    <div
      ref={setNodeRef}
      className="relative space-y-2"
      style={{
        gridColumn: `span ${colSpan}`,
        transform: CSS.Transform.toString(transform),
        transition: transition ?? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: isDragging ? 40 : 'auto',
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <div className={`rounded-xl transition-shadow ${isOver ? 'shadow-[0_0_0_2px_rgba(59,130,246,0.35)]' : ''}`}>
        <div className="relative">
          <div className="absolute right-2 top-2 z-20">
            <button
              ref={setActivatorNodeRef}
              type="button"
              aria-label="Kéo khối"
              title="Kéo để sắp xếp"
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              Kéo
            </button>
          </div>

          <EditorComponent
            block={block}
            selected={selectedBlockId === block.id}
            onSelect={() => onSelect(block.id)}
            onUpdate={(next) => onUpdate(block.id, () => next)}
          />
        </div>
      </div>

      {showInsideDropZone && (
        <div className={`space-y-2 border-l pl-4 transition-colors ${isInsideOver && canDropInside ? 'border-blue-300 bg-blue-50/30' : 'border-gray-100'}`}>
          <div className="px-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Nội dung con</div>

          <CanvasList
            blocks={block.children}
            rootBlocks={rootBlocks}
            parentId={block.id}
            selectedBlockId={selectedBlockId}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onMove={onMove}
            activeBlockId={activeBlockId}
            overSortableId={overSortableId}
          />
        </div>
      )}
    </div>
  )
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ blocks, selectedBlockId, onSelect, onUpdate, onMove }) => {
  const {
    activeBlockId,
    activeBlock,
    activeBlockRect,
    overSortableId,
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useCmsBlockDnd({ blocks, onMove })

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(event: DragEndEvent) => handleDragEnd(event)}
      onDragCancel={handleDragCancel}
      autoScroll
    >
      <div className="space-y-2" aria-label="Vùng chỉnh sửa">
        <CanvasList
          blocks={blocks}
          rootBlocks={blocks}
          parentId={null}
          selectedBlockId={selectedBlockId}
          onSelect={onSelect}
          onUpdate={onUpdate}
          onMove={onMove}
          activeBlockId={activeBlockId}
          overSortableId={overSortableId}
        />
      </div>

      <DragOverlay adjustScale={false}>
        {activeBlock ? (
          <div
            className="rounded-xl border border-blue-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-sm"
            style={{
              width: activeBlockRect?.width ? `${activeBlockRect.width}px` : undefined,
              maxWidth: '72vw',
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Đang kéo</p>
            <p className="mt-1 text-sm font-semibold text-gray-700">
              {blockRegistry.get(activeBlock.type)?.label ?? activeBlock.type}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
