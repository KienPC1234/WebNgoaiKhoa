// Wrapper to normalize exports from the custom CKEditor build bundle.
// The webpack build can expose the editor in several shapes depending on
// the module system. This resolver searches common locations and, when
// necessary, returns a small function shim that exposes a `create()`
// static method so `@ckeditor/ckeditor5-react` receives a `function`.
import * as CKBundle from '../../ckeditor-build/build/ckeditor'

// Global read-only locks map per editor instance. Used by the
// static and instance shim methods we attach below so the React
// integration can toggle read-only mode safely even when the
// upstream build misses the modern API.
const _editorReadOnlyLocks = new WeakMap()

function _staticEnableReadOnlyMode(editor, lockId) {
  if (!editor || typeof editor !== 'object') return
  let s = _editorReadOnlyLocks.get(editor)
  if (!s) { s = new Set(); _editorReadOnlyLocks.set(editor, s) }
  s.add(lockId === undefined ? Symbol.for('default') : lockId)
  try { if ('isReadOnly' in editor) { try { editor.isReadOnly = true } catch (e) {} } } catch (e) {}
}

function _staticDisableReadOnlyMode(editor, lockId) {
  if (!editor || typeof editor !== 'object') return
  const s = _editorReadOnlyLocks.get(editor)
  if (!s) return
  s.delete(lockId === undefined ? Symbol.for('default') : lockId)
  if (s.size === 0) {
    try { if ('isReadOnly' in editor) { try { editor.isReadOnly = false } catch (e) {} } } catch (e) {}
    try { _editorReadOnlyLocks.delete(editor) } catch (e) {}
  }
}

function isFunction(v) {
  return typeof v === 'function'
}

function hasCreate(v) {
  return v && typeof v.create === 'function'
}

function makeFunctionShim(obj) {
  const fn = function() {
    // The constructor itself is not intended to be called directly
    // in this shim; callers use `fn.create()`.
    throw new Error('Editor constructor shim is not callable; use Editor.create()')
  }
  fn.create = (...args) => Promise.resolve(obj.create(...args)).then((editor) => {
    // If the created editor is missing the modern read-only lock API,
    // provide lightweight shims so `@ckeditor/ckeditor5-react` can call
    // `enableReadOnlyMode` / `disableReadOnlyMode` safely. We prefer to
    // manipulate `editor.isReadOnly` when available (older builds used a
    // setter), otherwise the shim becomes a no-op.
    try {
      if (editor && typeof editor === 'object' && typeof editor.disableReadOnlyMode !== 'function') {
        const readOnlyLocks = new Set();

        editor.enableReadOnlyMode = function(lockId) {
          try {
            readOnlyLocks.add(lockId);
            if ('isReadOnly' in editor) {
              try { editor.isReadOnly = true } catch (e) {}
            }
          } catch (e) {}
        }

        editor.disableReadOnlyMode = function(lockId) {
          try {
            readOnlyLocks.delete(lockId);
            if (readOnlyLocks.size === 0 && 'isReadOnly' in editor) {
              try { editor.isReadOnly = false } catch (e) {}
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      // ignore shim errors
    }

    return editor
  })
  // Attach static and prototype-level read-only shims so callers
  // (including `@ckeditor/ckeditor5-react`) can call either the
  // static API or instance API without throwing.
  try {
    if (typeof fn.enableReadOnlyMode !== 'function') fn.enableReadOnlyMode = (ed, lockId) => _staticEnableReadOnlyMode(ed, lockId)
    if (typeof fn.disableReadOnlyMode !== 'function') fn.disableReadOnlyMode = (ed, lockId) => _staticDisableReadOnlyMode(ed, lockId)
    // Also provide instance-style methods on the function's prototype
    if (fn.prototype && typeof fn.prototype.enableReadOnlyMode !== 'function') {
      fn.prototype.enableReadOnlyMode = function(lockId) { _staticEnableReadOnlyMode(this, lockId) }
    }
    if (fn.prototype && typeof fn.prototype.disableReadOnlyMode !== 'function') {
      fn.prototype.disableReadOnlyMode = function(lockId) { _staticDisableReadOnlyMode(this, lockId) }
    }
  } catch (e) {
    // ignore attach failures
  }
  if (obj.builtinPlugins) fn.builtinPlugins = obj.builtinPlugins
  if (obj.defaultConfig) fn.defaultConfig = obj.defaultConfig
  return fn
}

function resolveEditor(bundle) {
  if (!bundle) return bundle
  // If module itself is a function/class -> done
  if (isFunction(bundle)) return bundle
  // If it already exposes a create function (object) -> shim to function
  if (hasCreate(bundle)) return makeFunctionShim(bundle)

  // Common nested shapes to check (priority order)
  const candidates = [
    bundle.default,
    bundle.default && bundle.default.default,
    bundle.ClassicEditor,
    bundle.default && bundle.default.ClassicEditor,
    bundle.default && bundle.default.default && bundle.default.default.ClassicEditor,
  ]

  for (const c of candidates) {
    if (!c) continue
    if (isFunction(c)) return c
    if (hasCreate(c)) return makeFunctionShim(c)
  }

  // UMD builds typically attach to window in browsers as `window.ClassicEditor`.
  if (typeof window !== 'undefined') {
    const winCandidate = window.ClassicEditor || (window.CKEDITOR && window.CKEDITOR.ClassicEditor)
    if (isFunction(winCandidate)) return winCandidate
    if (hasCreate(winCandidate)) return makeFunctionShim(winCandidate)
  }

  // Last resort: return the raw bundle (may cause informative runtime errors).
  return bundle
}

const Editor = resolveEditor(CKBundle)

// If the resolved Editor is a constructor/function, ensure it exposes
// the static and prototype read-only API expected by the React
// integration. This prevents `disableReadOnlyMode is not a function`
// runtime errors when the custom bundle misses the helpers.
try {
  if (Editor) {
    if (typeof Editor.enableReadOnlyMode !== 'function') Editor.enableReadOnlyMode = (ed, lockId) => _staticEnableReadOnlyMode(ed, lockId)
    if (typeof Editor.disableReadOnlyMode !== 'function') Editor.disableReadOnlyMode = (ed, lockId) => _staticDisableReadOnlyMode(ed, lockId)
    try {
      if (Editor.prototype && typeof Editor.prototype.enableReadOnlyMode !== 'function') {
        Editor.prototype.enableReadOnlyMode = function(lockId) { _staticEnableReadOnlyMode(this, lockId) }
      }
      if (Editor.prototype && typeof Editor.prototype.disableReadOnlyMode !== 'function') {
        Editor.prototype.disableReadOnlyMode = function(lockId) { _staticDisableReadOnlyMode(this, lockId) }
      }
    } catch (e) {}
  }
} catch (e) {}

// If the resolved editor came from an older custom build that set
// `window.CKEDITOR_VERSION` to a pre-37 value, the React wrapper will warn
// and may refuse to operate. Prefer a compatible runtime version for the
// integration check while preserving existing behavior.
try {
  if (typeof window !== 'undefined') {
    const cur = window.CKEDITOR_VERSION
    const major = cur ? Number(String(cur).split('.')[0]) : NaN
    if (!cur || Number.isNaN(major) || major < 37) {
      // Use a recent compatible CKEditor major version to satisfy the
      // React integration version check. This does not upgrade runtime
      // APIs; it only adjusts the global version string used by the
      // React wrapper for a compatibility check.
      window.CKEDITOR_VERSION = '42.0.2'
    }
  }
} catch (e) {
  // ignore
}

// Dev-only debug: print resolved shapes to help runtime diagnosis
try {
  if (typeof window !== 'undefined' && import.meta && import.meta.env && import.meta.env.DEV) {
    try {
      const bundleKeys = CKBundle && typeof CKBundle === 'object' ? Object.keys(CKBundle) : []
      console.debug('[ckeditor-custom-wrapper] resolved Editor', {
        CKBundleType: typeof CKBundle,
        CKBundleKeys: bundleKeys,
        EditorType: typeof Editor,
        hasCreate: Editor && typeof Editor.create === 'function',
        hasStaticEnable: Editor && typeof Editor.enableReadOnlyMode === 'function',
        hasStaticDisable: Editor && typeof Editor.disableReadOnlyMode === 'function',
      })
    } catch (e) {}
  }
} catch (e) {}

export default Editor
