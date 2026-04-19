import { useState } from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { cn } from '@/lib/utils'

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

const Base64UploadAdapterPlugin = (editor) => {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader) => new Base64UploadAdapter(loader)
}

export const RichTextEditor = ({
  label,
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  className,
  size = 'default',
  disabled = false,
}) => {
  const [hasCkError, setHasCkError] = useState(false)
  const sizeClass = size === 'compact' ? 'rich-editor-compact' : 'rich-editor-default'

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

  return (
    <div className={cn('rich-editor space-y-2', sizeClass, className)}>
      {label && (
        <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </label>
      )}
      <div className={cn('rounded-2xl border border-gray-100 bg-white p-2', disabled && 'opacity-70')}>
        <CKEditor
          editor={ClassicEditor}
          disabled={disabled}
          data={value || ''}
          config={{
            placeholder,
            extraPlugins: [Base64UploadAdapterPlugin],
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
              toolbar: ['imageTextAlternative', 'imageStyle:inline', 'imageStyle:block', 'imageStyle:side'],
            },
          }}
          onError={() => {
            setHasCkError(true)
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
