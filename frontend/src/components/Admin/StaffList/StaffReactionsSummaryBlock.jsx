import React from 'react'

const StaffReactionsSummaryBlock = ({ data = [] }) => {
  if (!data || data.length === 0) return null

  const totals = {}
  let totalReactions = 0
  const staffTotals = (data || []).map((item) => {
    const counts = item.counts || {}
    const sum = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
    totalReactions += sum
    Object.entries(counts).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + (v || 0) })
    return { staff_id: item.staff_id, name: item.full_name, total: sum }
  })

  staffTotals.sort((a, b) => b.total - a.total)
  const reactionTypes = Object.keys(totals).sort((a, b) => totals[b] - totals[a])

  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="col-span-2 bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">Tổng phản ứng</div>
        <div className="text-2xl font-bold mt-1">{totalReactions}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {reactionTypes.map((key) => (
            <div key={key} className="px-3 py-1 rounded-full bg-gray-100 text-sm font-medium">{key}: {totals[key]}</div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">Top hồ sơ theo tổng phản ứng</div>
        <ol className="mt-2 space-y-2 text-sm">
          {staffTotals.slice(0, 6).map((s) => (
            <li key={s.staff_id} className="flex justify-between">
              <span className="truncate mr-2">{s.name}</span>
              <span className="font-semibold">{s.total}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default StaffReactionsSummaryBlock
