import React, { memo, useCallback, useState, useRef, useEffect } from 'react'
import { Card } from '@/components/UI'
import { Heart, Star } from 'lucide-react'

// tiny neutral svg as fallback (gray background)
const FALLBACK_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="100%" height="100%" fill="%23e5e7eb"/></svg>'

const StaffCardPublic = ({ person, reaction = {}, onReact, eager = false }) => {
  const reactedType = reaction?.reaction_type || null
  const [imgLoaded, setImgLoaded] = useState(false)
  const [shouldLoadImage, setShouldLoadImage] = useState(Boolean(eager))
  const mountedRef = useRef(true)
  const cardRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (eager || shouldLoadImage) return
    if (!cardRef.current || typeof IntersectionObserver === 'undefined') {
      setShouldLoadImage(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadImage(true)
          observer.disconnect()
        }
      },
      { rootMargin: '80px 0px' }
    )

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [eager, shouldLoadImage])

  const handleReact = useCallback(
    (type) => {
      if (typeof onReact === 'function') onReact(person.id, type)
    },
    [onReact, person.id]
  )

  const onImgError = useCallback((e) => {
    try {
      e.currentTarget.onerror = null
      e.currentTarget.src = FALLBACK_SVG
      if (mountedRef.current) setImgLoaded(true)
    } catch (err) {}
  }, [])

  const onImgLoad = useCallback(() => {
    if (mountedRef.current) setImgLoaded(true)
  }, [])

  const optimizedSrc = person.image_optimized_url || person.image_url || FALLBACK_SVG
  const srcSet = person.image_srcset || ''
  const sizes = person.image_sizes || '(max-width: 640px) 80vw, 320px'

  // Ensure container keeps a sensible height even when server metadata is missing
  const aspectStyle = person.image_width && person.image_height
    ? { aspectRatio: `${person.image_width}/${person.image_height}` }
    : { aspectRatio: '4/5', minHeight: '18rem' }

  return (
    <div
      ref={cardRef}
      className="w-full max-w-[20rem] sm:w-64 md:w-72 lg:w-80"
    >
      <Card className="p-0 border-none bg-white shadow-xl rounded-[28px] sm:rounded-[36px] overflow-hidden group md:hover:-translate-y-4 transition-all duration-500" style={{ contain: 'paint' }}>
        <div className="relative overflow-hidden bg-gray-100" style={aspectStyle}>
          <div className="absolute inset-0 bg-gradient-to-t from-fpt-blue/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />

          {/* Blur-up placeholder */}
          {shouldLoadImage && person.image_blur_placeholder ? (
            <img
              src={person.image_blur_placeholder}
              alt={person.full_name}
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 transform-gpu transition-opacity duration-500"
              style={{ opacity: imgLoaded ? 0 : 1 }}
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gray-200" />
          )}

          {shouldLoadImage && (
            <picture>
              {srcSet ? <source srcSet={srcSet} sizes={sizes} type="image/webp" /> : null}
              <img
                src={optimizedSrc}
                alt={person.full_name}
                className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-opacity transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading={eager ? 'eager' : 'lazy'}
                fetchpriority={eager ? 'high' : 'low'}
                decoding="async"
                onError={onImgError}
                onLoad={onImgLoad}
                width={person.image_width || undefined}
                height={person.image_height || undefined}
              />
            </picture>
          )}

          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 z-20 md:translate-y-10 md:group-hover:translate-y-0 transition-transform duration-500 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            <div className="flex gap-4">
              <div
                role="button"
                title="Yêu thích"
                onClick={() => handleReact('love')}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer border border-white/30 ${reactedType === 'love' ? 'bg-fpt-orange text-white' : 'bg-white/20 text-white hover:bg-white hover:text-gray-800'}`}
              >
                <Heart size={18} />
              </div>

              <div
                role="button"
                title="Đánh dấu"
                onClick={() => handleReact('star')}
                className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer border border-white/30 ${reactedType === 'star' ? 'bg-fpt-orange text-white' : 'bg-white/20 text-white hover:bg-white hover:text-gray-800'}`}
              >
                <Star size={18} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 md:p-8 space-y-3">
          <h4 className="text-lg sm:text-xl font-black text-gray-800 tracking-tight group-hover:text-fpt-blue transition-colors break-words">{person.full_name}</h4>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-fpt-orange bg-orange-50 inline-block px-3 py-1 rounded-md break-words">{person.title}</div>
          </div>
          <p className="text-sm text-gray-500 font-medium leading-relaxed italic line-clamp-3" dangerouslySetInnerHTML={{ __html: person.bio || '' }} />
        </div>
      </Card>
    </div>
  )
}

function areEqual(prev, next) {
  // Compare by stable identifiers and minimal fields to avoid unnecessary re-renders
  if ((prev.person && prev.person.id) !== (next.person && next.person.id)) return false
  if ((prev.person && prev.person.image_url) !== (next.person && next.person.image_url)) return false
  if ((prev.person && prev.person.image_optimized_url) !== (next.person && next.person.image_optimized_url)) return false
  if ((prev.person && prev.person.image_srcset) !== (next.person && next.person.image_srcset)) return false
  if ((prev.person && prev.person.image_blur_placeholder) !== (next.person && next.person.image_blur_placeholder)) return false
  const a = prev.reaction || {}
  const b = next.reaction || {}
  return a.reacted === b.reacted && a.reaction_type === b.reaction_type
}

export default memo(StaffCardPublic, areEqual)
