export function tierGradientClass(tier) {
  if (!tier) return 'from-slate-400 to-slate-600'

  switch (tier) {
    case 'management':
      // warm gold -> orange (management / leadership)
      return 'from-yellow-400 via-orange-400 to-fpt-orange'
    case 'senior':
      // purple -> indigo -> blue (senior / subject lead)
      return 'from-purple-500 via-indigo-500 to-blue-500'
    case 'instructor':
      // blue -> cyan -> emerald (teaching staff)
      return 'from-blue-500 via-cyan-400 to-emerald-400'
    case 'assistant':
      // neutral gray for assistants
      return 'from-slate-400 to-slate-600'
    default:
      return 'from-slate-400 to-slate-600'
  }
}

export function tierLabel(tier) {
  if (!tier) return ''
  switch (tier) {
    case 'management':
      return 'Tổ trưởng'
    case 'senior':
      return 'Trưởng bộ môn'
    case 'instructor':
      return 'Giáo viên'
    case 'assistant':
      return 'Trợ giảng'
    default:
      return tier
  }
}
