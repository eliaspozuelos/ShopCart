import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { OrdersController } from './orders.controller.js';

const controller = new OrdersController();
export const ordersRouter = Router();
ordersRouter.use(authenticate);
ordersRouter.get('/', controller.list);
ordersRouter.get('/:orderId', controller.get);
ordersRouter.post('/:orderId/cancel', requireRole('Cliente'), controller.cancel);
ordersRouter.patch('/:orderId/status', requireRole('Operador', 'Administrador'), controller.changeStatus);
