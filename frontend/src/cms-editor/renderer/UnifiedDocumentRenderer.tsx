import React, { useEffect, useMemo } from 'react'
import { ensureDefaultBlocksRegistered } from '../blocks/defaultDefinitions'
import { blockRegistry } from '../core/registry'
import { computeGridPlacements, resolveSpan } from '../core/layout'
import type { CMSBlock, CMSDocument } from '../core/types'
import { normalizeDocumentForRender, type RenderDiagnostic } from './runtime'

ensureDefaultBlocksRegistered()

const DEFAULT_ROW_HEIGHT = 112

interface TocItem {
  id: string
  title: string
  children: TocItem[]
}

type UnknownBlockStrategy = 'placeholder' | 'skip'

interface UnifiedDocumentRendererProps {
  document: CMSDocument | null | undefined
  mode: 'preview' | 'publish'
  surface: 'editor' | 'public'
  rowHeight?: number
  className?: string
  unknownBlockStrategy?: UnknownBlockStrategy
  outerRenderContext?: Record<string, unknown>
  onDiagnostics?: (diagnostics: RenderDiagnostic[]) => void
}

const extractSectionTitle = (block: CMSBlock) => {
  const title = String(block.props.title || block.props.text || '').trim()
  return title || 'Mục'
}

const buildTocItems = (blocks: CMSBlock[]): TocItem[] => {
  return blocks.flatMap((block) => {
    if (block.type === 'section') {
      return [{ id: block.id, title: extractSectionTitle(block), children: buildTocItems(block.children) }]
    }

    if (block.children.length > 0) {
      return buildTocItems(block.children)
    }

    return []
  })
}

class BlockRenderBoundary extends React.Component<
  {
    blockId: string
    fallback: React.ReactNode
    children: React.ReactNode
  },
  { hasError: boolean }
> {
  constructor(props: { blockId: string; fallback: React.ReactNode; children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: { blockId: string }) {
    if (prevProps.blockId !== this.props.blockId && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch() {
    // Intentionally swallow renderer failures per block to keep document rendering stable.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

const UnknownBlockFallback: React.FC<{ type: string; mode: 'preview' | 'publish' }> = ({ type, mode }) => {
  if (mode === 'publish') return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
      Loại khối không xác định: <strong>{type}</strong>
    </div>
  )
}

const RendererErrorFallback: React.FC<{ type: string; mode: 'preview' | 'publish' }> = ({ type, mode }) => (
  <div
    className={`rounded-lg border px-3 py-2 text-xs ${
      mode === 'publish'
        ? 'border-gray-200 bg-gray-50 text-gray-500'
        : 'border-red-200 bg-red-50 text-red-700'
    }`}
  >
    Khối <strong>{type}</strong> không thể render.
  </div>
)

const BlockBody: React.FC<{
  block: CMSBlock
  mode: 'preview' | 'publish'
  unknownBlockStrategy: UnknownBlockStrategy
  tocItems: TocItem[]
  outerRenderContext?: Record<string, unknown>
}> = ({ block, mode, unknownBlockStrategy, tocItems, outerRenderContext }) => {
  const definition = blockRegistry.get(block.type)

  if (!definition) {
    return unknownBlockStrategy === 'skip' ? null : <UnknownBlockFallback type={block.type} mode={mode} />
  }

  const Renderer = definition.RendererComponent as unknown as React.ComponentType<{
    block: CMSBlock
    mode: 'preview' | 'publish'
    renderContext?: {
      tocItems: TocItem[]
    }
  }>

  return (
    <BlockRenderBoundary
      blockId={block.id}
      fallback={<RendererErrorFallback type={block.type} mode={mode} />}
    >
      <Renderer block={block} mode={mode} renderContext={{ tocItems, ...(outerRenderContext || {}) }} />
    </BlockRenderBoundary>
  )
}

const BlockTree: React.FC<{
  blocks: CMSBlock[]
  mode: 'preview' | 'publish'
  rowHeight: number
  unknownBlockStrategy: UnknownBlockStrategy
  tocItems: TocItem[]
  outerRenderContext?: Record<string, unknown>
  childContainerClassName?: string
}> = ({ blocks, mode, rowHeight, unknownBlockStrategy, tocItems, outerRenderContext, childContainerClassName = '' }) => {
  const placements = useMemo(() => computeGridPlacements(blocks), [blocks])

  return (
    <div
      className={`grid grid-cols-12 gap-3 ${childContainerClassName}`.trim()}
      style={{ gridAutoRows: `minmax(${rowHeight}px, auto)` }}
      aria-label="Cây khối CMS"
    >
      {blocks.map((block) => {
        const placement = placements[block.id]
        const span = resolveSpan(block)
        const colSpan = placement?.colSpan ?? span.colSpan
        const rowSpan = placement?.rowSpan ?? span.rowSpan
        const colStart = placement?.colStart
        const rowStart = placement?.rowStart

        const wrapperStyle: React.CSSProperties = {
          gridColumn: `${colStart ?? 'auto'} / span ${colSpan}`,
          gridRow: `${rowStart ?? 'auto'} / span ${rowSpan}`,
        }
        if (rowSpan > 1) {
          wrapperStyle.minHeight = `${rowSpan * rowHeight}px`
        }

        return (
          <div
            key={block.id}
            className="min-w-0"
            style={wrapperStyle}
          >
            <BlockBody
              block={block}
              mode={mode}
              unknownBlockStrategy={unknownBlockStrategy}
              tocItems={tocItems}
              outerRenderContext={outerRenderContext}
            />

            {block.children.length > 0 && (
              <BlockTree
                  blocks={block.children}
                  mode={mode}
                  rowHeight={rowHeight}
                  unknownBlockStrategy={unknownBlockStrategy}
                  tocItems={tocItems}
                  outerRenderContext={outerRenderContext}
                  childContainerClassName="border-l border-gray-100 pl-4"
                />
            )}
          </div>
        )
      })}
    </div>
  )
}

export const UnifiedDocumentRenderer: React.FC<UnifiedDocumentRendererProps> = ({
  document,
  mode,
  surface: _surface,
  rowHeight = DEFAULT_ROW_HEIGHT,
  className = '',
  unknownBlockStrategy = 'placeholder',
  onDiagnostics,
}) => {
  const normalized = useMemo(() => normalizeDocumentForRender(document), [document])
  const tocItems = useMemo(() => buildTocItems(normalized.document.blocks), [normalized.document.blocks])

  useEffect(() => {
    if (!onDiagnostics) return
    onDiagnostics(normalized.diagnostics)
  }, [normalized.diagnostics, onDiagnostics])

  if (normalized.document.blocks.length === 0) {
    return null
  }

  return (
    <article className={className} aria-label="Trình render tài liệu CMS">
      <BlockTree
        blocks={normalized.document.blocks}
        mode={mode}
        rowHeight={rowHeight}
        unknownBlockStrategy={unknownBlockStrategy}
        tocItems={tocItems}
      />
    </article>
  )
}
