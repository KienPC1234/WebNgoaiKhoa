import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export const Spotlight = ({ className }) => (
  <div
    aria-hidden="true"
    className={cn(
      'pointer-events-none absolute inset-0 overflow-hidden',
      className
    )}
  >
    <div className="absolute -top-24 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(242,112,36,0.24)_0%,rgba(242,112,36,0)_65%)] blur-2xl" />
    <div className="absolute -right-24 top-10 h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,rgba(29,42,87,0.2)_0%,rgba(29,42,87,0)_65%)] blur-2xl" />
  </div>
)

export const GridBackground = ({ className }) => (
  <div
    aria-hidden="true"
    className={cn('pointer-events-none absolute inset-0 opacity-60', className)}
  >
    <div className="h-full w-full bg-[linear-gradient(to_right,rgba(71,85,105,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(71,85,105,0.08)_1px,transparent_1px)] bg-[size:28px_28px]" />
  </div>
)

export const TextGenerateEffect = ({ text, className }) => {
  const words = (text || '').split(' ')

  return (
    <h2 className={cn('font-display', className)}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: index * 0.04 }}
          className="mr-2 inline-block"
        >
          {word}
        </motion.span>
      ))}
    </h2>
  )
}

export const ShimmerButton = ({ className, children, ...props }) => (
  <button
    className={cn(
      'group relative inline-flex items-center justify-center overflow-hidden rounded-2xl border border-orange-300/40 bg-fpt-orange px-6 py-3 text-xs font-black uppercase tracking-widest text-white shadow-[0_16px_30px_-18px_rgba(242,112,36,0.9)] transition-all hover:-translate-y-0.5',
      className
    )}
    {...props}
  >
    <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.35)_45%,transparent_100%)] transition-transform duration-700 group-hover:translate-x-full" />
    <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
  </button>
)
