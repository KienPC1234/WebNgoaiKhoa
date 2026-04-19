import React, { useMemo, useState } from 'react'
import type { EditorCommand } from './system'
import { queryCommands } from './system'

interface CommandPaletteProps {
  commands: EditorCommand[]
  onRun: (command: EditorCommand) => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ commands, onRun }) => {
  const [query, setQuery] = useState('')
  const results = useMemo(() => queryCommands(commands, query), [commands, query])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2" aria-label="Bảng lệnh">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
        placeholder="Tìm lệnh khối..."
        aria-label="Tìm lệnh"
      />
      <div className="max-h-64 overflow-auto space-y-1">
        {results.map((command) => (
          <button key={command.id} type="button" onClick={() => onRun(command)} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 hover:text-fpt-blue transition" aria-label={command.title}>
            {command.title}
          </button>
        ))}
        {results.length === 0 && (
          <p className="px-3 py-2 text-xs text-gray-400">Không có lệnh phù hợp</p>
        )}
      </div>
    </div>
  )
}
