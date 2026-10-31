export type CouponDiscountType = 'PORCENTAJE' | 'MONTO';

export interface CartHeaderRecord {
  IDCarrito: number;
  IDUsuario: number | null;
  TokenInvitado: string | null;
  Estado: string;
  IDCupon: number | null;
  Codigo: string | null;
  Tipo: CouponDiscountType | null;
  Valor: number | null;
  MontoMinimo: number | null;
  IDCategoriaCupon: number | null;
  CategoriaCupon: string | null;
  Subtotal: number;
  Descuento: number;
  Total: number;
}

export interface CartItemRecord {
  IDCarritoDetalle: number;
  IDVariante: number;
  IDProducto: number;
  NombreProducto: string;
  IDCategoria: number;
  Categoria: string;
  SKU: string;
  Precio: number;
  Cantidad: number;
  Importe: number;
  ExistenciaDisponible: number;
  Imagen: string | null;
}

export interface CartItemAttributeRecord {
  IDCarritoDetalle: number;
  IDAtributo: number;
  Atributo: string;
  Valor: string;
}

export interface CartItemResponse {
  id: number;
  variantId: number;
  productId: number;
  productName: string;
  sku: string;
  price: number;
  priceDisplay: string;
  quantity: number;
  lineTotal: number;
  lineTotalDisplay: string;
  availableStock: number;
  image: string | null;
  category: { id: number; name: string };
  attributes: Array<{ id: number; name: string; value: string }>;
}

export interface CartResponse {
  currency: string;
  currencySymbol: string;
  id: number;
  guestToken: string | null;
  items: CartItemResponse[];
  coupon: {
    id: number;
    code: string;
    type: CouponDiscountType;
    value: number;
    minimumAmount: number;
    category: { id: number; name: string } | null;
    discount: number;
    discountDisplay: string;
  } | null;
  totals: {
    subtotal: number;
    discount: number;
    total: number;
    subtotalDisplay: string;
    discountDisplay: string;
    totalDisplay: string;
  };
}

function toMoney(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export function toCartResponse(
  header: CartHeaderRecord,
  items: CartItemRecord[],
  attributes: CartItemAttributeRecord[],
  currency: { currency: string; currencySymbol: string },
): CartResponse {
  const formatMoney = (value: number): string => `${currency.currencySymbol} ${value.toFixed(2)}`;
  return {
    ...currency,
    id: header.IDCarrito,
    guestToken: header.TokenInvitado,
    items: items.map((item) => ({
      id: item.IDCarritoDetalle,
      variantId: item.IDVariante,
      productId: item.IDProducto,
      productName: item.NombreProducto,
      sku: item.SKU,
      price: toMoney(item.Precio),
      priceDisplay: formatMoney(toMoney(item.Precio)),
      quantity: item.Cantidad,
      lineTotal: toMoney(item.Importe),
      lineTotalDisplay: formatMoney(toMoney(item.Importe)),
      availableStock: item.ExistenciaDisponible,
      image: item.Imagen,
      category: { id: item.IDCategoria, name: item.Categoria },
      attributes: attributes
        .filter((attribute) => attribute.IDCarritoDetalle === item.IDCarritoDetalle)
        .map((attribute) => ({
          id: attribute.IDAtributo,
          name: attribute.Atributo,
          value: attribute.Valor,
        })),
    })),
    coupon: header.IDCupon && header.Codigo && header.Tipo
      ? {
          id: header.IDCupon,
          code: header.Codigo,
          type: header.Tipo,
          value: toMoney(header.Valor),
          minimumAmount: toMoney(header.MontoMinimo),
          category: header.IDCategoriaCupon && header.CategoriaCupon
            ? { id: header.IDCategoriaCupon, name: header.CategoriaCupon }
            : null,
          discount: toMoney(header.Descuento),
          discountDisplay: formatMoney(toMoney(header.Descuento)),
        }
      : null,
    totals: {
      subtotal: toMoney(header.Subtotal),
      discount: toMoney(header.Descuento),
      total: toMoney(header.Total),
      subtotalDisplay: formatMoney(toMoney(header.Subtotal)),
      discountDisplay: formatMoney(toMoney(header.Descuento)),
      totalDisplay: formatMoney(toMoney(header.Total)),
    },
  };
}
