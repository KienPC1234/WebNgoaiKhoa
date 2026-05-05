import React from 'react'
import { Input, Button } from '@/components/UI'
import { List, LayoutGrid, Plus, RefreshCw } from 'lucide-react'

const StaffToolbar = ({ view, setView, query, setQuery, onCreateToggle, onRefresh, tierFilter, setTierFilter }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="relative flex-1 md:flex-none">
          <input
            placeholder="Tìm theo tên, chức danh, chuyên môn..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm"
          />
        </div>
        <select
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm ml-2"
          value={tierFilter || ''}
          onChange={(e) => setTierFilter && setTierFilter(e.target.value)}
        >
          <option value="">Tất cả vị trí</option>
          <option value="management">Tổ trưởng</option>
          <option value="senior">Trưởng bộ môn</option>
          <option value="instructor">Giáo viên</option>
        </select>

        <Button size="sm" onClick={onCreateToggle} className="bg-fpt-orange">Thêm</Button>
        <Button size="sm" variant="ghost" onClick={onRefresh}><RefreshCw size={16} /></Button>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button className={`p-2 rounded-md ${view === 'grid' ? 'bg-gray-100' : ''}`} onClick={() => setView('grid')} aria-label="Grid view">
          <LayoutGrid size={18} />
        </button>
        <button className={`p-2 rounded-md ${view === 'table' ? 'bg-gray-100' : ''}`} onClick={() => setView('table')} aria-label="Table view">
          <List size={18} />
        </button>
      </div>
    </div>
  )
}

export default StaffToolbar
