import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const COLORS = [
  'var(--color-fpt-blue)',
  'var(--color-fpt-green)',
  'var(--color-fpt-orange)',
  'var(--color-destructive)',
  'var(--color-accent)',
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)'
]

const slugify = (s = '') => String(s).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

const StaffReactionsChart = ({ data = [] }) => {
  if (!data || data.length === 0) return null

  const reactionTypes = useMemo(() => {
    const set = new Set()
    data.forEach((item) => {
      const counts = item.counts || {}
      Object.keys(counts).forEach((k) => set.add(k))
    })
    return Array.from(set)
  }, [data])

  const chartData = useMemo(() => {
    return (data || []).map((item) => {
      const counts = item.counts || {}
      const total = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
      return { staff_id: item.staff_id, name: item.full_name, total, ...counts }
    })
  }, [data])

  const [visibleSet, setVisibleSet] = useState(() => new Set(reactionTypes))
  useEffect(() => {
    setVisibleSet((prev) => {
      const next = new Set(prev || [])
      reactionTypes.forEach((t) => next.add(t))
      // remove types that disappeared
      for (const v of Array.from(next)) if (!reactionTypes.includes(v)) next.delete(v)
      return next
    })
  }, [reactionTypes])

  const toggleType = useCallback((t) => {
    setVisibleSet((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }, [])

  const visibleTypes = useMemo(() => reactionTypes.filter((t) => visibleSet.has(t)), [reactionTypes, visibleSet])

  const colorMap = useMemo(() => {
    const m = {}
    reactionTypes.forEach((t, i) => {
      m[t] = COLORS[i % COLORS.length]
    })
    return m
  }, [reactionTypes])

  const [sortMode, setSortMode] = useState('total')

  const sortedData = useMemo(() => {
    const arr = [...chartData]
    if (sortMode === 'total') {
      const visibleTotals = (r) => visibleTypes.reduce((s, k) => s + (r[k] || 0), 0)
      arr.sort((a, b) => visibleTotals(b) - visibleTotals(a))
    } else if (sortMode === 'name') arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    return arr
  }, [chartData, sortMode, visibleTypes])

  const useVertical = (sortedData.length || 0) > 12
  const height = useVertical ? Math.min(800, 40 * sortedData.length + 80) : 360

  const exportCsv = useCallback(() => {
    if (!visibleTypes || visibleTypes.length === 0) return
    const header = ['staff_id', 'name', ...visibleTypes, 'total_visible']
    const rows = sortedData.map((r) => {
      const visibleSum = visibleTypes.reduce((s, k) => s + (r[k] || 0), 0)
      return [r.staff_id || '', r.name || '', ...visibleTypes.map((k) => r[k] || 0), visibleSum]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    a.href = url
    a.download = `staff_reactions_${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [sortedData, visibleTypes])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null
    const total = payload.reduce((s, p) => s + (p.value || 0), 0)
    return (
      <div className="bg-white border rounded p-2 shadow-sm text-sm">
        <div className="font-semibold mb-1">{label}</div>
        <div className="text-xs text-gray-500">Tổng: {total}</div>
        <div className="mt-1 space-y-1">
          {payload.map((p) => {
            const key = p.name || p.dataKey || 'unknown'
            const color = colorMap[key] || '#CBD5E1'
            return (
              <div key={key} className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <span style={{ background: color }} className="w-3 h-3 inline-block rounded-sm" />
                  <span>{key}</span>
                </div>
                <div className="font-semibold">{p.value || 0}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!visibleTypes || visibleTypes.length === 0) {
    return (
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm">
        <div className="text-sm text-gray-500">Không có loại phản ứng được chọn.</div>
        <div className="mt-2">
          <button onClick={() => setVisibleSet(new Set(reactionTypes))} className="px-3 py-1 rounded-full bg-fpt-blue text-white text-sm">Bật tất cả</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          {reactionTypes.map((t) => {
            const active = visibleSet.has(t)
            const color = colorMap[t]
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  active ? 'bg-fpt-blue text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span style={{ background: color }} className="w-3 h-3 rounded-sm inline-block" />
                  <span>{t}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="text-sm px-3 py-1 border rounded-md bg-white">
            <option value="total">Sắp xếp: Tổng</option>
            <option value="name">Sắp xếp: Tên</option>
            <option value="none">Sắp xếp: Không</option>
          </select>
          <button onClick={exportCsv} className="px-3 py-1 rounded-md bg-gray-100 text-sm">Export CSV</button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={sortedData} layout={useVertical ? 'vertical' : 'horizontal'} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
          <defs>
            {reactionTypes.map((t) => (
              <linearGradient id={`grad-${slugify(t)}`} key={t} x1="0" x2="1">
                <stop offset="0%" stopColor={colorMap[t]} stopOpacity="0.95" />
                <stop offset="100%" stopColor={colorMap[t]} stopOpacity="0.6" />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
          {useVertical ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={240} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis />
            </>
          )}
          <Tooltip content={<CustomTooltip />} />
          {visibleTypes.map((key) => (
            <Bar key={key} dataKey={key} stackId="a" fill={`url(#grad-${slugify(key)})`} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default StaffReactionsChart
