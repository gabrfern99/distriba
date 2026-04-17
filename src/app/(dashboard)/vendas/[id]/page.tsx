import { getSaleById } from '@/features/vendas/actions'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { SaleStatusBadge } from '@/components/shared/status-badge'
import { SaleActions } from './sale-actions'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sale = await getSaleById(id)

  if (!sale) notFound()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vendas" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Venda {sale.code}</h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/10 px-5 py-3 sm:flex-col sm:items-end sm:gap-1">
          <div className="flex items-center gap-3">
            <SaleStatusBadge status={sale.status} />
            <SaleActions saleId={sale.id} status={sale.status} />
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total da venda</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(sale.totalAmount.toString())}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Produto</th>
              <th className="text-left px-4 py-3 font-medium">Unidade</th>
              <th className="text-right px-4 py-3 font-medium">Qtd</th>
              <th className="text-right px-4 py-3 font-medium">Preço unit.</th>
              <th className="text-right px-4 py-3 font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-xs text-muted-foreground">{item.productSku}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.unitName}</td>
                <td className="px-4 py-3 text-right">{parseFloat(item.quantity.toString())}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.unitPrice.toString())}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal.toString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sale.notes && (
        <div className="p-4 rounded-lg border border-border">
          <div className="text-sm font-medium mb-1">Observações</div>
          <div className="text-sm text-muted-foreground">{sale.notes}</div>
        </div>
      )}
    </div>
  )
}
