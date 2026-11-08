import { createContext, useContext } from 'react'
import type { Cart } from './cart.types.ts'

export interface CartContextValue {
  cart: Cart | null
  status: 'loading' | 'ready'
  error: string | null
  itemCount: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (variantId: number, quantity: number) => Promise<void>
  updateItem: (itemId: number, quantity: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  applyCoupon: (code: string) => Promise<void>
  removeCoupon: () => Promise<void>
  clearCart: () => Promise<void>
  reload: () => Promise<void>
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider.')
  return context
}
