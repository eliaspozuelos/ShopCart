import { Router } from 'express';
import { optionalAuthenticate } from '../../middlewares/authenticate.middleware.js';
import { CartController } from './cart.controller.js';

const controller = new CartController();

export const cartRouter = Router();

// Permite conservar el carrito de un visitante y fusionarlo al iniciar sesión.
cartRouter.use(optionalAuthenticate);

cartRouter.get('/', controller.get);
cartRouter.delete('/', controller.clear);
cartRouter.post('/items', controller.addItem);
cartRouter.patch('/items/:itemId', controller.updateItem);
cartRouter.delete('/items/:itemId', controller.removeItem);
cartRouter.post('/coupon', controller.applyCoupon);
cartRouter.delete('/coupon', controller.removeCoupon);
