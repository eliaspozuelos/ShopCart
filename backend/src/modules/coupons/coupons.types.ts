export type CouponDiscountType = 'PORCENTAJE' | 'MONTO';

export interface CouponRecord {
  IDCupon: number;
  Codigo: string;
  Tipo: CouponDiscountType;
  Valor: number;
  MontoMinimo: number;
  VigenteDesde: Date;
  VigenteHasta: Date;
  LimiteUsosTotal: number;
  LimiteUsosPorCliente: number;
  UsosActuales: number;
  IDCategoria: number | null;
  Categoria: string | null;
  Activo: boolean;
  EsVigente: boolean;
}

export interface CouponValidationRecord {
  IDCupon: number;
  Codigo: string;
  Tipo: CouponDiscountType;
  Valor: number;
  MontoMinimo: number;
  IDCategoria: number | null;
  Categoria: string | null;
  DescuentoCalculado: number;
}

export interface CouponResponse {
  id: number;
  code: string;
  type: CouponDiscountType;
  value: number;
  minimumAmount: number;
  validFrom: string;
  validUntil: string;
  totalUsageLimit: number;
  usageLimitPerCustomer: number;
  currentUsages: number;
  category: { id: number; name: string } | null;
  active: boolean;
  isValid: boolean;
}

export interface CouponValidationResponse {
  id: number;
  code: string;
  type: CouponDiscountType;
  value: number;
  minimumAmount: number;
  category: { id: number; name: string } | null;
  calculatedDiscount: number;
}

function toBoolean(value: boolean | number): boolean {
  return value === true || value === 1;
}

function toMoney(value: number | string): number {
  return Number(value);
}

export function toCouponResponse(coupon: CouponRecord): CouponResponse {
  return {
    id: coupon.IDCupon,
    code: coupon.Codigo,
    type: coupon.Tipo,
    value: toMoney(coupon.Valor),
    minimumAmount: toMoney(coupon.MontoMinimo),
    validFrom: coupon.VigenteDesde instanceof Date ? coupon.VigenteDesde.toISOString() : String(coupon.VigenteDesde),
    validUntil: coupon.VigenteHasta instanceof Date ? coupon.VigenteHasta.toISOString() : String(coupon.VigenteHasta),
    totalUsageLimit: coupon.LimiteUsosTotal,
    usageLimitPerCustomer: coupon.LimiteUsosPorCliente,
    currentUsages: coupon.UsosActuales,
    category: coupon.IDCategoria && coupon.Categoria ? { id: coupon.IDCategoria, name: coupon.Categoria } : null,
    active: toBoolean(coupon.Activo),
    isValid: toBoolean(coupon.EsVigente),
  };
}

export function toCouponValidationResponse(coupon: CouponValidationRecord): CouponValidationResponse {
  return {
    id: coupon.IDCupon,
    code: coupon.Codigo,
    type: coupon.Tipo,
    value: toMoney(coupon.Valor),
    minimumAmount: toMoney(coupon.MontoMinimo),
    category: coupon.IDCategoria && coupon.Categoria ? { id: coupon.IDCategoria, name: coupon.Categoria } : null,
    calculatedDiscount: toMoney(coupon.DescuentoCalculado),
  };
}
