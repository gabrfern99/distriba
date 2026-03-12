import { getMovements } from '@/features/estoque/actions'
import { getProducts } from '@/features/estoque/actions'
import { formatDateTime, formatDecimal, serializeProduct } from '@/lib/utils'
import { MOVEMENT_TYPE_LABELS, MOVEMENT_ORIGIN_LABELS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { NewMovementForm } from './new-movement-form'

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; produto?: string }>
}) {
  const { page, produto } = await searchParams
  const currentPage = Number(page) || 1
  const { movements, total, pages } = await getMovements(produto || undefined, currentPage)
  const { products: rawProducts } = await getProducts(undefined, 1, false, 'all')
  const products = rawProducts.map(serializeProduct)

  const buildHref = (overrides: Record<string, string | undefined> = {}) => {
    const p = { produto, ...overrides }
    const parts = Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    return `/estoque/movimentacoes${parts.length ? `?${parts.join('&')}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Movimentações</h1>
          <p className="text-muted-foreground text-sm">{total} movimentação(ões) registrada(s)</p>
        </div>
        <NewMovementForm products={products} />
      </div>

      {/* Product filter */}
      <form method="GET" className="flex gap-2 items-end">
        <div className="flex flex-col gap-1.5 flex-1 max-w-xs">
          <label htmlFor="produto" className="text-sm font-medium text-foreground">
            Filtrar por produto
          </label>
          <select
            id="produto"
            name="produto"
            defaultValue={produto ?? ''}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos os produtos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors h-9"
        >
          Filtrar
        </button>
        {produto && (
          <Link
            href="/estoque/movimentacoes"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors h-9"
          >
            Limpar
          </Link>
        )}
      </form>

      {movements.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="Sem movimentações"
          description={produto ? 'Nenhuma movimentação encontrada para este produto' : 'As movimentações de estoque aparecerão aqui'}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Origem</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Detalhe</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Saldo ant.</th>
                <th className="text-right px-4 py-3 font-medium">Saldo</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground text-xs">{formatDateTime(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.product.name}</div>
                    <div className="text-xs text-muted-foreground">{m.product.sku}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        m.type === 'ENTRY'
                          ? 'success'
                          : m.type === 'EXIT'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {MOVEMENT_TYPE_LABELS[m.type as keyof typeof MOVEMENT_TYPE_LABELS]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {MOVEMENT_ORIGIN_LABELS[m.origin as keyof typeof MOVEMENT_ORIGIN_LABELS]}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {m.type === 'EXIT' ? '-' : '+'}{formatDecimal(m.quantity.toString(), 2)}{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      {m.product.baseUnit?.unitOfMeasure?.abbreviation ?? ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {m.unitName && m.unitQuantity
                      ? `${Number(m.unitQuantity)} ${m.unitName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                    {formatDecimal(m.previousStock.toString(), 2)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatDecimal(m.newStock.toString(), 2)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {m.user.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
                currentPage === p
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
