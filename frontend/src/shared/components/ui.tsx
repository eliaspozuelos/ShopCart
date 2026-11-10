import type { ReactNode } from 'react'

export function Spinner() {
  return (
    <span className="spinner" role="status" aria-label="Cargando">
      <span className="spinner-ring" />
      <img src="/logo1.svg" alt="" />
    </span>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  )
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
      {action}
    </div>
  )
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return <p className="form-error" role="alert">{message}</p>
}

export function Pagination({
  page,
  totalPages,
  onPage,
  disabled = false,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
  disabled?: boolean
}) {
  if (totalPages <= 1) return null
  return (
    <nav className="pagination" aria-label="Paginación">
      <button type="button" className="btn btn-ghost" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </button>
      <span>Página {page} de {totalPages}</span>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={disabled || page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  )
}
