import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ensureDefaultBlocksRegistered } from '../blocks/defaultDefinitions'
import { blockRegistry } from '../core/registry'
import type { CMSDocument } from '../core/types'
import { createInsertCommand, type EditorCommand } from '../commands/system'
import { CommandPalette } from '../commands/CommandPalette'
import { EditorCanvas } from './EditorCanvas'
import { InspectorPanel } from '../inspector/InspectorPanel'
import { createInitialEditorState, editorReducer } from './state'
import { findSelectedBlock } from './selection'
import { useAutosave } from './autosave'
import { validateDocument } from '../core/validation'
import { createMoveBlockAction } from './dragDrop'

ensureDefaultBlocksRegistered()

interface HybridCMSEditorRootProps {
  initialDocument?: CMSDocument | null
  onDocumentChange?: (document: CMSDocument) => void
}

export const HybridCMSEditorRoot: React.FC<HybridCMSEditorRootProps> = ({
  initialDocument,
  onDocumentChange,
}) => {
  const [state, dispatch] = useReducer(editorReducer, createInitialEditorState())
  const [search, setSearch] = useState('')
  const loadedInitialDocRef = useRef<string | null>(null)

  useEffect(() => {
    if (!initialDocument) return
    const loadKey = `${initialDocument.id}:${initialDocument.version}`
    if (loadedInitialDocRef.current === loadKey) return
    loadedInitialDocRef.current = loadKey
    dispatch({ type: 'LOAD_DOCUMENT', payload: initialDocument })
  }, [initialDocument?.id, initialDocument?.version])

  useEffect(() => {
    if (!onDocumentChange) return
    if (!state.dirty) return
    onDocumentChange(state.document)
  }, [state.document, state.dirty, onDocumentChange])

  useAutosave(state.document, {
    onSave: () => {
      dispatch({ type: 'MARK_SAVED', payload: { savedAt: Date.now() } })
    },
  })

  const selectedBlock = findSelectedBlock(state.document.blocks, state.selection)
  const validation = validateDocument(state.document)

  const commands = useMemo<EditorCommand[]>(() => {
    const defs = blockRegistry.listInsertable()
    return defs.map((def) => createInsertCommand(def.type, null, state.document.blocks.length))
  }, [state.document.blocks.length])

  const filteredCommands = useMemo(
    () => commands.filter((command) => command.title.toLowerCase().includes(search.toLowerCase())),
    [commands, search],
  )

  useEffect(() => {
    const handleDeleteShortcut = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Del') return
      if (!selectedBlock?.id) return

      const target = event.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase() || ''
      if (target?.isContentEditable || ['input', 'textarea', 'select'].includes(tagName)) {
        return
      }

      event.preventDefault()
      dispatch({ type: 'DELETE_BLOCK', payload: { blockId: selectedBlock.id } })
    }

    window.addEventListener('keydown', handleDeleteShortcut)
    return () => window.removeEventListener('keydown', handleDeleteShortcut)
  }, [selectedBlock?.id])

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <section className="xl:col-span-3 space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Document</h3>
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm font-semibold"
            value={state.document.title}
            onChange={(event) => dispatch({
              type: 'UPDATE_DOCUMENT_TITLE',
              payload: { title: event.target.value },
            })}
            aria-label="Document title"
          />
          <p className="text-[10px] text-gray-400">Version {state.document.version}</p>
          <p className={`text-[10px] ${validation.valid ? 'text-emerald-500' : 'text-red-500'}`}>
            {validation.valid ? 'Document valid' : `${validation.errors.length} validation issue(s)`}
          </p>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1 rounded-lg bg-gray-100 text-xs font-black" onClick={() => dispatch({ type: 'UNDO' })}>Undo</button>
            <button type="button" className="px-3 py-1 rounded-lg bg-gray-100 text-xs font-black" onClick={() => dispatch({ type: 'REDO' })}>Redo</button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Block Library</h3>
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm block: image, link, iframe..."
            aria-label="Search block"
          />
          <CommandPalette
            commands={filteredCommands}
            onRun={(command) => dispatch(command.execute())}
          />
        </div>

        <p className="text-xs text-gray-500 px-1">Chỉnh nhanh nội dung trực tiếp trên từng block. Click block để mở cấu hình chi tiết ở panel bên phải.</p>
      </section>

      <section className="xl:col-span-7 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Grid Canvas (12 cột)</h3>
          <p className="text-[11px] text-gray-500">Canvas chỉ preview, chọn block để chỉnh ở panel phải</p>
        </div>

        <EditorCanvas
          blocks={state.document.blocks}
          selectedBlockId={state.selection.blockId}
          onSelect={(blockId) => dispatch({ type: 'SET_SELECTION', payload: { blockId, path: [] } })}
          onUpdate={(blockId, updater) => dispatch({ type: 'UPDATE_BLOCK', payload: { blockId, updater } })}
          onMove={(blockId, targetParentId, targetIndex) => dispatch(createMoveBlockAction(blockId, targetParentId, targetIndex))}
        />
      </section>

      <section className="xl:col-span-2 space-y-3">
        <InspectorPanel
          selectedBlock={selectedBlock}
          onDelete={(blockId) => dispatch({ type: 'DELETE_BLOCK', payload: { blockId } })}
          onChange={(nextBlock) => {
            dispatch({
              type: 'UPDATE_BLOCK',
              payload: {
                blockId: nextBlock.id,
                updater: () => nextBlock,
              },
            })
          }}
        />
      </section>
    </div>
  )
}
