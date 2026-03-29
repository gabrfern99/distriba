'use client'

import { useState } from 'react'
import { GeneralDataForm } from './general-data-form'
import { UnitsTab } from './units-tab'
import type { UnitOfMeasure } from '@prisma/client'

interface SerializedProduct {
  id: string
  name: string
  sku: string
  description: string | null
  minStock: number
  baseUnitId: string | null
  isActive: boolean
  baseUnit: {
    id: string
    unitOfMeasure: { name: string; abbreviation: string }
  } | null
  productUnits: Array<{
    id: string
    unitOfMeasureId: string
    conversionFactor: number
    salePrice: number
    unitOfMeasure: { id: string; name: string; abbreviation: string }
  }>
}

interface EditProductTabsProps {
  product: SerializedProduct
  units: UnitOfMeasure[]
}

export function EditProductTabs({ product, units }: EditProductTabsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'units'>('general')

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 rounded-lg border border-border p-1 bg-muted/30 self-start w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'general'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Dados gerais
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('units')}
          className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'units'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Unidades
          {product.productUnits.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-semibold">
              {product.productUnits.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'general' ? (
        <GeneralDataForm product={product} />
      ) : (
        <UnitsTab product={product} units={units} />
      )}
    </div>
  )
}
