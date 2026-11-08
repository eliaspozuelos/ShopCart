import { createContext, useContext } from 'react'
import type { Category } from './catalog.types.ts'

export interface CatalogContextValue {
  categories: Category[]
  loading: boolean
  error: string | null
}

export const CatalogContext = createContext<CatalogContextValue | null>(null)

export function useCatalog() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error('useCatalog debe usarse dentro de CatalogProvider.')
  return context
}
