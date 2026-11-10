// Endpoints públicos para registro y sesión.
import { Router } from 'express';
import { authAttemptLimit } from '../../middlewares/auth-rate-limit.middleware.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { AuthController } from './auth.controller.js';

const controller = new AuthController();

export const authRouter = Router();

authRouter.post('/register', authAttemptLimit, controller.register);
authRouter.post('/login', authAttemptLimit, controller.login);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.patch('/password', authenticate, controller.changePassword);
