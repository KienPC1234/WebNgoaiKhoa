import type { CMSDocument } from './types'
import { validateDocumentSchema } from './schema'
import { migrateDocument } from './versioning'

export const serializeDocument = (doc: CMSDocument): string => JSON.stringify(doc)

export const deserializeDocument = (raw: string): CMSDocument => {
  const parsed = JSON.parse(raw)
  const migrated = migrateDocument(parsed)
  if (!validateDocumentSchema(migrated)) {
    throw new Error('Invalid CMS document payload')
  }
  return migrated
}
