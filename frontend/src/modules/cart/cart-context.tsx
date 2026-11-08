import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { errorMessage } from '../../shared/api/client.ts'
import { getGuestToken } from '../../shared/lib/session.ts'
import { useAuth } from '../auth/use-auth.ts'
import * as cartApi from './cart.api.ts'
import type { Cart } from './cart.types.ts'
import { CartContext, type CartContextValue } from './use-cart.ts'

export function CartProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const sessionKey = authStatus !== 'ready'
    ? 'pending'
    : user
      ? `user:${user.id}`
      : getGuestToken()
        ? 'guest'
        : 'anonymous'

  const apply = useCallback((next: Cart) => {
    cartApi.rememberCartSession(next)
    setCart(next)
    setError(null)
  }, [])

  useEffect(() => {
    if (sessionKey === 'pending' || sessionKey === 'anonymous') return
    let active = true
    void cartApi.getCart()
      .then((next) => {
        if (!active) return
        apply(next)
        setLoadedKey(sessionKey)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(errorMessage(caught))
        setLoadedKey(sessionKey)
      })

    return () => {
      active = false
    }
  }, [sessionKey, apply])

  const currentCart = sessionKey === 'anonymous' ? null : cart
  const status: 'loading' | 'ready' = sessionKey === 'pending' || (sessionKey !== 'anonymous' && loadedKey !== sessionKey && currentCart === null)
    ? 'loading'
    : 'ready'

  const run = useCallback(async (action: () => Promise<Cart>) => {
    const next = await action()
    apply(next)
  }, [apply])

  const reload = useCallback(async () => {
    const next = await cartApi.getCart()
    apply(next)
  }, [apply])

  const value = useMemo<CartContextValue>(() => ({
    cart: currentCart,
    status,
    error,
    itemCount: currentCart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem: (variantId, quantity) => run(() => cartApi.addCartItem(variantId, quantity)),
    updateItem: (itemId, quantity) => run(() => cartApi.updateCartItem(itemId, quantity)),
    removeItem: (itemId) => run(() => cartApi.removeCartItem(itemId)),
    applyCoupon: (code) => run(() => cartApi.applyCartCoupon(code)),
    removeCoupon: () => run(() => cartApi.removeCartCoupon()),
    clearCart: () => run(() => cartApi.clearCart()),
    reload,
  }), [currentCart, status, error, isOpen, run, reload])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
