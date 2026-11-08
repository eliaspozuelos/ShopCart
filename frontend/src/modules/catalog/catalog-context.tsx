import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { errorMessage } from '../../shared/api/client.ts'
import { listCategories } from './catalog.api.ts'
import type { Category } from './catalog.types.ts'
import { CatalogContext } from './use-catalog.ts'

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listCategories()
      .then((items) => {
        if (active) setCategories(items)
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => ({ categories, loading, error }), [categories, loading, error])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}
