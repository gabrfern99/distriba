import { getProducts } from '@/features/estoque/actions'
import { formatDecimal } from '@/lib/utils'
import { isLowStock, getStockEquivalents } from '@/features/estoque/utils'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/shared/pagination'
import { EmptyState } from '@/components/shared/empty-state'
import { Package, Plus, AlertTriangle, Search } from 'lucide-react'
import Link from 'next/link'
import { ProductActions } from './product-actions'

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; low?: string; status?: string }>
}) {
  const { q, page, low, status } = await searchParams
  const lowStockOnly = low === '1'
  const statusFilter = (status as 'all' | 'active' | 'inactive') || 'active'

  const { products, total, pages } = await getProducts(
    q,
    Number(page) || 1,
    lowStockOnly,
    statusFilter,
  )

  const buildHref = (overrides: Record<string, string | undefined> = {}) => {
    const p = { q, low, status, ...overrides }
    const parts = Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    return `/estoque${parts.length ? `?${parts.join('&')}` : ''}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground text-sm">
            {total} produto(s){' '}
            {lowStockOnly
              ? 'com estoque baixo'
              : statusFilter === 'inactive'
              ? 'inativo(s)'
              : statusFilter === 'all'
              ? 'no total'
              : 'ativo(s)'}
          </p>
        </div>
        <Link
          href="/estoque/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </Link>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form method="GET" className="flex gap-2 flex-1">
          {lowStockOnly && <input type="hidden" name="low" value="1" />}
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome ou SKU..."
              className="flex h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Buscar
          </button>
        </form>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg border border-border p-1 bg-muted/30 self-start flex-wrap">
          <Link
            href={buildHref({ status: 'active', low: undefined })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'active' && !lowStockOnly
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ativos
          </Link>
          <Link
            href={buildHref({ status: 'inactive', low: undefined })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inativos
          </Link>
          <Link
            href={buildHref({ status: 'all', low: undefined })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === 'all' && !lowStockOnly
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </Link>
          <Link
            href={buildHref({ low: '1', status: 'active' })}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              lowStockOnly
                ? 'bg-background text-destructive shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            Estoque baixo
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={lowStockOnly ? 'Nenhum produto com estoque baixo' : 'Nenhum produto encontrado'}
          description={
            lowStockOnly
              ? 'Todos os produtos estão com estoque adequado'
              : q
              ? 'Tente uma busca diferente'
              : 'Cadastre o primeiro produto'
          }
          action={
            !q && !lowStockOnly ? (
              <Link
                href="/estoque/novo"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Novo Produto
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">SKU</th>
                <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-medium">Estoque atual</th>
                <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Mínimo</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => {
                const low = isLowStock(product.currentStock.toString(), product.minStock.toString())
                const baseStock = Number(product.currentStock)
                const equivalents = getStockEquivalents(baseStock, product.productUnits)
                const baseUnitLabel = product.baseUnit
                  ? product.baseUnit.unitOfMeasure.abbreviation
                  : ''
                return (
                  <tr key={product.id} className={`hover:bg-muted/20 transition-colors ${!product.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.name}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <Badge variant={product.isActive ? 'success' : 'destructive'}>
                        {product.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${low ? 'text-destructive' : ''}`}>
                            {formatDecimal(baseStock, 2)} {baseUnitLabel}
                          </span>
                          {low && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Baixo</Badge>}
                        </div>
                        {equivalents.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {equivalents.map((e) => (
                              <span key={e.abbreviation} className="after:content-['·'] after:mx-1 last:after:content-[''] after:opacity-40">
                                {parseFloat(e.quantity.toFixed(3))} {e.abbreviation}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                      {formatDecimal(Number(product.minStock), 2)} {baseUnitLabel}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/estoque/${product.id}`}
                          className="text-muted-foreground hover:text-foreground hover:underline text-xs"
                        >
                          Visualizar
                        </Link>
                        <Link
                          href={`/estoque/${product.id}/editar`}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          Editar
                        </Link>
                        <ProductActions productId={product.id} productName={product.name} isActive={product.isActive} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={Number(page) || 1}
        totalPages={pages}
        buildHref={(p) => buildHref({ page: p > 1 ? String(p) : undefined })}
      />
    </div>
  )
}
