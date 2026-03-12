import { getInventories } from '@/features/estoque/actions'
import { formatDateTime } from '@/lib/utils'
import { InventoryStatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { ClipboardList, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function InventarioPage() {
  const { inventories } = await getInventories()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventários</h1>
          <p className="text-muted-foreground text-sm">Contagens físicas de estoque</p>
        </div>
        <Link
          href="/estoque/inventario/novo"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo inventário
        </Link>
      </div>

      {inventories.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Sem inventários"
          description="Crie um inventário para contar o estoque físico"
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Itens</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventories.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono font-medium">{inv.code}</td>
                  <td className="px-4 py-3">
                    <InventoryStatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-right">{inv._count.items}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatDateTime(inv.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/estoque/inventario/${inv.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Ver
                    </Link>
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
