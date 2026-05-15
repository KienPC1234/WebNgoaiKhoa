import { useState, useRef, useEffect } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
// Use local custom CKEditor build that includes font plugins
import ClassicEditor from '@/libs/ckeditor-custom-wrapper'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/apiClient'

const deriveUsername = (user) => {
  const email = String(user?.email || '').trim()
  if (email.includes('@')) {
    const local = email.split('@')[0].trim()
    if (local) return local
  }
  const name = String(user?.full_name || '').trim()
  if (name) return name.replace(/\s+/g, '').toLowerCase()
  return `user${user?.id || ''}`
}

class Base64UploadAdapter {
  constructor(loader) {
    this.loader = loader
    this.reader = null
  }

  upload() {
    return this.loader.file.then((file) => new Promise((resolve, reject) => {
      this.reader = new FileReader()
      this.reader.onload = () => resolve({ default: this.reader.result })
      this.reader.onerror = () => reject(this.reader.error || new Error('Khong the doc file anh.'))
      this.reader.onabort = () => reject(new Error('Da huy upload anh.'))
      this.reader.readAsDataURL(file)
    }))
  }

  abort() {
    if (this.reader) this.reader.abort()
  }
}

const attachBase64UploadAdapter = (editor) => {
  try {
    const fileRepo = editor && editor.plugins && typeof editor.plugins.get === 'function' ? editor.plugins.get('FileRepository') : null
    if (!fileRepo) return
    fileRepo.createUploadAdapter = (loader) => new Base64UploadAdapter(loader)
  } catch (err) {
    if (typeof console !== 'undefined' && console.warn) console.warn('attachBase64UploadAdapter disabled:', err)
  }
}

export const RichTextEditor = ({
  label,
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  className,
  size = 'default',
  disabled = false,
  enableMentions = false,
  autoFocus = false,
}) => {
  const [hasCkError, setHasCkError] = useState(false)
  const sizeClass = size === 'compact' ? 'rich-editor-compact' : 'rich-editor-default'
  const editorRef = useRef(null)

  // Focus when autoFocus prop toggles after initial mount
  useEffect(() => {
    if (editorRef.current && autoFocus) {
      try {
        editorRef.current.editing.view.focus()
      } catch (err) {
        // ignore
      }
    }
  }, [autoFocus])

  if (hasCkError) {
    return (
      <div className={cn('rich-editor space-y-2', sizeClass, className)}>
        {label && (
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {label}
          </label>
        )}
        <div className={cn('rounded-2xl border border-gray-100 bg-white p-2', disabled && 'opacity-70')}>
          <textarea
            value={value || ''}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => onChange?.(event.target.value)}
            rows={size === 'compact' ? 6 : 10}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-slate-400"
          />
        </div>
      </div>
    )
  }
  // Ensure editor build resolved correctly before attempting to render the React wrapper.
  const EditorImpl = ClassicEditor && (typeof ClassicEditor === 'function' || typeof ClassicEditor.create === 'function') ? ClassicEditor : null

  if (!EditorImpl) {
    // If the editor bundle isn't available, render simple textarea fallback.
    return (
      <div className={cn('rich-editor space-y-2', sizeClass, className)}>
        {label && (
          <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {label}
          </label>
        )}
        <div className={cn('rounded-2xl border border-gray-100 bg-white p-2', disabled && 'opacity-70')}>
          <textarea
            value={value || ''}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => onChange?.(event.target.value)}
            rows={size === 'compact' ? 6 : 10}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:border-slate-400"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rich-editor space-y-2', sizeClass, className)}>
      {label && (
        <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </label>
      )}
      <div className={cn('rounded-2xl border border-gray-100 bg-white p-2', disabled && 'opacity-70')}>
        <CKEditor
          editor={EditorImpl}
          disabled={disabled}
          data={value || ''}
          config={{
            placeholder,
            toolbar: {
              items: [
                'heading',
                '|',
                'bold',
                'italic',
                'link',
                'bulletedList',
                'numberedList',
                '|',
                'imageUpload',
                'blockQuote',
                'insertTable',
                '|',
                'undo',
                'redo',
              ],
            },
            image: {
              toolbar: ['imageStyle:full', 'imageStyle:side', '|', 'imageTextAlternative'],
            },
            mention: enableMentions
              ? {
                  feeds: [
                    {
                      marker: '@',
                      feed: async (query) => {
                        try {
                          const q = (query || '').trim()
                          const resp = await apiClient.get(`/public/users/mentions?q=${encodeURIComponent(q)}`)
                          // Return CKEditor mention items with stable string ids.
                          // We encode the numeric id in `@u:<id>:<username>` so backend can
                          // reliably parse mentions and send notifications.
                          return (resp.data || []).map((item) => {
                            const user = item?.user || {}
                            const username = deriveUsername(user)
                            return {
                              id: `@u:${user.id}:${username}`,
                              text: `@${username}`,
                              name: user.full_name || user.email || username,
                            }
                          })
                        } catch (err) {
                          return []
                        }
                      },
                      minimumCharacters: 1,
                    },
                  ],
                }
              : undefined,
          }}
          onReady={(editor) => {
            // Attach the Base64 upload adapter at runtime when the editor is ready.
            attachBase64UploadAdapter(editor)
            editorRef.current = editor
            if (autoFocus) {
              setTimeout(() => {
                try {
                  editor.editing.view.focus()
                } catch (err) {
                  // ignore focus errors
                }
              }, 0)
            }
          }}
          onError={(_, details) => {
            // CKEditor may emit recoverable runtime errors and restart itself.
            // Only fall back to textarea when initialization truly fails.
            if (details?.phase === 'initialization' && !details?.willEditorRestart) {
              setHasCkError(true)
            }
          }}
          onChange={(_, editor) => {
            const data = editor.getData()
            onChange?.(data)
          }}
        />
      </div>
    </div>
  )
}

 
