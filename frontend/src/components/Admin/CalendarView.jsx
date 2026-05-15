import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Button } from '@/components/UI'

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const CalendarView = ({ events = [], onSelectEvent, onRangeChange, onDayClick, onEventDrop, showNavigator = true }) => {
  const [current, setCurrent] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const yearTimerRef = useRef(null)
  const yearIntervalRef = useRef(null)
  const hoverMonthTimerRef = useRef(null)
  const hoverMonthIndexRef = useRef(null)

  const daysGrid = useMemo(() => {
    const firstDay = new Date(current.getFullYear(), current.getMonth(), 1)
    const startIndex = firstDay.getDay() // 0 = Sunday
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - startIndex)

    const cells = Array.from({ length: 42 }).map((_, idx) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + idx)

      const dayEvents = events.filter((ev) => {
        try {
          const d = new Date(ev.event_date)
          return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate()
        } catch (e) {
          return false
        }
      })

      return { date, events: dayEvents }
    })

    return cells
  }, [current, events])

  // Prev/Next navigation removed per UX — navigation via side panel or direct selection

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof onRangeChange !== 'function') return

    const start = new Date(current.getFullYear(), current.getMonth(), 1)
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59)
    try {
      onRangeChange(start.toISOString(), end.toISOString())
    } catch (e) {
      // ignore
    }
  }, [current, onRangeChange])

  useEffect(() => {
    if (!isDragging) {
      if (yearTimerRef.current) { clearTimeout(yearTimerRef.current); yearTimerRef.current = null }
      if (yearIntervalRef.current) { clearInterval(yearIntervalRef.current); yearIntervalRef.current = null }
      if (hoverMonthTimerRef.current) { clearTimeout(hoverMonthTimerRef.current); hoverMonthTimerRef.current = null; hoverMonthIndexRef.current = null }
    }
  }, [isDragging])

  useEffect(() => {
    return () => {
      if (yearTimerRef.current) { clearTimeout(yearTimerRef.current); yearTimerRef.current = null }
      if (yearIntervalRef.current) { clearInterval(yearIntervalRef.current); yearIntervalRef.current = null }
      if (hoverMonthTimerRef.current) { clearTimeout(hoverMonthTimerRef.current); hoverMonthTimerRef.current = null; hoverMonthIndexRef.current = null }
    }
  }, [])

  const startHoverMonth = (idx) => {
    if (!isDragging) return
    if (idx === current.getMonth()) return
    if (hoverMonthTimerRef.current) {
      clearTimeout(hoverMonthTimerRef.current)
      hoverMonthTimerRef.current = null
      hoverMonthIndexRef.current = null
    }
    hoverMonthIndexRef.current = idx
    hoverMonthTimerRef.current = setTimeout(() => {
      if (isDragging && hoverMonthIndexRef.current === idx) {
        setCurrent(c => new Date(c.getFullYear(), idx, 1))
      }
      hoverMonthTimerRef.current = null
      hoverMonthIndexRef.current = null
    }, 800)
  }

  const clearHoverMonth = (idx) => {
    if (hoverMonthIndexRef.current === idx) {
      if (hoverMonthTimerRef.current) {
        clearTimeout(hoverMonthTimerRef.current)
        hoverMonthTimerRef.current = null
      }
      hoverMonthIndexRef.current = null
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold">{monthNames[current.getMonth()]} {current.getFullYear()}</div>
          <div className="md:hidden flex items-center gap-2">
            <select value={current.getMonth()} onChange={(e) => setCurrent(new Date(current.getFullYear(), Number(e.target.value), 1))} className="rounded border px-2 py-1 text-sm">
              {monthNames.map((m, i) => (<option key={m} value={i}>{m}</option>))}
            </select>
            <input type="number" value={current.getFullYear()} onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setCurrent(new Date(v, current.getMonth(), 1)) }} className="w-20 rounded border px-2 py-1 text-sm" />
            <Button onClick={() => setCurrent(new Date())} className="rounded-md px-2 py-1 text-sm bg-slate-900 text-white hover:bg-slate-700">Today</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Prev/Next removed */}
        </div>
      </div>

      <div className="md:flex md:gap-4">
        {showNavigator && (
          <aside className="hidden md:block w-56">
            <div className="border rounded p-3 bg-white">
              <div className="mb-2 text-xs font-semibold">Month</div>
              <div className="grid grid-cols-3 gap-1">
                {monthNames.map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => setCurrent(new Date(current.getFullYear(), idx, 1))}
                    onDragEnter={() => startHoverMonth(idx)}
                    onMouseEnter={() => startHoverMonth(idx)}
                    onDragLeave={() => clearHoverMonth(idx)}
                    onMouseLeave={() => clearHoverMonth(idx)}
                    className={`text-left text-sm p-1 rounded ${current.getMonth() === idx ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
                    {m.slice(0,3)}
                  </button>
                ))}
              </div>
                <div className="mt-3 flex items-center gap-2">
                <Button onClick={() => setCurrent(new Date())} className="text-xs px-2 py-1 rounded bg-slate-900 text-white hover:bg-slate-700">Today</Button>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => setCurrent(c => new Date(c.getFullYear() - 1, c.getMonth(), 1))}
                    onMouseEnter={() => { if (isDragging) { yearTimerRef.current = yearTimerRef.current ?? setTimeout(() => { setCurrent(c => new Date(c.getFullYear() - 1, c.getMonth(), 1)); yearIntervalRef.current = setInterval(() => setCurrent(c => new Date(c.getFullYear() - 1, c.getMonth(), 1)), 200); }, 500) } }}
                    onMouseLeave={() => { if (yearTimerRef.current) { clearTimeout(yearTimerRef.current); yearTimerRef.current = null } if (yearIntervalRef.current) { clearInterval(yearIntervalRef.current); yearIntervalRef.current = null } }}
                    className="px-2 py-1 rounded border text-xs"
                  >-</button>
                  <div className="px-2 text-sm">{current.getFullYear()}</div>
                  <button
                    onClick={() => setCurrent(c => new Date(c.getFullYear() + 1, c.getMonth(), 1))}
                    onMouseEnter={() => { if (isDragging) { yearTimerRef.current = yearTimerRef.current ?? setTimeout(() => { setCurrent(c => new Date(c.getFullYear() + 1, c.getMonth(), 1)); yearIntervalRef.current = setInterval(() => setCurrent(c => new Date(c.getFullYear() + 1, c.getMonth(), 1)), 200); }, 500) } }}
                    onMouseLeave={() => { if (yearTimerRef.current) { clearTimeout(yearTimerRef.current); yearTimerRef.current = null } if (yearIntervalRef.current) { clearInterval(yearIntervalRef.current); yearIntervalRef.current = null } }}
                    className="px-2 py-1 rounded border text-xs"
                  >+</button>
                </div>
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1">
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} className="text-center font-semibold text-slate-600">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 mt-2">
            {daysGrid.map((cell, idx) => {
              const isCurrentMonth = cell.date.getMonth() === current.getMonth()
              const highlightClass = dragOverIndex === idx ? 'ring-2 ring-slate-300 bg-slate-50' : ''
              return (
                <div
                  key={idx}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDragEnter={() => setDragOverIndex(idx)}
                  onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                    e.preventDefault()
                    setDragOverIndex(null)
                    setIsDragging(false)
                    try {
                      const data = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
                      if (!data) return
                      const parsed = JSON.parse(data)
                      onEventDrop && onEventDrop(parsed, cell.date)
                    } catch (err) {
                      // ignore
                    }
                  }}
                  className={`min-h-[84px] rounded-md border p-2 ${isCurrentMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'} ${highlightClass}`}
                >
                  <div className="flex items-start justify-between">
                      <div className="text-[11px] font-semibold cursor-pointer" onClick={() => onDayClick && onDayClick(cell.date)}>{cell.date.getDate()}</div>
                  </div>
                  <div className="mt-1 space-y-1">
                    {cell.events.slice(0,3).map((ev) => (
                      <button
                        key={ev.id}
                        draggable
                        onDragStart={(e) => {
                              try {
                                e.dataTransfer.setData('application/json', JSON.stringify({ event_id: ev.event_id, occurrence_id: ev.id, event_date: ev.event_date }))
                                e.dataTransfer.effectAllowed = 'move'
                                setIsDragging(true)
                              } catch (err) {
                                // ignore
                              }
                            }}
                        onDragEnd={() => { setIsDragging(false); if (yearTimerRef.current) { clearTimeout(yearTimerRef.current); yearTimerRef.current = null } if (yearIntervalRef.current) { clearInterval(yearIntervalRef.current); yearIntervalRef.current = null } }}
                        onClick={() => onSelectEvent?.(ev)}
                        className="block w-full text-left truncate text-[12px] text-slate-700 hover:underline cursor-pointer"
                      >
                        {ev.title}
                      </button>
                    ))}
                    {cell.events.length > 3 && (
                      <div className="text-[11px] text-slate-500">+{cell.events.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarView
