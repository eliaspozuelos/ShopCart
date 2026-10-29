// Tipos del usuario, su identidad autenticada y su forma pública en la API.
export const userRoles = ['Cliente', 'Operador', 'Administrador'] as const;

export type UserRole = (typeof userRoles)[number];

export interface AuthUserRecord {
  IDUsuario: number;
  Correo: string;
  ContrasenaHash: string;
  Nombre: string;
  Rol: UserRole;
  Activo: boolean;
}

export interface PublicUserRecord {
  IDUsuario: number;
  Correo: string;
  Nombre: string;
  Rol: UserRole;
  Activo?: boolean;
}

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export function toUserResponse(user: PublicUserRecord): UserResponse {
  // Evita devolver campos internos, como el hash de contraseña.
  return {
    id: user.IDUsuario,
    email: user.Correo,
    name: user.Nombre,
    role: user.Rol,
  };
}
