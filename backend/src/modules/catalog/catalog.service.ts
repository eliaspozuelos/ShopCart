import { HttpError } from '../../utils/http-error.js';
import { CatalogRepository, type ProductDetailResult } from './catalog.repository.js';
import {
  toAttributeResponse,
  toCategoryResponse,
  toProductSummaryResponse,
  type ProductDetailResponse,
  type ProductVariantResponse,
} from './catalog.types.js';
import { ConfigurationRepository } from '../configuration/configuration.repository.js';

export class CatalogService {
  constructor(
    private readonly catalogRepository = new CatalogRepository(),
    private readonly configurationRepository = new ConfigurationRepository(),
  ) {}

  async listCategories(includeInactive = false, actorId?: number) {
    const categories = await this.catalogRepository.listCategories(includeInactive, actorId);
    return categories.map(toCategoryResponse);
  }

  async createCategory(input: { actorId: number; name: string }) {
    return toCategoryResponse(await this.catalogRepository.createCategory(input));
  }

  async updateCategory(input: {
    actorId: number;
    categoryId: number;
    name?: string | undefined;
    active?: boolean | undefined;
  }) {
    const category = await this.catalogRepository.updateCategory(input);
    if (!category) throw new HttpError(404, 'CATEGORY_NOT_FOUND', 'No se encontró la categoría.');
    return toCategoryResponse(category);
  }

  async listAttributes() {
    return (await this.catalogRepository.listAttributes()).map(toAttributeResponse);
  }

  async createAttribute(input: { actorId: number; name: string }) {
    return toAttributeResponse(await this.catalogRepository.createAttribute(input));
  }

  async updateAttribute(input: { actorId: number; attributeId: number; name: string }) {
    const attribute = await this.catalogRepository.updateAttribute(input);
    if (!attribute) throw new HttpError(404, 'ATTRIBUTE_NOT_FOUND', 'No se encontró el atributo.');
    return toAttributeResponse(attribute);
  }

  async deleteAttribute(input: { actorId: number; attributeId: number }) {
    await this.catalogRepository.deleteAttribute(input);
  }

  async listProducts(input: {
    page: number;
    pageSize: number;
    categoryId?: number | undefined;
    search?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    available?: boolean | undefined;
    sort?: 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | undefined;
    includeInactive?: boolean | undefined;
    actorId?: number | undefined;
  }) {
    const result = await this.catalogRepository.listProducts(input);
    const currency = await this.configurationRepository.getCurrencyMetadata();
    return {
      data: result.products.map((product) => {
        const summary = toProductSummaryResponse(product, currency);
        if (input.includeInactive) return summary;
        return { ...summary, stock: availableUnits(product.ExistenciaDisponible, summary.stock) };
      }),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        totalRecords: result.total,
        totalPages: Math.ceil(result.total / input.pageSize),
      },
    };
  }

  async getProduct(productId: number, includeInactive = false, actorId?: number): Promise<ProductDetailResponse> {
    const result = await this.catalogRepository.getProduct(productId, includeInactive, actorId);
    if (!result.product) {
      throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'No se encontró el producto.');
    }

    return this.toProductDetailResponse(result, includeInactive ? 'physical' : 'available');
  }

  private async toProductDetailResponse(
    result: ProductDetailResult,
    stockSource: 'physical' | 'available' = 'physical',
  ): Promise<ProductDetailResponse> {
    const product = result.product;
    if (!product) throw new Error('El procedimiento no devolvió el producto.');
    const currency = await this.configurationRepository.getCurrencyMetadata();
    const formatMoney = (value: number): string => `${currency.currencySymbol} ${value.toFixed(2)}`;
    return {
      ...currency,
      id: product.IDProducto,
      name: product.Nombre,
      description: product.Descripcion,
      active: product.Activo,
      category: { id: product.IDCategoria, name: product.Categoria },
      images: result.images.map((image) => ({
        id: image.IDProductoImagen,
        url: image.Url,
        order: image.Orden,
      })),
      variants: result.variants.map((variant): ProductVariantResponse => ({
        id: variant.IDVariante,
        sku: variant.SKU,
        price: variant.Precio,
        priceDisplay: formatMoney(variant.Precio),
        stock: stockSource === 'available'
          ? availableUnits(variant.ExistenciaDisponible, variant.ExistenciaFisica)
          : variant.ExistenciaFisica,
        active: variant.Activa,
        imageUrl: variant.UrlImagen || null,
        attributes: result.attributes
          .filter((attribute) => attribute.IDVariante === variant.IDVariante)
          .map((attribute) => ({
            id: attribute.IDAtributo,
            name: attribute.Atributo,
            value: attribute.Valor,
          })),
      })),
    };
  }

  async createProduct(input: {
    actorId: number;
    categoryId: number;
    name: string;
    description?: string | null | undefined;
    variants: Array<{
      sku: string;
      price: number;
      stock?: number | undefined;
      attributes: Array<{ attributeId: number; value: string }>;
    }>;
    images: Array<{ url: string; order: number }>;
  }) {
    const result = await this.catalogRepository.createProduct(input);
    if (!result.product) throw new Error('No se encontró el producto recién creado.');
    return {
      ...(await this.toProductDetailResponse(result)),
      categoryId: result.product.IDCategoria,
    };
  }

  async updateProduct(input: {
    actorId: number;
    productId: number;
    categoryId?: number | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    active?: boolean | undefined;
  }) {
    await this.catalogRepository.updateProduct(input);
    return this.getProduct(input.productId, true, input.actorId);
  }

  async saveVariant(input: {
    actorId: number;
    productId: number;
    variantId?: number | undefined;
    sku: string;
    price: number;
    stock?: number | undefined;
    imageUrl?: string | null | undefined;
    attributes: Array<{ attributeId: number; value: string }>;
  }) {
    const variant = await this.catalogRepository.saveVariant({
      ...input,
      imageUrl: input.imageUrl ? input.imageUrl : null,
      updateImage: input.imageUrl !== undefined,
    });
    const detail = await this.getProduct(input.productId, true, input.actorId);
    const response = detail.variants.find(({ id }) => id === variant.IDVariante);
    if (!response) throw new Error('La variante guardada no apareció en el detalle del producto.');
    return response;
  }

  async changeVariantStatus(input: {
    actorId: number;
    productId: number;
    variantId: number;
    active: boolean;
  }) {
    await this.catalogRepository.changeVariantStatus(input);
    const detail = await this.getProduct(input.productId, true, input.actorId);
    const variant = detail.variants.find(({ id }) => id === input.variantId);
    if (!variant) throw new Error('La variante actualizada no apareció en el detalle del producto.');
    return variant;
  }

  async saveImage(input: {
    actorId: number;
    productId: number;
    imageId?: number | undefined;
    url: string;
    order: number;
  }) {
    const image = await this.catalogRepository.saveImage(input);
    return { id: image.IDProductoImagen, productId: image.IDProducto, url: image.Url, order: image.Orden };
  }

  async deleteImage(input: { actorId: number; productId: number; imageId: number }): Promise<void> {
    await this.catalogRepository.deleteImage(input);
  }
}

function availableUnits(value: number | null | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return Math.max(0, fallback);
  return Math.max(0, Math.trunc(parsed));
}
