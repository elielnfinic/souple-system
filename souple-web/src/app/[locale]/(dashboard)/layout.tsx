import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { locale } = await params

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (hidden on mobile) */}
      <div className="relative hidden md:block">
        <Sidebar locale={locale} />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-[#030712]"
        >
          <div className="max-w-[1280px] mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
