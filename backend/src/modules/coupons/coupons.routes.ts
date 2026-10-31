import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from '../../middlewares/authenticate.middleware.js';
import { CouponsController } from './coupons.controller.js';

const controller = new CouponsController();

export const couponsRouter = Router();

// El carrito puede validar un cupón antes de aplicarlo.
couponsRouter.post('/validate', optionalAuthenticate, controller.validate);

// Crear y modificar cupones requiere permisos administrativos.
couponsRouter.use(authenticate, requireRole('Administrador'));

couponsRouter.get('/', controller.list);
couponsRouter.get('/:couponId', controller.getDetail);
couponsRouter.post('/', controller.create);
couponsRouter.patch('/:couponId', controller.update);
