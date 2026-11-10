import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { ReportsController } from './reports.controller.js';

const controller = new ReportsController();
export const reportsRouter = Router();
reportsRouter.use(authenticate, requireRole('Administrador'));
reportsRouter.get('/dashboard/export', controller.exportExcel);
reportsRouter.get('/dashboard', controller.dashboard);
