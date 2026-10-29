// Convierte errores de validación, negocio y sistema a respuestas HTTP.
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error.js';

const sqlErrorResponses: Record<number, { statusCode: number; code: string; message: string }> = {
  // Códigos definidos por los stored procedures de Auth y usuarios.
  50101: { statusCode: 409, code: 'EMAIL_ALREADY_REGISTERED', message: 'El correo ya está registrado.' },
  50110: { statusCode: 400, code: 'INVALID_SESSION_DATA', message: 'Los datos de sesión no son válidos.' },
  50111: { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'La sesión no es válida.' },
  50112: { statusCode: 401, code: 'REFRESH_TOKEN_REUSED', message: 'La sesión fue revocada; inicia sesión nuevamente.' },
  50113: { statusCode: 401, code: 'REFRESH_TOKEN_EXPIRED', message: 'La sesión expiró; inicia sesión nuevamente.' },
  50114: { statusCode: 403, code: 'USER_INACTIVE', message: 'La cuenta está inactiva.' },
  50120: { statusCode: 400, code: 'ROLE_NOT_ALLOWED', message: 'El rol solicitado no está permitido.' },
  50121: { statusCode: 403, code: 'ACTION_NOT_ALLOWED', message: 'No tienes permiso para realizar esta acción.' },
  50122: { statusCode: 404, code: 'USER_NOT_FOUND', message: 'No se encontró el usuario.' },
  50123: { statusCode: 409, code: 'CANNOT_DEACTIVATE_SELF', message: 'No puedes desactivar tu propia cuenta.' },
  50124: { statusCode: 400, code: 'USER_STATUS_REQUIRED', message: 'Debes indicar el estado del usuario.' },
  50125: { statusCode: 409, code: 'LAST_ADMINISTRATOR', message: 'No se puede desactivar al último administrador activo.' },
  50126: { statusCode: 400, code: 'PROFILE_DATA_REQUIRED', message: 'Debes indicar al menos un dato del perfil.' },
  50127: { statusCode: 404, code: 'ADDRESS_NOT_FOUND', message: 'No se encontró la dirección activa.' },
  50128: { statusCode: 400, code: 'PASSWORD_REQUIRED', message: 'Debes indicar la nueva contraseña.' },
};

function getSqlErrorNumber(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('number' in error)) {
    return undefined;
  }

  const { number } = error;
  return typeof number === 'number' ? number : undefined;
}

function isMalformedJson(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('type' in error)) {
    return false;
  }

  return error.type === 'entity.parse.failed';
}

export const errorMiddleware: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'La solicitud contiene datos no válidos.',
        details: error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      },
    });
    return;
  }

  if (isMalformedJson(error)) {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'El cuerpo de la solicitud no contiene JSON válido.' },
    });
    return;
  }

  const sqlErrorNumber = getSqlErrorNumber(error);
  const sqlResponse = sqlErrorNumber === undefined ? undefined : sqlErrorResponses[sqlErrorNumber];

  if (sqlResponse) {
    response.status(sqlResponse.statusCode).json({
      error: { code: sqlResponse.code, message: sqlResponse.message },
    });
    return;
  }

  console.error('Unhandled API error.', error);
  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Ocurrió un error interno.' },
  });
};
