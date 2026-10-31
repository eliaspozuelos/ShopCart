import type { Request, Response } from 'express';
import { HttpError } from '../../utils/http-error.js';
import {
  couponIdParamsSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
  validateCouponSchema,
} from './coupons.schemas.js';
import { CouponsService } from './coupons.service.js';

export class CouponsController {
  constructor(private readonly couponsService = new CouponsService()) {}

  // Lista cupones para que el administrador pueda consultarlos y filtrarlos.
  list = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const query = listCouponsQuerySchema.parse(request.query);
    const result = await this.couponsService.listCoupons({ ...query, actorId });
    response.status(200).json(result);
  };

  // Devuelve el detalle de un cupón específico.
  getDetail = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const { couponId } = couponIdParamsSchema.parse(request.params);
    const coupon = await this.couponsService.getCouponById(couponId, actorId);
    response.status(200).json({ data: coupon });
  };

  // Crea un cupón con sus reglas de descuento, vigencia y límites de uso.
  create = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const input = createCouponSchema.parse(request.body);
    const coupon = await this.couponsService.createCoupon({ ...input, actorId });
    response.status(201).json({
      message: 'Cupón creado correctamente.',
      data: coupon,
    });
  };

  // Actualiza las condiciones o el estado activo de un cupón.
  update = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const { couponId } = couponIdParamsSchema.parse(request.params);
    const input = updateCouponSchema.parse(request.body);
    const coupon = await this.couponsService.updateCoupon({ ...input, actorId, couponId });
    response.status(200).json({
      message: 'Cupón actualizado correctamente.',
      data: coupon,
    });
  };

  // Comprueba si un cupón puede aplicarse al monto y usuario indicados.
  validate = async (request: Request, response: Response): Promise<void> => {
    const input = validateCouponSchema.parse(request.body);
    const userId = request.auth?.userId;
    const result = await this.couponsService.validateCoupon({ ...input, userId });
    response.status(200).json({
      message: 'Cupón válido.',
      data: result,
    });
  };

  private getActorId(request: Request): number {
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }
    return actorId;
  }
}
