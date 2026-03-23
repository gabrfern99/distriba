'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface Product {
  id: string
  name: string
  sku: string
}

export function MovementSearch({
  products,
  defaultValue,
}: {
  products: Product[]
  defaultValue?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue ?? '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim().length > 0
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 10)
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(productId: string) {
    setOpen(false)
    router.push(`/estoque/movimentacoes/${productId}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setOpen(false)
    const params = query.trim() ? `?busca=${encodeURIComponent(query.trim())}` : ''
    router.push(`/estoque/movimentacoes${params}`)
  }

  function handleClear() {
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
    if (defaultValue) {
      router.push('/estoque/movimentacoes')
    }
  }

  return (
    <div ref={containerRef} className="relative flex gap-2 items-end">
      <div className="flex flex-col gap-1.5 flex-1 max-w-sm">
        <label htmlFor="busca" className="text-sm font-medium text-foreground">
          Pesquisar produto
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            id="busca"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(e.target.value.trim().length > 0)
            }}
            onFocus={() => {
              if (query.trim().length > 0) setOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Nome do produto, SKU..."
            autoComplete="off"
            className="flex h-9 w-full rounded-md border border-border bg-background pl-9 pr-8 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 hover:bg-muted text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && filtered.length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full max-w-sm rounded-md border border-border bg-background shadow-lg">
            <div className="max-h-64 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className="flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.sku}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors h-9"
      >
        Pesquisar
      </button>
      {defaultValue && (
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors h-9"
        >
          Limpar
        </button>
      )}
    </div>
  )
}
