import { cn } from "@/lib/utils"

export const Button = ({ className, children, variant = "default", size = "default", ...props }) => {
  const variants = {
    default: "bg-fpt-blue text-white hover:bg-fpt-blue/90 shadow-lg shadow-blue-100",
    orange: "bg-fpt-orange text-white hover:bg-fpt-orange/90 shadow-lg shadow-orange-100",
    outline: "bg-transparent border-2 border-fpt-blue/10 text-fpt-blue hover:bg-fpt-blue/5",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-100",
  }

  const sizes = {
    default: "px-4 py-2 text-sm font-black uppercase tracking-widest",
    lg: "px-8 py-4 text-lg font-black uppercase tracking-widest",
    sm: "px-3 py-1.5 text-xs font-black uppercase tracking-widest",
    icon: "p-3",
  }

  const isLinkButton = Boolean(props.href || props.to)
  const buttonType = props.type || (isLinkButton ? undefined : "button")

  return (
    <button
      type={buttonType}
      className={cn(
        "tap-target inline-flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange/35 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export const Card = ({ className, children, ...props }) => (
  <div className={cn("bg-white p-6 rounded-[32px] border border-gray-50 shadow-xl shadow-gray-100/50", className)} {...props}>
    {children}
  </div>
)

export const Input = ({ className, label, ...props }) => (
  <div className="space-y-2 w-full">
    {label && <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>}
    <input
      className={cn(
        "tap-target flex h-14 w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 text-sm font-bold ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-300 transition-all focus-visible:border-fpt-orange focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange/25 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
)

export const Textarea = ({ className, label, ...props }) => (
  <div className="space-y-2 w-full">
    {label && <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</label>}
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-2xl border-2 border-transparent bg-gray-50 px-6 py-4 text-sm font-medium ring-offset-white placeholder:text-gray-300 transition-all focus-visible:border-fpt-orange focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fpt-orange/25 disabled:cursor-not-allowed disabled:opacity-50 custom-scrollbar",
        className
      )}
      {...props}
    />
  </div>
)
