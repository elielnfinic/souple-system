import type { Metadata } from 'next'
import { StatCardSkeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] dark:text-[#F9FAFB]">
          Dashboard
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] mt-1">
          Welcome back. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats grid — skeleton while loading */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* TODO: Skill 09 will fill in real charts and metrics */}
      <div className="rounded-lg border border-[#E5E7EB] dark:border-[#374151] bg-white dark:bg-[#1F2937] p-8 text-center">
        <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Dashboard metrics will be available after Skill 09 (Dashboards &amp; Reporting) is complete.
        </p>
      </div>
    </div>
  )
}
