'use client'

import { cn } from '@/lib/utils'
import type { Conversation } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from './format-distance'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[]
  selectedId?: number
  isLoading?: boolean
  onSelect: (conv: Conversation) => void
  onArchive?: (id: number) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOtherParticipant(conv: Conversation, currentUserId?: number) {
  if (conv.participantAId === currentUserId) return conv.participantB
  return conv.participantA
}

function ConvTypeTag({ type }: { type: Conversation['type'] }) {
  const map: Record<Conversation['type'], { label: string; bg: string; text: string }> = {
    passenger_agency:  { label: 'Agence',    bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]' },
    passenger_driver:  { label: 'Chauffeur', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
    internal:          { label: 'Interne',   bg: 'bg-[#F3F4F6]', text: 'text-[#374151]' },
  }
  const { label, bg, text } = map[type]
  return (
    <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-medium', bg, text)}>
      {label}
    </span>
  )
}

// ─── Item ─────────────────────────────────────────────────────────────────────

function ConvItem({
  conv,
  isSelected,
  onClick,
  onArchive,
}: {
  conv: Conversation
  isSelected: boolean
  onClick: () => void
  onArchive?: () => void
}) {
  const other = getOtherParticipant(conv)
  const name = other?.fullName ?? `Conversation #${conv.id}`
  const unread = (conv.unreadCount ?? 0) > 0
  const lastMsgContent = conv.lastMessage?.content ?? ''

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 transition-colors duration-100 flex items-start gap-3',
        'border-b border-[#F3F4F6] dark:border-[#2C2C2E]',
        isSelected
          ? 'bg-[#EFF6FF] dark:bg-[#0A7AFF]/10'
          : 'hover:bg-[#F9FAFB] dark:hover:bg-[#1C1C1E]',
      )}
      aria-current={isSelected ? 'page' : undefined}
    >
      {/* Avatar */}
      <div className="shrink-0 w-9 h-9 rounded-full bg-[#E5E7EB] dark:bg-[#374151] flex items-center justify-center">
        <span className="text-sm font-semibold text-[#6B7280] dark:text-[#9CA3AF]">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', unread ? 'font-semibold text-[#111827] dark:text-[#F9FAFB]' : 'font-medium text-[#374151] dark:text-[#D1D5DB]')}>
            {name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {conv.lastMessageAt && (
              <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">
                {formatDistanceToNow(conv.lastMessageAt)}
              </span>
            )}
            {unread && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0A7AFF] text-[9px] font-bold text-white">
                {conv.unreadCount! > 9 ? '9+' : conv.unreadCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <ConvTypeTag type={conv.type} />
          {lastMsgContent && (
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] truncate flex-1">
              {lastMsgContent}
            </p>
          )}
        </div>
      </div>

      {/* Archive button (only when selected & not already archived) */}
      {isSelected && onArchive && conv.status === 'active' && (
        <button
          onClick={(e) => { e.stopPropagation(); onArchive() }}
          title="Archiver"
          className="shrink-0 p-1 rounded text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
          aria-label="Archiver la conversation"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        </button>
      )}
    </button>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ConvSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConversationList({
  conversations,
  selectedId,
  isLoading,
  onSelect,
  onArchive,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        {Array.from({ length: 6 }).map((_, i) => <ConvSkeleton key={i} />)}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-[#D1D5DB]" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm font-medium text-[#6B7280]">Aucune conversation</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Les conversations apparaîtront ici.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <ConvItem
          key={conv.id}
          conv={conv}
          isSelected={conv.id === selectedId}
          onClick={() => onSelect(conv)}
          onArchive={onArchive ? () => onArchive(conv.id) : undefined}
        />
      ))}
    </div>
  )
}
