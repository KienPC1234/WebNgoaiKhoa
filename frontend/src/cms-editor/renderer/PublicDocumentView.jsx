import { ensureDefaultBlocksRegistered } from '../blocks/defaultDefinitions'
import { UnifiedDocumentRenderer } from './UnifiedDocumentRenderer'

ensureDefaultBlocksRegistered()

export const PublicDocumentView = ({ document, context }) => {
  if (!document || !Array.isArray(document.blocks) || document.blocks.length === 0) {
    return null
  }

  return (
    <UnifiedDocumentRenderer
      document={document}
      mode="publish"
      surface="public"
      rowHeight={120}
      className="w-full"
      unknownBlockStrategy="skip"
      outerRenderContext={context}
    />
  )
}
