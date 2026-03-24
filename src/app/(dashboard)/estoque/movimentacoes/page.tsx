import { getProductsWithLastMovement } from '@/features/estoque/actions'
import { getProducts } from '@/features/estoque/actions'
import { formatDateTime, formatDecimal, serializeProduct } from '@/lib/utils'
import { MOVEMENT_TYPE_LABELS, MOVEMENT_ORIGIN_LABELS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { ArrowUpDown, Eye } from 'lucide-react'
import Link from 'next/link'
import { NewMovementForm } from './new-movement-form'
import { MovementSearch } from './movement-search'

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; busca?: string }>
}) {
  const { page, busca } = await searchParams
  const currentPage = Number(page) || 1
  const { products: productsWithMovements, total, pages } = await getProductsWithLastMovement(
    busca || undefined,
    currentPage,
  )
  const { products: rawProducts } = await getProducts(undefined, 1, false, 'all')
  const allProducts = rawProducts.map(serializeProduct)

  const buildHref = (overrides: Record<string, string | undefined> = {}) => {
    const p = { busca, ...overrides }
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
          <p className="text-muted-foreground text-sm">
            {total} produto(s) com movimentação
          </p>
        </div>
        <NewMovementForm products={allProducts} />
      </div>

      {/* Search filter */}
      <MovementSearch products={allProducts} defaultValue={busca} />

      {productsWithMovements.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="Sem movimentações"
          description={busca ? 'Nenhum produto encontrado com essa busca' : 'As movimentações de estoque aparecerão aqui'}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-right px-4 py-3 font-medium">Estoque Atual</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Última Mov.</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Origem</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Qtd</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Usuário</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Data</th>
                <th className="text-center px-4 py-3 font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {productsWithMovements.map((p) => {
                const lastMov = p.stockMovements[0]
                const unitAbbr = p.baseUnit?.unitOfMeasure?.abbreviation ?? p.baseUnitName
                return (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatDecimal(p.currentStock.toString(), 2)}{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        {unitAbbr}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lastMov && (
                        <Badge
                          variant={
                            lastMov.type === 'ENTRY'
                              ? 'success'
                              : lastMov.type === 'EXIT'
                                ? 'destructive'
                                : 'warning'
                          }
                        >
                          {MOVEMENT_TYPE_LABELS[lastMov.type as keyof typeof MOVEMENT_TYPE_LABELS]}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {lastMov && MOVEMENT_ORIGIN_LABELS[lastMov.origin as keyof typeof MOVEMENT_ORIGIN_LABELS]}
                    </td>
                    <td className="px-4 py-3 text-right font-medium hidden sm:table-cell">
                      {lastMov && (
                        <>
                          {lastMov.type === 'EXIT' ? '-' : '+'}{formatDecimal(lastMov.quantity.toString(), 2)}{' '}
                          <span className="text-xs text-muted-foreground font-normal">{unitAbbr}</span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {lastMov?.user.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      {lastMov && formatDateTime(lastMov.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/estoque/movimentacoes/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                        title="Ver movimentações"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Ver</span>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((pg) => (
            <Link
              key={pg}
              href={buildHref({ page: String(pg) })}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
                currentPage === pg
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {pg}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
