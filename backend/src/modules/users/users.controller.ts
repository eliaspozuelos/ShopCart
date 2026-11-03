// Valida parámetros HTTP y delega las operaciones de usuarios al servicio.
import type { Request, Response } from 'express';
import { HttpError } from '../../utils/http-error.js';
import {
  addressIdParamsSchema,
  changeUserStatusSchema,
  createAddressSchema,
  createInternalUserSchema,
  listUsersQuerySchema,
  updateAddressSchema,
  updateProfileSchema,
  userIdParamsSchema,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

export class UsersController {
  constructor(private readonly usersService = new UsersService()) {}

  // Maneja la solicitud GET /api/v1/users/me para obtener el perfil del usuario autenticado.
  getMyProfile = async (request: Request, response: Response): Promise<void> => {
    const userId = request.auth?.userId;
    if (!userId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const profile = await this.usersService.getMyProfile(userId);
    console.info('Perfil consultado correctamente.', { userId });
    response.status(200).json({ 
      message: 'El perfil se obtuvo correctamente.',
      data: profile });
  };

  // Maneja la solicitud PUT /api/v1/users/me para actualizar el perfil del usuario autenticado.
  updateMyProfile = async (request: Request, response: Response): Promise<void> => {
    const input = updateProfileSchema.parse(request.body);
    const userId = request.auth?.userId;
    if (!userId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    // Llama al servicio para actualizar el perfil y devuelve la respuesta.
    const profile = await this.usersService.updateMyProfile({ ...input, userId });
    response.status(200).json({ 
      message: 'El perfil se actualizó correctamente.',
      data: profile });
  };

  // Maneja la solicitud PUT /api/v1/users/me/addresses/:addressId para actualizar una dirección del usuario autenticado.
  updateMyAddress = async (request: Request, response: Response): Promise<void> => {
    const { addressId } = addressIdParamsSchema.parse(request.params);
    const input = updateAddressSchema.parse(request.body);
    const userId = request.auth?.userId;
    if (!userId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const address = await this.usersService.updateMyAddress({ ...input, addressId, userId });
    response.status(200).json({ 
      message: 'La dirección se actualizó correctamente.',
      data: address });
  };

  //Maneja las solicitudes de creación de direcciones para el usuario autenticado.
  createMyAddress = async (request: Request, response: Response): Promise<void> => {
    const input = createAddressSchema.parse(request.body);
    const userId = request.auth?.userId;
    if (!userId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const address = await this.usersService.createMyAddress({ ...input, userId });
    console.info('Dirección agregada correctamente.', { userId, alias: address.alias });
    response.status(201).json({ 
      message: 'La dirección se creó correctamente.',
      data: address });
  };

  //Maneja la solicitud para obtener los detalles de un usuario administrado por un administrador autenticado.
  getDetail = async (request: Request, response: Response): Promise<void> => {
    const { userId } = userIdParamsSchema.parse(request.params);
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const detail = await this.usersService.getAdminDetail({ actorId, userId });
    response.status(200).json({
      message: 'Los detalles del usuario se obtuvieron correctamente.',
      data: detail
    });
  };


  //Maneja las solicidutes de actualización de perfil de un usuario 
  updateAdminProfile = async (request: Request, response: Response): Promise<void> => {

    const { userId } = userIdParamsSchema.parse(request.params);
    const input = updateProfileSchema.parse(request.body);
    const actorId = request.auth?.userId;
    
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const detail = await this.usersService.updateAdminProfile({ ...input, actorId, userId });
    response.status(200).json({ 
      message: 'El perfil se actualizó correctamente.',
      data: detail });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const input = createInternalUserSchema.parse(request.body);
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const data = await this.usersService.createInternalUser({ ...input, actorId });
    response.status(201).json({
      message: 'El usuario se creó correctamente.',
      data: data,
    });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const query = listUsersQuerySchema.parse(request.query);
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const result = await this.usersService.list({ ...query, actorId });
    response.status(200).json(
      {
        
        message: 'Los usuarios se listaron correctamente.',
        data: result
      }
     
    );
    console.info('Usuarios listados correctamente.', {
      page: query.page,
      pageSize: query.pageSize,
      totalRecords: result.pagination.totalRecords,
    });
  };

  //Cambiar el estado de un usuario administrado por un administrador autenticado.
  changeStatus = async (request: Request, response: Response): Promise<void> => {
    const { userId } = userIdParamsSchema.parse(request.params);
    const { active } = changeUserStatusSchema.parse(request.body);
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }

    const result = await this.usersService.changeStatus({ actorId, userId, active });
    response.status(200).json({
      message: 'El estado del usuario se actualizó correctamente.',
      data: result
    });
  };
}
