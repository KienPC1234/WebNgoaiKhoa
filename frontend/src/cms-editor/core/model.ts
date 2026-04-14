import type { CMSBlock, CMSDocument } from './types'

export const DOC_VERSION = 1

export const createId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const createDocument = (title = 'Untitled Article'): CMSDocument => ({
  version: DOC_VERSION,
  id: createId('doc'),
  type: 'article',
  title,
  blocks: [],
  metadata: {
    locale: 'vi-VN',
    status: 'draft',
  },
})

export const createBlock = (type: CMSBlock['type'], props: Record<string, unknown> = {}, children: CMSBlock[] = []): CMSBlock => ({
  id: createId('block'),
  type,
  props,
  children,
})

export const cloneDocument = (doc: CMSDocument): CMSDocument => JSON.parse(JSON.stringify(doc))
