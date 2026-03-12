export function convertToBaseUnit(quantity: number, conversionFactor: number): number {
  return quantity * conversionFactor
}

export function convertFromBaseUnit(baseQuantity: number, conversionFactor: number): number {
  return baseQuantity / conversionFactor
}

export function isLowStock(currentStock: number | string, minStock: number | string): boolean {
  return parseFloat(currentStock.toString()) <= parseFloat(minStock.toString())
}

export interface UnitEquivalent {
  name: string
  abbreviation: string
  quantity: number
  conversionFactor: number
}

/**
 * Given a stock quantity in base units and the product's derived units,
 * returns a list of equivalent quantities in each unit (largest factor first).
 */
export function getStockEquivalents(
  baseStock: number,
  productUnits: Array<{
    conversionFactor: number | { toString(): string }
    unitOfMeasure: { name: string; abbreviation: string }
  }>,
): UnitEquivalent[] {
  return productUnits
    .map((pu) => ({
      name: pu.unitOfMeasure.name,
      abbreviation: pu.unitOfMeasure.abbreviation,
      conversionFactor: Number(pu.conversionFactor),
      quantity: baseStock / Number(pu.conversionFactor),
    }))
    .sort((a, b) => b.conversionFactor - a.conversionFactor)
}

/**
 * Formats a stock value as "X base + equivalents in derived units".
 * e.g. baseStock=13, base="un", units=[{caixa, factor:6}] → "13 un. (2 cx. de 6)"
 */
export function formatStockWithEquivalents(
  baseStock: number,
  baseUnitName: string,
  productUnits: Array<{
    conversionFactor: number | { toString(): string }
    unitOfMeasure: { name: string; abbreviation: string }
  }>,
): string {
  if (productUnits.length === 0) return `${baseStock} ${baseUnitName}`

  const equivalents = getStockEquivalents(baseStock, productUnits)
    .map((e) => {
      const qty = parseFloat(e.quantity.toFixed(3))
      return `${qty} ${e.abbreviation}`
    })
    .join(' + ')

  return `${baseStock} ${baseUnitName} (= ${equivalents})`
}

/**
 * Formats a movement quantity showing the base unit and, if applicable,
 * the best equivalent in a derived unit.
 * e.g. qty=24, baseAbbr="un", units=[{caixa, cx, factor:12}] → "24 un (= 2 cx)"
 */
export function formatMovementQuantity(
  qty: number,
  baseAbbr: string,
  productUnits: Array<{
    id: string
    conversionFactor: number | { toString(): string }
    unitOfMeasure: { name: string; abbreviation: string }
  }>,
  baseUnitId?: string | null,
): { base: string; equivalent: string | null } {
  const base = `${qty} ${baseAbbr}`

  const nonBaseUnits = productUnits
    .filter((pu) => pu.id !== baseUnitId && Number(pu.conversionFactor) > 1)
    .sort((a, b) => Number(b.conversionFactor) - Number(a.conversionFactor))

  for (const pu of nonBaseUnits) {
    const factor = Number(pu.conversionFactor)
    const converted = qty / factor
    if (Number.isInteger(converted) && converted > 0) {
      return { base, equivalent: `${converted} ${pu.unitOfMeasure.abbreviation}` }
    }
  }

  for (const pu of nonBaseUnits) {
    const factor = Number(pu.conversionFactor)
    const converted = qty / factor
    if (converted >= 1) {
      const rounded = parseFloat(converted.toFixed(2))
      return { base, equivalent: `${rounded} ${pu.unitOfMeasure.abbreviation}` }
    }
  }

  return { base, equivalent: null }
}
