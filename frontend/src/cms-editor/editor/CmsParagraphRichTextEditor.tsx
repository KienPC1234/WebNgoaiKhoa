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
          'underline',
          'strikethrough',
          'code',
          'subscript',
          'superscript',
          'removeFormat',
          '|',
          'alignment',
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
          'Aptos, Calibri, "Segoe UI", Arial, sans-serif',
          'Aptos Display, Aptos, "Segoe UI", Arial, sans-serif',
          'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif',
          'Arial, "Helvetica Neue", Helvetica, sans-serif',
          'Arial Black, Gadget, sans-serif',
          'Bahnschrift, "Segoe UI", Arial, sans-serif',
          'Cambria, Georgia, serif',
          'Cambria Math, Cambria, "Times New Roman", serif',
          'Candara, Calibri, Segoe, "Segoe UI", sans-serif',
          'Century Gothic, CenturyGothic, AppleGothic, sans-serif',
          'Century Schoolbook, Georgia, serif',
          'Charter, "Bitstream Charter", "Sitka Text", serif',
          'Copperplate, "Copperplate Gothic Light", fantasy',
          'Comic Sans MS, Comic Sans, cursive',
          'Consolas, "Lucida Console", Monaco, monospace',
          'Constantia, Georgia, serif',
          'Corbel, "Segoe UI", Arial, sans-serif',
          'Didot, "Bodoni MT", "Times New Roman", serif',
          'Fira Sans, "Segoe UI", Arial, sans-serif',
          'Fira Code, Consolas, "Courier New", monospace',
          'Frank Ruhl Libre, Georgia, serif',
          'Courier New, Courier, monospace',
          'Franklin Gothic Medium, "Arial Narrow", Arial, sans-serif',
          'Gabarito, "Segoe UI", Arial, sans-serif',
          'Garamond, "Times New Roman", serif',
          'Georgia, "Times New Roman", Times, serif',
          'Gill Sans, GillSans, Calibri, "Trebuchet MS", sans-serif',
          'Helvetica, "Helvetica Neue", Arial, sans-serif',
          'IBM Plex Sans, "Segoe UI", Arial, sans-serif',
          'IBM Plex Serif, Georgia, serif',
          'IBM Plex Mono, Consolas, "Courier New", monospace',
          'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
          'Josefin Sans, "Segoe UI", Arial, sans-serif',
          'Jost, "Segoe UI", Arial, sans-serif',
          'Lato, "Segoe UI", Arial, sans-serif',
          'Libre Baskerville, Georgia, serif',
          'Libre Franklin, "Segoe UI", Arial, sans-serif',
          'Lora, Georgia, serif',
          'Lucida Sans Unicode, Lucida Grande, sans-serif',
          'Manrope, "Segoe UI", Arial, sans-serif',
          'Merriweather, Georgia, serif',
          'Merriweather Sans, "Segoe UI", Arial, sans-serif',
          'Montserrat, Arial, Helvetica, sans-serif',
          'Mulish, "Segoe UI", Arial, sans-serif',
          'Nunito, "Segoe UI", Arial, sans-serif',
          'Nunito Sans, "Segoe UI", Arial, sans-serif',
          'Noto Sans, Arial, Helvetica, sans-serif',
          'Noto Serif, Georgia, serif',
          'Open Sans, "Segoe UI", Arial, sans-serif',
          'Palatino Linotype, Book Antiqua, Palatino, serif',
          'PT Sans, "Segoe UI", Arial, sans-serif',
          'PT Serif, Georgia, serif',
          'Poppins, Arial, Helvetica, sans-serif',
          'Public Sans, "Segoe UI", Arial, sans-serif',
          'Quicksand, "Segoe UI", Arial, sans-serif',
          'Raleway, "Segoe UI", Arial, sans-serif',
          'Roboto Condensed, Roboto, Arial, sans-serif',
          'Roboto Slab, "Times New Roman", serif',
          'Roboto, Arial, Helvetica, sans-serif',
          'Sora, "Segoe UI", Arial, sans-serif',
          'Segoe UI, Segoe, Tahoma, Geneva, Verdana, sans-serif',
          'Sitka Text, Cambria, Georgia, serif',
          'Spectral, Georgia, serif',
          'Source Sans 3, system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
          'Source Sans Pro, Arial, Helvetica, sans-serif',
          'Space Grotesk, "Segoe UI", Arial, sans-serif',
          'Titillium Web, "Segoe UI", Arial, sans-serif',
          'Tahoma, Geneva, sans-serif',
          'Times New Roman, Times, serif',
          'Ubuntu, "Segoe UI", Arial, sans-serif',
          'Trebuchet MS, Helvetica, sans-serif',
          'Vollkorn, Georgia, serif',
          'Work Sans, "Segoe UI", Arial, sans-serif',
          'Abhaya Libre, "Times New Roman", serif',
          'Alegreya, Georgia, serif',
          'Alegreya Sans, "Segoe UI", Arial, sans-serif',
          'Alfa Slab One, Georgia, serif',
          'Archivo, "Segoe UI", Arial, sans-serif',
          'Archivo Narrow, "Segoe UI", Arial, sans-serif',
          'Arimo, Arial, sans-serif',
          'Asap, "Segoe UI", Arial, sans-serif',
          'Asap Condensed, "Segoe UI", Arial, sans-serif',
          'Assistant, "Segoe UI", Arial, sans-serif',
          'Barlow, "Segoe UI", Arial, sans-serif',
          'Barlow Condensed, "Segoe UI", Arial, sans-serif',
          'Bebas Neue, Impact, sans-serif',
          'Bitter, Georgia, serif',
          'Bricolage Grotesque, "Segoe UI", Arial, sans-serif',
          'Cabin, "Segoe UI", Arial, sans-serif',
          'Cairo, "Segoe UI", Arial, sans-serif',
          'Cardo, Georgia, serif',
          'Chivo, "Segoe UI", Arial, sans-serif',
          'Crimson Pro, Georgia, serif',
          'DM Sans, "Segoe UI", Arial, sans-serif',
          'DM Serif Display, Georgia, serif',
          'Domine, Georgia, serif',
          'Epilogue, "Segoe UI", Arial, sans-serif',
          'Exo 2, "Segoe UI", Arial, sans-serif',
          'Figtree, "Segoe UI", Arial, sans-serif',
          'Fraunces, Georgia, serif',
          'Heebo, "Segoe UI", Arial, sans-serif',
          'Hind, "Segoe UI", Arial, sans-serif',
          'Inconsolata, Consolas, "Courier New", monospace',
          'Instrument Sans, "Segoe UI", Arial, sans-serif',
          'Karla, "Segoe UI", Arial, sans-serif',
          'Lexend, "Segoe UI", Arial, sans-serif',
          'Libre Caslon Text, Georgia, serif',
          'M PLUS Rounded 1c, "Segoe UI", Arial, sans-serif',
          'Mada, "Segoe UI", Arial, sans-serif',
          'Martel, Georgia, serif',
          'Newsreader, Georgia, serif',
          'Outfit, "Segoe UI", Arial, sans-serif',
          'Overpass, "Segoe UI", Arial, sans-serif',
          'Oxygen, "Segoe UI", Arial, sans-serif',
          'Playfair Display, Georgia, serif',
          'Plus Jakarta Sans, "Segoe UI", Arial, sans-serif',
          'Prompt, "Segoe UI", Arial, sans-serif',
          'Red Hat Display, "Segoe UI", Arial, sans-serif',
          'Rokkitt, Georgia, serif',
          'Rubik, "Segoe UI", Arial, sans-serif',
          'Schibsted Grotesk, "Segoe UI", Arial, sans-serif',
          'Teko, "Segoe UI", Arial, sans-serif',
          'Urbanist, "Segoe UI", Arial, sans-serif',
          'Be Vietnam, "Segoe UI", Arial, sans-serif',
          'Be Vietnam Pro, "Segoe UI", Arial, sans-serif',
          'Tinos, Georgia, serif',
          'M PLUS 1p, "Segoe UI", Arial, sans-serif',
          'Gentium Basic, Georgia, serif',
          'Gentium Book Basic, Georgia, serif',
          'EB Garamond, Georgia, serif',
          'Droid Sans, Arial, sans-serif',
          'Mukta, "Segoe UI", Arial, sans-serif',
          'Merriweather Sans, "Segoe UI", Arial, sans-serif',
          'Verdana, Geneva, sans-serif',
        ],
        supportAllValues: true,
      },
      fontSize: {
        options: ['10px','11px','12px','13px','14px','15px','16px','18px','20px','22px','24px','28px','32px','36px','48px'],
        supportAllValues: true,
      },
      alignment: {
        options: ['left', 'center', 'right', 'justify'],
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
