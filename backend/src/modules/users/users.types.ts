import type { UserRole } from '../auth/auth.types.js';

export interface UserAddressRecord {
  IDDireccion: number;
  Alias: string;
  Linea1: string;
  Linea2: string | null;
  Municipio: string;
  Departamento: string;
  Telefono: string;
}

export interface UserAddressResponse {
  id: number;
  alias: string;
  line1: string;
  line2: string | null;
  municipality: string;
  department: string;
  phone: string;
}

export interface UserProfileRecord {
  IDUsuario: number;
  Correo: string;
  Nombre: string;
}

export interface AdminUserDetailRecord extends UserProfileRecord {
  Rol: UserRole;
  Activo: boolean;
  FechaCreacion: Date;
}

export function toUserAddressResponse(address: UserAddressRecord): UserAddressResponse {
  return {
    id: address.IDDireccion,
    alias: address.Alias,
    line1: address.Linea1,
    line2: address.Linea2,
    municipality: address.Municipio,
    department: address.Departamento,
    phone: address.Telefono,
  };
}
