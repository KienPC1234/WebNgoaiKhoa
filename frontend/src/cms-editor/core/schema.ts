import type { CMSBlock, CMSDocument } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const validateBlockSchema = (value: unknown): value is CMSBlock => {
  if (!isRecord(value)) return false
  if (typeof value.id !== 'string' || value.id.length === 0) return false
  if (typeof value.type !== 'string' || value.type.length === 0) return false
  if (!isRecord(value.props)) return false
  if (!Array.isArray(value.children)) return false
  return value.children.every((child) => validateBlockSchema(child))
}

export const validateDocumentSchema = (value: unknown): value is CMSDocument => {
  if (!isRecord(value)) return false
  if (typeof value.version !== 'number' || value.version <= 0) return false
  if (typeof value.id !== 'string' || value.id.length === 0) return false
  if (value.type !== 'article') return false
  if (typeof value.title !== 'string' || value.title.length === 0) return false
  if (!Array.isArray(value.blocks) || !value.blocks.every((block) => validateBlockSchema(block))) return false
  if (!isRecord(value.metadata)) return false
  return true
}
