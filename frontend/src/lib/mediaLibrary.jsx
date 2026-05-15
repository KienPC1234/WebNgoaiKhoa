import React from 'react'

const MediaLibraryModal = React.lazy(() => import('@/components/Admin/MediaLibrary/MediaLibraryModal'))

const MediaLibraryContext = React.createContext({ openMediaLibrary: async () => null })

export const MediaLibraryProvider = ({ children }) => {
  const [open, setOpen] = React.useState(false)
  const [opts, setOpts] = React.useState({ accept: 'image/*', multi: false })
  const resolveRef = React.useRef(null)

  const openMediaLibrary = React.useCallback((options = {}) => {
    setOpts({ accept: 'image/*', multi: false, ...options })
    setOpen(true)

    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleClose = React.useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(null)
      resolveRef.current = null
    }
    setOpen(false)
  }, [])

  const handleSelect = React.useCallback((asset) => {
    if (resolveRef.current) {
      resolveRef.current(asset)
      resolveRef.current = null
    }
    setOpen(false)
  }, [])

  return (
    <MediaLibraryContext.Provider value={{ openMediaLibrary }}>
      {children}
      {open ? (
        <React.Suspense fallback={null}>
          <MediaLibraryModal open={open} onClose={handleClose} onSelect={handleSelect} accept={opts.accept} multi={opts.multi} />
        </React.Suspense>
      ) : null}
    </MediaLibraryContext.Provider>
  )
}

export const useMediaLibrary = () => React.useContext(MediaLibraryContext)

export default MediaLibraryProvider
