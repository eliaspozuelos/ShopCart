export interface CategoryRecord {
  IDCategoria: number;
  Nombre: string;
  Activa: boolean;
}

export interface AttributeRecord {
  IDAtributo: number;
  Nombre: string;
}

export interface ProductRecord {
  IDProducto: number;
  Nombre: string;
  Descripcion: string | null;
  Activo: boolean;
  IDCategoria: number;
  Categoria: string;
  ImagenPrincipal: string | null;
  PrecioMinimo: number | null;
  PrecioMaximo: number | null;
  ExistenciaTotal: number | null;
}

export interface ProductDetailRecord {
  IDProducto: number;
  Nombre: string;
  Descripcion: string | null;
  Activo: boolean;
  IDCategoria: number;
  Categoria: string;
}

export interface ProductImageRecord {
  IDProductoImagen: number;
  IDProducto: number;
  Url: string;
  Orden: number;
}

export interface ProductVariantRecord {
  IDVariante: number;
  IDProducto: number;
  SKU: string;
  Precio: number;
  ExistenciaFisica: number;
  Activa: boolean;
}

export interface ProductVariantAttributeRecord {
  IDVariante: number;
  IDAtributo: number;
  Atributo: string;
  Valor: string;
}

export interface ProductVariantResponse {
  id: number;
  sku: string;
  price: number;
  priceDisplay: string;
  stock: number;
  active: boolean;
  attributes: Array<{ id: number; name: string; value: string }>;
}

export interface ProductDetailResponse {
  currency: string;
  currencySymbol: string;
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  category: { id: number; name: string };
  images: Array<{ id: number; url: string; order: number }>;
  variants: ProductVariantResponse[];
}

export function toCategoryResponse(category: CategoryRecord) {
  return { id: category.IDCategoria, name: category.Nombre, active: category.Activa };
}

export function toAttributeResponse(attribute: AttributeRecord) {
  return { id: attribute.IDAtributo, name: attribute.Nombre };
}

export function toProductSummaryResponse(
  product: ProductRecord,
  currency: { currency: string; currencySymbol: string },
) {
  const formatMoney = (value: number | null): string | null =>
    value === null ? null : `${currency.currencySymbol} ${value.toFixed(2)}`;
  return {
    ...currency,
    id: product.IDProducto,
    name: product.Nombre,
    description: product.Descripcion,
    active: product.Activo,
    category: { id: product.IDCategoria, name: product.Categoria },
    primaryImage: product.ImagenPrincipal,
    price: {
      minimum: product.PrecioMinimo,
      maximum: product.PrecioMaximo,
      minimumDisplay: formatMoney(product.PrecioMinimo),
      maximumDisplay: formatMoney(product.PrecioMaximo),
    },
    stock: product.ExistenciaTotal ?? 0,
  };
}
