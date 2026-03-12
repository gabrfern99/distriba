export function calcSubtotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100
}

export function calcTotal(
  items: Array<{ quantity: number; unitPrice: number }>,
): number {
  return Math.round(
    items.reduce((sum, item) => sum + calcSubtotal(item.quantity, item.unitPrice), 0) * 100,
  ) / 100
}
