import React from 'react'
import type { CMSDocument } from '../core/types'
import { UnifiedDocumentRenderer } from './UnifiedDocumentRenderer'

export const DocumentRenderer: React.FC<{ document: CMSDocument; mode?: 'preview' | 'publish' }> = ({
  document,
  mode = 'preview',
}) => (
  <UnifiedDocumentRenderer
    document={document}
    mode={mode}
    surface="editor"
    rowHeight={96}
    className="w-full"
    unknownBlockStrategy="placeholder"
  />
)
