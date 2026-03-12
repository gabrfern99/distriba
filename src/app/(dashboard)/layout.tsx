import { auth } from '@/features/auth/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import prisma from '@/lib/prisma'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.tenantId) {
    redirect('/login?error=no-tenant')
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true },
  })

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar tenantRole={session.user.tenantRole} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header userName={session.user.name ?? ''} tenantName={tenant?.name} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
