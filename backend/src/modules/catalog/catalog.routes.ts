import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/authenticate.middleware.js';
import { CatalogController } from './catalog.controller.js';
import { catalogPhotoUpload } from './catalog.photos.js';

const controller = new CatalogController();

export const catalogRouter = Router();

// La tienda solo expone elementos activos en sus consultas públicas.
catalogRouter.get('/categories', controller.listCategories);
catalogRouter.get('/attributes', controller.listAttributes);
catalogRouter.get('/products', controller.listProducts);
catalogRouter.get('/products/:productId', controller.getProduct);
catalogRouter.get('/media/:fileName', controller.getPhoto);

// La administración del catálogo está reservada al Administrador.
catalogRouter.use('/admin', authenticate, requireRole('Administrador'));

// Las categorías se desactivan para conservar las referencias históricas.
catalogRouter.get('/admin/categories', controller.listAdminCategories);
catalogRouter.post('/admin/categories', controller.createCategory);
catalogRouter.patch('/admin/categories/:categoryId', controller.updateCategory);

catalogRouter.post('/admin/attributes', controller.createAttribute);
catalogRouter.patch('/admin/attributes/:attributeId', controller.updateAttribute);
catalogRouter.delete('/admin/attributes/:attributeId', controller.deleteAttribute);
catalogRouter.post('/admin/photos', catalogPhotoUpload, controller.uploadPhoto);

catalogRouter.get('/admin/products', controller.listAdminProducts);
catalogRouter.get('/admin/products/:productId', controller.getAdminProduct);
catalogRouter.post('/admin/products', controller.createProduct);
catalogRouter.patch('/admin/products/:productId', controller.updateProduct);

// Los cambios de existencia se registran también en el kardex de Inventario.
catalogRouter.post('/admin/products/:productId/variants', controller.createVariant);
catalogRouter.put('/admin/products/:productId/variants/:variantId', controller.updateVariant);
catalogRouter.patch('/admin/products/:productId/variants/:variantId/status', controller.changeVariantStatus);

catalogRouter.post('/admin/products/:productId/images', controller.createImage);
catalogRouter.put('/admin/products/:productId/images/:imageId', controller.updateImage);
catalogRouter.delete('/admin/products/:productId/images/:imageId', controller.deleteImage);
