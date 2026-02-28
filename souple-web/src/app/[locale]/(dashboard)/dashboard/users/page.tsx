'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, MoreVertical, Shield, Trash2, X } from 'lucide-react'
import { orgsApi, ApiError } from '@/lib/api-client'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { TextInput, FormField, FormLabel, FormError } from '@/components/ui/form-field'
import { StatusBadge } from '@/components/ui/status-badge'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'owner' | 'manager' | 'finance' | 'ticketer' | 'driver'

interface Member {
  userId: number
  role: Role
  isActive: boolean
  joinedAt: string
  user?: {
    id: number
    firstName: string
    lastName: string
    fullName: string
    phone: string
    email: string | null
    avatarUrl: string | null
  }
}

interface OrgDetail {
  id: number
  name: string
  type: string
  members: Member[]
}

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: 'owner', label: 'Propriétaire', desc: 'Accès complet, peut gérer les membres' },
  { value: 'manager', label: 'Manager', desc: 'Gestion des voyages, réservations, finances' },
  { value: 'finance', label: 'Finance', desc: 'Accès aux paiements et rapports financiers' },
  { value: 'ticketer', label: 'Guichetier', desc: 'Vente de billets et enregistrement' },
  { value: 'driver', label: 'Chauffeur', desc: 'Application chauffeur, accès aux voyages assignés' },
]

const ROLE_COLORS: Record<Role, string> = {
  owner: 'bg-[#FDF4FF] dark:bg-[#A855F7]/15 text-[#A855F7]',
  manager: 'bg-[#EFF6FF] dark:bg-[#0A7AFF]/15 text-[#0A7AFF]',
  finance: 'bg-[#F0FDF4] dark:bg-[#16A34A]/15 text-[#16A34A]',
  ticketer: 'bg-[#FFF7ED] dark:bg-[#F59E0B]/15 text-[#F59E0B]',
  driver: 'bg-[#F0F9FF] dark:bg-[#0EA5E9]/15 text-[#0EA5E9]',
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  const colors = ['#0A7AFF', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2']
  const color = colors[name.charCodeAt(0) % colors.length]

  return (
    <div
      style={{ width: size, height: size, backgroundColor: color }}
      className="rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
    >
      {initials || '?'}
    </div>
  )
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
  orgId: number
  onClose: () => void
  onSuccess: () => void
}

function InviteModal({ orgId, onClose, onSuccess }: InviteModalProps) {
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('ticketer')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError(null)
    try {
      // Normalise: strip spaces/dashes, add +243 if missing
      let normalised = phone.replace(/[\s\-]/g, '')
      if (!normalised.startsWith('+')) {
        normalised = `+243${normalised}`
      }
      await orgsApi.addMember(orgId, { phone: normalised, role })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur inattendue s\'est produite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[420px] bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Inviter un membre
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField>
            <FormLabel htmlFor="invite-phone" required>Numéro de téléphone</FormLabel>
            <TextInput
              id="invite-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+243 812 345 678"
              autoFocus
              required
            />
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              L'utilisateur doit déjà avoir un compte Souple.
            </p>
          </FormField>

          <FormField>
            <FormLabel required>Rôle</FormLabel>
            <div className="space-y-1.5 mt-1">
              {ROLES.filter((r) => r.value !== 'owner').map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={[
                    'w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all',
                    role === r.value
                      ? 'border-[#0A7AFF] bg-[#EFF6FF] dark:bg-[#0A7AFF]/10 ring-1 ring-[#0A7AFF]'
                      : 'border-[#E5E7EB] dark:border-[#3A3A3C] hover:border-[#D1D5DB] dark:hover:border-[#48484A]',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={[
                      'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors',
                      role === r.value ? 'border-[#0A7AFF] bg-[#0A7AFF]' : 'border-[#D1D5DB] dark:border-[#48484A]',
                    ].join(' ')} />
                    <div>
                      <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{r.label}</span>
                      <span className="block text-xs text-[#6B7280] dark:text-[#8E8E93]">{r.desc}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </FormField>

          {error && <FormError role="alert">{error}</FormError>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" size="md" fullWidth onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" size="md" fullWidth loading={loading}>
              Inviter
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: Member
  currentUserId: number
  canManage: boolean
  orgId: number
  onRefetch: () => void
}

function MemberRow({ member, currentUserId, canManage, orgId, onRefetch }: MemberRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const isMe = member.userId === currentUserId
  const name = member.user?.fullName ?? `User #${member.userId}`

  const handleRemove = async () => {
    if (!confirm(`Retirer ${name} de l'organisation ?`)) return
    setLoading(true)
    try {
      await orgsApi.removeMember(orgId, member.userId)
      onRefetch()
    } finally {
      setLoading(false)
    }
    setMenuOpen(false)
  }

  const handleRoleChange = async (newRole: Role) => {
    setLoading(true)
    try {
      await orgsApi.updateMemberRole(orgId, member.userId, { role: newRole })
      onRefetch()
    } finally {
      setLoading(false)
    }
    setMenuOpen(false)
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#2C2C2E]/60 transition-colors">
      <Avatar name={name} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] truncate">
            {name}
          </span>
          {isMe && (
            <span className="text-[10px] font-medium bg-[#F3F4F6] dark:bg-[#2C2C2E] text-[#9CA3AF] dark:text-[#6B7280] px-1.5 py-0.5 rounded-full">
              Vous
            </span>
          )}
        </div>
        <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          {member.user?.phone ?? '—'}
        </span>
      </div>

      <span className={[
        'text-xs font-semibold px-2.5 py-1 rounded-full',
        ROLE_COLORS[member.role],
      ].join(' ')}>
        {ROLES.find((r) => r.value === member.role)?.label ?? member.role}
      </span>

      {canManage && !isMe && member.role !== 'owner' && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={loading}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#D1D5DB] hover:bg-[#F3F4F6] dark:hover:bg-[#2C2C2E] transition-colors"
          >
            <MoreVertical size={15} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-[#1C1C1E] rounded-xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_8px_24px_rgba(0,0,0,0.12)] overflow-hidden py-1">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-[#9CA3AF] dark:text-[#6B7280] uppercase tracking-wide">
                  Changer le rôle
                </div>
                {ROLES.filter((r) => r.value !== 'owner' && r.value !== member.role).map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRoleChange(r.value)}
                    className="w-full text-left px-3 py-2 text-sm text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] flex items-center gap-2"
                  >
                    <Shield size={13} className="text-[#9CA3AF] dark:text-[#6B7280]" />
                    {r.label}
                  </button>
                ))}
                <div className="h-px bg-[#F3F4F6] dark:bg-[#2C2C2E] my-1" />
                <button
                  onClick={handleRemove}
                  className="w-full text-left px-3 py-2 text-sm text-[#EF4444] hover:bg-[#FEF2F2] dark:hover:bg-[#EF4444]/10 flex items-center gap-2"
                >
                  <Trash2 size={13} />
                  Retirer
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user, activeOrg } = useAuth()
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)

  const orgId = activeOrg?.organizationId
  const canManage = activeOrg?.role === 'owner' || activeOrg?.role === 'manager' || !!user?.isSuperAdmin

  const { data, isLoading } = useQuery({
    queryKey: ['org-detail', orgId],
    queryFn: () => orgsApi.get(orgId!) as Promise<{ success: true; data: OrgDetail }>,
    enabled: !!orgId,
    select: (res) => res.data,
  })

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['org-detail', orgId] })

  const members = data?.members ?? []

  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Users size={40} className="text-[#D1D5DB] dark:text-[#4B5563]" />
        <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Aucune organisation active.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            Équipe
          </h1>
          <p className="text-sm text-[#6B7280] dark:text-[#8E8E93] mt-1">
            {activeOrg?.organization.name} · {members.length} membre{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<UserPlus size={14} />}
            onClick={() => setShowInvite(true)}
          >
            Inviter un membre
          </Button>
        )}
      </div>

      {/* Role guide */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {ROLES.map((r) => (
          <div
            key={r.value}
            className="bg-white dark:bg-[#1C1C1E] rounded-xl border border-[#E5E7EB] dark:border-[#2C2C2E] p-3"
          >
            <span className={[
              'text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-2',
              ROLE_COLORS[r.value],
            ].join(' ')}>
              {r.label}
            </span>
            <p className="text-xs text-[#6B7280] dark:text-[#8E8E93] leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Members list */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
          <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Membres actifs</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-[#0A7AFF] border-t-transparent animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Users size={32} className="text-[#D1D5DB] dark:text-[#4B5563]" />
            <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Aucun membre trouvé.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F3F4F6] dark:divide-[#2C2C2E]">
            {members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                currentUserId={user?.id ?? -1}
                canManage={canManage}
                orgId={orgId}
                onRefetch={refetch}
              />
            ))}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          orgId={orgId}
          onClose={() => setShowInvite(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}
