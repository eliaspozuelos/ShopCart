// Acceso a datos de usuarios mediante los stored procedures del módulo.
import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type { UserRole } from '../auth/auth.types.js';
import type {
  AdminUserDetailRecord,
  UserAddressRecord,
  UserProfileRecord,
} from './users.types.js';

export interface UserListItem {
  IDUsuario: number;
  Correo: string;
  Nombre: string;
  Rol: UserRole;
  Activo: boolean;
  FechaCreacion: Date;
}

interface UserCountRow {
  TotalRegistros: number;
}

interface UserStatusRow {
  IDUsuario: number;
  Activo: boolean;
}

export class UsersRepository {
  async createOwnAddress(input: {
    userId: number;
    alias: string;
    line1: string;
    line2: string | null;
    municipality: string;
    department: string;
    phone: string;
  }): Promise<UserAddressRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.userId)
      .input('Alias', sql.NVarChar(50), input.alias)
      .input('Linea1', sql.NVarChar(200), input.line1)
      .input('Linea2', sql.NVarChar(200), input.line2)
      .input('Municipio', sql.NVarChar(100), input.municipality)
      .input('Departamento', sql.NVarChar(100), input.department)
      .input('Telefono', sql.NVarChar(20), input.phone)
      .execute<UserAddressRecord>('dbo.SP_Direcciones_CrearPropia');

    const address = result.recordset[0];
    if (!address) {
      throw new Error('SP_Direcciones_CrearPropia did not return the created address.');
    }

    return address;
  }

  async findOwnProfile(userId: number): Promise<UserProfileRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, userId)
      .execute<UserProfileRecord>('dbo.SP_Usuarios_ObtenerPerfil');

    return result.recordset[0];
  }

  async findOwnAddresses(userId: number): Promise<UserAddressRecord[]> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, userId)
      .execute<UserAddressRecord>('dbo.SP_Direcciones_ListarPorUsuario');

    return result.recordset;
  }

  async updateOwnProfile(input: {
    userId: number;
    name?: string | undefined;
    email?: string | undefined;
  }): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('IDUsuarioActor', sql.Int, input.userId)
      .input('Nombre', sql.NVarChar(100), input.name ?? null)
      .input('Correo', sql.NVarChar(256), input.email ?? null)
      .execute('dbo.SP_Usuarios_ActualizarPerfil');
  }

  async updateAdminProfile(input: {
    actorId: number;
    userId: number;
    name?: string | undefined;
    email?: string | undefined;
  }): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDUsuario', sql.Int, input.userId)
      .input('Nombre', sql.NVarChar(100), input.name ?? null)
      .input('Correo', sql.NVarChar(256), input.email ?? null)
      .execute('dbo.SP_Usuarios_ActualizarPerfilAdmin');
  }

  async updateOwnAddress(input: {
    userId: number;
    addressId: number;
    alias: string;
    line1: string;
    line2: string | null;
    municipality: string;
    department: string;
    phone: string;
  }): Promise<UserAddressRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.userId)
      .input('IDDireccion', sql.Int, input.addressId)
      .input('Alias', sql.NVarChar(50), input.alias)
      .input('Linea1', sql.NVarChar(200), input.line1)
      .input('Linea2', sql.NVarChar(200), input.line2)
      .input('Municipio', sql.NVarChar(100), input.municipality)
      .input('Departamento', sql.NVarChar(100), input.department)
      .input('Telefono', sql.NVarChar(20), input.phone)
      .execute<UserAddressRecord>('dbo.SP_Direcciones_ActualizarPropia');

    return result.recordset[0];
  }

  async findAdminDetail(input: {
    actorId: number;
    userId: number;
  }): Promise<{ user: AdminUserDetailRecord | undefined; addresses: UserAddressRecord[] }> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDUsuario', sql.Int, input.userId)
      .execute<[AdminUserDetailRecord, UserAddressRecord]>('dbo.SP_Usuarios_ObtenerDetalle');

    return {
      user: result.recordsets[0]?.[0],
      addresses: result.recordsets[1] ?? [],
    };
  }

  async createInternalUser(input: {
    actorId: number;
    email: string;
    passwordHash: string;
    name: string;
    role: 'Operador' | 'Administrador';
  }): Promise<number> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Correo', sql.NVarChar(256), input.email)
      .input('ContrasenaHash', sql.NVarChar(255), input.passwordHash)
      .input('Nombre', sql.NVarChar(100), input.name)
      .input('NombreRol', sql.NVarChar(30), input.role)
      .execute<{ IDUsuario: number }>('dbo.SP_Usuarios_CrearInterno');

    const userId = result.recordset[0]?.IDUsuario;
    if (userId === undefined) {
      throw new Error('SP_Usuarios_CrearInterno did not return IDUsuario.');
    }
    return userId;
  }

  async list(input: {
    actorId: number;
    page: number;
    pageSize: number;
    search?: string | undefined;
    role?: UserRole | undefined;
    active?: boolean | undefined;
  }): Promise<{ total: number; users: UserListItem[] }> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Pagina', sql.Int, input.page)
      .input('TamanoPagina', sql.Int, input.pageSize)
      .input('Buscar', sql.NVarChar(100), input.search ?? null)
      .input('NombreRol', sql.NVarChar(30), input.role ?? null)
      .input('Activo', sql.Bit, input.active ?? null)
      .execute<[UserCountRow, UserListItem]>('dbo.SP_Usuarios_Listar');

    // El SP devuelve primero el total y después las filas de la página.
    const total = result.recordsets[0]?.[0]?.TotalRegistros;
    const users = result.recordsets[1];
    if (total === undefined || !users) {
      throw new Error('SP_Usuarios_Listar did not return the expected result sets.');
    }

    return { total, users };
  }

  async changeStatus(input: {
    actorId: number;
    userId: number;
    active: boolean;
  }): Promise<UserStatusRow | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDUsuario', sql.Int, input.userId)
      .input('Activo', sql.Bit, input.active)
      .execute<UserStatusRow>('dbo.SP_Usuarios_CambiarEstado');

    return result.recordset[0];
  }
}
