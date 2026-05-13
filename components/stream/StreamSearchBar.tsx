'use client'

import { Search, X } from 'lucide-react'
import { useState } from 'react'

export default function StreamSearchBar({ value, resultCount, onChange }: { value: string; resultCount?: number; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        onChange(draft.trim())
      }}
    >
      <label className="relative block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ghost)' }} />
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search signals or #tags" className="w-full rounded-2xl py-3 pl-10 pr-10 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
        {draft && (
          <button type="button" onClick={() => { setDraft(''); onChange('') }} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ghost)' }} aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </label>
      {value && typeof resultCount === 'number' && <p className="px-1 text-xs" style={{ color: 'var(--ghost)' }}>{resultCount} results for {value.startsWith('#') ? value : `"${value}"`}</p>}
    </form>
  )
}