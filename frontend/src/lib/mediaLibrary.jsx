import React, { createContext, useCallback, useContext, useState, useRef } from 'react'
import MediaLibraryModal from '@/components/Admin/MediaLibrary/MediaLibraryModal'

const MediaLibraryContext = createContext({ openMediaLibrary: async () => null })

export const MediaLibraryProvider = ({ children }) => {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState({ accept: 'image/*', multi: false })
  const resolveRef = useRef(null)

  const openMediaLibrary = useCallback((options = {}) => {
    setOpts({ accept: 'image/*', multi: false, ...options })
    setOpen(true)

    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleClose = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(null)
      resolveRef.current = null
    }
    setOpen(false)
  }, [])

  const handleSelect = useCallback((asset) => {
    if (resolveRef.current) {
      resolveRef.current(asset)
      resolveRef.current = null
    }
    setOpen(false)
  }, [])

  return (
    <MediaLibraryContext.Provider value={{ openMediaLibrary }}>
      {children}
      <MediaLibraryModal open={open} onClose={handleClose} onSelect={handleSelect} accept={opts.accept} multi={opts.multi} />
    </MediaLibraryContext.Provider>
  )
}

export const useMediaLibrary = () => useContext(MediaLibraryContext)

export default MediaLibraryProvider
