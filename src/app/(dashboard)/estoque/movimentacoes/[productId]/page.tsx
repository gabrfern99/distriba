import { getMovements, getProductById } from '@/features/estoque/actions'
import { formatDateTime, formatDecimal } from '@/lib/utils'
import { MOVEMENT_TYPE_LABELS, MOVEMENT_ORIGIN_LABELS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { ArrowUpDown, ArrowLeft, Calendar, Filter } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ProductMovementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{
    page?: string
    de?: string
    ate?: string
    tipo?: string
    origem?: string
  }>
}) {
  const { productId } = await params
  const { page, de, ate, tipo, origem } = await searchParams
  const currentPage = Number(page) || 1

  const product = await getProductById(productId)
  if (!product) notFound()

  const { movements, total, pages } = await getMovements(productId, currentPage, 50, {
    dateFrom: de || undefined,
    dateTo: ate || undefined,
    type: tipo || undefined,
    origin: origem || undefined,
  })

  const hasFilters = !!(de || ate || tipo || origem)

  const buildHref = (overrides: Record<string, string | undefined> = {}) => {
    const p = { de, ate, tipo, origem, ...overrides }
    const parts = Object.entries(p)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    return `/estoque/movimentacoes/${productId}${parts.length ? `?${parts.join('&')}` : ''}`
  }

  const unitLabel = product.baseUnit?.unitOfMeasure?.abbreviation ?? product.baseUnitName

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/estoque/movimentacoes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para movimentações
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground text-sm">
              SKU: {product.sku} — Estoque atual:{' '}
              <span className="font-medium text-foreground">
                {formatDecimal(product.currentStock.toString(), 2)} {unitLabel}
              </span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm text-muted-foreground">{total} movimentação(ões)</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4" />
          Filtros
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="de" className="text-xs font-medium text-muted-foreground">
              Data inicial
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                id="de"
                name="de"
                type="date"
                defaultValue={de ?? ''}
                className="flex h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ate" className="text-xs font-medium text-muted-foreground">
              Data final
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                id="ate"
                name="ate"
                type="date"
                defaultValue={ate ?? ''}
                className="flex h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipo" className="text-xs font-medium text-muted-foreground">
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={tipo ?? ''}
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Todos</option>
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Saída</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="origem" className="text-xs font-medium text-muted-foreground">
              Origem
            </label>
            <select
              id="origem"
              name="origem"
              defaultValue={origem ?? ''}
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Todas</option>
              <option value="MANUAL">Manual</option>
              <option value="SALE">Venda</option>
              <option value="PURCHASE_ORDER">Pedido de Compra</option>
              <option value="INVENTORY_ADJUSTMENT">Inventário</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors h-9"
          >
            Filtrar
          </button>
          {hasFilters && (
            <Link
              href={`/estoque/movimentacoes/${productId}`}
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors h-9"
            >
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {/* Movements table */}
      {movements.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="Sem movimentações"
          description={
            hasFilters
              ? 'Nenhuma movimentação encontrada com os filtros aplicados'
              : 'Nenhuma movimentação registrada para este produto'
          }
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Origem</th>
                <th className="text-right px-4 py-3 font-medium">Qtd</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Detalhe</th>
                <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Saldo ant.</th>
                <th className="text-right px-4 py-3 font-medium">Saldo</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Usuário</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {formatDateTime(m.createdAt)}
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
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {MOVEMENT_ORIGIN_LABELS[m.origin as keyof typeof MOVEMENT_ORIGIN_LABELS]}
                  </td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    <span className={m.type === 'EXIT' ? 'text-red-600' : 'text-green-600'}>
                      {m.type === 'EXIT' ? '-' : '+'}{formatDecimal(m.quantity.toString(), 2)}
                    </span>{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      {unitLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {m.unitName && m.unitQuantity
                      ? `${Number(m.unitQuantity)} ${m.unitName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                    {formatDecimal(m.previousStock.toString(), 2)}{' '}
                    <span className="text-xs">{unitLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatDecimal(m.newStock.toString(), 2)}{' '}
                    <span className="text-xs text-muted-foreground font-normal">{unitLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {m.user.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[200px] truncate">
                    {m.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
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
