import React, { useMemo, useRef, useState } from 'react'
import type { CMSBlock } from '../core/types'
import { blockRegistry } from '../core/registry'
import { canDropIntoParent } from './dragDrop'

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const resolveSpan = (block: CMSBlock) => ({
  colSpan: clamp(toNumber(block.props.colSpan, 12), 1, 12),
  rowSpan: clamp(toNumber(block.props.rowSpan, 1), 1, 6),
})

const findBlockById = (blocks: CMSBlock[], blockId: string): CMSBlock | null => {
  const stack = [...blocks]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    if (current.id === blockId) return current
    if (current.children.length > 0) {
      stack.push(...current.children)
    }
  }
  return null
}

interface EditorCanvasProps {
  blocks: CMSBlock[]
  selectedBlockId: string | null
  onSelect: (blockId: string) => void
  onUpdate: (blockId: string, updater: (prev: CMSBlock) => CMSBlock) => void
  onMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
}

interface BlockPlacement {
  colStart: number
  rowStart: number
  colSpan: number
  rowSpan: number
}

type DropVariant = 'before' | 'after' | 'right' | 'inside'

interface DropSlotProps {
  rootBlocks: CMSBlock[]
  draggingBlockId: string | null
  targetParentId: string | null
  targetIndex: number
  onDropMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
  variant: DropVariant
  className?: string
  label: string
}

const DropSlot: React.FC<DropSlotProps> = ({
  rootBlocks,
  draggingBlockId,
  targetParentId,
  targetIndex,
  onDropMove,
  variant,
  className = '',
  label,
}) => {
  const [isOver, setIsOver] = useState(false)
  const canDrop = Boolean(draggingBlockId) && canDropIntoParent(rootBlocks, String(draggingBlockId), targetParentId)
  const slotLabel = variant === 'before'
    ? 'Before'
    : variant === 'after'
      ? 'After'
      : variant === 'right'
        ? 'Right'
        : 'Inside'

  const baseClass =
    variant === 'right'
      ? 'absolute -right-2 top-0 bottom-0 z-30 w-2 rounded'
      : 'col-span-12 h-4 rounded border border-dashed'

  const activeClass =
    variant === 'right'
      ? isOver
        ? 'bg-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]'
        : 'bg-transparent'
      : isOver
        ? 'border-blue-400 bg-blue-200'
        : 'border-blue-200 bg-blue-100/60'

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={label}
      title={label}
      className={`${baseClass} ${canDrop ? activeClass : 'border-transparent bg-transparent'} ${className}`}
      onDragOver={(event) => {
        if (!canDrop) return
        event.preventDefault()
        event.stopPropagation()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        if (!canDrop) return
        event.preventDefault()
        event.stopPropagation()
        setIsOver(false)
        const sourceId = event.dataTransfer.getData('text/cms-block-id') || event.dataTransfer.getData('text/plain')
        if (!sourceId) return
        onDropMove(sourceId, targetParentId, targetIndex)
      }}
    >
      {canDrop && isOver && variant !== 'right' && (
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
          {slotLabel}
        </span>
      )}
      {canDrop && isOver && variant === 'right' && (
        <span className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
          {slotLabel}
        </span>
      )}
    </div>
  )
}

const CanvasList: React.FC<{
  blocks: CMSBlock[]
  rootBlocks: CMSBlock[]
  parentId: string | null
  selectedBlockId: string | null
  onSelect: (blockId: string) => void
  onUpdate: (blockId: string, updater: (prev: CMSBlock) => CMSBlock) => void
  onMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
  layoutEpoch: number
  draggingBlockId: string | null
  setDraggingBlockId: (value: string | null) => void
}> = ({
  blocks,
  rootBlocks,
  parentId,
  selectedBlockId,
  onSelect,
  onUpdate,
  onMove,
  layoutEpoch,
  draggingBlockId,
  setDraggingBlockId,
}) => {
  const rowLockRef = useRef<Record<string, number>>({})
  const lastLayoutEpochRef = useRef(layoutEpoch)

  const placements = useMemo(() => {
    if (lastLayoutEpochRef.current !== layoutEpoch) {
      rowLockRef.current = {}
      lastLayoutEpochRef.current = layoutEpoch
    }

    const occupied: Record<number, boolean[]> = {}
    const nextLocks: Record<string, number> = {}
    const result: Record<string, BlockPlacement> = {}

    const ensureRow = (row: number) => {
      if (!occupied[row]) occupied[row] = Array(12).fill(false)
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
      const minRow = Math.max(1, rowLockRef.current[block.id] ?? 1)
      let rowStart = minRow
      let colStart = 1
      let found = false

      while (!found) {
        for (let col = 1; col <= 13 - span.colSpan; col += 1) {
          if (isFree(rowStart, col, span.colSpan, span.rowSpan)) {
            colStart = col
            found = true
            break
          }
        }
        if (!found) rowStart += 1
      }

      occupy(rowStart, colStart, span.colSpan, span.rowSpan)
      nextLocks[block.id] = rowStart
      result[block.id] = {
        rowStart,
        colStart,
        colSpan: span.colSpan,
        rowSpan: span.rowSpan,
      }
    })

    rowLockRef.current = nextLocks
    return result
  }, [blocks, layoutEpoch])

  return (
    <div className="grid grid-cols-12 gap-2" style={{ gridAutoFlow: 'row' }}>
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          <DropSlot
            rootBlocks={rootBlocks}
            draggingBlockId={draggingBlockId}
            targetParentId={parentId}
            targetIndex={index}
            onDropMove={onMove}
            variant="before"
            label="Drop before block"
          />
          <CanvasBlock
            block={block}
            rootBlocks={rootBlocks}
            parentId={parentId}
            index={index}
            placement={placements[block.id]}
            selectedBlockId={selectedBlockId}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onMove={onMove}
            layoutEpoch={layoutEpoch}
            draggingBlockId={draggingBlockId}
            setDraggingBlockId={setDraggingBlockId}
          />
        </React.Fragment>
      ))}

      <DropSlot
        rootBlocks={rootBlocks}
        draggingBlockId={draggingBlockId}
        targetParentId={parentId}
        targetIndex={blocks.length}
        onDropMove={onMove}
        variant="after"
        label="Drop at end"
      />
    </div>
  )
}

const CanvasBlock: React.FC<{
  block: CMSBlock
  rootBlocks: CMSBlock[]
  parentId: string | null
  index: number
  placement?: BlockPlacement
  layoutEpoch: number
  onSelect: (blockId: string) => void
  onUpdate: (blockId: string, updater: (prev: CMSBlock) => CMSBlock) => void
  onMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
  draggingBlockId: string | null
  setDraggingBlockId: (value: string | null) => void
}> = ({
  block,
  rootBlocks,
  parentId,
  index,
  placement,
  selectedBlockId,
  onSelect,
  onUpdate,
  onMove,
  draggingBlockId,
  setDraggingBlockId,
}) => {
  const definition = blockRegistry.get(block.type)
  if (!definition) {
    return <div className="text-xs text-red-400">Unknown block: {block.type}</div>
  }

  const { colSpan, rowSpan } = resolveSpan(block)

  const handleRightDrop = (sourceId: string, targetParentId: string | null, targetIndex: number) => {
    if (!sourceId || sourceId === block.id) return

    const sourceBlock = findBlockById(rootBlocks, sourceId)
    if (sourceBlock) {
      const sourceColSpan = resolveSpan(sourceBlock).colSpan
      const targetColStart = placement?.colStart ?? 1
      const targetColSpan = placement?.colSpan ?? colSpan

      let nextTargetColSpan = targetColSpan
      let availableRight = 12 - (targetColStart + nextTargetColSpan - 1)

      if (availableRight <= 0 && nextTargetColSpan > 1) {
        const maxShrink = nextTargetColSpan - 1
        const shrinkBy = Math.min(maxShrink, Math.max(1, sourceColSpan))
        nextTargetColSpan = Math.max(1, nextTargetColSpan - shrinkBy)
        availableRight = 12 - (targetColStart + nextTargetColSpan - 1)
      }

      if (nextTargetColSpan !== targetColSpan) {
        onUpdate(block.id, (prev) => ({
          ...prev,
          props: {
            ...prev.props,
            colSpan: nextTargetColSpan,
          },
        }))
      }

      if (availableRight > 0 && sourceColSpan > availableRight) {
        onUpdate(sourceId, (prev) => ({
          ...prev,
          props: {
            ...prev.props,
            colSpan: availableRight,
          },
        }))
      }
    }

    onMove(sourceId, targetParentId, targetIndex)
  }

  return (
    <div
      className="relative space-y-2"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/cms-block-id', block.id)
        event.dataTransfer.setData('text/plain', block.id)
        setDraggingBlockId(block.id)
      }}
      onDragEnd={() => setDraggingBlockId(null)}
      style={{
        gridColumn: `${placement?.colStart ?? 'auto'} / span ${placement?.colSpan ?? colSpan}`,
        gridRow: `${placement?.rowStart ?? 'auto'} / span ${placement?.rowSpan ?? rowSpan}`,
      }}
    >
      <DropSlot
        rootBlocks={rootBlocks}
        draggingBlockId={draggingBlockId}
        targetParentId={parentId}
        targetIndex={index + 1}
        onDropMove={handleRightDrop}
        variant="right"
        label="Drop to the right"
      />

      {definition.EditorComponent({
        block,
        selected: selectedBlockId === block.id,
        onSelect: () => onSelect(block.id),
        onUpdate: (next) => onUpdate(block.id, () => next),
      })}

      <div className="space-y-2 border-l border-gray-100 pl-4">
        <DropSlot
          rootBlocks={rootBlocks}
          draggingBlockId={draggingBlockId}
          targetParentId={block.id}
          targetIndex={0}
          onDropMove={onMove}
          variant="inside"
          label="Drop as first child"
        />

        {block.children.length > 0 && (
          <CanvasList
            blocks={block.children}
            rootBlocks={rootBlocks}
            parentId={block.id}
            selectedBlockId={selectedBlockId}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onMove={onMove}
                      layoutEpoch={layoutEpoch}
            draggingBlockId={draggingBlockId}
            setDraggingBlockId={setDraggingBlockId}
          />
        )}

        <DropSlot
          rootBlocks={rootBlocks}
          draggingBlockId={draggingBlockId}
          targetParentId={block.id}
          targetIndex={block.children.length}
          onDropMove={onMove}
          variant="inside"
          label="Drop as last child"
        />
      </div>
    </div>
  )
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ blocks, selectedBlockId, onSelect, onUpdate, onMove }) => {
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [layoutEpoch, setLayoutEpoch] = useState(0)

  const handleMove = (blockId: string, targetParentId: string | null, targetIndex: number) => {
    setLayoutEpoch((prev) => prev + 1)
    onMove(blockId, targetParentId, targetIndex)
  }

  return (
    <div className="space-y-2" aria-label="Editor canvas">
      <CanvasList
        blocks={blocks}
        rootBlocks={blocks}
        parentId={null}
        selectedBlockId={selectedBlockId}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onMove={handleMove}
        layoutEpoch={layoutEpoch}
        draggingBlockId={draggingBlockId}
        setDraggingBlockId={setDraggingBlockId}
      />
    </div>
  )
}
