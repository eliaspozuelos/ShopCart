// Reglas de autenticación: hashing, sesiones y emisión/verificación de JWT.
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { HttpError } from '../../utils/http-error.js';
import { AuthRepository } from './auth.repository.js';
import {
  toUserResponse,
  type AuthenticatedUser,
  type PublicUserRecord,
  type UserResponse,
} from './auth.types.js';

const bcryptRounds = 12;

export interface AuthSessionResponse {
  accessToken: string;
  user: UserResponse;
}

export interface RefreshSessionResponse extends AuthSessionResponse {
  refreshToken: string;
}

export class AuthService {
  constructor(private readonly authRepository = new AuthRepository()) {}

  async registerCustomer(input: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ id: number }> {
    const passwordHash = await bcrypt.hash(input.password, bcryptRounds);
    const id = await this.authRepository.registerCustomer({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    return { id };
  }

  async changePassword(input: {
    userId: number;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.authRepository.findCredentialsById(input.userId);
    if (!user || !user.Activo) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'La sesión no es válida.');
    }

    const passwordMatches = await bcrypt.compare(input.currentPassword, user.ContrasenaHash);
    if (!passwordMatches) {
      throw new HttpError(400, 'CURRENT_PASSWORD_INCORRECT', 'La contraseña actual es incorrecta.');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, bcryptRounds);
    await this.authRepository.updatePassword({ userId: input.userId, passwordHash });
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<RefreshSessionResponse> {
    const user = await this.authRepository.findUserByEmail(input.email);
    const passwordMatches = user
      ? await bcrypt.compare(input.password, user.ContrasenaHash)
      : false;

    if (!user || !passwordMatches || !user.Activo) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    }

    // Solo se persiste el hash del refresh token; el token original va en cookie.
    const refreshToken = this.createRefreshToken();
    await this.authRepository.createSession({
      userId: user.IDUsuario,
      tokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: this.getRefreshExpiry(),
    });

    console.info('Inicio de sesión exitoso.', {
      userId: user.IDUsuario,
      role: user.Rol,
    });

    return {
      accessToken: this.createAccessToken(user),
      refreshToken,
      user: toUserResponse(user),
    };
  }

  async refresh(currentRefreshToken: string): Promise<RefreshSessionResponse> {
    // El SP invalida el token usado y registra el reemplazo en una sola operación.
    const refreshToken = this.createRefreshToken();
    const user = await this.authRepository.rotateRefreshToken({
      currentTokenHash: this.hashRefreshToken(currentRefreshToken),
      newTokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: this.getRefreshExpiry(),
    });

    if (!user) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'La sesión no es válida.');
    }

    return {
      accessToken: this.createAccessToken(user),
      refreshToken,
      user: toUserResponse(user),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.authRepository.closeSession(this.hashRefreshToken(refreshToken));
      console.info('Solicitud de cierre de sesión procesada.');
    }
  }

  private createRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshExpiry(): Date {
    return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }

  private createAccessToken(user: PublicUserRecord): string {
    return jwt.sign(
      { email: user.Correo, role: user.Rol },
      env.JWT_ACCESS_SECRET,
      {
        algorithm: 'HS256',
        subject: String(user.IDUsuario),
        expiresIn: env.JWT_ACCESS_TTL_SECONDS,
        issuer: 'shopcart-api',
        audience: 'shopcart-client',
      },
    );
  }
}

export function verifyAccessToken(token: string): AuthenticatedUser {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
      issuer: 'shopcart-api',
      audience: 'shopcart-client',
    });

    if (typeof payload === 'string' || !payload.sub) {
      throw new HttpError(401, 'INVALID_ACCESS_TOKEN', 'La sesión no es válida.');
    }

    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      throw new HttpError(401, 'INVALID_ACCESS_TOKEN', 'La sesión no es válida.');
    }

    const email = payload.email;
    const role = payload.role;
    if (
      typeof email !== 'string'
      || (role !== 'Cliente' && role !== 'Operador' && role !== 'Administrador')
    ) {
      throw new HttpError(401, 'INVALID_ACCESS_TOKEN', 'La sesión no es válida.');
    }

    return { userId, email, role };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new HttpError(401, 'INVALID_ACCESS_TOKEN', 'La sesión no es válida.');
    }

    throw error;
  }
}
