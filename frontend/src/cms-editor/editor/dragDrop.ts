import type { CMSBlock, EditorAction } from '../core/types'

export const createMoveBlockAction = (
  blockId: string,
  targetParentId: string | null,
  targetIndex: number
): EditorAction => ({
  type: 'MOVE_BLOCK',
  payload: {
    blockId,
    targetParentId,
    targetIndex,
  },
})

export const canDropInto = (sourceBlockId: string, targetBlockId: string) => {
  if (!sourceBlockId || !targetBlockId) return false
  return sourceBlockId !== targetBlockId
}

const findBlock = (blocks: CMSBlock[], blockId: string): CMSBlock | null => {
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

export const isBlockInSubtree = (root: CMSBlock, blockId: string): boolean => {
  if (root.id === blockId) return true
  return root.children.some((child) => isBlockInSubtree(child, blockId))
}

export const canDropIntoParent = (
  blocks: CMSBlock[],
  sourceBlockId: string,
  targetParentId: string | null
): boolean => {
  if (!sourceBlockId) return false
  if (!targetParentId) return true
  if (sourceBlockId === targetParentId) return false

  const source = findBlock(blocks, sourceBlockId)
  if (!source) return false
  return !isBlockInSubtree(source, targetParentId)
}
