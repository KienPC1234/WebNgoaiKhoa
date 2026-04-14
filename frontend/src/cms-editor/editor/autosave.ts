import { useEffect, useRef } from 'react'
import type { CMSDocument } from '../core/types'

interface UseAutosaveOptions {
  enabled?: boolean
  delayMs?: number
  storageKey?: string
  onSave?: (doc: CMSDocument) => Promise<void> | void
}

export const useAutosave = (document: CMSDocument, options: UseAutosaveOptions = {}) => {
  const { enabled = true, delayMs = 1200, storageKey = 'cms-editor-autosave', onSave } = options
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return

    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(async () => {
      const payload = JSON.stringify(document)
      localStorage.setItem(storageKey, payload)
      if (onSave) {
        await onSave(document)
      }
    }, delayMs)

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [document, enabled, delayMs, storageKey, onSave])
}
