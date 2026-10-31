import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { ConfigurationController } from './configuration.controller.js';

const controller = new ConfigurationController();

export const configurationRouter = Router();

configurationRouter.use(authenticate, requireRole('Administrador'));
configurationRouter.get('/', controller.list);
configurationRouter.post('/', controller.create);
configurationRouter.patch('/:key', controller.update);
