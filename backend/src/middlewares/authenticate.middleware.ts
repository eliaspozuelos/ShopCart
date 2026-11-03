// Verifica el access token y adjunta la identidad autenticada a la solicitud.
import type { RequestHandler } from 'express';
import { HttpError } from '../utils/http-error.js';
import { verifyAccessToken } from '../modules/auth/auth.service.js';
import { AuthRepository } from '../modules/auth/auth.repository.js';
import type { UserRole } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      auth?: import('../modules/auth/auth.types.js').AuthenticatedUser;
    }
  }
}

const authRepository = new AuthRepository();

async function authenticateToken(token: string): Promise<NonNullable<Express.Request['auth']>> {
  const authenticatedUser = verifyAccessToken(token);
  const user = await authRepository.findUserById(authenticatedUser.userId);

  if (!user || !user.Activo) {
    throw new HttpError(403, 'USER_INACTIVE', 'La cuenta está inactiva.');
  }

  return authenticatedUser;
}

export const authenticate: RequestHandler = async (request, _response, next) => {
  const authorization = request.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.'));
    return;
  }

  try {
    request.auth = await authenticateToken(authorization.slice('Bearer '.length).trim());
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate: RequestHandler = async (request, _response, next) => {
  const authorization = request.header('authorization');
  if (authorization?.startsWith('Bearer ')) {
    try {
      request.auth = await authenticateToken(authorization.slice('Bearer '.length).trim());
    } catch {
      // Un token inválido o de una cuenta inactiva se trata como una visita anónima.
    }
  }
  next();
};

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  // Restringe una ruta a los roles indicados después de autenticar.
  return (request, _response, next) => {
    if (!request.auth) {
      next(new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.'));
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      next(new HttpError(403, 'ACTION_NOT_ALLOWED', 'No tienes permiso para realizar esta acción.'));
      return;
    }

    next();
  };
}
