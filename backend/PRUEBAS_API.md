# Guía de Pruebas Manuales de la API ShopCart

Esta guía detalla el paso a paso para probar exhaustivamente todos los módulos de la API ShopCart (RF-01 a RF-09) utilizando Postman o cualquier cliente HTTP.

---

## 1. Preparación del Entorno

1. **Asegúrate de que SQL Server esté activo** y la base de datos `ShopCart` tenga ejecutados todos los scripts de `database/` (esquema, procedimientos almacenados y semillas).
2. **Inicia el servidor backend:**
   ```powershell
   cd backend
   npm run dev
   ```
   La API estará escuchando en `http://localhost:3000`. Comprueba la salud del servicio en `http://localhost:3000/health`.

### Configuración de Postman
- **URL Base:** `http://localhost:3000/api/v1`
- **Encabezados Globales:**
  - `Content-Type: application/json` (en solicitudes con cuerpo JSON).
- **Manejo de Cookies:** Mantén habilitado el *Cookie Jar* de Postman para gestionar automáticamente la cookie `HttpOnly` `shopcart_refresh`.
- **Autorización:** Para rutas protegidas, selecciona **Auth → Bearer Token** y pega el `accessToken` devuelto en el login.

### Credenciales Demo Sembradas
| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@example.com` | `ShopCartDemo2026!` |
| **Operador** (crear en admin) | `operador@example.com` | `OperadorDemo2026!` |
| **Cliente** (registro público) | `cliente@example.com` | `ClienteDemo2026!` |

---

## 2. Autenticación y Sesiones (RF-01)

### 2.1. Registro de Cliente
- **Método:** `POST`
- **URL:** `{{base_url}}/auth/register`
- **Acceso:** Público
- **Cuerpo (JSON):**
```json
{
  "email": "cliente@example.com",
  "password": "ClienteDemo2026!",
  "name": "Carlos López"
}
```
- **Respuesta esperada (201 Created):**
```json
{
  "data": {
    "user": {
      "id": 2,
      "email": "cliente@example.com",
      "name": "Carlos López",
      "role": "Cliente"
    }
  }
}
```

### 2.2. Iniciar Sesión (Login)
- **Método:** `POST`
- **URL:** `{{base_url}}/auth/login`
- **Acceso:** Público
- **Cuerpo (JSON):**
```json
{
  "email": "admin@example.com",
  "password": "ShopCartDemo2026!"
}
```
- **Respuesta esperada (200 OK):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOi...",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "name": "Administrador Demo",
      "role": "Administrador"
    }
  }
}
```
*Nota:* El encabezado `Set-Cookie` enviará la cookie segura `shopcart_refresh`.

### 2.3. Renovar Sesión (Refresh Token)
- **Método:** `POST`
- **URL:** `{{base_url}}/auth/refresh`
- **Acceso:** Cookie `shopcart_refresh` requerida (sin cuerpo).
- **Respuesta esperada (200 OK):** Nuevo `accessToken` y rotación de la cookie refresh.

### 2.4. Cerrar Sesión (Logout)
- **Método:** `POST`
- **URL:** `{{base_url}}/auth/logout`
- **Acceso:** Cookie `shopcart_refresh` requerida.
- **Respuesta esperada (200 OK):** Sesión revocada en SQL Server y cookie eliminada.

### 2.5. Cambiar Contraseña
- **Método:** `PATCH`
- **URL:** `{{base_url}}/auth/password`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Cuerpo (JSON):**
```json
{
  "currentPassword": "ShopCartDemo2026!",
  "newPassword": "NuevaClaveAdmin2026!"
}
```

---

## 3. Perfil y Direcciones de Usuario (RF-01)

### 3.1. Consultar Perfil Propio
- **Método:** `GET`
- **URL:** `{{base_url}}/users/me`
- **Headers:** `Authorization: Bearer <accessToken>`

### 3.2. Actualizar Perfil Propio
- **Método:** `PATCH`
- **URL:** `{{base_url}}/users/me`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Cuerpo (JSON):**
```json
{
  "name": "Carlos Alberto López",
  "email": "carlos.nuevo@example.com"
}
```

### 3.3. Crear Dirección de Entrega
- **Método:** `POST`
- **URL:** `{{base_url}}/users/me/addresses`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Cuerpo (JSON):**
```json
{
  "alias": "Casa",
  "line1": "7a Avenida 12-34 Zona 9",
  "line2": "Apartamento 4B",
  "municipality": "Guatemala",
  "department": "Guatemala",
  "phone": "+502 5555-1234"
}
```

### 3.4. Actualizar Dirección
- **Método:** `PUT`
- **URL:** `{{base_url}}/users/me/addresses/1`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Cuerpo (JSON):**
```json
{
  "alias": "Oficina",
  "line1": "Diagonal 6 10-01 Zona 10",
  "line2": "Nivel 8 Oficina 802",
  "municipality": "Guatemala",
  "department": "Guatemala",
  "phone": "+502 5555-9876"
}
```

---

## 4. Gestión Administrativa de Usuarios (RF-01)

*Todas las siguientes rutas requieren `Authorization: Bearer <token_admin>`.*

### 4.1. Crear Usuario Interno (Operador o Admin)
- **Método:** `POST`
- **URL:** `{{base_url}}/users`
- **Cuerpo (JSON):**
```json
{
  "name": "Mario Operador",
  "email": "operador@example.com",
  "password": "OperadorDemo2026!",
  "role": "Operador"
}
```

### 4.2. Listar Usuarios con Filtros y Paginación
- **Método:** `GET`
- **URL:** `{{base_url}}/users?page=1&pageSize=10&role=Operador&active=true`

### 4.3. Activar o Desactivar Usuario
- **Método:** `PATCH`
- **URL:** `{{base_url}}/users/2/status`
- **Cuerpo (JSON):**
```json
{
  "active": false
}
```

---

## 5. Catálogo de Productos (RF-02)

### 5.1. Consultas Públicas
- **Listar Categorías:** `GET {{base_url}}/catalog/categories`
- **Listar Tipos de Atributos:** `GET {{base_url}}/catalog/attributes`
- **Búsqueda Avanzada de Productos:**
  ```http
  GET {{base_url}}/catalog/products?page=1&pageSize=12&search=gorra&categoryId=2&minPrice=10&maxPrice=100&available=true&sort=price_asc
  ```
- **Detalle de Producto:** `GET {{base_url}}/catalog/products/1`

### 5.2. Gestión Administrativa del Catálogo
*Requiere `Authorization: Bearer <token_admin>`.*

- **Crear Categoría:** `POST {{base_url}}/catalog/admin/categories`
  ```json
  { "name": "Accesorios Deportivos" }
  ```
- **Crear Atributo:** `POST {{base_url}}/catalog/admin/attributes`
  ```json
  { "name": "Material" }
  ```
- **Creación Integral de Producto con Variantes, Imágenes y Stock Inicial:**
  - **Método:** `POST`
  - **URL:** `{{base_url}}/catalog/admin/products`
  - **Cuerpo (JSON):**
  ```json
  {
    "categoryId": 2,
    "name": "Gorra DryFit Pro",
    "description": "Gorra transpirable con ajuste ergonómico",
    "variants": [
      {
        "sku": "GOR-DRY-NEG-M",
        "price": 125.00,
        "stock": 25,
        "attributes": [
          { "attributeId": 2, "value": "Negro" },
          { "attributeId": 3, "value": "M" }
        ]
      },
      {
        "sku": "GOR-DRY-AZU-L",
        "price": 125.00,
        "stock": 15,
        "attributes": [
          { "attributeId": 2, "value": "Azul" },
          { "attributeId": 3, "value": "L" }
        ]
      }
    ],
    "images": [
      {
        "url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b",
        "order": 0
      }
    ]
  }
  ```
- **Modificar Stock y Atributos de una Variante:**
  - **Método:** `PUT`
  - **URL:** `{{base_url}}/catalog/admin/products/1/variants/1`
  - **Cuerpo (JSON):**
  ```json
  {
    "sku": "GOR-DRY-NEG-M",
    "price": 130.00,
    "stock": 40,
    "attributes": [
      { "attributeId": 2, "value": "Negro" },
      { "attributeId": 3, "value": "M" }
    ]
  }
  ```

---

## 6. Inventario y Kardex (RF-03)

*Requiere rol `Operador` o `Administrador`.*

### 6.1. Consultar Existencias (Física, Reservada, Disponible)
- **Método:** `GET`
- **URL:** `{{base_url}}/inventory/variants/1/stock`
- **Respuesta esperada (200 OK):**
```json
{
  "data": {
    "variantId": 1,
    "sku": "GOR-DRY-NEG-M",
    "physicalStock": 40,
    "reservedStock": 0,
    "availableStock": 40
  }
}
```

### 6.2. Ajuste Manual de Existencias
- **Método:** `PATCH`
- **URL:** `{{base_url}}/inventory/variants/1/stock`
- **Cuerpo (JSON):**
```json
{
  "stock": 50,
  "reason": "Recepción de lote importado GT-2026-01"
}
```

### 6.3. Auditoría del Kardex de Movimientos
- **Método:** `GET`
- **URL:** `{{base_url}}/inventory/movements?variantId=1&page=1&pageSize=20`

---

## 7. Cupones y Promociones (RF-05)

### 7.1. Validar un Cupón (Público / Pre-checkout)
- **Método:** `POST`
- **URL:** `{{base_url}}/coupons/validate`
- **Cuerpo (JSON):**
```json
{
  "code": "DEMO-10",
  "subtotal": 250.00,
  "eligibleSubtotal": 250.00
}
```

### 7.2. Crear Cupón Administrativo
- **Método:** `POST`
- **URL:** `{{base_url}}/coupons`
- **Headers:** `Authorization: Bearer <token_admin>`
- **Cuerpo (JSON):**
```json
{
  "code": "PROMO2026",
  "type": "PORCENTAJE",
  "value": 15.00,
  "minimumAmount": 100.00,
  "validFrom": "2026-01-01T00:00:00Z",
  "validUntil": "2026-12-31T23:59:59Z",
  "totalUsageLimit": 200,
  "usageLimitPerCustomer": 1,
  "categoryId": null
}
```

---

## 8. Carrito de Compras (RF-04)

*El carrito puede ser operado como Visitante Anónimo (usando el encabezado `X-Guest-Cart-Token`) o como Cliente Autenticado (`Authorization: Bearer <token_cliente>`).*

### 8.1. Consultar o Crear Carrito
- **Método:** `GET`
- **URL:** `{{base_url}}/cart`
- **Headers opcionales:** `X-Guest-Cart-Token: d2b45a0b-1111-4444-8888-abcdef123456`
- **Respuesta:** Devuelve el carrito actual o uno nuevo inicializado, con totales en Quetzales.

### 8.2. Agregar Ítem al Carrito
- **Método:** `POST`
- **URL:** `{{base_url}}/cart/items`
- **Cuerpo (JSON):**
```json
{
  "variantId": 1,
  "quantity": 2
}
```
*Efecto:* Valida stock y crea una reserva temporal de 15 minutos en `dbo.ReservaExistencia`.

### 8.3. Modificar Cantidad de un Ítem
- **Método:** `PATCH`
- **URL:** `{{base_url}}/cart/items/1`
- **Cuerpo (JSON):**
```json
{
  "quantity": 3
}
```

### 8.4. Aplicar Cupón al Carrito
- **Método:** `POST`
- **URL:** `{{base_url}}/cart/coupon`
- **Cuerpo (JSON):**
```json
{
  "code": "DEMO-10"
}
```

### 8.5. Quitar Cupón del Carrito
- **Método:** `DELETE`
- **URL:** `{{base_url}}/cart/coupon`

### 8.6. Remover Ítem del Carrito
- **Método:** `DELETE`
- **URL:** `{{base_url}}/cart/items/1`

### 8.7. Vaciar Carrito Completo
- **Método:** `DELETE`
- **URL:** `{{base_url}}/cart`

---

## 9. Checkout y Pedidos (RF-06 y RF-07)

### 9.1. Procesar Checkout (Crear Pedido)
- **Método:** `POST`
- **URL:** `{{base_url}}/orders/checkout`
- **Headers:**
  - `Authorization: Bearer <token_cliente>`
  - `X-Idempotency-Key: a3b92c4e-5f81-49b2-a6de-7b89d4e5f123`
- **Cuerpo (JSON):**
```json
{
  "addressId": 1,
  "paymentMethod": "CONTRA_ENTREGA"
}
```
*Opciones de `paymentMethod`:* `TARJETA` o `CONTRA_ENTREGA`.
*Resultado:*
1. Valida bajo concurrencia estricta (`UPDLOCK, HOLDLOCK`) stock, límites de cupones y estado de ítems.
2. Descuenta del inventario físico generando movimientos tipo `VENTA` en el kardex.
3. Convierte el carrito a estado inactivo.
4. Registra el pedido en estado `CONFIRMADO` con desglose de subtotal, descuento, IVA 12% y total en GTQ.

### 9.2. Listar Pedidos
- **Método:** `GET`
- **URL:** `{{base_url}}/orders?page=1&pageSize=10&status=CONFIRMADO`
- **Regla:**
  - Si quien consulta es **Cliente**, solo lista sus propios pedidos.
  - Si quien consulta es **Operador** o **Administrador**, puede listar todos los pedidos y filtrar por `customerId`.

### 9.3. Detalle de Pedido
- **Método:** `GET`
- **URL:** `{{base_url}}/orders/1`

### 9.4. Cambio de Estado del Pedido (Máquina de Estados)
- **Método:** `PATCH`
- **URL:** `{{base_url}}/orders/1/status`
- **Headers:** `Authorization: Bearer <token_operador_o_admin>`
- **Cuerpo (JSON):**
```json
{
  "status": "PREPARANDO"
}
```
*Flujo legal de estados:*
`CONFIRMADO` $\rightarrow$ `PREPARANDO` $\rightarrow$ `DESPACHADO` $\rightarrow$ `EN_RUTA` $\rightarrow$ `ENTREGADO`.
*Cancelación:*
`CONFIRMADO` $\rightarrow$ `CANCELADO` (único estado cancelable; una vez en preparación ya no se puede cancelar). Al cancelar, se reintegra automáticamente el stock físico en el kardex como `ANULACION_VENTA`.

---

## 10. Devoluciones (RF-08)

*Solo aplicable a pedidos en estado `ENTREGADO`.*

- **Método:** `POST`
- **URL:** `{{base_url}}/orders/1/returns`
- **Headers:** `Authorization: Bearer <token_cliente_o_admin>`
- **Cuerpo (JSON):**
```json
{
  "reason": "Talla no adecuada",
  "items": [
    {
      "orderDetailId": 1,
      "quantity": 1,
      "amount": 125.00
    }
  ]
}
```
*Efecto:* Reintegra 1 unidad al stock físico de la variante en el kardex bajo el movimiento `DEVOLUCION` y actualiza el pedido a estado `DEVUELTO`.

---

## 11. Reportes y Business Intelligence (RF-09)

*Requiere rol `Administrador`.*

- **Método:** `GET`
- **URL:** `{{base_url}}/reports/dashboard?from=2026-01-01&to=2026-12-31`
- **Respuesta esperada (200 OK):**
```json
{
  "data": {
    "summary": {
      "netSales": 12500.50,
      "ordersCount": 45,
      "unitsSold": 112,
      "returnsAmount": 250.00,
      "returnsCount": 2
    },
    "salesOverTime": [
      { "period": "2026-01", "netSales": 4200.00, "ordersCount": 15 }
    ],
    "salesByCategory": [
      { "categoryId": 2, "categoryName": "Ropa", "netSales": 8500.00 }
    ],
    "topProducts": [
      { "productId": 1, "productName": "Gorra DryFit Pro", "unitsSold": 35, "revenue": 4375.00 }
    ],
    "ordersByStatus": [
      { "status": "ENTREGADO", "count": 40 },
      { "status": "CONFIRMADO", "count": 5 }
    ],
    "abandonedCartsCount": 14
  }
}
```

---

## 12. Configuración Global y Bitácora de Auditoría

*Requiere rol `Administrador`.*

### 12.1. Configuración del Sistema
- **Consultar Configuraciones:** `GET {{base_url}}/configuration`
- **Registrar Clave:** `POST {{base_url}}/configuration`
  ```json
  {
    "key": "SHIPPING_COST_DEFAULT",
    "value": "25.00",
    "description": "Tarifa plana de envío en Quetzales"
  }
  ```
- **Actualizar Clave:** `PATCH {{base_url}}/configuration/SHIPPING_COST_DEFAULT`
  ```json
  {
    "value": "30.00"
  }
  ```

### 12.2. Bitácora de Auditoría Inmutable
- **Método:** `GET`
- **URL:** `{{base_url}}/audit?module=PEDIDOS&page=1&pageSize=20`
- **Respuesta:** Lista detallada de eventos de auditoría con ID de usuario, acción (`INSERT`, `UPDATE`, `STATUS_CHANGE`), fecha/hora y diferencias de valores.

---

## 13. Resumen Consolidado de Rutas

| Módulo | Método | Endpoint | Rol Requerido | Propósito |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/auth/register` | Público | Registro de clientes |
| **Auth** | `POST` | `/auth/login` | Público | Autenticación y emisión de tokens |
| **Auth** | `POST` | `/auth/refresh` | Cookie | Rotación de refresh token |
| **Auth** | `POST` | `/auth/logout` | Cookie | Cierre de sesión |
| **Auth** | `PATCH` | `/auth/password` | Autenticado | Cambio de contraseña |
| **Users** | `GET` | `/users/me` | Autenticado | Consulta de perfil |
| **Users** | `PATCH` | `/users/me` | Autenticado | Edición de perfil |
| **Users** | `POST` | `/users/me/addresses` | Autenticado | Crear dirección de entrega |
| **Users** | `PUT` | `/users/me/addresses/:id` | Autenticado | Modificar dirección |
| **Users** | `GET` | `/users` | Administrador | Listar usuarios |
| **Users** | `POST` | `/users` | Administrador | Crear usuario Operador/Admin |
| **Users** | `GET` | `/users/:id` | Administrador | Detalle de usuario |
| **Users** | `PATCH` | `/users/:id` | Administrador | Editar usuario |
| **Users** | `PATCH` | `/users/:id/status` | Administrador | Activar/desactivar usuario |
| **Catalog** | `GET` | `/catalog/categories` | Público | Listar categorías activas |
| **Catalog** | `GET` | `/catalog/attributes` | Público | Listar tipos de atributos |
| **Catalog** | `GET` | `/catalog/products` | Público | Búsqueda y catálogo público |
| **Catalog** | `GET` | `/catalog/products/:id` | Público | Detalle de producto |
| **Catalog** | `GET` | `/catalog/admin/categories` | Administrador | Todas las categorías |
| **Catalog** | `POST` | `/catalog/admin/categories` | Administrador | Crear categoría |
| **Catalog** | `PATCH` | `/catalog/admin/categories/:id` | Administrador | Modificar categoría |
| **Catalog** | `POST` | `/catalog/admin/attributes` | Administrador | Crear atributo |
| **Catalog** | `GET` | `/catalog/admin/products` | Administrador | Listar productos para admin |
| **Catalog** | `GET` | `/catalog/admin/products/:id` | Administrador | Detalle de producto para admin |
| **Catalog** | `POST` | `/catalog/admin/products` | Administrador | Crear producto atómico |
| **Catalog** | `PATCH` | `/catalog/admin/products/:id` | Administrador | Modificar producto |
| **Catalog** | `POST` | `/catalog/admin/products/:id/variants` | Administrador | Agregar variante |
| **Catalog** | `PUT` | `/catalog/admin/products/:id/variants/:vid` | Administrador | Modificar variante y stock |
| **Catalog** | `PATCH` | `/catalog/admin/products/:id/variants/:vid/status` | Administrador | Desactivar variante |
| **Catalog** | `POST` | `/catalog/admin/products/:id/images` | Administrador | Agregar imagen |
| **Catalog** | `PUT` | `/catalog/admin/products/:id/images/:imgId` | Administrador | Modificar imagen |
| **Catalog** | `DELETE` | `/catalog/admin/products/:id/images/:imgId` | Administrador | Eliminar imagen |
| **Inventory**| `GET` | `/inventory/variants/:id/stock` | Operador / Admin | Consultar existencias |
| **Inventory**| `PATCH` | `/inventory/variants/:id/stock` | Operador / Admin | Ajustar stock con motivo |
| **Inventory**| `GET` | `/inventory/movements` | Operador / Admin | Consultar kardex |
| **Coupons** | `POST` | `/coupons/validate` | Público / Cliente | Validar cupón |
| **Coupons** | `GET` | `/coupons` | Administrador | Listar cupones |
| **Coupons** | `GET` | `/coupons/:id` | Administrador | Detalle de cupón |
| **Coupons** | `POST` | `/coupons` | Administrador | Crear cupón |
| **Coupons** | `PATCH` | `/coupons/:id` | Administrador | Modificar cupón |
| **Cart** | `GET` | `/cart` | Público / Cliente | Obtener o crear carrito |
| **Cart** | `DELETE`| `/cart` | Público / Cliente | Vaciar carrito |
| **Cart** | `POST` | `/cart/items` | Público / Cliente | Agregar producto al carrito |
| **Cart** | `PATCH` | `/cart/items/:id` | Público / Cliente | Modificar cantidad |
| **Cart** | `DELETE`| `/cart/items/:id` | Público / Cliente | Quitar ítem |
| **Cart** | `POST` | `/cart/coupon` | Público / Cliente | Aplicar cupón |
| **Cart** | `DELETE`| `/cart/coupon` | Público / Cliente | Quitar cupón |
| **Checkout**| `POST` | `/orders/checkout` | Cliente | Confirmar pedido e idempotencia |
| **Orders** | `GET` | `/orders` | Autenticado | Listar pedidos |
| **Orders** | `GET` | `/orders/:id` | Autenticado | Ver detalle de pedido |
| **Orders** | `PATCH` | `/orders/:id/status` | Operador / Admin | Avanzar máquina de estados |
| **Returns** | `POST` | `/orders/:id/returns` | Autenticado | Devolución de pedido |
| **Reports** | `GET` | `/reports/dashboard` | Administrador | Métricas y BI |
| **Config** | `GET` | `/configuration` | Administrador | Ver configuración |
| **Config** | `POST` | `/configuration` | Administrador | Crear clave config |
| **Config** | `PATCH` | `/configuration/:key` | Administrador | Editar clave config |
| **Audit** | `GET` | `/audit` | Administrador | Consultar bitácora |
