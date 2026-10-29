// Rutas para consultar y administrar perfiles y usuarios.
import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { UsersController } from './users.controller.js';

const controller = new UsersController();

export const usersRouter = Router();

// El perfil propio requiere sesión, pero no privilegios de administrador.
usersRouter.get('/me', authenticate, controller.getMyProfile);
usersRouter.patch('/me', authenticate, controller.updateMyProfile);
usersRouter.post('/me/addresses', authenticate, controller.createMyAddress);
usersRouter.put('/me/addresses/:addressId', authenticate, controller.updateMyAddress);

usersRouter.use(authenticate, requireRole('Administrador'));
usersRouter.post('/', controller.create);
usersRouter.get('/', controller.list);
usersRouter.get('/:userId', controller.getDetail);
usersRouter.patch('/:userId', controller.updateAdminProfile);
usersRouter.patch('/:userId/status', controller.changeStatus);
