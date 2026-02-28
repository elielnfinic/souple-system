'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CannedResponse } from '@/lib/types'

interface CannedResponsePickerProps {
  responses: CannedResponse[]
  locale?: string
  onSelect: (text: string) => void
  onClose: () => void
}

export function CannedResponsePicker({
  responses,
  locale = 'fr',
  onSelect,
  onClose,
}: CannedResponsePickerProps) {
  const [query, setQuery] = useState('')

  const filtered = responses.filter((r) => {
    if (!r.isActive) return false
    if (!query) return true
    const q = query.toLowerCase()
    return (
      r.shortcut.toLowerCase().includes(q) ||
      (r.text[locale] ?? r.text['fr'] ?? '').toLowerCase().includes(q) ||
      (r.category ?? '').toLowerCase().includes(q)
    )
  })

  function handleSelect(r: CannedResponse) {
    const text = r.text[locale] ?? r.text['fr'] ?? Object.values(r.text)[0] ?? ''
    onSelect(text)
    onClose()
  }

  return (
    <div
      className={cn(
        'absolute bottom-full mb-2 left-0 right-0 z-20',
        'bg-white dark:bg-[#1C1C1E] rounded-xl border border-[#E5E7EB] dark:border-[#2C2C2E]',
        'shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
        'flex flex-col max-h-64'
      )}
      role="listbox"
      aria-label="Réponses prédéfinies"
    >
      {/* Search */}
      <div className="px-3 pt-3 pb-2 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une réponse..."
          className={cn(
            'w-full h-8 px-2.5 rounded-lg text-sm',
            'bg-[#F9FAFB] dark:bg-[#111827]',
            'border border-[#E5E7EB] dark:border-[#374151]',
            'text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF]',
            'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]'
          )}
        />
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-[#9CA3AF] text-center">Aucune réponse trouvée</p>
        ) : (
          filtered.map((r) => {
            const text = r.text[locale] ?? r.text['fr'] ?? Object.values(r.text)[0] ?? ''
            return (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                role="option"
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors duration-100',
                  'hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E]',
                  'border-b border-[#F9FAFB] dark:border-[#1C1C1E] last:border-0'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <code className="text-[11px] font-mono text-[#0A7AFF] bg-[#EFF6FF] dark:bg-[#0A7AFF]/10 px-1.5 py-0.5 rounded">
                    /{r.shortcut}
                  </code>
                  {r.category && (
                    <span className="text-[10px] text-[#9CA3AF]">{r.category}</span>
                  )}
                </div>
                <p className="text-sm text-[#374151] dark:text-[#D1D5DB] line-clamp-2">{text}</p>
              </button>
            )
          })
        )}
      </div>

      {/* Close hint */}
      <div className="px-3 py-2 border-t border-[#F3F4F6] dark:border-[#2C2C2E]">
        <button
          onClick={onClose}
          className="text-xs text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] transition-colors"
        >
          Échap. pour fermer
        </button>
      </div>
    </div>
  )
}
