import React from 'react'

const WEEKDAYS = [
  ['MO','Mon'], ['TU','Tue'], ['WE','Wed'], ['TH','Thu'], ['FR','Fri'], ['SA','Sat'], ['SU','Sun']
]

const SeriesEditor = ({ rrule = '', onChange }) => {
  // Parse a minimal rrule string into parts
  const parse = (s) => {
    const parts = {}
    if (!s) return parts
    s.split(';').forEach(p => {
      const [k,v] = p.split('=')
      if (k && v) parts[k.toUpperCase()] = v
    })
    return parts
  }

  const parts = parse(rrule)
  const freq = parts.FREQ || ''
  const interval = parts.INTERVAL || '1'
  const byday = (parts.BYDAY || '').split(',').filter(Boolean)
  const count = parts.COUNT || ''
  const until = parts.UNTIL || ''

  const build = (next) => {
    const out = {
      FREQ: next.FREQ || freq,
      INTERVAL: next.INTERVAL || interval,
    }
    if (next.BYDAY !== undefined) out.BYDAY = (next.BYDAY || []).join(',')
    if (next.COUNT !== undefined && next.COUNT) out.COUNT = next.COUNT
    if (next.UNTIL !== undefined && next.UNTIL) out.UNTIL = next.UNTIL

    const partsArr = []
    Object.keys(out).forEach(k => {
      if (out[k]) partsArr.push(`${k}=${out[k]}`)
    })
    const val = partsArr.join(';')
    onChange && onChange(val)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm">Frequency</label>
        <select value={freq} onChange={(e) => build({FREQ: e.target.value})} className="rounded-md border px-2 py-1 text-sm">
          <option value="">None</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
        </select>
        <label className="text-sm">Interval</label>
        <input value={interval} onChange={(e) => build({INTERVAL: e.target.value})} className="w-16 rounded-md border px-2 py-1 text-sm" />
      </div>

      {freq === 'WEEKLY' && (
        <div className="flex gap-2 flex-wrap">
          {WEEKDAYS.map(([code,label]) => (
            <label key={code} className="inline-flex items-center gap-1 text-sm">
              <input type="checkbox" checked={byday.includes(code)} onChange={(e) => {
                const nextDays = e.target.checked ? [...byday, code] : byday.filter(d => d !== code)
                build({BYDAY: nextDays})
              }} /> {label}
            </label>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-sm">Count</label>
        <input value={count} onChange={(e) => build({COUNT: e.target.value})} className="w-20 rounded-md border px-2 py-1 text-sm" />
        <label className="text-sm">Until (ISO)</label>
        <input value={until} onChange={(e) => build({UNTIL: e.target.value})} className="w-44 rounded-md border px-2 py-1 text-sm" />
      </div>

      <div className="text-xs text-slate-500">RRULE Preview: {rrule || '—'}</div>
    </div>
  )
}

export default SeriesEditor
