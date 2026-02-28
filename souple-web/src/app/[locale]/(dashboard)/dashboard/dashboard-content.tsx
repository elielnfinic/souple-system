'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Route, Ticket, Users, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalTrips: number
  totalRevenueCdf: number
  activeBookings: number
  passengersToday: number
}

interface TripRow {
  id: number
  routeName: string
  departureTime: string
  status: string
}

interface BookingRow {
  id: number
  reference: string
  passengerName: string
  routeName: string
  status: string
}

interface StatsResponse {
  success: true
  data: DashboardStats
}

interface TripsResponse {
  success: true
  data: { items: TripRow[] }
}

interface BookingsResponse {
  success: true
  data: { items: BookingRow[] }
}

// ─── Placeholder data (shown when API is unavailable) ─────────────────────────

const PLACEHOLDER_STATS: DashboardStats = {
  totalTrips: 0,
  totalRevenueCdf: 0,
  activeBookings: 0,
  passengersToday: 0,
}

const PLACEHOLDER_TRIPS: TripRow[] = []
const PLACEHOLDER_BOOKINGS: BookingRow[] = []

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>(PLACEHOLDER_STATS)
  const [trips, setTrips] = useState<TripRow[]>(PLACEHOLDER_TRIPS)
  const [bookings, setBookings] = useState<BookingRow[]>(PLACEHOLDER_BOOKINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, tripsRes, bookingsRes] = await Promise.all([
          api.get<StatsResponse>('/dashboard/stats'),
          api.get<TripsResponse>('/trips', { params: { limit: 5, sort: 'departureTime', order: 'desc' } }),
          api.get<BookingsResponse>('/bookings', { params: { limit: 5, sort: 'createdAt', order: 'desc' } }),
        ])
        setStats(statsRes.data)
        setTrips(tripsRes.data.items)
        setBookings(bookingsRes.data.items)
      } catch {
        // API not yet available — keep placeholder data
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">
          Dashboard
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
          Welcome back. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Trips"
          value={loading ? '—' : stats.totalTrips.toLocaleString()}
          icon={<Route />}
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Total Revenue (CDF)"
          value={loading ? '—' : formatCurrency(stats.totalRevenueCdf, 'CDF')}
          icon={<TrendingUp />}
          color="green"
          loading={loading}
        />
        <StatCard
          label="Active Bookings"
          value={loading ? '—' : stats.activeBookings.toLocaleString()}
          icon={<Ticket />}
          color="yellow"
          loading={loading}
        />
        <StatCard
          label="Passengers Today"
          value={loading ? '—' : stats.passengersToday.toLocaleString()}
          icon={<Users />}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent trips */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trips</CardTitle>
            <Link
              href="trips"
              className="text-xs text-[#0A7AFF] hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 rounded bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                      <div className="h-3 w-20 rounded bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : trips.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#9CA3AF]">No trips yet.</p>
            ) : (
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
                {trips.map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
                        {trip.routeName}
                      </p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {new Date(trip.departureTime).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={trip.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <Link
              href="bookings"
              className="text-xs text-[#0A7AFF] hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 rounded bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                      <div className="h-3 w-20 rounded bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-[#E5E7EB] dark:bg-[#374151] animate-pulse" />
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#9CA3AF]">No bookings yet.</p>
            ) : (
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#374151]">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB]">
                        {booking.passengerName}
                      </p>
                      <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                        {booking.routeName} · {booking.reference}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
