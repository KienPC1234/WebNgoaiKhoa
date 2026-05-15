const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const normalizeShortDescription = (value) => stripHtml(value)

export const extractPublicationShortDescription = (publication) => {
  if (!publication || typeof publication !== 'object') return ''
  const metadata = publication.layout_metadata
  if (!metadata || typeof metadata !== 'object') return ''

  const fromDocumentMetadata = normalizeShortDescription(metadata?.metadata?.short_description)
  if (fromDocumentMetadata) return fromDocumentMetadata

  const fromRootMetadata = normalizeShortDescription(metadata?.short_description)
  if (fromRootMetadata) return fromRootMetadata

  return ''
}

export const getPublicationCardDescription = (publication, maxChars = 180) => {
  const explicit = extractPublicationShortDescription(publication)
  const fallback = normalizeShortDescription(publication?.snippet || publication?.content || '')
  const text = explicit || fallback
  if (!text) return ''
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trimEnd()}...`
}