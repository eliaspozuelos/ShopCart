import { HttpError } from '../../utils/http-error.js';
import { CouponsRepository } from './coupons.repository.js';
import {
  toCouponResponse,
  toCouponValidationResponse,
  type CouponDiscountType,
  type CouponResponse,
  type CouponValidationResponse,
} from './coupons.types.js';

export interface ListCouponsInput {
  actorId: number;
  page: number;
  pageSize: number;
  search?: string | undefined;
  active?: boolean | undefined;
  valid?: boolean | undefined;
}

export interface CreateCouponInput {
  actorId: number;
  code: string;
  type: CouponDiscountType;
  value: number;
  minimumAmount: number;
  validFrom: string;
  validUntil: string;
  totalUsageLimit: number;
  usageLimitPerCustomer: number;
  categoryId?: number | null | undefined;
}

export interface UpdateCouponInput {
  actorId: number;
  couponId: number;
  minimumAmount?: number | undefined;
  validFrom?: string | undefined;
  validUntil?: string | undefined;
  totalUsageLimit?: number | undefined;
  usageLimitPerCustomer?: number | undefined;
  categoryId?: number | null | undefined;
  active?: boolean | undefined;
}

export class CouponsService {
  constructor(private readonly couponsRepository = new CouponsRepository()) {}

  async listCoupons(input: ListCouponsInput): Promise<{
    data: CouponResponse[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const result = await this.couponsRepository.listCoupons(input);
    const totalPages = Math.ceil(result.total / input.pageSize) || 1;

    return {
      data: result.coupons.map(toCouponResponse),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages,
      },
    };
  }

  async getCouponById(couponId: number, actorId: number): Promise<CouponResponse> {
    const coupon = await this.couponsRepository.findCouponById(couponId, actorId);
    if (!coupon) {
      throw new HttpError(404, 'COUPON_NOT_FOUND', 'No se encontró el cupón.');
    }
    return toCouponResponse(coupon);
  }

  async createCoupon(input: CreateCouponInput): Promise<CouponResponse> {
    const coupon = await this.couponsRepository.createCoupon({
      ...input,
      validFrom: new Date(input.validFrom),
      validUntil: new Date(input.validUntil),
    });
    return toCouponResponse(coupon);
  }

  async updateCoupon(input: UpdateCouponInput): Promise<CouponResponse> {
    const coupon = await this.couponsRepository.updateCoupon({
      ...input,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
    });
    return toCouponResponse(coupon);
  }

  async validateCoupon(input: {
    code: string;
    subtotal: number;
    eligibleSubtotal?: number | undefined;
    userId?: number | undefined;
  }): Promise<CouponValidationResponse> {
    const coupon = await this.couponsRepository.validateCoupon(input);
    if (!coupon) {
      throw new HttpError(404, 'COUPON_NOT_FOUND', 'El cupón no es válido o no está disponible.');
    }
    return toCouponValidationResponse(coupon);
  }
}
