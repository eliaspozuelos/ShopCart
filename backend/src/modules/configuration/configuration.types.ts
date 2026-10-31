export interface ConfigurationRecord {
  Clave: string;
  Valor: string;
  Descripcion: string | null;
}

export interface ConfigurationResponse {
  key: string;
  value: string;
  description: string | null;
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
  };
}
