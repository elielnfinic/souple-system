'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { messagingApi } from '@/lib/api/messaging'
import type { Conversation, Message, CannedResponse } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { CannedResponsePicker } from './CannedResponsePicker'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatWindowProps {
  conversation: Conversation
  currentUserId: number
  cannedResponses?: CannedResponse[]
  onBack?: () => void
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isMine,
}: {
  message: Message
  isMine: boolean
}) {
  const time = new Intl.DateTimeFormat('fr', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(message.createdAt)
  )

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-[#9CA3AF] bg-[#F3F4F6] dark:bg-[#2C2C2E] px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2 max-w-[80%]', isMine ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
      {/* Avatar */}
      {!isMine && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-[#E5E7EB] dark:bg-[#374151] flex items-center justify-center self-end">
          <span className="text-[10px] font-semibold text-[#6B7280]">
            {(message.sender?.fullName ?? '?').charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={cn(
          'px-3 py-2 rounded-2xl text-sm max-w-full break-words',
          isMine
            ? 'bg-[#0A7AFF] text-white rounded-br-sm'
            : 'bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#111827] dark:text-[#F9FAFB] rounded-bl-sm'
        )}
      >
        {!isMine && message.sender && (
          <p className="text-[10px] font-semibold mb-1 opacity-60">{message.sender.fullName}</p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={cn('text-[10px] mt-1 text-right', isMine ? 'text-white/60' : 'text-[#9CA3AF]')}>
          {time}
          {isMine && message.readAt && (
            <span className="ml-1" title="Lu">✓✓</span>
          )}
        </p>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatWindow({
  conversation,
  currentUserId,
  cannedResponses = [],
  onBack,
}: ChatWindowProps) {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'fr'
  const queryClient = useQueryClient()

  const [draft, setDraft] = useState('')
  const [showCanned, setShowCanned] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Fetch messages ────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['messages', conversation.id],
    queryFn: () => messagingApi.getMessages(conversation.id),
    refetchInterval: 5_000, // poll every 5s
  })

  const messages: Message[] = data?.data ?? []

  // ── Mark as read when opened ──────────────────────────────────────────────

  useEffect(() => {
    messagingApi.markRead(conversation.id).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ['conversations-unread'] })
  }, [conversation.id, queryClient])

  // ── Scroll to bottom on new messages ─────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: (content: string) => messagingApi.sendMessage(conversation.id, content),
    onSuccess: (res) => {
      queryClient.setQueryData(['messages', conversation.id], (old: typeof data) => {
        if (!old) return old
        return { ...old, data: [...old.data, res.data] }
      })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const handleSend = useCallback(() => {
    const text = draft.trim()
    if (!text || sendMutation.isPending) return
    setDraft('')
    sendMutation.mutate(text)
  }, [draft, sendMutation])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') setShowCanned(false)
  }

  function handleCannedSelect(text: string) {
    setDraft(text)
    inputRef.current?.focus()
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const otherParticipant =
    conversation.participantAId === currentUserId
      ? conversation.participantB
      : conversation.participantA
  const title = otherParticipant?.fullName ?? `Conversation #${conversation.id}`

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111111]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 shrink-0',
        'border-b border-[#E5E7EB] dark:border-[#2C2C2E]',
        'bg-white dark:bg-[#1C1C1E]'
      )}>
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors"
            aria-label="Retour"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        <div className="w-8 h-8 rounded-full bg-[#E5E7EB] dark:bg-[#374151] flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-[#6B7280]">
            {title.charAt(0).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">{title}</h2>
          {otherParticipant?.phone && (
            <p className="text-xs text-[#9CA3AF] truncate">{otherParticipant.phone}</p>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF]">
          <span className={cn(
            'inline-block w-1.5 h-1.5 rounded-full',
            conversation.status === 'active' ? 'bg-[#22C55E]' : 'bg-[#9CA3AF]'
          )} />
          {conversation.status === 'active' ? 'Active' : 'Archivée'}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={cn('flex gap-2', i % 3 === 0 ? 'flex-row-reverse ml-auto max-w-[60%]' : 'max-w-[70%]')}>
                <Skeleton className="w-7 h-7 rounded-full shrink-0 self-end" />
                <Skeleton className="h-12 flex-1 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[#9CA3AF]">Envoyez le premier message.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderUserId === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      {conversation.status === 'active' && (
        <div className={cn(
          'shrink-0 px-4 py-3',
          'border-t border-[#E5E7EB] dark:border-[#2C2C2E]',
          'bg-white dark:bg-[#1C1C1E]',
          'relative'
        )}>
          {/* Canned response picker */}
          {showCanned && cannedResponses.length > 0 && (
            <CannedResponsePicker
              responses={cannedResponses}
              locale={locale}
              onSelect={handleCannedSelect}
              onClose={() => setShowCanned(false)}
            />
          )}

          <div className="flex items-end gap-2">
            {/* Canned toggle */}
            {cannedResponses.length > 0 && (
              <button
                onClick={() => setShowCanned((v) => !v)}
                title="Réponses prédéfinies"
                className={cn(
                  'p-2 rounded-lg transition-colors shrink-0 mb-0.5',
                  showCanned
                    ? 'bg-[#0A7AFF] text-white'
                    : 'text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E]'
                )}
                aria-label="Réponses prédéfinies"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
              </button>
            )}

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
              className={cn(
                'flex-1 resize-none rounded-xl px-3 py-2.5 text-sm',
                'bg-[#F9FAFB] dark:bg-[#111827]',
                'border border-[#E5E7EB] dark:border-[#374151]',
                'text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF]',
                'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]',
                'max-h-32 overflow-y-auto'
              )}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 128) + 'px'
              }}
              aria-label="Message"
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sendMutation.isPending}
              className={cn(
                'p-2.5 rounded-xl transition-colors shrink-0 mb-0.5',
                draft.trim()
                  ? 'bg-[#0A7AFF] text-white hover:bg-[#0A6AEF]'
                  : 'bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#9CA3AF] cursor-not-allowed'
              )}
              aria-label="Envoyer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {conversation.status === 'archived' && (
        <div className="shrink-0 px-4 py-3 border-t border-[#E5E7EB] dark:border-[#2C2C2E] text-center text-xs text-[#9CA3AF]">
          Cette conversation est archivée.
        </div>
      )}
    </div>
  )
}
