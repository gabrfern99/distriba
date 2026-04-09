import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  buildHref: (page: number) => string
}

export function Pagination({ currentPage, totalPages, buildHref }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <div className="flex items-center justify-center gap-1">
      <Link
        href={currentPage > 1 ? buildHref(currentPage - 1) : '#'}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
          currentPage <= 1
            ? 'pointer-events-none opacity-40 border border-border'
            : 'border border-border hover:bg-muted'
        }`}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="inline-flex h-8 w-8 items-center justify-center text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p as number)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
              currentPage === p
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:bg-muted'
            }`}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={currentPage < totalPages ? buildHref(currentPage + 1) : '#'}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
          currentPage >= totalPages
            ? 'pointer-events-none opacity-40 border border-border'
            : 'border border-border hover:bg-muted'
        }`}
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}

interface ClientPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ClientPagination({ currentPage, totalPages, onPageChange }: ClientPaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
          currentPage <= 1
            ? 'opacity-40 border border-border cursor-not-allowed'
            : 'border border-border hover:bg-muted'
        }`}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="inline-flex h-8 w-8 items-center justify-center text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
              currentPage === p
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:bg-muted'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
          currentPage >= totalPages
            ? 'opacity-40 border border-border cursor-not-allowed'
            : 'border border-border hover:bg-muted'
        }`}
        aria-label="Próxima página"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
