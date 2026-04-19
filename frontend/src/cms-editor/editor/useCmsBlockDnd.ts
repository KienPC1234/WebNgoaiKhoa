import { useMemo, useState } from 'react'
import {
  type CollisionDetection,
  closestCenter,
  PointerSensor,
  pointerWithin,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CMSBlock } from '../core/types'
import { canDropIntoParent } from './dragDrop'

const ROOT_CONTAINER_ID = '__root__'
const BLOCK_ID_PREFIX = 'block:'
const CONTAINER_ID_PREFIX = 'container:'

export const toBlockSortableId = (blockId: string) => `${BLOCK_ID_PREFIX}${blockId}`
export const toContainerSortableId = (parentId: string | null) => `${CONTAINER_ID_PREFIX}${parentId ?? ROOT_CONTAINER_ID}`

export const fromBlockSortableId = (id: string | null | undefined): string | null => {
  if (!id || !id.startsWith(BLOCK_ID_PREFIX)) return null
  return id.slice(BLOCK_ID_PREFIX.length)
}

export const fromContainerSortableId = (id: string | null | undefined): string | null | undefined => {
  if (!id || !id.startsWith(CONTAINER_ID_PREFIX)) return undefined
  const parentId = id.slice(CONTAINER_ID_PREFIX.length)
  return parentId === ROOT_CONTAINER_ID ? null : parentId
}

interface BlockLocation {
  parentId: string | null
  index: number
  block: CMSBlock
}

const findBlockLocation = (
  blocks: CMSBlock[],
  blockId: string,
  parentId: string | null = null
): BlockLocation | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]
    if (block.id === blockId) {
      return { parentId, index, block }
    }

    if (block.children.length > 0) {
      const nested = findBlockLocation(block.children, blockId, block.id)
      if (nested) return nested
    }
  }

  return null
}

const findBlockById = (blocks: CMSBlock[], blockId: string): CMSBlock | null => {
  const location = findBlockLocation(blocks, blockId)
  return location?.block ?? null
}

const getInsertionAfterOverBlock = (event: DragEndEvent): boolean => {
  const translated = event.active.rect.current.translated
  const overRect = event.over?.rect
  if (!translated || !overRect) return false

  const activeCenter = translated.top + translated.height / 2
  const overCenter = overRect.top + overRect.height / 2
  return activeCenter > overCenter
}

const areSameTarget = (
  source: BlockLocation,
  targetParentId: string | null,
  targetIndex: number
) => source.parentId === targetParentId && source.index === targetIndex

interface UseCmsBlockDndArgs {
  blocks: CMSBlock[]
  onMove: (blockId: string, targetParentId: string | null, targetIndex: number) => void
}

interface ActiveBlockRect {
  width: number
  height: number
}

export const useCmsBlockDnd = ({ blocks, onMove }: UseCmsBlockDndArgs) => {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [overSortableId, setOverSortableId] = useState<string | null>(null)
  const [activeBlockRect, setActiveBlockRect] = useState<ActiveBlockRect | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const blockId = fromBlockSortableId(String(event.active.id))
    setActiveBlockId(blockId)

    const initialRect = event.active.rect.current.initial
    if (initialRect) {
      setActiveBlockRect({
        width: Math.max(1, Math.round(initialRect.width)),
        height: Math.max(1, Math.round(initialRect.height)),
      })
      return
    }

    setActiveBlockRect(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverSortableId(event.over ? String(event.over.id) : null)
  }

  const resetDragState = () => {
    setActiveBlockId(null)
    setOverSortableId(null)
    setActiveBlockRect(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const draggedBlockId = fromBlockSortableId(String(event.active.id))
    const overId = event.over ? String(event.over.id) : null

    if (!draggedBlockId || !overId) {
      resetDragState()
      return
    }

    const sourceLocation = findBlockLocation(blocks, draggedBlockId)
    if (!sourceLocation) {
      resetDragState()
      return
    }

    let targetParentId: string | null = sourceLocation.parentId
    let targetIndex = sourceLocation.index

    const overBlockId = fromBlockSortableId(overId)
    const overContainerId = fromContainerSortableId(overId)

    if (overBlockId) {
      const targetLocation = findBlockLocation(blocks, overBlockId)
      if (!targetLocation) {
        resetDragState()
        return
      }

      targetParentId = targetLocation.parentId
      targetIndex = targetLocation.index + (getInsertionAfterOverBlock(event) ? 1 : 0)
    } else if (overContainerId !== undefined) {
      targetParentId = overContainerId
      const parentBlock = targetParentId ? findBlockById(blocks, targetParentId) : null
      targetIndex = parentBlock ? parentBlock.children.length : blocks.length
    }

    if (!canDropIntoParent(blocks, draggedBlockId, targetParentId)) {
      resetDragState()
      return
    }

    if (areSameTarget(sourceLocation, targetParentId, targetIndex)) {
      resetDragState()
      return
    }

    onMove(draggedBlockId, targetParentId, targetIndex)
    resetDragState()
  }

  const handleDragCancel = () => {
    resetDragState()
  }

  const collisionDetection = useMemo<CollisionDetection>(() => {
    return (args) => {
      const pointerCollisions = pointerWithin(args)
      if (pointerCollisions.length > 0) {
        const containerCollision = pointerCollisions.find(
          (collision) => fromContainerSortableId(String(collision.id)) !== undefined
        )
        if (containerCollision) {
          return [containerCollision]
        }
        return pointerCollisions
      }

      return closestCenter(args)
    }
  }, [])

  const activeBlock = useMemo(() => {
    if (!activeBlockId) return null
    return findBlockById(blocks, activeBlockId)
  }, [activeBlockId, blocks])

  return {
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
  }
}
