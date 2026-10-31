import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { AuditController } from './audit.controller.js';

const controller = new AuditController();
export const auditRouter = Router();
auditRouter.use(authenticate, requireRole('Administrador'));
auditRouter.get('/', controller.list);
