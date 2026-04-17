import { auth } from '@/features/auth/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { TenantConfigForm } from './tenant-config-form'

export default async function ConfiguracoesPage() {
  const session = await auth()
  if (!session?.user?.tenantId) redirect('/login')

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, logoUrl: true },
  })

  if (!tenant) redirect('/login')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
        <p className="text-muted-foreground text-sm">Dados do tenant</p>
      </div>
      <TenantConfigForm tenant={tenant} />
    </div>
  )
}
