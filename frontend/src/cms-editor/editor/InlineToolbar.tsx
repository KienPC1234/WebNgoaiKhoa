import React from 'react'

interface InlineToolbarProps {
  onApply: (format: 'bold' | 'italic' | 'link' | 'code') => void
}

export const InlineToolbar: React.FC<InlineToolbarProps> = ({ onApply }) => {
  const items: Array<{ id: 'bold' | 'italic' | 'link' | 'code'; label: string }> = [
    { id: 'bold', label: 'Đậm' },
    { id: 'italic', label: 'Nghiêng' },
    { id: 'link', label: 'Liên kết' },
    { id: 'code', label: 'Mã' },
  ]

  return (
    <div className="inline-flex bg-white rounded-lg border border-gray-200 p-1 gap-1" role="toolbar" aria-label="Thanh định dạng nhanh">
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onApply(item.id)} className="px-2 py-1 text-xs font-black text-gray-600 rounded hover:bg-gray-100" aria-label={`Áp dụng ${item.label}`}>
          {item.label}
        </button>
      ))}
    </div>
  )
}
