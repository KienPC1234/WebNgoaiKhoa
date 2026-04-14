import React, { useMemo } from 'react'
import type { EditorCommand } from './system'
import { queryCommands } from './system'

interface SlashCommandProps {
  query: string
  commands: EditorCommand[]
  onRun: (command: EditorCommand) => void
}

export const SlashCommand: React.FC<SlashCommandProps> = ({ query, commands, onRun }) => {
  const enabled = query.trim().startsWith('/')
  const keyword = enabled ? query.trim().slice(1) : ''
  const results = useMemo(() => queryCommands(commands, keyword), [commands, keyword])

  if (!enabled) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 space-y-1" aria-label="Slash command menu">
      {results.slice(0, 8).map((command) => (
        <button key={command.id} type="button" onClick={() => onRun(command)} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
          / {command.title}
        </button>
      ))}
      {results.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Không có command phù hợp</p>}
    </div>
  )
}
