export type CouponDiscountType = 'PORCENTAJE' | 'MONTO'

export interface CartItem {
  id: number
  variantId: number
  productId: number
  productName: string
  sku: string
  price: number
  priceDisplay: string
  quantity: number
  lineTotal: number
  lineTotalDisplay: string
  availableStock: number
  image: string | null
  category: { id: number; name: string }
  attributes: Array<{ id: number; name: string; value: string }>
}

export interface Cart {
  currency: string
  currencySymbol: string
  id: number
  guestToken: string | null
  items: CartItem[]
  coupon: {
    id: number
    code: string
    type: CouponDiscountType
    value: number
    minimumAmount: number
    category: { id: number; name: string } | null
    discount: number
    discountDisplay: string
  } | null
  totals: {
    subtotal: number
    discount: number
    total: number
    subtotalDisplay: string
    discountDisplay: string
    totalDisplay: string
  }
}
