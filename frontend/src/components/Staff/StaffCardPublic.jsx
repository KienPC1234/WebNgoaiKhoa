import React, { memo, useCallback, useState, useRef, useEffect } from 'react'
import { Card } from '@/components/UI'
import { Heart, Star } from 'lucide-react'
import { motion } from 'framer-motion'

// tiny neutral svg as fallback (gray background)
const FALLBACK_SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="100%" height="100%" fill="%23e5e7eb"/></svg>'

const StaffCardPublic = ({ person, reaction = {}, onReact, eager = false }) => {
  const reactedType = reaction?.reaction_type || null
  const [imgLoaded, setImgLoaded] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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

  const onImgLoad = useCallback((e) => {
    const img = e.currentTarget
    // Prefer the decode() promise so we only reveal the image once it's ready to paint
    if (img && typeof img.decode === 'function') {
      img.decode().then(() => {
        if (mountedRef.current) setImgLoaded(true)
      }).catch(() => {
        if (mountedRef.current) setImgLoaded(true)
      })
    } else {
      if (mountedRef.current) setImgLoaded(true)
    }
  }, [])

  // Ensure container keeps a sensible height even when server metadata is missing
  const aspectStyle = person.image_width && person.image_height
    ? { aspectRatio: `${person.image_width}/${person.image_height}` }
    : { aspectRatio: '4/5', minHeight: '18rem' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      viewport={{ once: true }}
      className="w-full sm:w-64 md:w-72 lg:w-80"
    >
      <Card className="p-0 border-none bg-white shadow-xl rounded-[40px] overflow-hidden group hover:-translate-y-4 transition-all duration-500" style={{ contain: 'paint' }}>
        <div className="relative overflow-hidden bg-gray-100" style={aspectStyle}>
          <div className="absolute inset-0 bg-gradient-to-t from-fpt-blue/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />

          {/* Blur-up placeholder */}
          {person.image_blur_placeholder ? (
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

          <img
            src={person.image_url || FALLBACK_SVG}
            alt={person.full_name}
            className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-opacity transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={onImgError}
            onLoad={onImgLoad}
            width={person.image_width || undefined}
            height={person.image_height || undefined}
            style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
          />

          <div className="absolute bottom-6 left-6 right-6 z-20 translate-y-10 group-hover:translate-y-0 transition-transform duration-500 opacity-0 group-hover:opacity-100">
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

        <div className="p-8 space-y-3">
          <h4 className="text-xl font-black text-gray-800 tracking-tight group-hover:text-fpt-blue transition-colors">{person.full_name}</h4>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-fpt-orange bg-orange-50 inline-block px-3 py-1 rounded-md">{person.title}</div>
          </div>
          <p className="text-sm text-gray-500 font-medium leading-relaxed italic line-clamp-3" dangerouslySetInnerHTML={{ __html: person.bio || '' }} />
        </div>
      </Card>
    </motion.div>
  )
}

function areEqual(prev, next) {
  // Compare by stable identifiers and minimal fields to avoid unnecessary re-renders
  if ((prev.person && prev.person.id) !== (next.person && next.person.id)) return false
  if ((prev.person && prev.person.image_url) !== (next.person && next.person.image_url)) return false
  if ((prev.person && prev.person.image_blur_placeholder) !== (next.person && next.person.image_blur_placeholder)) return false
  const a = prev.reaction || {}
  const b = next.reaction || {}
  return a.reacted === b.reacted && a.reaction_type === b.reaction_type
}

export default memo(StaffCardPublic, areEqual)
