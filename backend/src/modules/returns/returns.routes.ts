import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { ReturnsController } from './returns.controller.js';

const controller = new ReturnsController();
export const returnsRouter = Router();
returnsRouter.post('/:orderId/returns', authenticate, requireRole('Cliente', 'Operador', 'Administrador'), controller.create);
returnsRouter.patch('/:orderId/returns/:returnId', authenticate, requireRole('Operador', 'Administrador'), controller.resolve);
