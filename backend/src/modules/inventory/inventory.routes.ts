import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { InventoryController } from './inventory.controller.js';

const controller = new InventoryController();

export const inventoryRouter = Router();

inventoryRouter.use(authenticate, requireRole('Operador', 'Administrador'));
inventoryRouter.get('/movements', controller.listMovements);
inventoryRouter.get('/variants/:variantId/stock', controller.getStock);
inventoryRouter.patch('/variants/:variantId/stock', controller.adjustStock);
