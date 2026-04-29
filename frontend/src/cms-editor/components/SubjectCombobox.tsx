import React, { useEffect, useRef, useState } from 'react'
import { useSubjects } from '../hooks/useSubjects'

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  subjects?: string[]
}

const formatLabel = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())

export const SubjectCombobox: React.FC<Props> = ({ id, value, onChange, placeholder, className, subjects: externalSubjects }) => {
  const { subjects: fetched = [], loading } = useSubjects()
  const subjects = externalSubjects ?? fetched

  const [query, setQuery] = useState(String(value || ''))
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setQuery(String(value || '')), [value])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const list = [''].concat(subjects.filter((s) => s.toLowerCase().includes(query.toLowerCase())))

  const handleSelect = (s: string) => {
    onChange(s)
    setQuery(String(s || ''))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        aria-autocomplete="list"
        aria-expanded={open}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, Math.max(0, list.length - 1)))
            setOpen(true)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
            setOpen(true)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const s = list[highlight] ?? ''
            handleSelect(s)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        className={className || 'w-full rounded-md border border-gray-100 bg-white px-3 py-2 text-xs'}
      />

      {open && (
        <div role="listbox" aria-label="Chọn môn" className="absolute z-50 mt-1 w-full overflow-auto rounded border border-gray-100 bg-white shadow-lg max-h-48">
          {loading ? (
            <div className="px-3 py-2 text-xs text-gray-500">Đang tải...</div>
          ) : (
            list.map((s, idx) => {
              const label = s ? formatLabel(s) : 'Tất cả môn'
              const isHighlighted = idx === highlight
              return (
                <div
                  key={`${s}-${idx}`}
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => {
                    // mousedown to avoid blurring before click
                    e.preventDefault()
                    handleSelect(s)
                  }}
                  className={`px-3 py-2 text-xs cursor-pointer ${isHighlighted ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {label}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default SubjectCombobox
