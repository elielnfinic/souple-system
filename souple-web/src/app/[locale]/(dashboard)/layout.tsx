import { DashboardShell } from '@/components/layout/DashboardShell'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = await params
  return <DashboardShell locale={locale}>{children}</DashboardShell>
}
