export interface ConfigurationRecord {
  Clave: string;
  Valor: string;
  Descripcion: string | null;
  IDUsuarioCreacion: number | null;
  FechaCreacion: Date;
  IDUsuarioModificacion: number | null;
  FechaModificacion: Date | null;
}

export interface ConfigurationResponse {
  key: string;
  value: string;
  description: string | null;
  createdByUserId: number | null;
  createdAt: string;
  updatedByUserId: number | null;
  updatedAt: string | null;
}

export interface CurrencyMetadata {
  currency: string;
  currencySymbol: string;
}

export function toConfigurationResponse(record: ConfigurationRecord): ConfigurationResponse {
  return {
    key: record.Clave,
    value: record.Valor,
    description: record.Descripcion,
    createdByUserId: record.IDUsuarioCreacion,
    createdAt: record.FechaCreacion.toISOString(),
    updatedByUserId: record.IDUsuarioModificacion,
    updatedAt: record.FechaModificacion?.toISOString() ?? null,
  };
}
