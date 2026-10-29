// Configura Express: seguridad, CORS, rutas y respuestas comunes.
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { apiRouter } from './routes/index.js';
import { HttpError } from './utils/http-error.js';

export const app = express();

// Reduce información expuesta por Express y aplica encabezados de seguridad.
app.disable('x-powered-by');
app.use(helmet());

// Permite solicitudes desde los orígenes configurados, incluyendo cookies.
app.use(cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
}));

// Interpreta cuerpos JSON y limita su tamaño para evitar solicitudes excesivas.
app.use(express.json({ limit: '20kb' }));

// Endpoint sencillo para comprobar que la API está respondiendo.
app.get('/health', (_request, response) => {
  response.status(200).json({ 
    status: 'ok' ,
    message: 'ShopCart API is healthy and running.',  
  });
});

// 
app.use('/api/v1', apiRouter);
app.use((_request, _response, next) => {
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'No se encontró la ruta solicitada.'));
});

// errores de las rutas y middleware anteriores.
app.use(errorMiddleware);
