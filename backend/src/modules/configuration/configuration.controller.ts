import type { Request, Response } from 'express';
import { HttpError } from '../../utils/http-error.js';
import {
  createConfigurationSchema,
  updateConfigurationSchema,
} from './configuration.schemas.js';
import { ConfigurationService } from './configuration.service.js';

export class ConfigurationController {
  constructor(private readonly service = new ConfigurationService()) {}

  list = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: await this.service.list(this.getActorId(request)) });
  };

  create = async (request: Request, response: Response): Promise<void> => {
    const input = createConfigurationSchema.parse(request.body);
    const data = await this.service.create({
      ...input,
      actorId: this.getActorId(request),
      description: input.description ?? null,
    });
    response.status(201).json({ message: 'Configuración creada correctamente.', data });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const key = String(request.params.key);
    const input = updateConfigurationSchema.parse(request.body);
    const data = await this.service.update({
      ...input,
      key,
      actorId: this.getActorId(request),
    });
    response.json({ message: 'Configuración actualizada correctamente.', data });
  };

  private getActorId(request: Request): number {
    const actorId = request.auth?.userId;
    if (!actorId) {
      throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Debes iniciar sesión.');
    }
    return actorId;
  }
}
