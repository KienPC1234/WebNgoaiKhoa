import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { ensureDefaultBlocksRegistered } from '../blocks/defaultDefinitions'
import { blockRegistry } from '../core/registry'
import type { CMSDocument } from '../core/types'
import { createInsertCommand, type EditorCommand } from '../commands/system'
import { CommandPalette } from '../commands/CommandPalette'
import { EditorCanvas } from './EditorCanvas'
import { DocumentRenderer } from '../renderer/DocumentRenderer'
import { createInitialEditorState, editorReducer } from './state'
import { findSelectedBlock } from './selection'
import { useAutosave } from './autosave'
import { validateDocument } from '../core/validation'
import { createMoveBlockAction } from './dragDrop'
import { EditorHelpDialog } from './EditorHelpDialog'
import { toastSuccess, toastError, confirmAction } from '@/lib/notify'

ensureDefaultBlocksRegistered()

interface HybridCMSEditorRootProps {
  initialDocument?: CMSDocument | null
  onDocumentChange?: (document: CMSDocument) => void
  /** When false, hides the document title input (use when the host page already exposes a title field) */
  showDocumentTitle?: boolean
  onAutosave?: (document: CMSDocument) => Promise<void> | void
}

export const HybridCMSEditorRoot: React.FC<HybridCMSEditorRootProps> = ({
  initialDocument,
  onDocumentChange,
  showDocumentTitle = true,
  onAutosave,
}) => {
  const [state, dispatch] = useReducer(editorReducer, createInitialEditorState())
  const [canvasMode, setCanvasMode] = useState<'edit' | 'preview'>('edit')
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [isAutosaving, setIsAutosaving] = useState(false)
  const loadedInitialDocRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
    enabled: !!state.dirty,
    onSave: async (doc) => {
      setIsAutosaving(true)
      try {
        if (typeof (onAutosave) === 'function') {
          await onAutosave(doc)
        }
      } catch (err) {
        // ignore autosave errors to avoid disturbing the editor UX
        console.debug('autosave error', err)
      } finally {
        dispatch({ type: 'MARK_SAVED', payload: { savedAt: Date.now() } })
        setIsAutosaving(false)
      }
    },
  })

  const selectedBlock = findSelectedBlock(state.document.blocks, state.selection)
  const validation = validateDocument(state.document)

  const commands = useMemo<EditorCommand[]>(() => {
    const defs = blockRegistry.listInsertable()
    return defs.map((def) => createInsertCommand(def.type, null, state.document.blocks.length, def.label))
  }, [state.document.blocks.length])

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

  const exportDocument = () => {
    try {
      const data = JSON.stringify(state.document, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeTitle = (state.document.title || 'document').replace(/[^a-z0-9_\-]/gi, '_')
      a.href = url
      a.download = `${safeTitle}-v${state.document.version}.hybridcms.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toastSuccess('Tệp CMS đã được xuất.')
    } catch (err) {
      console.error('Export error', err)
      toastError('Không thể xuất tài liệu.')
    }
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const doc = JSON.parse(text)
      const validationResult = validateDocument(doc)
      if (!validationResult.valid) {
        toastError('Tệp không hợp lệ: ' + (validationResult.errors || []).slice(0, 5).join('; '))
        return
      }

      if (state.dirty) {
        const ok = await confirmAction({
          title: 'Tài liệu chưa lưu',
          text: 'Nhập tài liệu mới sẽ ghi đè các thay đổi hiện tại. Bạn có muốn tiếp tục?',
          confirmButtonText: 'Tiếp tục',
          cancelButtonText: 'Hủy',
        })
        if (!ok) return
      }

      dispatch({ type: 'LOAD_DOCUMENT', payload: doc })
      toastSuccess('Đã nhập tài liệu CMS thành công.')
    } catch (err) {
      console.error('Import error', err)
      toastError('Không thể đọc tệp. Đảm bảo định dạng là JSON của CMS Editor.')
    }
  }

  const onImportClick = () => fileInputRef.current?.click()

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Không gian biên tập</h3>
            <p className="text-[11px] text-gray-500">
              Trình biên tập theo khối theo phong cách CMS hiện đại. Dùng bảng bên trái để chèn khối và chỉnh nội dung trực tiếp trên canvas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded-lg bg-blue-50 text-xs font-black uppercase tracking-widest text-fpt-blue hover:bg-blue-100"
              onClick={() => setShowHelpDialog(true)}
            >
              Trợ giúp
            </button>
              <button
                type="button"
                className="px-3 py-1 rounded-lg bg-green-50 text-xs font-black uppercase tracking-widest text-emerald-600 hover:bg-green-100"
                onClick={exportDocument}
              >
                Xuất
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-lg bg-amber-50 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100"
                onClick={onImportClick}
              >
                Nhập
              </button>
            
            <input ref={(el) => (fileInputRef.current = el)} type="file" accept="application/json" onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)} className="hidden" />
            {/* <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${validation.valid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {validation.valid ? 'Hợp lệ' : `${validation.errors.length} lỗi`}
            </span> */}
            <button type="button" className="px-3 py-1 rounded-lg bg-gray-100 text-xs font-black" onClick={() => dispatch({ type: 'UNDO' })}>Hoàn tác</button>
            <button type="button" className="px-3 py-1 rounded-lg bg-gray-100 text-xs font-black" onClick={() => dispatch({ type: 'REDO' })}>Làm lại</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <section className="xl:col-span-2 space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Tài liệu</h3>
          {showDocumentTitle && (
            <input
              className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm font-semibold"
              value={state.document.title}
              onChange={(event) => dispatch({
                type: 'UPDATE_DOCUMENT_TITLE',
                payload: { title: event.target.value },
              })}
              aria-label="Tiêu đề tài liệu"
            />
          )}
          <div className="text-[10px] text-gray-400">
            {isAutosaving ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-3 w-3 text-fpt-blue" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Đang lưu...
              </span>
            ) : state.lastSavedAt ? (
              <span>Đã lưu {new Date(state.lastSavedAt).toLocaleTimeString()}</span>
            ) : (
              <span>Chưa lưu</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Thư viện khối</h3>
          <CommandPalette
            commands={commands}
            onRun={(command) => dispatch(command.execute())}
          />
        </div>

        <p className="text-xs text-gray-500 px-1">Bấm vào khối để chọn, kéo thả để đổi vị trí, và dùng bảng bên phải để chỉnh chi tiết.</p>
      </section>

      <section className="xl:col-span-10 rounded-xl border border-gray-200 bg-white p-4 space-y-3 min-h-[82vh]">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-fpt-blue">Vùng nội dung (12 cột)</h3>
            <p className="text-[11px] text-gray-500">
              {canvasMode === 'edit'
                ? 'Bấm vào khối để chỉnh sửa trực tiếp ngay trên canvas.'
                : 'Chế độ xem trước dùng render phát hành để giống với giao diện người đọc sẽ thấy.'}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setCanvasMode('edit')}
              className={`rounded-md px-3 py-1 text-xs font-black uppercase tracking-widest transition ${
                canvasMode === 'edit' ? 'bg-white text-fpt-blue shadow-sm' : 'text-gray-500'
              }`}
              aria-pressed={canvasMode === 'edit'}
            >
              Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={() => setCanvasMode('preview')}
              className={`rounded-md px-3 py-1 text-xs font-black uppercase tracking-widest transition ${
                canvasMode === 'preview' ? 'bg-white text-fpt-blue shadow-sm' : 'text-gray-500'
              }`}
              aria-pressed={canvasMode === 'preview'}
            >
              Xem trước
            </button>
          </div>
        </div>

        {canvasMode === 'edit' ? (
          <EditorCanvas
            blocks={state.document.blocks}
            selectedBlockId={state.selection.blockId}
            onSelect={(blockId) => dispatch({ type: 'SET_SELECTION', payload: { blockId, path: [] } })}
            onUpdate={(blockId, updater) => dispatch({ type: 'UPDATE_BLOCK', payload: { blockId, updater } })}
            onMove={(blockId, targetParentId, targetIndex) => dispatch(createMoveBlockAction(blockId, targetParentId, targetIndex))}
          />
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            {state.document.blocks.length > 0 ? (
              <DocumentRenderer document={state.document} mode="publish" />
            ) : (
              <p className="text-sm text-gray-400">Chưa có khối để xem trước.</p>
            )}
          </div>
        )}
      </section>
      </div>

      <EditorHelpDialog open={showHelpDialog} onClose={() => setShowHelpDialog(false)} />
    </div>
  )
}
