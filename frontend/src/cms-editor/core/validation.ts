import type { CMSDocument, BlockValidationResult } from './types'
import { validateDocumentSchema } from './schema'
import { blockRegistry } from './registry'

export const validateDocument = (doc: CMSDocument): BlockValidationResult => {
  const errors: string[] = []

  if (!validateDocumentSchema(doc)) {
    errors.push('Document schema is invalid')
  }

  const walk = (blocks: CMSDocument['blocks']) => {
    blocks.forEach((block) => {
      const def = blockRegistry.get(block.type)
      if (!def) {
        errors.push(`Unknown block type: ${block.type}`)
      } else {
        const result = def.validate(block)
        if (!result.valid) {
          result.errors.forEach((e) => errors.push(`${block.id}: ${e}`))
        }
      }
      walk(block.children)
    })
  }

  walk(doc.blocks)

  return {
    valid: errors.length === 0,
    errors,
  }
}
