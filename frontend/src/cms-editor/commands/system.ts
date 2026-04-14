import type { BlockType, EditorAction } from '../core/types'
import { createBlock } from '../core/model'

export interface EditorCommand {
  id: string
  title: string
  keywords: string[]
  execute: () => EditorAction
}

export const createInsertCommand = (type: BlockType, parentId: string | null, index: number): EditorCommand => ({
  id: `insert-${type}`,
  title: `Insert ${type}`,
  keywords: ['insert', type],
  execute: () => ({
    type: 'INSERT_BLOCK',
    payload: {
      parentId,
      index,
      block: createBlock(type),
    },
  }),
})

export const queryCommands = (commands: EditorCommand[], query: string) => {
  const keyword = query.trim().toLowerCase()
  if (!keyword) return commands
  return commands.filter((cmd) => [cmd.title, ...cmd.keywords].join(' ').toLowerCase().includes(keyword))
}
