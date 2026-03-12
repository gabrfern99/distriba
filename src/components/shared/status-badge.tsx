import { Badge } from '@/components/ui/badge'
import {
  SALE_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_LABELS,
  INVENTORY_STATUS_LABELS,
} from '@/lib/constants'

export function SaleStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED'
      ? 'success'
      : status === 'CANCELLED'
        ? 'destructive'
        : 'outline'

  return (
    <Badge variant={variant}>
      {SALE_STATUS_LABELS[status as keyof typeof SALE_STATUS_LABELS] ?? status}
    </Badge>
  )
}

export function PurchaseOrderStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED'
      ? 'success'
      : status === 'CANCELLED'
        ? 'destructive'
        : status === 'SENT'
          ? 'warning'
          : 'outline'

  return (
    <Badge variant={variant}>
      {PURCHASE_ORDER_STATUS_LABELS[status as keyof typeof PURCHASE_ORDER_STATUS_LABELS] ?? status}
    </Badge>
  )
}

export function InventoryStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'COMPLETED'
      ? 'success'
      : status === 'CANCELLED'
        ? 'destructive'
        : 'outline'

  return (
    <Badge variant={variant}>
      {INVENTORY_STATUS_LABELS[status as keyof typeof INVENTORY_STATUS_LABELS] ?? status}
    </Badge>
  )
}
