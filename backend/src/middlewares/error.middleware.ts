// Convierte errores de validación, negocio y sistema a respuestas HTTP.
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http-error.js';

const sqlErrorResponses: Record<number, { statusCode: number; code: string; message: string }> = {
  // Códigos definidos por los stored procedures de Auth, usuarios, catálogo, cupones, inventario y carrito.
  50101: { statusCode: 409, code: 'EMAIL_ALREADY_REGISTERED', message: 'El correo ya está registrado.' },
  50110: { statusCode: 400, code: 'INVALID_SESSION_DATA', message: 'Los datos de sesión no son válidos.' },
  50111: { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'La sesión no es válida.' },
  50112: { statusCode: 401, code: 'REFRESH_TOKEN_REUSED', message: 'La sesión fue revocada; inicia sesión nuevamente.' },
  50113: { statusCode: 401, code: 'REFRESH_TOKEN_EXPIRED', message: 'La sesión expiró; inicia sesión nuevamente.' },
  50114: { statusCode: 403, code: 'USER_INACTIVE', message: 'La cuenta está inactiva.' },
  50120: { statusCode: 400, code: 'ROLE_NOT_ALLOWED', message: 'El rol solicitado no está permitido.' },
  50121: { statusCode: 403, code: 'ACTION_NOT_ALLOWED', message: 'No tienes permiso para realizar esta acción.' },
  50122: { statusCode: 404, code: 'USER_NOT_FOUND', message: 'No se encontró el usuario.' },
  50123: { statusCode: 409, code: 'CANNOT_DEACTIVATE_SELF', message: 'No puedes desactivar tu propia cuenta.' },
  50124: { statusCode: 400, code: 'USER_STATUS_REQUIRED', message: 'Debes indicar el estado del usuario.' },
  50125: { statusCode: 409, code: 'LAST_ADMINISTRATOR', message: 'No se puede desactivar al último administrador activo.' },
  50126: { statusCode: 400, code: 'PROFILE_DATA_REQUIRED', message: 'Debes indicar al menos un dato del perfil.' },
  50127: { statusCode: 404, code: 'ADDRESS_NOT_FOUND', message: 'No se encontró la dirección activa.' },
  50128: { statusCode: 400, code: 'PASSWORD_REQUIRED', message: 'Debes indicar la nueva contraseña.' },
  50130: { statusCode: 404, code: 'CATEGORY_NOT_FOUND', message: 'No se encontró la categoría o está inactiva.' },
  50131: { statusCode: 404, code: 'PRODUCT_NOT_FOUND', message: 'No se encontró el producto.' },
  50132: { statusCode: 404, code: 'VARIANT_NOT_FOUND', message: 'No se encontró la variante para ese producto.' },
  50133: { statusCode: 404, code: 'PRODUCT_IMAGE_NOT_FOUND', message: 'No se encontró la imagen para ese producto.' },
  50134: { statusCode: 409, code: 'SKU_ALREADY_EXISTS', message: 'Ya existe una variante con ese SKU.' },
  50135: { statusCode: 409, code: 'CATALOG_NAME_ALREADY_EXISTS', message: 'Ya existe un elemento del catálogo con ese nombre.' },
  50136: { statusCode: 400, code: 'INVALID_VARIANT_ATTRIBUTES', message: 'Uno o más atributos de la variante no son válidos.' },
  50137: { statusCode: 400, code: 'CATALOG_DATA_REQUIRED', message: 'Debes indicar los datos requeridos del catálogo.' },
  50138: { statusCode: 500, code: 'INVENTORY_MOVEMENT_TYPE_NOT_CONFIGURED', message: 'Faltan tipos de ajuste de inventario. Ejecuta nuevamente la semilla de la base de datos.' },
  50139: { statusCode: 409, code: 'STOCK_BELOW_RESERVED', message: 'La existencia no puede quedar por debajo de las unidades reservadas.' },
  50140: { statusCode: 404, code: 'COUPON_NOT_FOUND', message: 'El cupón no existe o no está disponible.' },
  50141: { statusCode: 409, code: 'COUPON_CODE_ALREADY_EXISTS', message: 'Ya existe un cupón con ese código.' },
  50142: { statusCode: 400, code: 'COUPON_EXPIRED', message: 'El cupón está vencido.' },
  50143: { statusCode: 400, code: 'COUPON_USAGE_LIMIT_REACHED', message: 'El cupón ha alcanzado el límite máximo de usos disponibles.' },
  50144: { statusCode: 400, code: 'COUPON_USER_LIMIT_REACHED', message: 'Has alcanzado el límite de usos permitidos para este cupón.' },
  50145: { statusCode: 400, code: 'COUPON_MINIMUM_AMOUNT_NOT_MET', message: 'El monto de compra no alcanza el mínimo requerido para este cupón.' },
  50146: { statusCode: 400, code: 'INVALID_COUPON_DATA', message: 'Los datos del cupón no son válidos.' },
  50147: { statusCode: 400, code: 'COUPON_NOT_APPLICABLE', message: 'El cupón no aplica a los productos del carrito.' },
  50148: { statusCode: 409, code: 'CART_COUPON_ALREADY_APPLIED', message: 'El carrito ya tiene un cupón aplicado.' },
  50149: { statusCode: 400, code: 'COUPON_NOT_STARTED', message: 'El cupón aún no inicia su periodo de vigencia.' },
  50150: { statusCode: 404, code: 'CART_NOT_FOUND', message: 'No se encontró el carrito.' },
  50151: { statusCode: 404, code: 'CART_ITEM_NOT_FOUND', message: 'No se encontró el producto en el carrito.' },
  50152: { statusCode: 409, code: 'INSUFFICIENT_STOCK', message: 'No hay existencia suficiente para esa cantidad.' },
  50153: { statusCode: 409, code: 'VARIANT_NOT_AVAILABLE', message: 'La variante no está disponible para la venta.' },
  50154: { statusCode: 400, code: 'INVALID_CART_QUANTITY', message: 'La cantidad del carrito no es válida.' },
  50155: { statusCode: 400, code: 'GUEST_CART_TOKEN_INVALID', message: 'El token de carrito de invitado no es válido.' },
  50156: { statusCode: 404, code: 'INVENTORY_VARIANT_NOT_FOUND', message: 'No se encontró la variante de inventario.' },
  50157: { statusCode: 400, code: 'INVENTORY_ADJUSTMENT_REASON_REQUIRED', message: 'El motivo del ajuste es requerido.' },
  50160: { statusCode: 409, code: 'CONFIGURATION_KEY_ALREADY_EXISTS', message: 'La clave de configuración ya existe.' },
  50161: { statusCode: 404, code: 'CONFIGURATION_NOT_FOUND', message: 'La configuración solicitada no existe.' },
  50200: { statusCode: 400, code: 'EMPTY_CART', message: 'El carrito está vacío.' },
  50201: { statusCode: 400, code: 'INVALID_SHIPPING_ADDRESS', message: 'La dirección de envío no es válida.' },
  50202: { statusCode: 409, code: 'INSUFFICIENT_STOCK', message: 'No hay existencia suficiente para completar el pedido.' },
  50210: { statusCode: 400, code: 'ORDER_NOT_DELIVERED', message: 'El pedido debe estar entregado para devolverlo.' },
  50211: { statusCode: 400, code: 'RETURN_REASON_REQUIRED', message: 'El motivo de devolución es requerido.' },
  50212: { statusCode: 400, code: 'INVALID_RETURN_DETAILS', message: 'El detalle de devolución no es válido.' },
  50213: { statusCode: 409, code: 'RETURN_QUANTITY_EXCEEDED', message: 'La cantidad devuelta supera la cantidad disponible.' },
  50220: { statusCode: 404, code: 'ORDER_NOT_FOUND', message: 'No se encontró el pedido.' },
  50221: { statusCode: 400, code: 'ORDER_STATUS_NOT_FOUND', message: 'El estado de destino no existe.' },
  50222: { statusCode: 409, code: 'ORDER_STATUS_TRANSITION_NOT_ALLOWED', message: 'La transición de estado del pedido no está permitida.' },
  50223: { statusCode: 403, code: 'ORDER_STATUS_CHANGE_NOT_ALLOWED', message: 'Solo un Operador o Administrador puede cambiar el estado del pedido.' },
  50224: { statusCode: 409, code: 'ORDER_ALREADY_FINAL', message: 'El pedido ya se encuentra en un estado final.' },
  50225: { statusCode: 400, code: 'INVALID_PAYMENT_METHOD', message: 'El método de pago debe ser TARJETA o CONTRA_ENTREGA.' },
  50226: { statusCode: 409, code: 'COUPON_CUSTOMER_LIMIT_REACHED', message: 'Has alcanzado el límite de usos permitidos para este cupón.' },
  50227: { statusCode: 400, code: 'COUPON_MINIMUM_NOT_REACHED', message: 'El monto de compra no alcanza el mínimo requerido para este cupón.' },
  50228: { statusCode: 409, code: 'COUPON_LIMIT_REACHED', message: 'El cupón alcanzó su límite de usos durante el checkout.' },
  50229: { statusCode: 409, code: 'CART_ITEM_NOT_AVAILABLE', message: 'El carrito contiene un producto que ya no está disponible.' },
  50230: { statusCode: 409, code: 'IDEMPOTENCY_KEY_CART_MISMATCH', message: 'La llave de idempotencia ya fue utilizada con otro carrito.' },
  50231: { statusCode: 409, code: 'CART_RESERVATION_EXPIRED', message: 'La reserva del carrito venció; vuelve a agregar los productos para continuar.' },
  51004: { statusCode: 409, code: 'AUDIT_LOG_IMMUTABLE', message: 'La bitácora es inmutable; no se permiten UPDATE ni DELETE.' },
};

function getSqlErrorNumber(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('number' in error)) {
    return undefined;
  }

  const { number } = error;
  return typeof number === 'number' ? number : undefined;
}

function isMalformedJson(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('type' in error)) {
    return false;
  }

  return error.type === 'entity.parse.failed';
}

export const errorMiddleware: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'La solicitud contiene datos no válidos.',
        details: error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      },
    });
    return;
  }

  if (isMalformedJson(error)) {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'El cuerpo de la solicitud no contiene JSON válido.' },
    });
    return;
  }

  const sqlErrorNumber = getSqlErrorNumber(error);
  const sqlResponse = sqlErrorNumber === undefined ? undefined : sqlErrorResponses[sqlErrorNumber];

  if (sqlResponse) {
    const sqlMessage = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : undefined;
    response.status(sqlResponse.statusCode).json({
      error: { code: sqlResponse.code, message: sqlMessage || sqlResponse.message },
    });
    return;
  }

  console.error('Unhandled API error.', error);
  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Ocurrió un error interno.' },
  });
};
