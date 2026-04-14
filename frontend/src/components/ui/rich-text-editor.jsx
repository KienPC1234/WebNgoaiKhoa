import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { cn } from '@/lib/utils'

export const RichTextEditor = ({
  label,
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  className,
  size = 'default',
  disabled = false,
}) => {
  const sizeClass = size === 'compact' ? 'rich-editor-compact' : 'rich-editor-default'

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
