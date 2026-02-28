'use client'

import { useQuery } from '@tanstack/react-query'
import { MapPin, Route, Building2, Activity, Plus, ArrowRight } from 'lucide-react'
import { citiesApi, routesApi } from '@/lib/api-client'
import { StatCard } from '@/components/ui/stat-card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface City {
  id: number
  name: string
  province: string | null
  country: string | null
  timezone: string | null
  isActive: number | boolean
}

interface RouteRow {
  id: number
  fromCity: { name: string } | null
  toCity: { name: string } | null
  distanceKm: number | null
  estimatedDurationMin: number | null
  isActive: number | boolean
}

interface ApiList<T> {
  success: true
  data: T[]
  meta: { total: number; page: number; perPage: number; lastPage: number }
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Column definitions ───────────────────────────────────────────────────────

const cityColumns: Column<City>[] = [
  {
    key: 'name',
    header: 'City',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">{row.name}</span>
    ),
  },
  {
    key: 'province',
    header: 'Province',
    render: (row) => (
      <span className="text-[#6B7280] dark:text-[#8E8E93]">{row.province ?? '—'}</span>
    ),
  },
  {
    key: 'timezone',
    header: 'Timezone',
    render: (row) => (
      <span className="font-mono text-xs text-[#6B7280] dark:text-[#8E8E93]">
        {row.timezone ?? '—'}
      </span>
    ),
  },
  {
    key: 'isActive',
    header: 'Status',
    align: 'right',
    render: (row) => (
      <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
    ),
  },
]

const routeColumns: Column<RouteRow>[] = [
  {
    key: 'fromCity',
    header: 'Origin',
    render: (row) => (
      <span className="font-medium text-[#111827] dark:text-[#F9FAFB]">
        {row.fromCity?.name ?? '—'}
      </span>
    ),
  },
  {
    key: 'toCity',
    header: 'Destination',
    render: (row) => (
      <span className="text-[#6B7280] dark:text-[#8E8E93]">
        {row.toCity?.name ?? '—'}
      </span>
    ),
  },
  {
    key: 'distanceKm',
    header: 'Distance',
    align: 'right',
    render: (row) => (
      <span className="tabular-nums text-[#6B7280] dark:text-[#8E8E93]">
        {row.distanceKm != null ? `${row.distanceKm} km` : '—'}
      </span>
    ),
  },
  {
    key: 'isActive',
    header: 'Status',
    align: 'right',
    render: (row) => (
      <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
    ),
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: citiesRes, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => citiesApi.list({ perPage: 50 }) as Promise<ApiList<City>>,
  })

  const { data: routesRes, isLoading: routesLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: () => routesApi.list({ perPage: 50 }) as Promise<ApiList<RouteRow>>,
  })

  const cities = citiesRes?.data ?? []
  const routes = routesRes?.data ?? []
  const cityCount = citiesRes?.meta.total ?? 0
  const routeCount = routesRes?.meta.total ?? 0

  return (
    <div className="space-y-8">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#9CA3AF] dark:text-[#6B7280]">
            {formatDate()}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F9FAFB]">
            {greeting()}{user?.firstName ? `, ${user.firstName}` : ''}.
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Button variant="secondary" size="sm" leadingIcon={<Plus size={14} />}>
            New trip
          </Button>
          <Button variant="primary" size="sm" leadingIcon={<Plus size={14} />}>
            New booking
          </Button>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active cities"
          value={citiesLoading ? '—' : cityCount}
          icon={<MapPin size={17} />}
          iconClass="bg-[#EFF6FF] dark:bg-[#0A7AFF]/15 text-[#0A7AFF]"
          description="Served destinations"
          loading={citiesLoading}
        />
        <StatCard
          label="Routes"
          value={routesLoading ? '—' : routeCount}
          icon={<Route size={17} />}
          iconClass="bg-[#F0FDF4] dark:bg-[#16A34A]/15 text-[#16A34A]"
          description="Configured connections"
          loading={routesLoading}
        />
        <StatCard
          label="Bookings today"
          value="—"
          icon={<Activity size={17} />}
          iconClass="bg-[#FFF7ED] dark:bg-[#F59E0B]/15 text-[#F59E0B]"
          description="Available in Skill 04"
        />
        <StatCard
          label="Organizations"
          value="—"
          icon={<Building2 size={17} />}
          iconClass="bg-[#FDF4FF] dark:bg-[#A855F7]/15 text-[#A855F7]"
          description="Available in Skill 01 auth"
        />
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Cities table */}
        <div className="xl:col-span-2 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
            <div>
              <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Cities</h2>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
                {cityCount} destination{cityCount !== 1 ? 's' : ''} configured
              </p>
            </div>
            <Link
              href="./routes"
              className="flex items-center gap-1 text-xs font-medium text-[#0A7AFF] hover:underline"
            >
              Manage <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-4">
            <DataTable<City>
              columns={cityColumns}
              data={cities}
              rowKey={(r) => r.id}
              loading={citiesLoading}
              emptyMessage="No cities configured yet."
              pageSize={8}
            />
          </div>
        </div>

        {/* Quick start sidebar */}
        <div className="space-y-4">
          {/* Routes card */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] dark:border-[#2C2C2E]">
              <div>
                <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Routes</h2>
                <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-0.5">
                  {routeCount} route{routeCount !== 1 ? 's' : ''} configured
                </p>
              </div>
            </div>
            <div className="p-4">
              <DataTable<RouteRow>
                columns={routeColumns}
                data={routes}
                rowKey={(r) => r.id}
                loading={routesLoading}
                emptyMessage="No routes yet. Add cities first."
                pageSize={5}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-[#E5E7EB] dark:border-[#2C2C2E] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
            <h2 className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] mb-4">
              Quick actions
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Add a city', href: './routes', icon: <MapPin size={14} /> },
                { label: 'Create a route', href: './routes', icon: <Route size={14} /> },
                { label: 'Invite team member', href: './users', icon: <Building2 size={14} /> },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#374151] dark:text-[#D1D5DB] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] transition-colors duration-100"
                >
                  <span className="text-[#9CA3AF] dark:text-[#6B7280]">{action.icon}</span>
                  {action.label}
                  <ArrowRight size={13} className="ml-auto text-[#D1D5DB] dark:text-[#4B5563]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
