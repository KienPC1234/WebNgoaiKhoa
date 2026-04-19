import React from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { cn } from '@/lib/utils'

interface CmsParagraphRichTextEditorProps {
  label?: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
  className?: string
  size?: 'default' | 'compact'
  disabled?: boolean
}

class Base64UploadAdapter {
  private loader: any
  private reader: FileReader | null

  constructor(loader: any) {
    this.loader = loader
    this.reader = null
  }

  upload() {
    return this.loader.file.then(
      (file: File) =>
        new Promise<{ default: string }>((resolve, reject) => {
          this.reader = new FileReader()
          this.reader.onload = () => resolve({ default: String(this.reader?.result || '') })
          this.reader.onerror = () => reject(this.reader?.error || new Error('Không thể đọc tệp ảnh.'))
          this.reader.onabort = () => reject(new Error('Đã hủy tải ảnh lên.'))
          this.reader.readAsDataURL(file)
        }),
    )
  }

  abort() {
    if (this.reader) this.reader.abort()
  }
}

const attachUploadAdapter = (editor: any) => {
  const fileRepository = editor.plugins.get('FileRepository')
  fileRepository.createUploadAdapter = (loader: any) => new Base64UploadAdapter(loader)
}

export const CmsParagraphRichTextEditor: React.FC<CmsParagraphRichTextEditorProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  className,
  size = 'default',
  disabled = false,
}) => {
  const isMountedRef = React.useRef(true)

  React.useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const sizeClass = size === 'compact' ? 'rich-editor-compact' : 'rich-editor-default'

  const editorConfig = React.useMemo(
    () => ({
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
      table: {
        contentToolbar: [
          'tableColumn',
          'tableRow',
          'mergeTableCells',
          'tableProperties',
          'tableCellProperties',
        ],
      },
      image: {
        toolbar: [
          'imageTextAlternative',
          'imageStyle:inline',
          'imageStyle:block',
          'imageStyle:side',
          '|',
          'toggleImageCaption',
          'imageResize',
        ],
      },
      mediaEmbed: {
        previewsInData: true,
      },
    }),
    [placeholder],
  )

  return (
    <div className={cn('rich-editor space-y-2', sizeClass, className)}>
      {label ? <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label> : null}
      <div className={cn('rounded-2xl border border-gray-100 bg-white p-2', disabled && 'opacity-70')}>
        <CKEditor
          editor={ClassicEditor}
          disabled={disabled}
          data={value || ''}
          disableWatchdog
          config={editorConfig}
          onReady={(editor) => {
            if (!isMountedRef.current) return
            attachUploadAdapter(editor)
          }}
          onChange={(_, editor) => {
            if (!isMountedRef.current) return
            onChange(editor.getData())
          }}
        />
      </div>
    </div>
  )
}
