# 🗄️ Base de Datos de ShopCart

Documentación técnica de la base de datos relacional para **ShopCart** implementada en **Microsoft SQL Server 2019+**.

El diseño está 100% normalizado, cuenta con restricciones estrictas de integridad (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `DEFAULT`), tipos numéricos exactos (`DECIMAL(18,2)` para moneda e `INT` / `BIGINT` para cantidades), y se opera **exclusivamente mediante Stored Procedures**. Toda manipulación de datos comerciales queda auditada en una bitácora inmutable protegida por trigger.

---

## 📋 Contenido

1. [Componentes y Estructura de Scripts](#-componentes-y-estructura-de-scripts)
2. [Justificación del Orden de Scripts de Tablas (DDL)](#-justificación-del-orden-de-scripts-de-tablas-ddl)
3. [Instalación de una Base Nueva](#-instalación-de-una-base-nueva)
4. [Actualización de una Base Existente (Migraciones)](#-actualización-de-una-base-existente-migraciones)
5. [Modelo Relacional y Decisiones de Diseño](#-modelo-relacional-y-decisiones-de-diseño)
6. [Catálogo de Códigos de Error (50xxx y 51xxx)](#-catálogo-de-códigos-de-error-50xxx-y-51xxx)
7. [Invariante de Inventario y Kardex](#-invariante-de-inventario-y-kardex)
8. [Verificación de la Base de Datos](#-verificación-de-la-base-de-datos)

---

## 📦 Componentes y Estructura de Scripts

```text
database/
├── 001_CrearBaseDatos.sql               # Instalación consolidada de base y tablas completas
├── 010_Semillas.sql                     # Semillas: roles, usuario admin, catálogo y movimientos iniciales
├── 011_Semillas_Pedidos.sql             # Semillas: estados y matriz de transiciones permitidas
├── 100_SP_Auth.sql                      # Procedimientos de autenticación y refresh tokens
├── 101_SP_Usuarios.sql                  # Procedimientos de administración de usuarios y creación de internos
├── 102_SP_Usuarios_Perfil.sql           # Procedimientos de consulta y actualización de perfil propio
├── 103_SP_Direcciones.sql               # Procedimientos de direcciones de entrega
├── 104_SP_Auth_Contrasena.sql           # Procedimientos de cambio de contraseña
├── 105_SP_Configuracion.sql             # Procedimientos de parámetros configurables del sistema
├── 106_SP_Inventario.sql                # Procedimientos de kardex, ajustes y consulta de stock
├── 107_SP_Catalogo.sql                  # Procedimientos de categorías, atributos, productos y variantes
├── 108_SP_Cupones.sql                   # Procedimientos y función de cálculo de cupones de descuento
├── 109_SP_Carrito.sql                   # Procedimientos de carrito de compras y reservas
├── 110_SP_Bitacora.sql                  # Procedimiento de consulta de auditoría
├── 111_SP_Pedidos_Checkout.sql          # Procedimiento transaccional atómico de checkout
├── 112_SP_Devoluciones.sql              # Procedimiento de devoluciones totales y parciales
├── 113_SP_Reportes.sql                  # Procedimiento de dashboard analítico y reportes
├── 114_SP_Pedidos_Estado.sql            # Procedimiento de avance de estados y cancelación de pedidos
├── 117_Verificar_Invariante_Inventario.sql # Script de validación de consistencia matemática del kardex
├── 120_Verificar_Instalacion.sql        # Script de comprobación de presencia de objetos críticos
├── migrations/                          # Migraciones idempotentes para actualización de bases existentes
│   ├── 009_Migrar_Configuracion_Auditoria.sql
│   ├── 115_Migrar_Pago_Pendiente.sql
│   ├── 116_Migrar_Reservas_Idempotencia.sql
│   ├── 118_Migrar_Trigger_Transiciones.sql
│   ├── 119_Migrar_Bitacora_Inmutable.sql
│   ├── 120_Migrar_Infraestructura.sql
│   └── 121_Migrar_Cancelacion_y_Reportes.sql
├── tablas/                              # Scripts DDL modulares individuales (0001 a 009)
│   ├── 0001_CrearBaseDatos.sql
│   ├── 002_Tablas_Seguridad.sql
│   ├── 003_Tablas_Catalogo.sql
│   ├── 004_Tablas_Cupones.sql
│   ├── 005_Tablas_Carrito.sql
│   ├── 006_Tablas_Pedidos.sql
│   ├── 007_Tablas_Inventario.sql
│   ├── 008_Tablas_Auditoria.sql
│   └── 009_Tablas_Sistema.sql
└── triggers/                            # Triggers de base de datos
    ├── TR_Bitacora_Inmutable.sql        # Bloquea UPDATE y DELETE sobre la tabla Bitacora
    └── TR_Pedido_ValidarTransicionEstado.sql # Valida transiciones permitidas en dbo.Pedido
```

---

## 🔍 Justificación del Orden de Scripts de Tablas (DDL)

Una duda habitual al revisar el proyecto es por qué las tablas se crean en el orden:
`005_Tablas_Carrito.sql` $\rightarrow$ `006_Tablas_Pedidos.sql` $\rightarrow$ `007_Tablas_Inventario.sql`, cuando en los requerimientos del reto Inventario es **RF-03** y Carrito es **RF-04**.

### Razón Técnica: Integridad Referencial de SQL Server
En una base de datos relacional estricta, una tabla que tiene una Llave Foránea (`FOREIGN KEY`) **no puede crearse antes que la tabla a la que hace referencia**:
1. La tabla `dbo.MovimientoInventario` (en `007`) audita las salidas por venta y requiere la relación:
   ```sql
   CONSTRAINT FK_Movimiento_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido)
   ```
2. La tabla `dbo.ReservaExistencia` (en `007`) gestiona los apartados de 15 minutos de un carrito y requiere la relación:
   ```sql
   CONSTRAINT FK_Reserva_Carrito FOREIGN KEY (IDCarrito) REFERENCES dbo.Carrito (IDCarrito)
   ```

Si se intentara ejecutar `007_Tablas_Inventario.sql` antes de `005` y `006`, el motor de SQL Server fallaría de inmediato con el error `Foreign key references invalid table`.

### Distinción entre Modelo Físico (DDL) y Lógica de Negocio (RF)
- **A nivel de scripts DDL:** Se respeta el árbol de dependencias físicas de SQL Server.
- **A nivel de reglas de negocio:** La jerarquía funcional del backend cumple al 100% el enunciado:
  1. El stock físico se parametriza en las variantes del Catálogo y se audita en Inventario (RF-03).
  2. El Carrito (RF-04) consulta la existencia disponible calculada en Inventario (`FU_Inventario_ExistenciaDisponible`).
  3. El Checkout (RF-06) reserva stock y genera el Pedido (RF-07).

---

## ⚡ Instalación de una Base Nueva

Elige **una sola** de las dos opciones para evitar duplicar objetos:

### Opción A: Instalación Consolidada (Recomendada)
En SQL Server Management Studio (SSMS), conéctate a tu instancia y ejecuta los archivos en este orden estricto:

1. `001_CrearBaseDatos.sql` (crea la base `ShopCart` y todas las tablas base).
2. Stored Procedures:
   - `100_SP_Auth.sql`
   - `101_SP_Usuarios.sql`
   - `102_SP_Usuarios_Perfil.sql`
   - `103_SP_Direcciones.sql`
   - `104_SP_Auth_Contrasena.sql`
   - `105_SP_Configuracion.sql`
   - `106_SP_Inventario.sql`
   - `107_SP_Catalogo.sql`
   - `108_SP_Cupones.sql`
   - `109_SP_Carrito.sql`
   - `110_SP_Bitacora.sql`
   - `111_SP_Pedidos_Checkout.sql`
   - `112_SP_Devoluciones.sql`
   - `113_SP_Reportes.sql`
   - `114_SP_Pedidos_Estado.sql`
3. Semillas de datos:
   - `010_Semillas.sql` (roles, cuenta admin demo, catálogo demo y tipos de inventario).
   - `011_Semillas_Pedidos.sql` (catálogo de estados y transiciones de pedidos).
4. Migraciones funcionales y triggers:
   - `migrations/115_Migrar_Pago_Pendiente.sql`
   - `migrations/116_Migrar_Reservas_Idempotencia.sql`
   - `migrations/121_Migrar_Cancelacion_y_Reportes.sql`
   - `triggers/TR_Pedido_ValidarTransicionEstado.sql`
   - `triggers/TR_Bitacora_Inmutable.sql`
5. Verificaciones finales:
   - `117_Verificar_Invariante_Inventario.sql` (debe retornar 0 discrepancias).
   - `120_Verificar_Instalacion.sql` (debe confirmar la presencia de todos los objetos críticos).

---

## 🔄 Actualización de una Base Existente (Migraciones)

Si ya tienes la base `ShopCart` creada con versiones previas, aplica la suite de migraciones idempotentes:

1. `migrations/009_Migrar_Configuracion_Auditoria.sql`
2. `migrations/120_Migrar_Infraestructura.sql` (crea la secuencia `SeqNumeroPedido` y control de migraciones).
3. Re-ejecuta los procedimientos actualizados desde `105_SP_Configuracion.sql` hasta `114_SP_Pedidos_Estado.sql`.
4. `migrations/115_Migrar_Pago_Pendiente.sql`
5. `migrations/116_Migrar_Reservas_Idempotencia.sql`
6. `migrations/121_Migrar_Cancelacion_y_Reportes.sql`
7. `migrations/118_Migrar_Trigger_Transiciones.sql`
8. `migrations/119_Migrar_Bitacora_Inmutable.sql`
9. `010_Semillas.sql` y `011_Semillas_Pedidos.sql` (idempotentes, insertan datos faltantes).
10. `117_Verificar_Invariante_Inventario.sql` y `120_Verificar_Instalacion.sql`.

---

## 🧠 Modelo Relacional y Decisiones de Diseño

1. **Snapshots Históricos en Pedidos:**
   - La tabla `dbo.Pedido` almacena `DireccionSnapshot`, `CodigoCuponSnapshot`, y `dbo.PedidoDetalle` almacena `IDCategoriaSnapshot`, `SKUSnapshot`, `NombreSnapshot` y `PrecioUnitario`.
   - Modificar precios, nombres o categorías en el catálogo no altera bajo ninguna circunstancia los registros históricos ni las facturas previas.
2. **Kardex Integral (+1 / -1):**
   - La tabla `dbo.TipoMovimiento` define el signo: `ENTRADA (+1)`, `SALIDA (-1)`, `AJUSTE_POSITIVO (+1)`, `AJUSTE_NEGATIVO (-1)`, `DEVOLUCION (+1)`.
   - Cada inserción en `dbo.MovimientoInventario` es atómica y actualiza la `ExistenciaFisica` en `dbo.Variante` grabando la `ExistenciaResultante`.
3. **Existencia Disponible vs Física:**
   - La función `dbo.FU_Inventario_ExistenciaDisponible(@IDVariante)` calcula:
     $$\text{Stock Disponible} = \text{Existencia Física} - \text{Reservas Activas No Vencidas}$$
   - El carrito y el catálogo público consultan esta función para impedir sobreventa.
4. **Idempotencia en Checkout:**
   - `dbo.Pedido` cuenta con un índice único filtrado sobre `(IDUsuario, LlaveIdempotencia)`. Si una solicitud con la misma llave se repite, el procedimiento retorna el pedido original sin duplicar cobros ni descontar inventario.
5. **Bitácora Inmutable:**
   - Registra eventos de seguridad, cambios en productos, precios, existencias y estados.
   - El trigger `TR_Bitacora_Inmutable` arroja el error `51004` ante cualquier `UPDATE` o `DELETE`, garantizando la inmutabilidad de la auditoría requerida por el criterio RF-09.

---

## 🛑 Catálogo de Códigos de Error (50xxx y 51xxx)

Los Stored Procedures lanzan errores controlados mediante `THROW 50xxx` para que el middleware de Express los traduzca consistentemente al cliente:

| Código SQL | Significado en Base de Datos | Código de Error API | Código HTTP |
|---|---|---|---|
| `50101` | El correo ya está registrado en el sistema. | `EMAIL_ALREADY_REGISTERED` | `409 Conflict` |
| `50110` | Datos de sesión inválidos (hash malformado o fecha inválida). | `INVALID_SESSION_DATA` | `400 Bad Request` |
| `50111` | Refresh token inválido o no reconocido. | `INVALID_REFRESH_TOKEN` | `401 Unauthorized` |
| `50112` | Intento de reutilización de refresh token revocado (ataque detectado). | `REFRESH_TOKEN_REUSED` | `401 Unauthorized` |
| `50113` | El refresh token ha expirado. | `REFRESH_TOKEN_EXPIRED` | `401 Unauthorized` |
| `50114` | La cuenta de usuario se encuentra inactiva. | `USER_INACTIVE` | `403 Forbidden` |
| `50120` | Rol solicitado no permitido para usuario interno. | `ROLE_NOT_ALLOWED` | `400 Bad Request` |
| `50121` | Acción administrativa no autorizada o intento de duplicar admin inicial. | `ACTION_NOT_ALLOWED` | `403 Forbidden` |
| `50122` | Usuario no encontrado. | `USER_NOT_FOUND` | `404 Not Found` |
| `50123` | Se intenta desactivar la propia cuenta de administrador. | `CANNOT_DEACTIVATE_SELF` | `409 Conflict` |
| `50124` | Estado requerido no especificado al cambiar estatus. | `USER_STATUS_REQUIRED` | `400 Bad Request` |
| `50125` | No se puede desactivar al último administrador activo del sistema. | `LAST_ADMINISTRATOR` | `409 Conflict` |
| `50126` | Datos de perfil insuficientes o vacíos. | `PROFILE_DATA_REQUIRED` | `400 Bad Request` |
| `50127` | La dirección activa especificada no existe. | `ADDRESS_NOT_FOUND` | `404 Not Found` |
| `50128` | Contraseña no indicada. | `PASSWORD_REQUIRED` | `400 Bad Request` |
| `50130` | Categoría inexistente o inactiva. | `CATEGORY_NOT_FOUND` | `404 Not Found` |
| `50131` | Producto inexistente. | `PRODUCT_NOT_FOUND` | `404 Not Found` |
| `50132` | Variante inexistente o no asociada al producto. | `VARIANT_NOT_FOUND` | `404 Not Found` |
| `50133` | Imagen inexistente o no asociada al producto. | `PRODUCT_IMAGE_NOT_FOUND` | `404 Not Found` |
| `50134` | SKU duplicado; ya pertenece a otra variante. | `SKU_ALREADY_EXISTS` | `409 Conflict` |
| `50135` | Nombre de categoría o atributo duplicado. | `CATALOG_NAME_ALREADY_EXISTS` | `409 Conflict` |
| `50136` | Atributo de variante inválido o no existe en catálogo. | `INVALID_VARIANT_ATTRIBUTES` | `400 Bad Request` |
| `50137` | Faltan datos requeridos para la operación de catálogo. | `CATALOG_DATA_REQUIRED` | `400 Bad Request` |
| `50138` | Tipos de movimiento de inventario no configurados. | `INVENTORY_MOVEMENT_TYPE_NOT_CONFIGURED` | `500 Server Error` |
| `50139` | La existencia quedaría por debajo de las reservas activas. | `STOCK_BELOW_RESERVED` | `409 Conflict` |
| `50140` | Cupón inexistente o inactivo. | `COUPON_NOT_FOUND` | `404 Not Found` |
| `50141` | Código de cupón duplicado. | `COUPON_CODE_ALREADY_EXISTS` | `409 Conflict` |
| `50142` | Cupón fuera de su periodo de vigencia (vencido). | `COUPON_EXPIRED_OR_NOT_STARTED` | `400 Bad Request` |
| `50143` | Cupón agotó su límite total de usos disponibles. | `COUPON_USAGE_LIMIT_REACHED` | `400 Bad Request` |
| `50144` | Cliente alcanzó el límite de usos permitidos de este cupón. | `COUPON_USER_LIMIT_REACHED` | `400 Bad Request` |
| `50145` | El subtotal no alcanza el monto mínimo de compra del cupón. | `COUPON_MINIMUM_AMOUNT_NOT_MET` | `400 Bad Request` |
| `50146` | Datos inválidos al crear o actualizar cupón. | `INVALID_COUPON_DATA` | `400 Bad Request` |
| `50147` | El cupón no aplica a los productos del carrito (restricción categoría). | `COUPON_NOT_APPLICABLE` | `400 Bad Request` |
| `50148` | El carrito ya tiene otro cupón aplicado. | `CART_COUPON_ALREADY_APPLIED` | `409 Conflict` |
| `50150` | Carrito activo no encontrado. | `CART_NOT_FOUND` | `404 Not Found` |
| `50151` | Línea de carrito no encontrada o no pertenece al solicitante. | `CART_ITEM_NOT_FOUND` | `404 Not Found` |
| `50152` | No hay existencia disponible suficiente para la cantidad solicitada. | `INSUFFICIENT_STOCK` | `409 Conflict` |
| `50153` | La variante o el producto están desactivados para la venta. | `VARIANT_NOT_AVAILABLE` | `409 Conflict` |
| `50154` | Cantidad de carrito no válida (debe ser mayor a 0). | `INVALID_CART_QUANTITY` | `400 Bad Request` |
| `50155` | Token de carrito de invitado inválido. | `GUEST_CART_TOKEN_INVALID` | `400 Bad Request` |
| `50156` | Variante de inventario no encontrada. | `INVENTORY_VARIANT_NOT_FOUND` | `404 Not Found` |
| `50157` | Motivo de ajuste manual de inventario requerido. | `INVENTORY_ADJUSTMENT_REASON_REQUIRED` | `400 Bad Request` |
| `50160` | Clave de configuración duplicada. | `CONFIGURATION_KEY_ALREADY_EXISTS` | `409 Conflict` |
| `50161` | Clave de configuración no encontrada. | `CONFIGURATION_NOT_FOUND` | `404 Not Found` |
| `50190` | Configuración incompleta en la base (faltan roles o parámetros clave). | `INTERNAL_SERVER_ERROR` | `500 Server Error` |
| `50200` | El carrito está vacío al intentar realizar el checkout. | `EMPTY_CART` | `400 Bad Request` |
| `50201` | La dirección de envío seleccionada no existe o no pertenece al cliente. | `INVALID_SHIPPING_ADDRESS` | `400 Bad Request` |
| `50202` | Existencia insuficiente durante checkout (sobreventa bloqueada). | `INSUFFICIENT_STOCK` | `409 Conflict` |
| `50210` | El pedido no se encuentra en estado ENTREGADO para devolución. | `ORDER_NOT_DELIVERED` | `400 Bad Request` |
| `50211` | Motivo de devolución requerido. | `RETURN_REASON_REQUIRED` | `400 Bad Request` |
| `50212` | Detalle de devolución inválido o líneas incorrectas. | `INVALID_RETURN_DETAILS` | `400 Bad Request` |
| `50213` | Cantidad a devolver supera las unidades compradas o ya devueltas. | `RETURN_QUANTITY_EXCEEDED` | `409 Conflict` |
| `50220` | Pedido no encontrado. | `ORDER_NOT_FOUND` | `404 Not Found` |
| `50221` | Estado de pedido solicitado no existe. | `ORDER_STATUS_NOT_FOUND` | `400 Bad Request` |
| `50222` | Transición de estado no permitida por la máquina de estados. | `ORDER_STATUS_TRANSITION_NOT_ALLOWED` | `409 Conflict` |
| `50223` | El actor no tiene permisos para cambiar el estado del pedido. | `ORDER_STATUS_CHANGE_NOT_ALLOWED` | `403 Forbidden` |
| `50224` | El pedido ya se encuentra en un estado final (cerrado). | `ORDER_ALREADY_FINAL` | `409 Conflict` |
| `50225` | Método de pago no soportado (debe ser TARJETA o CONTRA_ENTREGA). | `INVALID_PAYMENT_METHOD` | `400 Bad Request` |
| `50226` | El cliente alcanzó su límite del cupón durante checkout concurrente. | `COUPON_CUSTOMER_LIMIT_REACHED` | `409 Conflict` |
| `50227` | El cupón no alcanza el monto mínimo durante checkout. | `COUPON_MINIMUM_NOT_REACHED` | `400 Bad Request` |
| `50228` | El cupón agotó sus usos globales durante checkout concurrente. | `COUPON_LIMIT_REACHED` | `409 Conflict` |
| `50229` | El carrito contiene un producto desactivado por el administrador. | `CART_ITEM_NOT_AVAILABLE` | `409 Conflict` |
| `50230` | La llave de idempotencia pertenece a otro carrito distinto. | `IDEMPOTENCY_KEY_CART_MISMATCH` | `409 Conflict` |
| `50231` | La reserva del carrito expiró (superó los 15 minutos). | `CART_RESERVATION_EXPIRED` | `409 Conflict` |
| `51003` | Error de integridad: Existencia física no coincide con suma de kardex. | `INVENTORY_INVARIANT_VIOLATION` | `500 Server Error` |
| `51004` | Intento ilegal de modificar o eliminar registros de bitácora. | `AUDIT_LOG_IMMUTABLE` | `409 Conflict` |
| `51006` | Verificación de instalación fallida: faltan objetos críticos. | `INSTALLATION_INCOMPLETE` | `500 Server Error` |

---

## 📈 Invariante de Inventario y Kardex

El criterio de aceptación de **RF-03** estipula que:
> *"La existencia actual coincide con la suma de movimientos del kardex."*

En ShopCart, esta invariante se valida matemáticamente mediante la fórmula:
$$\text{Existencia Física} = \sum (\text{Cantidad} \times \text{Signo})$$

Para comprobar la integridad en cualquier momento en SSMS, ejecuta:
```sql
USE ShopCart;
GO
EXEC dbo.SP_Inventario_VerificarInvariante;
-- O ejecuta el script:
-- database/117_Verificar_Invariante_Inventario.sql
```
Si alguna variante presentara una diferencia, el script reporta la discrepancia con el detalle de IDVariante, SKU, Existencia en tabla y Suma calculada de movimientos.

---

## ✅ Verificación de la Base de Datos

Para verificar que todos los roles, tablas, procedimientos y triggers se hayan instalado correctamente, ejecuta en SSMS:
```sql
USE ShopCart;
GO
EXEC dbo.SP_Sistema_VerificarInstalacion;
-- O ejecuta el script:
-- database/120_Verificar_Instalacion.sql
```
Debe finalizar con el mensaje:
> `Verificación de instalación completada. Todos los objetos requeridos están presentes.`
