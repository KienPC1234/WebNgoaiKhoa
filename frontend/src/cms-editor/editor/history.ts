import type { CMSDocument } from '../core/types'
import { cloneDocument } from '../core/model'

export const pushSnapshot = (history: CMSDocument[], current: CMSDocument) => {
  history.push(cloneDocument(current))
  if (history.length > 100) {
    history.shift()
  }
  return history
}

export const restoreSnapshot = (history: CMSDocument[]) => {
  const snapshot = history.pop()
  return snapshot || null
}
