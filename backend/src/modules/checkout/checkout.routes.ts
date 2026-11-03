import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { CheckoutController } from './checkout.controller.js';

const controller = new CheckoutController();
export const checkoutRouter = Router();
checkoutRouter.post('/checkout', authenticate, requireRole('Cliente'), controller.create);
