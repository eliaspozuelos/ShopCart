// Agrupa las rutas de cada módulo; app.ts añade el prefijo /api/v1.
import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);