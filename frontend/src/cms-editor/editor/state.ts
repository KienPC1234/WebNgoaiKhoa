import type { EditorAction, EditorState, CMSBlock, CMSDocument } from '../core/types'
import { cloneDocument, createDocument } from '../core/model'
import { isBlockInSubtree } from './dragDrop'

const pushHistory = (state: EditorState) => {
  state.history.past.push(cloneDocument(state.document))
  if (state.history.past.length > 100) {
    state.history.past.shift()
  }
  state.history.future = []
}

const walkBlocks = (blocks: CMSBlock[], callback: (block: CMSBlock, parent: CMSBlock[] | null, index: number) => CMSBlock[] | void): CMSBlock[] => {
  const next = [...blocks]
  let i = 0
  while (i < next.length) {
    const current = next[i]
    if (!current) {
      i += 1
      continue
    }

    const result = callback(current, next, i)
    if (result) return result

    // Callback may remove or replace the current index (e.g. delete action).
    // Re-check index existence before recursive descent to avoid undefined access.
    const after = next[i]
    if (!after) {
      continue
    }

    next[i] = { ...after, children: walkBlocks(after.children, callback) }
    i += 1
  }
  return next
}

type FoundBlock = { block: CMSBlock; parent: CMSBlock[]; index: number } | null

const findBlock = (doc: CMSDocument, blockId: string): FoundBlock => {
  const stack: Array<{ blocks: CMSBlock[] }> = [{ blocks: doc.blocks }]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue

    for (let i = 0; i < current.blocks.length; i += 1) {
      const block = current.blocks[i]
      if (block.id === blockId) {
        return { block, parent: current.blocks, index: i }
      }
      if (block.children.length > 0) {
        stack.push({ blocks: block.children })
      }
    }
  }

  return null
}

export const createInitialEditorState = (): EditorState => ({
  document: createDocument(),
  selection: { blockId: null, path: [] },
  history: { past: [], future: [] },
  dirty: false,
  lastSavedAt: null,
  lastDraftSavedAt: null,
})

export const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  const next = structuredClone(state) as EditorState

  switch (action.type) {
    case 'LOAD_DOCUMENT':
      next.document = action.payload
      next.history = { past: [], future: [] }
      next.dirty = false
      return next

    case 'UPDATE_DOCUMENT_TITLE':
      next.document = {
        ...next.document,
        title: action.payload.title,
      }
      next.dirty = true
      return next

    case 'SET_SELECTION':
      next.selection = action.payload
      return next

    case 'INSERT_BLOCK': {
      pushHistory(next)
      const { parentId, index, block } = action.payload
      if (!parentId) {
        next.document.blocks.splice(index, 0, block)
      } else {
        next.document.blocks = walkBlocks(next.document.blocks, (item) => {
          if (item.id !== parentId) return
          item.children.splice(index, 0, block)
        })
      }
      next.dirty = true
      return next
    }

    case 'UPDATE_BLOCK': {
      pushHistory(next)
      next.document.blocks = walkBlocks(next.document.blocks, (item, parent, index) => {
        if (item.id !== action.payload.blockId || !parent) return
        parent[index] = action.payload.updater(item)
      })
      next.dirty = true
      return next
    }

    case 'DELETE_BLOCK': {
      pushHistory(next)
      next.document.blocks = walkBlocks(next.document.blocks, (item, parent, index) => {
        if (item.id !== action.payload.blockId || !parent) return
        parent.splice(index, 1)
      })
      if (next.selection.blockId === action.payload.blockId) {
        next.selection = { blockId: null, path: [] }
      }
      next.dirty = true
      return next
    }

    case 'DUPLICATE_BLOCK': {
      pushHistory(next)
      const found = findBlock(next.document, action.payload.blockId)
      if (found) {
        const copy = cloneDocument({
          version: 1,
          id: 'tmp',
          type: 'article',
          title: 'tmp',
          metadata: {},
          blocks: [found.block],
        }).blocks[0]
        copy.id = `${copy.id}-copy`
        found.parent.splice(found.index + 1, 0, copy)
      }
      next.dirty = true
      return next
    }

    case 'MOVE_BLOCK': {
      pushHistory(next)
      const { blockId, targetParentId, targetIndex } = action.payload
      const source = findBlock(next.document, blockId)
      if (!source) return state

      if (targetParentId && isBlockInSubtree(source.block, targetParentId)) {
        return state
      }

      const targetParent = targetParentId ? findBlock(next.document, targetParentId) : null
      if (targetParentId && !targetParent) return state

      const targetChildren = targetParent ? targetParent.block.children : next.document.blocks
      const [block] = source.parent.splice(source.index, 1)

      let insertIndex = Math.max(0, Math.min(targetIndex, targetChildren.length))
      if (source.parent === targetChildren && source.index < insertIndex) {
        insertIndex -= 1
      }

      targetChildren.splice(insertIndex, 0, block)
      next.dirty = true
      return next
    }

    case 'UNDO': {
      const previous = next.history.past.pop()
      if (!previous) return state
      next.history.future.unshift(cloneDocument(next.document))
      next.document = previous
      next.dirty = true
      return next
    }

    case 'REDO': {
      const future = next.history.future.shift()
      if (!future) return state
      next.history.past.push(cloneDocument(next.document))
      next.document = future
      next.dirty = true
      return next
    }

    case 'MARK_SAVED':
      next.dirty = false
      next.lastSavedAt = action.payload.savedAt
      next.lastDraftSavedAt = action.payload.savedAt
      return next

    case 'MARK_DRAFT_SAVED':
      next.lastDraftSavedAt = action.payload.savedAt
      // keep next.dirty = true — draft save does not clear unsaved/permanent state
      return next

    default:
      return state
  }
}
