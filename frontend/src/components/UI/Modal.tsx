import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  open: boolean
  onClose: () => void
  anchorRef?: React.RefObject<HTMLElement>
  ariaLabel?: string
  className?: string
  maxWidth?: string
  children?: React.ReactNode
}

const FOCUSABLE_SELECTOR = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"])'

const Modal: React.FC<ModalProps> = ({ open, onClose, ariaLabel = 'Dialog', children, className = '', maxWidth = 'max-w-5xl' }) => {
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous || ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const node = dialogRef.current
    if (!node) return

    const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.getAttribute('tabindex') !== '-1')
    if (focusable.length) focusable[0].focus()
    else node.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => (el as HTMLElement).offsetParent !== null)
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const idx = focusable.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey) {
        if (idx === 0 || document.activeElement === node) {
          focusable[focusable.length - 1].focus()
          e.preventDefault()
        }
      } else {
        if (idx === focusable.length - 1) {
          focusable[0].focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [open])

  if (!mounted || !open) return null

  const contentStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  const node = (
    <>
      <div className="fixed inset-0 z-[120] bg-black/70" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{ position: 'fixed', ...contentStyle, zIndex: 121 }}
        className={`w-full ${maxWidth} ${className} rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  )

  return createPortal(node, document.body)
}

export default Modal
