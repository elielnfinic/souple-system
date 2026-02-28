'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messagingApi } from '@/lib/api/messaging'
import type { Conversation } from '@/lib/types'
import { useAuth } from '@/providers/auth-provider'
import { ConversationList } from '@/components/messaging/ConversationList'
import { ChatWindow } from '@/components/messaging/ChatWindow'
import { cn } from '@/lib/utils'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [showArchived, setShowArchived] = useState(false)

  // ── Conversations list ──────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagingApi.listConversations({ perPage: 50 }),
    refetchInterval: 15_000,
  })

  const allConversations: Conversation[] = data?.data ?? []
  const conversations = allConversations.filter((c) =>
    showArchived ? c.status !== 'active' : c.status === 'active'
  )

  // ── Canned responses ────────────────────────────────────────────────────

  const { data: cannedData } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: () => messagingApi.listCannedResponses(),
  })
  const cannedResponses = cannedData?.data ?? []

  // ── Archive mutation ────────────────────────────────────────────────────

  const archiveMutation = useMutation({
    mutationFn: (id: number) => messagingApi.archive(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['conversations'], (old: typeof data) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((c) =>
            c.id === id ? { ...c, status: 'archived' } : c
          ),
        }
      })
      if (selectedConv?.id === id) {
        setSelectedConv((prev) => prev ? { ...prev, status: 'archived' } : prev)
      }
    },
  })

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleSelect(conv: Conversation) {
    setSelectedConv(conv)
    setMobileView('chat')
  }

  function handleBack() {
    setMobileView('list')
  }

  // ── Totals ──────────────────────────────────────────────────────────────

  const activeCount = allConversations.filter((c) => c.status === 'active').length
  const unread = allConversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-52px)] flex flex-col -mx-4 sm:-mx-6 -my-5 sm:-my-8">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-4 px-4 sm:px-6 py-3 shrink-0',
        'border-b border-[#E5E7EB] dark:border-[#2C2C2E]',
        'bg-white dark:bg-[#111111]'
      )}>
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Messages
          </h1>
          {unread > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#0A7AFF] text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>

        {/* Toggle archived */}
        <button
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors',
            showArchived
              ? 'bg-[#0A7AFF] text-white'
              : 'bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#6B7280] hover:text-[#374151] dark:hover:text-[#D1D5DB]'
          )}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
          {showArchived ? 'Actives' : 'Archives'}
        </button>

        {/* Count badge */}
        <span className="text-xs text-[#9CA3AF]">
          {isLoading ? '—' : `${activeCount} active${activeCount !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── Split panel ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left: Conversation list */}
        <aside
          className={cn(
            'flex flex-col shrink-0',
            'border-r border-[#E5E7EB] dark:border-[#2C2C2E]',
            'bg-white dark:bg-[#111111]',
            // Mobile: full width or hidden based on view
            'md:w-80',
            mobileView === 'chat' ? 'hidden md:flex' : 'flex w-full'
          )}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedConv?.id}
            isLoading={isLoading}
            onSelect={handleSelect}
            onArchive={(id) => archiveMutation.mutate(id)}
          />
        </aside>

        {/* Right: Chat window */}
        <main
          className={cn(
            'flex-1 min-w-0',
            // Mobile: show chat or empty state
            mobileView === 'list' ? 'hidden md:flex md:flex-col' : 'flex flex-col'
          )}
        >
          {selectedConv ? (
            <ChatWindow
              key={selectedConv.id}
              conversation={selectedConv}
              currentUserId={user?.id ?? 0}
              cannedResponses={cannedResponses}
              onBack={handleBack}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4 text-[#D1D5DB] dark:text-[#374151]"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                  Sélectionnez une conversation
                </p>
                <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
                  Choisissez une conversation dans la liste à gauche pour commencer.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
