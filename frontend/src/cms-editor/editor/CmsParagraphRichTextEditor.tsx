import React from 'react'
import { CKEditor } from '@ckeditor/ckeditor5-react'
// Use the local custom built CKEditor (built with font plugins)
// Use wrapper that resolves the custom build export shape to the editor constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ClassicEditor from '@/libs/ckeditor-custom-wrapper'
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
          'fontFamily',
          'fontSize',
          '|',
          'fontColor',
          'fontBackgroundColor',
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
          'imageStyle:full',
          'imageStyle:side',
          '|',
          'imageTextAlternative',
        ],
      },
      fontFamily: {
        options: [
          'default',
          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
          'Roboto, Arial, Helvetica, sans-serif',
          'Poppins, Arial, Helvetica, sans-serif',
          'Montserrat, Arial, Helvetica, sans-serif',
          'Source Sans 3, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
          'Source Sans Pro, Arial, Helvetica, sans-serif',
          'Noto Sans, Arial, Helvetica, sans-serif',
          'Lora, Georgia, serif',
          'Merriweather, Georgia, serif',
          'Times New Roman, Times, serif',
          'Courier New, Courier, monospace',
          'Verdana, Geneva, sans-serif',
        ],
        supportAllValues: true,
      },
      fontSize: {
        options: ['10px','11px','12px','13px','14px','15px','16px','18px','20px','22px','24px','28px','32px','36px','48px'],
        supportAllValues: true,
      },
      fontColor: {
        columns: 5,
        colors: [
          { color: '#000000', label: 'Black' },
          { color: '#444444', label: 'Dark gray' },
          { color: '#666666', label: 'Gray' },
          { color: '#ffffff', label: 'White' },
          { color: '#f87171', label: 'Red' },
          { color: '#f59e0b', label: 'Orange' },
          { color: '#fbbf24', label: 'Yellow' },
          { color: '#34d399', label: 'Green' },
          { color: '#60a5fa', label: 'Blue' },
          { color: '#a78bfa', label: 'Purple' }
        ]
      },
      fontBackgroundColor: {
        columns: 5,
        colors: [
          { color: '#000000', label: 'Black' },
          { color: '#444444', label: 'Dark gray' },
          { color: '#666666', label: 'Gray' },
          { color: '#ffffff', label: 'White' },
          { color: '#f87171', label: 'Red' },
          { color: '#f59e0b', label: 'Orange' },
          { color: '#fbbf24', label: 'Yellow' },
          { color: '#34d399', label: 'Green' },
          { color: '#60a5fa', label: 'Blue' },
          { color: '#a78bfa', label: 'Purple' }
        ]
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
