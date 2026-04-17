import { getProductById } from '@/features/estoque/actions'
import { getMovements } from '@/features/estoque/actions'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDateTime, formatDecimal } from '@/lib/utils'
import { isLowStock, getStockEquivalents } from '@/features/estoque/utils'
import { MOVEMENT_TYPE_LABELS, MOVEMENT_ORIGIN_LABELS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'

export default async function ProductViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mpage?: string }>
}) {
  const { id } = await params
  const { mpage } = await searchParams
  const movPage = Number(mpage) || 1

  const [product, { movements, total: movTotal, pages: movPages }] = await Promise.all([
    getProductById(id),
    getMovements(id, movPage, 10),
  ])

  if (!product) notFound()

  const baseStock = Number(product.currentStock)
  const low = isLowStock(baseStock, Number(product.minStock))
  const absUnit = product.productUnits.find((pu) => Number(pu.conversionFactor) === 1)
  const baseUnitLabel = absUnit?.unitOfMeasure.abbreviation
    ?? product.baseUnit?.unitOfMeasure?.abbreviation
    ?? null
  const equivalents = getStockEquivalents(
    baseStock,
    product.productUnits.filter((pu) => Number(pu.conversionFactor) !== 1),
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/estoque" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              <Badge variant={product.isActive ? 'success' : 'destructive'}>
                {product.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
          </div>
        </div>
        <Link
          href={`/estoque/${id}/editar`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Link>
      </div>

      {/* Stock overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-border bg-muted/10">
        <div className="col-span-2 sm:col-span-1">
          <div className="text-xs text-muted-foreground mb-1">Estoque atual</div>
          <div className={`text-xl font-bold ${low ? 'text-destructive' : ''}`}>
            {formatDecimal(baseStock, 2)} {baseUnitLabel ?? ''}
          </div>
          {equivalents.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {equivalents.map((e) => (
                <div key={e.abbreviation} className="text-xs text-muted-foreground">
                  = {parseFloat(e.quantity.toFixed(3))} {e.name}
                  <span className="opacity-50 ml-1">(fator {e.conversionFactor})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Estoque mínimo</div>
          <div className="text-lg font-medium">
            {formatDecimal(Number(product.minStock), 2)} {baseUnitLabel ?? ''}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Unidades</div>
          <div className="text-lg font-medium">{product.productUnits.length}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Situação</div>
          <div className={`text-sm font-semibold ${low ? 'text-destructive' : 'text-green-600'}`}>
            {low ? 'Estoque baixo' : 'Adequado'}
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Descrição</h2>
          <p className="text-sm text-muted-foreground">{product.description}</p>
        </section>
      )}

      {/* Units */}
      {product.productUnits.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Unidades</h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Unidade</th>
                  <th className="text-right px-4 py-3 font-medium">Fator de conversão</th>
                  <th className="text-right px-4 py-3 font-medium">Preço de venda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {product.productUnits.map((pu) => (
                  <tr key={pu.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-medium">{pu.unitOfMeasure.name}</span>
                      <span className="text-muted-foreground ml-1">({pu.unitOfMeasure.abbreviation})</span>
                      {pu.id === product.baseUnitId && (
                        <Badge variant="default" className="ml-2 text-[10px]">Base</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{Number(pu.conversionFactor)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(Number(pu.salePrice))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Movements */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Últimas movimentações</h2>
          {movTotal > 0 && (
            <span className="text-xs text-muted-foreground">{movTotal} movimentação(ões)</span>
          )}
        </div>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem movimentações registradas</p>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Data</th>
                    <th className="text-left px-4 py-3 font-medium">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium">Origem</th>
                    <th className="text-right px-4 py-3 font-medium">Qtd</th>
                    <th className="text-left px-4 py-3 font-medium">Detalhe</th>
                    <th className="text-right px-4 py-3 font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(m.createdAt)}</td>
                      <td className="px-4 py-3">
                        {MOVEMENT_TYPE_LABELS[m.type as keyof typeof MOVEMENT_TYPE_LABELS]}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {MOVEMENT_ORIGIN_LABELS[m.origin as keyof typeof MOVEMENT_ORIGIN_LABELS]}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {m.type === 'EXIT' ? '-' : '+'}
                        {formatDecimal(
                          (m.unitQuantity != null ? Number(m.unitQuantity) : Number(m.quantity)).toString(),
                          2,
                        )}{' '}
                        <span className="text-xs text-muted-foreground">
                          {m.unitName ?? baseUnitLabel ?? ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {m.unitName && m.unitQuantity
                          ? `${Number(m.unitQuantity)} ${m.unitName}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">{formatDecimal(m.newStock.toString(), 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {movPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {Array.from({ length: movPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/estoque/${id}?mpage=${p}`}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
                      movPage === p
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border hover:bg-muted'
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
