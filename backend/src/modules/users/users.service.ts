// Lógica de usuarios: hash de contraseñas y preparación de resultados.
import bcrypt from 'bcrypt';
import { UsersRepository, type UserListItem } from './users.repository.js';
import type { UserRole } from '../auth/auth.types.js';
import { HttpError } from '../../utils/http-error.js';
import { toUserAddressResponse } from './users.types.js';

const bcryptRounds = 12;

export interface ListUsersInput {
  actorId: number;
  page: number;
  pageSize: number;
  search?: string | undefined;
  role?: UserRole | undefined;
  active?: boolean | undefined;
}

export class UsersService {
  constructor(private readonly usersRepository = new UsersRepository()) {}

  async getMyProfile(userId: number): Promise<{
    name: string;
    email: string;
    addresses: ReturnType<typeof toUserAddressResponse>[];
  }> {
    const user = await this.usersRepository.findOwnProfile(userId);
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'No se encontró el usuario.');
    }

    const addresses = await this.usersRepository.findOwnAddresses(userId);
    return {
      name: user.Nombre,
      email: user.Correo,
      addresses: addresses.map(toUserAddressResponse),
    };
  }

  async updateMyProfile(input: {
    userId: number;
    name?: string | undefined;
    email?: string | undefined;
  }): Promise<{
    name: string;
    email: string;
    addresses: ReturnType<typeof toUserAddressResponse>[];
  }> {
    await this.usersRepository.updateOwnProfile(input);
    return this.getMyProfile(input.userId);
  }

  async createMyAddress(input: {
    userId: number;
    alias: string;
    line1: string;
    line2?: string | null | undefined;
    municipality: string;
    department: string;
    phone: string;
  }): Promise<ReturnType<typeof toUserAddressResponse>> {
    const address = await this.usersRepository.createOwnAddress({
      ...input,
      line2: input.line2 ?? null,
    });

    return toUserAddressResponse(address);
  }

  async updateAdminProfile(input: {
    actorId: number;
    userId: number;
    name?: string | undefined;
    email?: string | undefined;
  }): Promise<{
    id: number;
    email: string;
    name: string;
    role: UserRole;
    active: boolean;
    createdAt: Date;
    addresses: ReturnType<typeof toUserAddressResponse>[];
  }> {
    await this.usersRepository.updateAdminProfile(input);
    return this.getAdminDetail(input);
  }

  async updateMyAddress(input: {
    userId: number;
    addressId: number;
    alias: string;
    line1: string;
    line2: string | null;
    municipality: string;
    department: string;
    phone: string;
  }): Promise<ReturnType<typeof toUserAddressResponse>> {
    const address = await this.usersRepository.updateOwnAddress(input);
    if (!address) {
      throw new HttpError(404, 'ADDRESS_NOT_FOUND', 'No se encontró la dirección activa.');
    }

    return toUserAddressResponse(address);
  }

  async getAdminDetail(input: { actorId: number; userId: number }): Promise<{
    id: number;
    email: string;
    name: string;
    role: UserRole;
    active: boolean;
    createdAt: Date;
    addresses: ReturnType<typeof toUserAddressResponse>[];
  }> {
    const result = await this.usersRepository.findAdminDetail(input);
    if (!result.user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'No se encontró el usuario.');
    }

    return {
      id: result.user.IDUsuario,
      email: result.user.Correo,
      name: result.user.Nombre,
      role: result.user.Rol,
      active: result.user.Activo,
      createdAt: result.user.FechaCreacion,
      addresses: result.addresses.map(toUserAddressResponse),
    };
  }

  async createInternalUser(input: {
    actorId: number;
    email: string;
    password: string;
    name: string;
    role: 'Operador' | 'Administrador';
  }): Promise<{ id: number }> {
    const passwordHash = await bcrypt.hash(input.password, bcryptRounds);
    const id = await this.usersRepository.createInternalUser({
      actorId: input.actorId,
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    });

    return { id };
  }

  async list(input: ListUsersInput): Promise<{
    data: UserListItem[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
  }> {
    const result = await this.usersRepository.list(input);

    return {
      data: result.users,
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalRecords: result.total,
        totalPages: Math.ceil(result.total / input.pageSize),
      },
    };
  }

  async changeStatus(input: {
    actorId: number;
    userId: number;
    active: boolean;
  }): Promise<{ id: number; active: boolean }> {
    const result = await this.usersRepository.changeStatus(input);
    if (!result) {
      throw new Error('SP_Usuarios_CambiarEstado did not return the expected user.');
    }

    return { id: result.IDUsuario, active: result.Activo };
  }
}
