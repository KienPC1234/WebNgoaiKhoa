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
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2" aria-label="Command palette">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-gray-50 text-sm"
        placeholder="Type command..."
        aria-label="Search command"
      />
      <div className="max-h-52 overflow-auto space-y-1">
        {results.map((command) => (
          <button key={command.id} type="button" onClick={() => onRun(command)} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100" aria-label={command.title}>
            {command.title}
          </button>
        ))}
      </div>
    </div>
  )
}
