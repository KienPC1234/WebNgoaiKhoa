import type { ReactNode } from 'react'

export type DocumentType = 'article'

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'list'
  | 'quote'
  | 'code'
  | 'image'
  | 'gallery'
  | 'video'
  | 'embed'
  | 'section'
  | 'columns'
  | 'grid'
  | 'spacer'
  | 'divider'
  | 'sidebar'
  | 'hero'
  | 'author-box'
  | 'toc'
  | 'related-posts'
  | 'callout'
  | 'badge'
  | 'pullquote'
  | 'highlight'
  | 'link'
  | 'document'
  | 'iframe'
  | 'table'

export interface CMSDocument {
  version: number
  id: string
  type: DocumentType
  title: string
  blocks: CMSBlock[]
  metadata: Record<string, unknown>
}

export interface CMSBlock {
  id: string
  type: BlockType
  props: Record<string, unknown>
  children: CMSBlock[]
}

export interface TableCell {
  id: string
  content: string
  rowSpan: number
  colSpan: number
  hidden?: boolean
  isHeader?: boolean
  style?: {
    align?: 'left' | 'center' | 'right'
    verticalAlign?: 'top' | 'middle' | 'bottom'
    bgColor?: string
    textColor?: string
  }
}

export interface TableModel {
  columns: number[]
  rows: TableCell[][]
  hasHeaderRow: boolean
  hasHeaderColumn: boolean
}

export interface BlockValidationResult {
  valid: boolean
  errors: string[]
}

export interface BlockDefinition {
  type: BlockType
  label: string
  category: 'text' | 'media' | 'layout' | 'article' | 'decor' | 'table'
  insertable?: boolean
  create: () => CMSBlock
  validate: (block: CMSBlock) => BlockValidationResult
  EditorComponent: (props: BlockEditorProps) => ReactNode
  RendererComponent: (props: BlockRendererProps) => ReactNode
}

export interface BlockEditorProps {
  block: CMSBlock
  selected: boolean
  onUpdate: (next: CMSBlock) => void
  onSelect: () => void
}

export interface BlockRendererProps {
  block: CMSBlock
  mode: 'preview' | 'publish'
}

export interface EditorSelection {
  blockId: string | null
  path: string[]
}

export interface EditorState {
  document: CMSDocument
  selection: EditorSelection
  history: {
    past: CMSDocument[]
    future: CMSDocument[]
  }
  dirty: boolean
  lastSavedAt: number | null
  lastDraftSavedAt: number | null
}

export type EditorAction =
  | { type: 'LOAD_DOCUMENT'; payload: CMSDocument }
  | { type: 'UPDATE_DOCUMENT_TITLE'; payload: { title: string } }
  | { type: 'SET_SELECTION'; payload: EditorSelection }
  | { type: 'INSERT_BLOCK'; payload: { parentId: string | null; index: number; block: CMSBlock } }
  | { type: 'UPDATE_BLOCK'; payload: { blockId: string; updater: (prev: CMSBlock) => CMSBlock } }
  | { type: 'DELETE_BLOCK'; payload: { blockId: string } }
  | { type: 'DUPLICATE_BLOCK'; payload: { blockId: string } }
  | { type: 'MOVE_BLOCK'; payload: { blockId: string; targetParentId: string | null; targetIndex: number } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED'; payload: { savedAt: number } }
  | { type: 'MARK_DRAFT_SAVED'; payload: { savedAt: number } }
