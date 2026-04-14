import type { CMSDocument } from './types'
import { DOC_VERSION } from './model'

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>

const migrations: Record<number, Migration> = {
  1: (doc) => doc,
}

export const migrateDocument = (input: Record<string, unknown>): CMSDocument => {
  const current = Number(input.version || 1)
  let doc = { ...input }

  for (let version = current; version <= DOC_VERSION; version += 1) {
    const migration = migrations[version]
    if (migration) {
      doc = migration(doc)
    }
  }

  doc.version = DOC_VERSION
  return doc as unknown as CMSDocument
}
