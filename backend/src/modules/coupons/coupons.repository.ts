import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type {
  CouponDiscountType,
  CouponRecord,
  CouponValidationRecord,
} from './coupons.types.js';

interface CouponCountRecord {
  TotalRegistros: number;
}

export interface CouponListResult {
  total: number;
  coupons: CouponRecord[];
}

export class CouponsRepository {
  async listCoupons(input: {
    actorId: number;
    page: number;
    pageSize: number;
    search?: string | undefined;
    active?: boolean | undefined;
    valid?: boolean | undefined;
  }): Promise<CouponListResult> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Pagina', sql.Int, input.page)
      .input('TamanoPagina', sql.Int, input.pageSize)
      .input('Busqueda', sql.NVarChar(50), input.search ?? null)
      .input('Activo', sql.Bit, input.active ?? null)
      .input('Vigente', sql.Bit, input.valid ?? null)
      .execute<[CouponCountRecord, CouponRecord]>('dbo.SP_Cupones_Listar');

    const total = result.recordsets[0]?.[0]?.TotalRegistros ?? 0;
    const coupons = result.recordsets[1] ?? [];
    return { total, coupons };
  }

  async findCouponById(couponId: number, actorId: number): Promise<CouponRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, actorId)
      .input('IDCupon', sql.Int, couponId)
      .execute<CouponRecord>('dbo.SP_Cupones_ObtenerPorID');

    return result.recordset[0];
  }

  async createCoupon(input: {
    actorId: number;
    code: string;
    type: CouponDiscountType;
    value: number;
    minimumAmount: number;
    validFrom: Date;
    validUntil: Date;
    totalUsageLimit: number;
    usageLimitPerCustomer: number;
    categoryId?: number | null | undefined;
  }): Promise<CouponRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Codigo', sql.NVarChar(30), input.code)
      .input('Tipo', sql.NVarChar(12), input.type)
      .input('Valor', sql.Decimal(18, 2), input.value)
      .input('MontoMinimo', sql.Decimal(18, 2), input.minimumAmount)
      .input('VigenteDesde', sql.DateTime2(0), input.validFrom)
      .input('VigenteHasta', sql.DateTime2(0), input.validUntil)
      .input('LimiteUsosTotal', sql.Int, input.totalUsageLimit)
      .input('LimiteUsosPorCliente', sql.Int, input.usageLimitPerCustomer)
      .input('IDCategoria', sql.Int, input.categoryId ?? null)
      .execute<CouponRecord>('dbo.SP_Cupones_Crear');

    const coupon = result.recordset[0];
    if (!coupon) throw new Error('SP_Cupones_Crear did not return the created coupon.');
    return coupon;
  }

  async updateCoupon(input: {
    actorId: number;
    couponId: number;
    minimumAmount?: number | undefined;
    validFrom?: Date | undefined;
    validUntil?: Date | undefined;
    totalUsageLimit?: number | undefined;
    usageLimitPerCustomer?: number | undefined;
    categoryId?: number | null | undefined;
    active?: boolean | undefined;
  }): Promise<CouponRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDCupon', sql.Int, input.couponId)
      .input('MontoMinimo', sql.Decimal(18, 2), input.minimumAmount ?? null)
      .input('VigenteDesde', sql.DateTime2(0), input.validFrom ?? null)
      .input('VigenteHasta', sql.DateTime2(0), input.validUntil ?? null)
      .input('LimiteUsosTotal', sql.Int, input.totalUsageLimit ?? null)
      .input('LimiteUsosPorCliente', sql.Int, input.usageLimitPerCustomer ?? null)
      .input('IDCategoria', sql.Int, input.categoryId !== undefined ? input.categoryId : null)
      .input('ActualizarCategoria', sql.Bit, input.categoryId !== undefined)
      .input('Activo', sql.Bit, input.active ?? null)
      .execute<CouponRecord>('dbo.SP_Cupones_Actualizar');

    const coupon = result.recordset[0];
    if (!coupon) throw new Error('SP_Cupones_Actualizar did not return the updated coupon.');
    return coupon;
  }

  async validateCoupon(input: {
    code: string;
    subtotal: number;
    eligibleSubtotal?: number | undefined;
    userId?: number | undefined;
  }): Promise<CouponValidationRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('Codigo', sql.NVarChar(30), input.code)
      .input('Subtotal', sql.Decimal(18, 2), input.subtotal)
      .input('IDUsuario', sql.Int, input.userId ?? null)
      .input('SubtotalElegible', sql.Decimal(18, 2), input.eligibleSubtotal ?? null)
      .execute<CouponValidationRecord>('dbo.SP_Cupones_Validar');

    return result.recordset[0];
  }
}
