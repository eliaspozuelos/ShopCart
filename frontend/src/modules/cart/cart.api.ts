import { api, getAccessToken } from '../../shared/api/client.ts'
import { setGuestToken } from '../../shared/lib/session.ts'
import type { Cart } from './cart.types.ts'

interface Envelope<T> {
  data: T
  message?: string
}

export function rememberCartSession(cart: Cart): void {
  if (cart.guestToken) {
    setGuestToken(cart.guestToken)
    return
  }
  if (getAccessToken()) setGuestToken(null)
}

async function readCart(path: string, method: string, body?: unknown): Promise<Cart> {
  const response = await api<Envelope<Cart>>(path, { method, body })
  rememberCartSession(response.data)
  return response.data
}

export function getCart(): Promise<Cart> {
  return readCart('/api/v1/cart', 'GET')
}

export function addCartItem(variantId: number, quantity: number): Promise<Cart> {
  return readCart('/api/v1/cart/items', 'POST', { variantId, quantity })
}

export function updateCartItem(itemId: number, quantity: number): Promise<Cart> {
  return readCart(`/api/v1/cart/items/${itemId}`, 'PATCH', { quantity })
}

export function removeCartItem(itemId: number): Promise<Cart> {
  return readCart(`/api/v1/cart/items/${itemId}`, 'DELETE')
}

export function applyCartCoupon(code: string): Promise<Cart> {
  return readCart('/api/v1/cart/coupon', 'POST', { code })
}

export function removeCartCoupon(): Promise<Cart> {
  return readCart('/api/v1/cart/coupon', 'DELETE')
}

export function clearCart(): Promise<Cart> {
  return readCart('/api/v1/cart', 'DELETE')
}
