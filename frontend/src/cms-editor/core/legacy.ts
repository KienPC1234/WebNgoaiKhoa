import type { CMSBlock, CMSDocument } from './types'
import { createBlock, createDocument } from './model'
import { deserializeDocument } from './serialization'

const parseMaybeJson = (value: unknown) => {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const mapLegacyBlockType = (legacyType: string): CMSBlock['type'] => {
  if (legacyType === 'text') return 'paragraph'
  if (legacyType === 'image') return 'image'
  if (legacyType === 'gallery') return 'gallery'
  if (legacyType === 'quote') return 'quote'
  if (legacyType === 'table') return 'table'
  return 'paragraph'
}

const fromLegacyBlock = (legacyBlock: Record<string, unknown>): CMSBlock => {
  const blockType = mapLegacyBlockType(String(legacyBlock.type || 'text'))
  const title = String(legacyBlock.title || '')
  const body = String(legacyBlock.body || '')
  const imageUrl = String(legacyBlock.image_url || '')
  const imageSecondaryUrl = String(legacyBlock.image_secondary_url || '')

  const colSpan = Math.max(1, Math.min(toNumber(legacyBlock.col_span, 6), 12))
  const rowSpan = Math.max(1, Math.min(toNumber(legacyBlock.row_span, 1), 6))

  const baseProps: Record<string, unknown> = {
    colSpan,
    rowSpan,
  }

  if (blockType === 'quote') {
    baseProps.text = body || title
  } else if (blockType === 'image') {
    baseProps.src = imageUrl
    baseProps.text = title || body
  } else if (blockType === 'gallery') {
    baseProps.images = [imageUrl, imageSecondaryUrl].filter(Boolean)
    baseProps.text = title || body
  } else if (blockType === 'table') {
    baseProps.table = legacyBlock.table
    baseProps.text = title || 'Table'
  } else {
    baseProps.text = body || title
  }

  return createBlock(blockType, baseProps)
}

export const convertLegacyLayoutMetadataToDocument = (
  legacyMetadata: Record<string, unknown>,
  title = 'Untitled Article'
): CMSDocument => {
  const doc = createDocument(title)
  const blocks = Array.isArray(legacyMetadata.blocks) ? legacyMetadata.blocks : []

  doc.blocks = blocks
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((block) => fromLegacyBlock(block))

  doc.metadata = {
    ...doc.metadata,
    migratedFrom: 'legacy-layout-metadata',
    template: legacyMetadata.template || 'legacy',
  }

  return doc
}

export const normalizeLayoutMetadataToDocument = (
  layoutMetadata: unknown,
  title = 'Untitled Article'
): CMSDocument | null => {
  const parsed = parseMaybeJson(layoutMetadata)
  if (!parsed || typeof parsed !== 'object') return null

  try {
    return deserializeDocument(JSON.stringify(parsed))
  } catch {
    return convertLegacyLayoutMetadataToDocument(parsed as Record<string, unknown>, title)
  }
}

const collectText = (blocks: CMSBlock[], bucket: string[]) => {
  blocks.forEach((block) => {
    const text = typeof block.props.text === 'string' ? block.props.text.trim() : ''
    if (text) bucket.push(text)
    if (block.children.length > 0) {
      collectText(block.children, bucket)
    }
  })
}

export const deriveHtmlContentFromDocument = (document: CMSDocument): string => {
  const chunks: string[] = []
  collectText(document.blocks, chunks)
  if (chunks.length === 0) {
    return `<p>${document.title}</p>`
  }
  return chunks.slice(0, 12).map((text) => `<p>${text}</p>`).join('')
}
