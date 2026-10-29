// Traduce solicitudes HTTP de Auth a llamadas del servicio y respuestas.
import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http-error.js';
import { AuthService } from './auth.service.js';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.schemas.js';

const refreshCookieName = 'shopcart_refresh';
const refreshCookiePath = '/api/v1/auth';

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}


// Maneja la solicitud  para registrar un nuevo cliente.
  register = async (request: Request, response: Response): Promise<void> => {
    const input = registerSchema.parse(request.body);
    const result = await this.authService.registerCustomer(input);
    response.status(201).json({ data: result });
  };


  //maneja logica de login de usuario y genera tokens de acceso y refresh.
  login = async (request: Request, response: Response): Promise<void> => {
    const input = loginSchema.parse(request.body);
    const session = await this.authService.login(input);
    this.setRefreshCookie(response, session.refreshToken);
    response.status(200).json({
      data: { accessToken: session.accessToken, user: session.user },
    });
  };

  refresh = async (request: Request, response: Response): Promise<void> => {
    const currentRefreshToken = this.getRefreshCookie(request);
    const session = await this.authService.refresh(currentRefreshToken);
    this.setRefreshCookie(response, session.refreshToken);
    response.status(200).json({
      data: { accessToken: session.accessToken, user: session.user },
    });
  };

  //Manejo de logout de usuario, eliminando el refresh token de la cookie y del servidor.
  logout = async (request: Request, response: Response): Promise<void> => {
    await this.authService.logout(this.readRefreshCookie(request));
    response.clearCookie(refreshCookieName, this.refreshCookieOptions());
    response.status(204).end();
  };

  //cambio de contrase;a para user auteticado, requiere el token de acceso y la cookie de refresh.
  changePassword = async (request: Request, response: Response): Promise<void> => {
    const userId = request.auth?.userId;
    if (!userId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const input = changePasswordSchema.parse(request.body);
    await this.authService.changePassword({ ...input, userId });
    response.clearCookie(refreshCookieName, this.refreshCookieOptions());
    response.status(204).end();
  };

  // Obtiene el refresh token de la cookie HttpOnly y lanza un error si no está presente.
  private getRefreshCookie(request: Request): string {
    const token = this.readRefreshCookie(request);
    if (!token) {
      throw new HttpError(401, 'REFRESH_TOKEN_REQUIRED', 'La sesión no es válida.');
    }
    return token;
  }


  // Establece la cookie HttpOnly con el refresh token y las opciones de seguridad.
  private readRefreshCookie(request: Request): string | undefined {
    // Se lee la cookie HttpOnly sin exponer el refresh token al JavaScript cliente.
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    for (const cookie of cookieHeader.split(';')) {
      const separatorIndex = cookie.indexOf('=');
      if (separatorIndex < 0) {
        continue;
      }

      const name = cookie.slice(0, separatorIndex).trim();
      if (name === refreshCookieName) {
        return cookie.slice(separatorIndex + 1).trim();
      }
    }

    return undefined;
  }


  // Establece la cookie HttpOnly con el refresh token y las opciones de seguridad.
  private setRefreshCookie(response: Response, token: string): void {
    response.cookie(refreshCookieName, token, {
      ...this.refreshCookieOptions(),
      maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }

  private refreshCookieOptions(): {
    httpOnly: true;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
  } {
    return {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: env.COOKIE_SAME_SITE,
      path: refreshCookiePath,
    };
  }
}
