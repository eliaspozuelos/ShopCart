// Limita los intentos de registro e inicio de sesión por dirección IP.
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

export const authAttemptLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (request: Request, response: Response) => {
    const retryAfterSeconds = waitSeconds(request);
    response.setHeader('Retry-After', String(retryAfterSeconds));
    response.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT',
        message: 'Demasiados intentos. Espera para volver a intentarlo.',
        retryAfterSeconds,
      },
    });
  },
});

function waitSeconds(request: Request): number {
  const resetTime = (request as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
  if (!resetTime) return 60;
  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
}
