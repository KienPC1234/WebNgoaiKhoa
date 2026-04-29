import type { CMSBlock, CMSDocument } from '../core/types'
import { resolveSpan } from '../core/layout'

const DEFAULT_MAX_DEPTH = 12
const DEFAULT_MAX_BLOCKS = 500

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export interface RenderDiagnostic {
  code: string
  message: string
  path: string
}

interface NormalizeOptions {
  maxDepth?: number
  maxBlocks?: number
}

interface NormalizeState {
  maxDepth: number
  maxBlocks: number
  totalBlocks: number
  maxBlocksReached: boolean
  ids: Set<string>
  diagnostics: RenderDiagnostic[]
}

const createFallbackDocument = (): CMSDocument => ({
  version: 1,
  id: 'render-doc',
  type: 'article',
  title: 'Bài viết chưa có tiêu đề',
  blocks: [],
  metadata: {},
})

const withUniqueId = (rawId: string, ids: Set<string>) => {
  let candidate = rawId
  let suffix = 1

  while (ids.has(candidate)) {
    candidate = `${rawId}-${suffix}`
    suffix += 1
  }

  ids.add(candidate)
  return candidate
}

const normalizeBlock = (value: unknown, path: string, depth: number, state: NormalizeState): CMSBlock | null => {
  if (state.totalBlocks >= state.maxBlocks) {
    if (!state.maxBlocksReached) {
      state.maxBlocksReached = true
      state.diagnostics.push({
        code: 'max-blocks-reached',
        message: `Đã chạm giới hạn số khối render (${state.maxBlocks}). Các khối còn lại đã bị bỏ qua.`,
        path,
      })
    }
    return null
  }

  if (!isRecord(value)) {
    state.diagnostics.push({
      code: 'invalid-block',
      message: 'Khối phải là một object.',
      path,
    })
    return null
  }

  const rawType = typeof value.type === 'string' && value.type.trim().length > 0
    ? value.type.trim()
    : 'paragraph'

  if (typeof value.type !== 'string' || value.type.trim().length === 0) {
    state.diagnostics.push({
      code: 'missing-block-type',
      message: 'Thiếu loại khối; đã dùng fallback đoạn văn.',
      path,
    })
  }

  const suggestedId = typeof value.id === 'string' && value.id.trim().length > 0
    ? value.id.trim()
    : `render-block-${state.totalBlocks + 1}`

  const id = withUniqueId(suggestedId, state.ids)

  if (id !== suggestedId) {
    state.diagnostics.push({
      code: 'duplicate-block-id',
      message: `Mã khối trùng "${suggestedId}" đã được đổi thành "${id}" để đảm bảo render ổn định.`,
      path,
    })
  }

  const props = isRecord(value.props) ? { ...value.props } : {}
  if (!isRecord(value.props)) {
    state.diagnostics.push({
      code: 'invalid-block-props',
      message: 'Props của khối phải là object; đã dùng object rỗng thay thế.',
      path,
    })
  }

  // Use the same default fallback as the editor canvas (6 columns)
  // so blocks missing an explicit `colSpan` render consistently
  // between editor preview and the public renderer.
  const span = resolveSpan({ props }, { colSpan: 6, rowSpan: 1 })
  props.colSpan = span.colSpan
  props.rowSpan = span.rowSpan

  state.totalBlocks += 1

  const inputChildren = Array.isArray(value.children) ? value.children : []
  if (!Array.isArray(value.children)) {
    state.diagnostics.push({
      code: 'invalid-block-children',
      message: 'Children của khối phải là mảng; đã dùng mảng rỗng thay thế.',
      path,
    })
  }

  if (depth >= state.maxDepth) {
    if (inputChildren.length > 0) {
      state.diagnostics.push({
        code: 'max-depth-reached',
        message: `Lồng khối sâu hơn ${state.maxDepth} đã bị cắt bớt.`,
        path,
      })
    }

    return {
      id,
      type: rawType as CMSBlock['type'],
      props,
      children: [],
    }
  }

  const children = inputChildren
    .map((child, index) => normalizeBlock(child, `${path}.children[${index}]`, depth + 1, state))
    .filter(Boolean) as CMSBlock[]

  return {
    id,
    type: rawType as CMSBlock['type'],
    props,
    children,
  }
}

export const normalizeDocumentForRender = (
  value: CMSDocument | null | undefined,
  options: NormalizeOptions = {}
): { document: CMSDocument; diagnostics: RenderDiagnostic[] } => {
  const state: NormalizeState = {
    maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxBlocks: options.maxBlocks ?? DEFAULT_MAX_BLOCKS,
    totalBlocks: 0,
    maxBlocksReached: false,
    ids: new Set<string>(),
    diagnostics: [],
  }

  if (!isRecord(value)) {
    state.diagnostics.push({
      code: 'invalid-document',
      message: 'Dữ liệu tài liệu thiếu hoặc không hợp lệ. Đã render tài liệu rỗng.',
      path: 'document',
    })
    return { document: createFallbackDocument(), diagnostics: state.diagnostics }
  }

  const version = typeof value.version === 'number' && value.version > 0 ? value.version : 1
  const id = typeof value.id === 'string' && value.id.trim().length > 0 ? value.id.trim() : 'render-doc'
  const title = typeof value.title === 'string' && value.title.trim().length > 0 ? value.title : 'Bài viết chưa có tiêu đề'
  const metadata = isRecord(value.metadata) ? { ...value.metadata } : {}
  const blocksInput = Array.isArray(value.blocks) ? value.blocks : []

  const blocks = blocksInput
    .map((block, index) => normalizeBlock(block, `document.blocks[${index}]`, 0, state))
    .filter(Boolean) as CMSBlock[]

  return {
    document: {
      version,
      id,
      type: 'article',
      title,
      blocks,
      metadata,
    },
    diagnostics: state.diagnostics,
  }
}
