import { getSuppliers } from '@/features/compras/actions'
import { EmptyState } from '@/components/shared/empty-state'
import { Users, Plus } from 'lucide-react'
import { SupplierForm } from './supplier-form'
import { SupplierActions } from './supplier-actions'

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const { suppliers, total } = await getSuppliers(q)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground text-sm">{total} fornecedor(es)</p>
        </div>
        <SupplierForm />
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome..."
          className="flex h-9 w-full max-w-sm rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button type="submit" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Buscar
        </button>
      </form>

      {suppliers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum fornecedor"
          description="Cadastre fornecedores para criar pedidos de compra"
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Contato</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">CNPJ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {s.phone && <div>{s.phone}</div>}
                    {s.email && <div>{s.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.document ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <SupplierActions supplier={s} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
