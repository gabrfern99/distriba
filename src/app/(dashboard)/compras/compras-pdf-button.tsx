'use client'

import { useState } from 'react'
import { getPurchaseOrderById } from '@/features/compras/actions'
import { FileDown } from 'lucide-react'

interface ComprasPdfButtonProps {
  orderId: string
}

export function ComprasPdfButton({ orderId }: ComprasPdfButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const order = await getPurchaseOrderById(orderId)
      if (!order) return

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageW = 210
      const marginL = 14
      const marginR = 14
      const contentW = pageW - marginL - marginR
      let y = 18

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('Pedido de Compra', marginL, y)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Código: ${order.code}`, pageW - marginR, y, { align: 'right' })

      y += 8
      doc.setFontSize(10)
      doc.text(`Fornecedor: ${order.supplier.name}`, marginL, y)

      y += 6
      const createdDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }).format(new Date(order.createdAt))
      doc.text(`Data: ${createdDate}`, marginL, y)

      if (order.completedAt) {
        const completedDate = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }).format(new Date(order.completedAt))
        doc.text(`Concluído em: ${completedDate}`, marginL + 70, y)
      }

      if (order.notes) {
        y += 6
        doc.text(`Observações: ${order.notes}`, marginL, y)
      }

      y += 10
      doc.setDrawColor(180, 180, 180)
      doc.line(marginL, y, pageW - marginR, y)
      y += 6

      const colWidths = { product: contentW * 0.42, unit: contentW * 0.14, qty: contentW * 0.12, price: contentW * 0.16, subtotal: contentW * 0.16 }
      const colX = {
        product: marginL,
        unit: marginL + colWidths.product,
        qty: marginL + colWidths.product + colWidths.unit,
        price: marginL + colWidths.product + colWidths.unit + colWidths.qty,
        subtotal: marginL + colWidths.product + colWidths.unit + colWidths.qty + colWidths.price,
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Produto', colX.product, y)
      doc.text('Unidade', colX.unit, y)
      doc.text('Qtd', colX.qty + colWidths.qty, y, { align: 'right' })
      doc.text('Preço unit.', colX.price + colWidths.price, y, { align: 'right' })
      doc.text('Subtotal', colX.subtotal + colWidths.subtotal, y, { align: 'right' })

      y += 4
      doc.setDrawColor(180, 180, 180)
      doc.line(marginL, y, pageW - marginR, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      const fmt = (n: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

      for (const item of order.items) {
        if (y > 270) {
          doc.addPage()
          y = 18
        }

        const productName = item.product?.name ?? item.productName
        const lines = doc.splitTextToSize(productName, colWidths.product - 2)
        doc.text(lines, colX.product, y)
        doc.text(item.unitName, colX.unit, y)
        doc.text(String(parseFloat(item.quantity.toString())), colX.qty + colWidths.qty, y, { align: 'right' })
        doc.text(fmt(parseFloat(item.unitPrice.toString())), colX.price + colWidths.price, y, { align: 'right' })
        doc.text(fmt(parseFloat(item.subtotal.toString())), colX.subtotal + colWidths.subtotal, y, { align: 'right' })

        const rowH = Math.max(lines.length * 4.5, 6)
        y += rowH
      }

      y += 3
      doc.setDrawColor(180, 180, 180)
      doc.line(marginL, y, pageW - marginR, y)
      y += 6

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Total', colX.price + colWidths.price, y, { align: 'right' })
      doc.text(
        fmt(parseFloat(order.totalAmount.toString())),
        colX.subtotal + colWidths.subtotal,
        y,
        { align: 'right' },
      )

      doc.save(`pedido-${order.code}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Baixar PDF"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <FileDown className="h-3.5 w-3.5" />
      {loading ? '...' : 'PDF'}
    </button>
  )
}
