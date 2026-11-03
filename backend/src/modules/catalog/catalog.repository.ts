import sql from 'mssql';
import { getDatabase } from '../../config/database.js';
import type {
  AttributeRecord,
  CategoryRecord,
  ProductDetailRecord,
  ProductImageRecord,
  ProductRecord,
  ProductVariantAttributeRecord,
  ProductVariantRecord,
} from './catalog.types.js';

interface ProductCountRecord {
  TotalRegistros: number;
}

export interface ProductListResult {
  total: number;
  products: ProductRecord[];
}

export interface ProductDetailResult {
  product: ProductDetailRecord | undefined;
  images: ProductImageRecord[];
  variants: ProductVariantRecord[];
  attributes: ProductVariantAttributeRecord[];
}

export class CatalogRepository {

  
  async listCategories(includeInactive = false, actorId?: number): Promise<CategoryRecord[]> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IncluirInactivas', sql.Bit, includeInactive)
      .input('IDUsuarioActor', sql.Int, actorId ?? null)
      .execute<CategoryRecord>('dbo.SP_Catalogo_ListarCategorias');
    return result.recordset;
  }

  async createCategory(input: { actorId: number; name: string }): Promise<CategoryRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Nombre', sql.NVarChar(100), input.name)
      .execute<CategoryRecord>('dbo.SP_Catalogo_CrearCategoria');
    const category = result.recordset[0];
    if (!category) throw new Error('SP_Catalogo_CrearCategoria no devolvió la categoría creada.');
    return category;
  }

  async updateCategory(input: {
    actorId: number;
    categoryId: number;
    name?: string | undefined;
    active?: boolean | undefined;
  }): Promise<CategoryRecord | undefined> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDCategoria', sql.Int, input.categoryId)
      .input('Nombre', sql.NVarChar(100), input.name ?? null)
      .input('Activa', sql.Bit, input.active ?? null)
      .execute<CategoryRecord>('dbo.SP_Catalogo_ActualizarCategoria');
    return result.recordset[0];
  }

  async listAttributes(): Promise<AttributeRecord[]> {
    const database = await getDatabase();
    const result = await database.request()
      .execute<AttributeRecord>('dbo.SP_Catalogo_ListarAtributos');
    return result.recordset;
  }

  async createAttribute(input: { actorId: number; name: string }): Promise<AttributeRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('Nombre', sql.NVarChar(50), input.name)
      .execute<AttributeRecord>('dbo.SP_Catalogo_CrearAtributo');
    const attribute = result.recordset[0];
    if (!attribute) throw new Error('SP_Catalogo_CrearAtributo no devolvió el atributo creado.');
    return attribute;
  }

  async listProducts(input: {
    page: number;
    pageSize: number;
    categoryId?: number | undefined;
    search?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    available?: boolean | undefined;
    sort?: string | undefined;
    includeInactive?: boolean | undefined;
    actorId?: number | undefined;
  }): Promise<ProductListResult> {
    const database = await getDatabase();
    const result = await database.request()
      .input('Pagina', sql.Int, input.page)
      .input('TamanoPagina', sql.Int, input.pageSize)
      .input('IDCategoria', sql.Int, input.categoryId ?? null)
      .input('Buscar', sql.NVarChar(100), input.search ?? null)
      .input('PrecioMinimo', sql.Decimal(18, 2), input.minPrice ?? null)
      .input('PrecioMaximo', sql.Decimal(18, 2), input.maxPrice ?? null)
      .input('SoloDisponibles', sql.Bit, input.available ?? null)
      .input('OrdenarPor', sql.VarChar(20), input.sort ?? 'name_asc')
      .input('IncluirInactivos', sql.Bit, input.includeInactive ?? false)
      .input('IDUsuarioActor', sql.Int, input.actorId ?? null)
      .execute<[ProductCountRecord, ProductRecord]>('dbo.SP_Catalogo_ListarProductos');
    const total = result.recordsets[0]?.[0]?.TotalRegistros;
    const products = result.recordsets[1];
    if (total === undefined || !products) {
      throw new Error('SP_Catalogo_ListarProductos no devolvió los resultados esperados.');
    }
    return { total, products };
  }

  async getProduct(productId: number, includeInactive = false, actorId?: number): Promise<ProductDetailResult> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDProducto', sql.Int, productId)
      .input('IncluirInactivos', sql.Bit, includeInactive)
      .input('IDUsuarioActor', sql.Int, actorId ?? null)
      .execute<[
        ProductDetailRecord,
        ProductImageRecord,
        ProductVariantRecord,
        ProductVariantAttributeRecord,
      ]>('dbo.SP_Catalogo_ObtenerProducto');
    return {
      product: result.recordsets[0]?.[0],
      images: result.recordsets[1] ?? [],
      variants: result.recordsets[2] ?? [],
      attributes: result.recordsets[3] ?? [],
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
  }): Promise<ProductDetailResult> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDCategoria', sql.Int, input.categoryId)
      .input('Nombre', sql.NVarChar(150), input.name)
      .input('Descripcion', sql.NVarChar(2000), input.description ?? null)
      .input('VariantesJson', sql.NVarChar(sql.MAX), JSON.stringify(input.variants))
      .input('ImagenesJson', sql.NVarChar(sql.MAX), JSON.stringify(input.images))
      .execute<[
        ProductDetailRecord,
        ProductImageRecord,
        ProductVariantRecord,
        ProductVariantAttributeRecord,
      ]>('dbo.SP_Catalogo_CrearProducto');
    const product = result.recordsets[0]?.[0];
    if (!product) throw new Error('SP_Catalogo_CrearProducto no devolvió el producto creado.');
    return {
      product,
      images: result.recordsets[1] ?? [],
      variants: result.recordsets[2] ?? [],
      attributes: result.recordsets[3] ?? [],
    };
  }

  async updateProduct(input: {
    actorId: number;
    productId: number;
    categoryId?: number | undefined;
    name?: string | undefined;
    description?: string | null | undefined;
    active?: boolean | undefined;
  }): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDProducto', sql.Int, input.productId)
      .input('IDCategoria', sql.Int, input.categoryId ?? null)
      .input('Nombre', sql.NVarChar(150), input.name ?? null)
      .input('Descripcion', sql.NVarChar(2000), input.description ?? null)
      .input('ActualizarDescripcion', sql.Bit, input.description !== undefined)
      .input('Activo', sql.Bit, input.active ?? null)
      .execute('dbo.SP_Catalogo_ActualizarProducto');
  }

  async saveVariant(input: {
    actorId: number;
    productId: number;
    variantId?: number | undefined;
    sku: string;
    price: number;
    stock?: number | undefined;
    attributes: Array<{ attributeId: number; value: string }>;
  }): Promise<ProductVariantRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDProducto', sql.Int, input.productId)
      .input('IDVariante', sql.Int, input.variantId ?? null)
      .input('SKU', sql.NVarChar(50), input.sku)
      .input('Precio', sql.Decimal(18, 2), input.price)
      .input('ExistenciaFisica', sql.Int, input.stock ?? null)
      .input('AtributosJson', sql.NVarChar(sql.MAX), JSON.stringify(input.attributes))
      .execute<ProductVariantRecord>('dbo.SP_Catalogo_GuardarVariante');
    const variant = result.recordset[0];
    if (!variant) throw new Error('SP_Catalogo_GuardarVariante no devolvió la variante.');
    return variant;
  }

  async changeVariantStatus(input: {
    actorId: number;
    productId: number;
    variantId: number;
    active: boolean;
  }): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDProducto', sql.Int, input.productId)
      .input('IDVariante', sql.Int, input.variantId)
      .input('Activa', sql.Bit, input.active)
      .execute('dbo.SP_Catalogo_CambiarEstadoVariante');
  }

  async saveImage(input: {
    actorId: number;
    productId: number;
    imageId?: number | undefined;
    url: string;
    order: number;
  }): Promise<ProductImageRecord> {
    const database = await getDatabase();
    const result = await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDProducto', sql.Int, input.productId)
      .input('IDProductoImagen', sql.Int, input.imageId ?? null)
      .input('Url', sql.NVarChar(500), input.url)
      .input('Orden', sql.Int, input.order)
      .execute<ProductImageRecord>('dbo.SP_Catalogo_GuardarImagen');
    const image = result.recordset[0];
    if (!image) throw new Error('SP_Catalogo_GuardarImagen no devolvió la imagen.');
    return image;
  }

  async deleteImage(input: { actorId: number; productId: number; imageId: number }): Promise<void> {
    const database = await getDatabase();
    await database.request()
      .input('IDUsuarioActor', sql.Int, input.actorId)
      .input('IDProducto', sql.Int, input.productId)
      .input('IDProductoImagen', sql.Int, input.imageId)
      .execute('dbo.SP_Catalogo_EliminarImagen');
  }
}
