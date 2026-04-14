import type { CMSBlock, EditorSelection } from '../core/types'

export const createSelection = (blockId: string | null, path: string[] = []): EditorSelection => ({
  blockId,
  path,
})

export const findSelectedBlock = (blocks: CMSBlock[], selection: EditorSelection): CMSBlock | null => {
  if (!selection.blockId) return null
  const stack = [...blocks]
  while (stack.length > 0) {
    const node = stack.shift()
    if (!node) continue
    if (node.id === selection.blockId) return node
    stack.push(...node.children)
  }
  return null
}
