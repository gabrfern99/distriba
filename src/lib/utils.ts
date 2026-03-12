import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | { toString(): string }): string {
  const num = typeof value === 'number' ? value : parseFloat(value.toString())
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDecimal(value: number | string | { toString(): string }, decimals = 4): string {
  const num = typeof value === 'number' ? value : parseFloat(value.toString())
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function generateCode(prefix: string, count: number): string {
  return `${prefix}${String(count + 1).padStart(6, '0')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeProduct<T extends Record<string, any>>(p: T): T {
  return {
    ...p,
    currentStock: Number(p.currentStock),
    minStock: Number(p.minStock),
    costPrice: Number(p.costPrice),
    salePrice: Number(p.salePrice),
    productUnits: (p.productUnits ?? []).map((pu: Record<string, unknown>) => ({
      ...pu,
      conversionFactor: Number(pu.conversionFactor),
      salePrice: Number(pu.salePrice ?? 0),
    })),
    ...(p.baseUnit
      ? {
          baseUnit: {
            ...p.baseUnit,
            conversionFactor: Number(p.baseUnit.conversionFactor),
            salePrice: Number(p.baseUnit.salePrice ?? 0),
          },
        }
      : {}),
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}
