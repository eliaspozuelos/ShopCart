// Acceso a datos de Auth: invoca SP con tipos SQL explícitos.
import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type { AuthUserRecord, PublicUserRecord } from './auth.types.js';

export class AuthRepository {

  
  async registerCustomer(input: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<number> {
    const database = await getDatabase();
    const result = await database.request()
      .input('Correo', sql.NVarChar(256), input.email)
      .input('ContrasenaHash', sql.NVarChar(255), input.passwordHash)
      .input('Nombre', sql.NVarChar(100), input.name)
      .execute<{ IDUsuario: number }>('dbo.SP_Auth_RegistrarCliente');

    const userId = result.recordset[0]?.IDUsuario;
    if (userId === undefined) {
      throw new Error('SP_Auth_RegistrarCliente did not return IDUsuario.');
    }

    return userId;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('Correo', sql.NVarChar(256), email)
      .execute<AuthUserRecord>('dbo.SP_Auth_ObtenerUsuarioPorCorreo');

    return result.recordset[0];
  }

  async findCredentialsById(userId: number): Promise<Pick<AuthUserRecord, 'IDUsuario' | 'ContrasenaHash' | 'Activo'> | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuario', sql.Int, userId)
      .execute<Pick<AuthUserRecord, 'IDUsuario' | 'ContrasenaHash' | 'Activo'>>(
        'dbo.SP_Auth_ObtenerCredencialesPorID',
      );

    return result.recordset[0];
  }

  async updatePassword(input: { userId: number; passwordHash: string }): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('IDUsuarioActor', sql.Int, input.userId)
      .input('ContrasenaHash', sql.NVarChar(255), input.passwordHash)
      .execute('dbo.SP_Auth_CambiarContrasena');
  }

  async createSession(input: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('IDUsuario', sql.Int, input.userId)
      .input('TokenHash', sql.Char(64), input.tokenHash)
      .input('ExpiraEn', sql.DateTime2(0), input.expiresAt)
      .execute('dbo.SP_Auth_CrearSesion');
  }

  async rotateRefreshToken(input: {
    currentTokenHash: string;
    newTokenHash: string;
    expiresAt: Date;
  }): Promise<PublicUserRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('TokenHashActual', sql.Char(64), input.currentTokenHash)
      .input('TokenHashNuevo', sql.Char(64), input.newTokenHash)
      .input('ExpiraEn', sql.DateTime2(0), input.expiresAt)
      .execute<PublicUserRecord>('dbo.SP_Auth_RotarRefreshToken');

    return result.recordset[0];
  }

  async closeSession(tokenHash: string): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('TokenHash', sql.Char(64), tokenHash)
      .execute('dbo.SP_Auth_CerrarSesion');
  }
}
