import type { Request, Response } from "express";
import { HttpError } from "../../utils/http-error.js";
import {
  catalogListQuerySchema,
  categoryIdParamsSchema,
  createAttributeSchema,
  createCategorySchema,
  createProductSchema,
  productIdParamsSchema,
  productImageParamsSchema,
  productVariantParamsSchema,
  saveProductImageSchema,
  saveVariantSchema,
  updateCategorySchema,
  updateProductSchema,
  variantStatusSchema,
} from "./catalog.schemas.js";
import { CatalogService } from "./catalog.service.js";

export class CatalogController {
  constructor(private readonly catalogService = new CatalogService()) {}

  // Consulta las categorías visibles para los clientes de la tienda.
  listCategories = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    response
      .status(200)
      .json({ data: await this.catalogService.listCategories() });
  };

  // Consulta categorías incluyendo inactivas para la administración del catálogo.
  listAdminCategories = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    response
      .status(200)
      .json({ data: await this.catalogService.listCategories(true, actorId) });
  };

  // Crea una categoría y registra al administrador que realizó la acción.
  createCategory = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const input = createCategorySchema.parse(request.body);
    response.status(201).json({
      data: await this.catalogService.createCategory({ ...input, actorId }),
    });
  };

  // Actualiza el nombre o el estado de una categoría existente.
  updateCategory = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const { categoryId } = categoryIdParamsSchema.parse(request.params);
    const input = updateCategorySchema.parse(request.body);
    response.status(200).json({
      data: await this.catalogService.updateCategory({
        ...input,
        actorId,
        categoryId,
      }),
    });
  };

  // Devuelve los atributos disponibles para construir variantes de productos.
  listAttributes = async (
    _request: Request,
    response: Response,
  ): Promise<void> => {
    response
      .status(200)
      .json({ data: await this.catalogService.listAttributes() });
  };

  // Registra un atributo como talla, color u otra característica de una variante.
  createAttribute = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const input = createAttributeSchema.parse(request.body);
    response.status(201).json({
      data: await this.catalogService.createAttribute({ ...input, actorId }),
    });
  };

  // Lista los productos activos que puede consultar la tienda.
  listProducts = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const query = catalogListQuerySchema.parse(request.query);
    response.status(200).json({
      data: await this.catalogService.listProducts(query),
    });
  };

  // Lista productos para administración, incluyendo los que están inactivos.
  listAdminProducts = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const query = catalogListQuerySchema.parse(request.query);
    const actorId = this.getActorId(request);
    response.status(200).json({
      data: await this.catalogService.listProducts({
        ...query,
        includeInactive: true,
        actorId,
      }),
    });
  };

  // Consulta el detalle público de un producto y sus variantes activas.
  getProduct = async (request: Request, response: Response): Promise<void> => {
    const { productId } = productIdParamsSchema.parse(request.params);
    response.status(200).json({
      data: await this.catalogService.getProduct(productId),
    });
  };

  // Consulta el detalle administrativo completo, incluyendo elementos inactivos.
  getAdminProduct = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const { productId } = productIdParamsSchema.parse(request.params);
    const actorId = this.getActorId(request);
    response.status(200).json({
      data: await this.catalogService.getProduct(productId, true, actorId),
    });
  };

  // Crea un producto junto con la información recibida en la solicitud.
  createProduct = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const input = createProductSchema.parse(request.body);
    response.status(201).json({
      data: await this.catalogService.createProduct({ ...input, actorId }),
    });
  };

  // Modifica la información principal de un producto existente.
  updateProduct = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const { productId } = productIdParamsSchema.parse(request.params);
    const input = updateProductSchema.parse(request.body);
    response.status(200).json({
      message: "Producto actualizado correctamente.",
      data: await this.catalogService.updateProduct({
        ...input,
        actorId,
        productId,
      }),
    });
  };

  // Crea una variante con su SKU, precio, atributos y existencia inicial.
  createVariant = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const { productId } = productIdParamsSchema.parse(request.params);
    const input = saveVariantSchema.parse(request.body);
    response.status(201).json({
      data: await this.catalogService.saveVariant({
        ...input,
        actorId,
        productId,
      }),
    });
  };

  // Actualiza los datos de una variante y registra cualquier cambio de stock.
  updateVariant = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const { productId, variantId } = productVariantParamsSchema.parse(
      request.params,
    );
    const input = saveVariantSchema.parse(request.body);
    response.status(200).json({
      data: await this.catalogService.saveVariant({
        ...input,
        actorId,
        productId,
        variantId,
      }),
    });
  };

  // Activa o desactiva una variante sin eliminar su historial.
  changeVariantStatus = async (
    request: Request,
    response: Response,
  ): Promise<void> => {
    const actorId = this.getActorId(request);
    const { productId, variantId } = productVariantParamsSchema.parse(
      request.params,
    );
    const { active } = variantStatusSchema.parse(request.body);
    response.status(200).json({
      message: "Estado de la variante actualizado correctamente.",
      data: await this.catalogService.changeVariantStatus({
        actorId,
        productId,
        variantId,
        active,
      }),
    });
  };

  // Guarda una imagen asociada al producto.
  createImage = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const { productId } = productIdParamsSchema.parse(request.params);
    const input = saveProductImageSchema.parse(request.body);
    response.status(201).json({
      message: "Imagen creada correctamente.",
      data: await this.catalogService.saveImage({
        ...input,
        actorId,
        productId,
      }),
    });
  };

  // Reemplaza la información de una imagen existente.
  updateImage = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const { productId, imageId } = productImageParamsSchema.parse(
      request.params,
    );
    const input = saveProductImageSchema.parse(request.body);
    response.status(200).json({
      data: await this.catalogService.saveImage({
        ...input,
        actorId,
        productId,
        imageId,
      }),
    });
  };

  // Elimina una imagen específica del producto.
  deleteImage = async (request: Request, response: Response): Promise<void> => {
    const actorId = this.getActorId(request);
    const { productId, imageId } = productImageParamsSchema.parse(
      request.params,
    );
    await this.catalogService.deleteImage({ actorId, productId, imageId });
    response.status(204).end();
  };

  private getActorId(request: Request): number {
    const actorId = request.auth?.userId;
    if (!actorId)
      throw new HttpError(
        401,
        "AUTHENTICATION_REQUIRED",
        "Debes iniciar sesión.",
      );
    return actorId;
  }
}
