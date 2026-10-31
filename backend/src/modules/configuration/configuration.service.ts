import { ConfigurationRepository } from './configuration.repository.js';
import { toConfigurationResponse } from './configuration.types.js';

export class ConfigurationService {
  constructor(private readonly repository = new ConfigurationRepository()) {}

  async list(actorId: number) {
    const records = await this.repository.list(actorId);
    return records.map(toConfigurationResponse);
  }

  async create(input: {
    actorId: number;
    key: string;
    value: string;
    description: string | null;
  }) {
    return toConfigurationResponse(await this.repository.create(input));
  }

  async update(input: {
    actorId: number;
    key: string;
    value: string;
    description?: string | null | undefined;
  }) {
    return toConfigurationResponse(await this.repository.update(input));
  }
}
