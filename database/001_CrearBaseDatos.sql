
/* ============================================================
   001_CrearBaseDatos.sql
   Instalacion consolidada: crea ShopCart y todas sus tablas.
   ============================================================ */
USE master;
GO

IF DB_ID(N'ShopCart') IS NULL
BEGIN
    CREATE DATABASE ShopCart COLLATE Modern_Spanish_CI_AI;
END
GO


/* ============================================================
   002_Tablas_Seguridad.sql
   Rol, Usuario, RefreshToken, Direccion
   ============================================================ */
USE ShopCart;
GO

IF OBJECT_ID(N'dbo.SchemaMigration', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SchemaMigration (
        MigrationKey NVARCHAR(150) NOT NULL,
        AppliedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SchemaMigration_AppliedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_SchemaMigration PRIMARY KEY (MigrationKey)
    );
END;
GO

IF OBJECT_ID(N'dbo.Seq_NumeroPedido', N'SO') IS NULL
    CREATE SEQUENCE dbo.Seq_NumeroPedido AS BIGINT START WITH 1 INCREMENT BY 1;
GO

/* ------------------------------------------------------------
   dbo.Rol
   Catalogo de roles disponibles para los usuarios.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Rol (
    IDRol   INT IDENTITY(1,1) NOT NULL,
    Nombre  NVARCHAR(30) NOT NULL,
    CONSTRAINT PK_Rol PRIMARY KEY (IDRol),
    CONSTRAINT UQ_Rol_Nombre UNIQUE (Nombre)
);
GO

/* ------------------------------------------------------------
   dbo.Usuario
   Cuentas de acceso, su rol y sus datos de perfil.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Usuario (
    IDUsuario       INT IDENTITY(1,1) NOT NULL,
    IDRol           INT NOT NULL,
    Correo          NVARCHAR(256) NOT NULL,
    ContrasenaHash  NVARCHAR(255) NOT NULL,
    Nombre          NVARCHAR(100) NOT NULL,
    Activo          BIT NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT 1,
    FechaCreacion   DATETIME2(0) NOT NULL CONSTRAINT DF_Usuario_FechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Usuario PRIMARY KEY (IDUsuario),
    CONSTRAINT UQ_Usuario_Correo UNIQUE (Correo),
    CONSTRAINT FK_Usuario_Rol FOREIGN KEY (IDRol) REFERENCES dbo.Rol (IDRol)
);
GO

/* ------------------------------------------------------------
   dbo.RefreshToken
   Hashes de refresh tokens y su ciclo de vida por familia.
   ------------------------------------------------------------ */
CREATE TABLE dbo.RefreshToken (
    IDRefreshToken    INT IDENTITY(1,1) NOT NULL,
    IDUsuario         INT NOT NULL,
    TokenHash         CHAR(64) NOT NULL,            -- SHA-256 en hexadecimal; nunca el token en claro
    IDFamilia         UNIQUEIDENTIFIER NOT NULL,    -- agrupa los tokens rotados de una misma sesion
    ExpiraEn          DATETIME2(0) NOT NULL,
    RevocadoEn        DATETIME2(0) NULL,
    IDReemplazadoPor  INT NULL,
    FechaCreacion     DATETIME2(0) NOT NULL CONSTRAINT DF_RefreshToken_FechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_RefreshToken PRIMARY KEY (IDRefreshToken),
    CONSTRAINT UQ_RefreshToken_TokenHash UNIQUE (TokenHash),
    CONSTRAINT FK_RefreshToken_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT FK_RefreshToken_Reemplazo FOREIGN KEY (IDReemplazadoPor) REFERENCES dbo.RefreshToken (IDRefreshToken)
);
GO
CREATE INDEX IX_RefreshToken_Usuario ON dbo.RefreshToken (IDUsuario, IDFamilia);
GO

/* ------------------------------------------------------------
   dbo.Direccion
   Direcciones de envio asociadas a cada usuario.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Direccion (
    IDDireccion   INT IDENTITY(1,1) NOT NULL,
    IDUsuario     INT NOT NULL,
    Alias         NVARCHAR(50) NOT NULL,
    Linea1        NVARCHAR(200) NOT NULL,
    Linea2        NVARCHAR(200) NULL,
    Municipio     NVARCHAR(100) NOT NULL,
    Departamento  NVARCHAR(100) NOT NULL,
    Telefono      NVARCHAR(20) NOT NULL,
    Activa        BIT NOT NULL CONSTRAINT DF_Direccion_Activa DEFAULT 1,
    CONSTRAINT PK_Direccion PRIMARY KEY (IDDireccion),
    CONSTRAINT FK_Direccion_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario)
);
GO
CREATE INDEX IX_Direccion_Usuario ON dbo.Direccion (IDUsuario) WHERE Activa = 1;
GO



/* ============================================================
   003_Tablas_Catalogo.sql
   Categoria, Producto, ProductoImagen, Atributo, Variante,
   VarianteAtributo
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.Categoria
   Categorias disponibles para organizar los productos.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Categoria (
    IDCategoria  INT IDENTITY(1,1) NOT NULL,
    Nombre       NVARCHAR(100) NOT NULL,
    Activa       BIT NOT NULL CONSTRAINT DF_Categoria_Activa DEFAULT 1,
    CONSTRAINT PK_Categoria PRIMARY KEY (IDCategoria),
    CONSTRAINT UQ_Categoria_Nombre UNIQUE (Nombre)
);
GO

/* ------------------------------------------------------------
   dbo.Producto
   Datos generales y estado de publicacion de cada producto.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Producto (
    IDProducto   INT IDENTITY(1,1) NOT NULL,
    IDCategoria  INT NOT NULL,
    Nombre       NVARCHAR(150) NOT NULL,
    Descripcion  NVARCHAR(2000) NULL,
    Activo       BIT NOT NULL CONSTRAINT DF_Producto_Activo DEFAULT 1,
    CONSTRAINT PK_Producto PRIMARY KEY (IDProducto),
    CONSTRAINT FK_Producto_Categoria FOREIGN KEY (IDCategoria) REFERENCES dbo.Categoria (IDCategoria)
);
GO
CREATE INDEX IX_Producto_Categoria ON dbo.Producto (IDCategoria, Activo);
GO

/* ------------------------------------------------------------
   dbo.ProductoImagen
   Imagenes de producto y su orden de presentacion.
   ------------------------------------------------------------ */
CREATE TABLE dbo.ProductoImagen (
    IDProductoImagen  INT IDENTITY(1,1) NOT NULL,
    IDProducto        INT NOT NULL,
    Url               NVARCHAR(500) NOT NULL,
    Orden             INT NOT NULL CONSTRAINT DF_ProductoImagen_Orden DEFAULT 0,
    CONSTRAINT PK_ProductoImagen PRIMARY KEY (IDProductoImagen),
    CONSTRAINT FK_ProductoImagen_Producto FOREIGN KEY (IDProducto) REFERENCES dbo.Producto (IDProducto)
);
GO

/* ------------------------------------------------------------
   dbo.Atributo
   Tipos de caracteristicas que describen una variante.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Atributo (
    IDAtributo  INT IDENTITY(1,1) NOT NULL,
    Nombre      NVARCHAR(50) NOT NULL,       -- Talla, Color, etc.
    CONSTRAINT PK_Atributo PRIMARY KEY (IDAtributo),
    CONSTRAINT UQ_Atributo_Nombre UNIQUE (Nombre)
);
GO

/* ------------------------------------------------------------
   dbo.Variante
   SKU, precio y existencia fisica de una presentacion.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Variante (
    IDVariante         INT IDENTITY(1,1) NOT NULL,
    IDProducto         INT NOT NULL,
    SKU                NVARCHAR(50) NOT NULL,
    Precio             DECIMAL(18,2) NOT NULL,      -- precio publicado, IVA incluido
    ExistenciaFisica   INT NOT NULL CONSTRAINT DF_Variante_Existencia DEFAULT 0,
    Activa             BIT NOT NULL CONSTRAINT DF_Variante_Activa DEFAULT 1,
    Version            ROWVERSION NOT NULL,
    CONSTRAINT PK_Variante PRIMARY KEY (IDVariante),
    CONSTRAINT UQ_Variante_SKU UNIQUE (SKU),
    CONSTRAINT FK_Variante_Producto FOREIGN KEY (IDProducto) REFERENCES dbo.Producto (IDProducto),
    CONSTRAINT CK_Variante_Precio CHECK (Precio > 0),
    CONSTRAINT CK_Variante_Existencia CHECK (ExistenciaFisica >= 0)
);
GO
CREATE INDEX IX_Variante_Producto ON dbo.Variante (IDProducto);
GO

/* ------------------------------------------------------------
   dbo.VarianteAtributo
   Valores de atributos asignados a cada variante.
   ------------------------------------------------------------ */
CREATE TABLE dbo.VarianteAtributo (
    IDVariante  INT NOT NULL,
    IDAtributo  INT NOT NULL,
    Valor       NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_VarianteAtributo PRIMARY KEY (IDVariante, IDAtributo),
    CONSTRAINT FK_VarianteAtributo_Variante FOREIGN KEY (IDVariante) REFERENCES dbo.Variante (IDVariante),
    CONSTRAINT FK_VarianteAtributo_Atributo FOREIGN KEY (IDAtributo) REFERENCES dbo.Atributo (IDAtributo)
);
GO




/* ============================================================
   004_Tablas_Cupones.sql
   Cupon  (CuponUso va en 006 porque depende de Pedido)
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.Cupon
   Descuentos, vigencia, limites de uso y categoria aplicable.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Cupon (
    IDCupon               INT IDENTITY(1,1) NOT NULL,
    Codigo                NVARCHAR(30) NOT NULL,
    Tipo                  NVARCHAR(12) NOT NULL,          -- PORCENTAJE | MONTO
    Valor                 DECIMAL(18,2) NOT NULL,
    MontoMinimo           DECIMAL(18,2) NOT NULL CONSTRAINT DF_Cupon_MontoMinimo DEFAULT 0,
    VigenteDesde          DATETIME2(0) NOT NULL,
    VigenteHasta          DATETIME2(0) NOT NULL,
    LimiteUsosTotal       INT NOT NULL,
    LimiteUsosPorCliente  INT NOT NULL,
    UsosActuales          INT NOT NULL CONSTRAINT DF_Cupon_Usos DEFAULT 0,
    IDCategoria           INT NULL,                       -- NULL = aplica a todo el carrito
    Activo                BIT NOT NULL CONSTRAINT DF_Cupon_Activo DEFAULT 1,
    CONSTRAINT PK_Cupon PRIMARY KEY (IDCupon),
    CONSTRAINT UQ_Cupon_Codigo UNIQUE (Codigo),
    CONSTRAINT FK_Cupon_Categoria FOREIGN KEY (IDCategoria) REFERENCES dbo.Categoria (IDCategoria),
    CONSTRAINT CK_Cupon_Tipo CHECK (Tipo IN (N'PORCENTAJE', N'MONTO')),
    CONSTRAINT CK_Cupon_Valor CHECK (
        (Tipo = N'PORCENTAJE' AND Valor > 0 AND Valor <= 100)
        OR (Tipo = N'MONTO' AND Valor > 0)
    ),
    CONSTRAINT CK_Cupon_MontoMinimo CHECK (MontoMinimo >= 0),
    CONSTRAINT CK_Cupon_Vigencia CHECK (VigenteHasta > VigenteDesde),
    CONSTRAINT CK_Cupon_Limites CHECK (LimiteUsosTotal > 0 AND LimiteUsosPorCliente > 0),
    CONSTRAINT CK_Cupon_Usos CHECK (UsosActuales >= 0 AND UsosActuales <= LimiteUsosTotal)
);
GO
/* ============================================================
   005_Tablas_Carrito.sql
   Carrito, CarritoDetalle
   El carrito NO guarda precios: se calculan al leerlo.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.Carrito
   Carrito activo de un cliente o de un visitante identificado.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Carrito (
    IDCarrito         INT IDENTITY(1,1) NOT NULL,
    IDUsuario         INT NULL,                  -- cliente con sesion
    TokenInvitado     UNIQUEIDENTIFIER NULL,     -- visitante sin sesion
    IDCupon           INT NULL,
    Estado            NVARCHAR(12) NOT NULL CONSTRAINT DF_Carrito_Estado DEFAULT N'ACTIVO',
    UltimaActividad   DATETIME2(0) NOT NULL CONSTRAINT DF_Carrito_Actividad DEFAULT SYSUTCDATETIME(),
    FechaCreacion     DATETIME2(0) NOT NULL CONSTRAINT DF_Carrito_Creacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Carrito PRIMARY KEY (IDCarrito),
    CONSTRAINT FK_Carrito_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT FK_Carrito_Cupon FOREIGN KEY (IDCupon) REFERENCES dbo.Cupon (IDCupon),
    CONSTRAINT CK_Carrito_Estado CHECK (Estado IN (N'ACTIVO', N'CONVERTIDO')),
    -- Exactamente uno de los dos: usuario o token de invitado
    CONSTRAINT CK_Carrito_Dueno CHECK (
        (IDUsuario IS NOT NULL AND TokenInvitado IS NULL)
        OR (IDUsuario IS NULL AND TokenInvitado IS NOT NULL)
    )
);
GO
CREATE UNIQUE INDEX UX_Carrito_TokenInvitado ON dbo.Carrito (TokenInvitado) WHERE TokenInvitado IS NOT NULL;
CREATE UNIQUE INDEX UX_Carrito_UsuarioActivo ON dbo.Carrito (IDUsuario) WHERE IDUsuario IS NOT NULL AND Estado = N'ACTIVO';
CREATE INDEX IX_Carrito_Usuario ON dbo.Carrito (IDUsuario, Estado);
CREATE INDEX IX_Carrito_Abandono ON dbo.Carrito (Estado, UltimaActividad);
GO

/* ------------------------------------------------------------
   dbo.CarritoDetalle
   Variantes y cantidades incluidas en cada carrito.
   ------------------------------------------------------------ */
CREATE TABLE dbo.CarritoDetalle (
    IDCarritoDetalle  INT IDENTITY(1,1) NOT NULL,
    IDCarrito         INT NOT NULL,
    IDVariante        INT NOT NULL,
    Cantidad          INT NOT NULL,
    CONSTRAINT PK_CarritoDetalle PRIMARY KEY (IDCarritoDetalle),
    CONSTRAINT UQ_CarritoDetalle_Variante UNIQUE (IDCarrito, IDVariante),
    CONSTRAINT FK_CarritoDetalle_Carrito FOREIGN KEY (IDCarrito) REFERENCES dbo.Carrito (IDCarrito),
    CONSTRAINT FK_CarritoDetalle_Variante FOREIGN KEY (IDVariante) REFERENCES dbo.Variante (IDVariante),
    CONSTRAINT CK_CarritoDetalle_Cantidad CHECK (Cantidad > 0)
);
GO
/* ============================================================
   006_Tablas_Pedidos.sql
   EstadoPedido, TransicionEstadoPedido, Pedido, PedidoDetalle,
   PedidoHistorialEstado, Pago, CuponUso, Devolucion,
   DevolucionDetalle
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.EstadoPedido
   Catalogo de estados posibles para un pedido.
   ------------------------------------------------------------ */
CREATE TABLE dbo.EstadoPedido (
    IDEstadoPedido  INT IDENTITY(1,1) NOT NULL,
    Nombre          NVARCHAR(30) NOT NULL,
    EsFinal         BIT NOT NULL CONSTRAINT DF_EstadoPedido_EsFinal DEFAULT 0,
    CONSTRAINT PK_EstadoPedido PRIMARY KEY (IDEstadoPedido),
    CONSTRAINT UQ_EstadoPedido_Nombre UNIQUE (Nombre)
);
GO

/* ------------------------------------------------------------
   dbo.TransicionEstadoPedido
   Transiciones permitidas entre estados de pedido.
   ------------------------------------------------------------ */
CREATE TABLE dbo.TransicionEstadoPedido (
    IDEstadoOrigen   INT NOT NULL,
    IDEstadoDestino  INT NOT NULL,
    CONSTRAINT PK_TransicionEstadoPedido PRIMARY KEY (IDEstadoOrigen, IDEstadoDestino),
    CONSTRAINT FK_Transicion_Origen FOREIGN KEY (IDEstadoOrigen) REFERENCES dbo.EstadoPedido (IDEstadoPedido),
    CONSTRAINT FK_Transicion_Destino FOREIGN KEY (IDEstadoDestino) REFERENCES dbo.EstadoPedido (IDEstadoPedido),
    CONSTRAINT CK_Transicion_Distintos CHECK (IDEstadoOrigen <> IDEstadoDestino)
);
GO

/* ------------------------------------------------------------
   dbo.Pedido
   Encabezado del pedido, importes y datos congelados de compra.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Pedido (
    IDPedido             INT IDENTITY(1,1) NOT NULL,
    NumeroPedido         NVARCHAR(20) NOT NULL,
    IDUsuario            INT NOT NULL,
    IDEstadoPedido       INT NOT NULL,
    LlaveIdempotencia    UNIQUEIDENTIFIER NULL,
    IDCarritoIdempotencia INT NULL,
    DireccionSnapshot    NVARCHAR(600) NOT NULL,   -- direccion congelada al comprar
    CodigoCuponSnapshot  NVARCHAR(30) NULL,
    Subtotal             DECIMAL(18,2) NOT NULL,
    Descuento            DECIMAL(18,2) NOT NULL CONSTRAINT DF_Pedido_Descuento DEFAULT 0,
    Total                DECIMAL(18,2) NOT NULL,
    MontoIVA             DECIMAL(18,2) NOT NULL,   -- IVA contenido en el total
    FechaCreacion        DATETIME2(0) NOT NULL CONSTRAINT DF_Pedido_Creacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Pedido PRIMARY KEY (IDPedido),
    CONSTRAINT UQ_Pedido_Numero UNIQUE (NumeroPedido),
    CONSTRAINT FK_Pedido_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT FK_Pedido_Estado FOREIGN KEY (IDEstadoPedido) REFERENCES dbo.EstadoPedido (IDEstadoPedido),
    CONSTRAINT FK_Pedido_CarritoIdempotencia FOREIGN KEY (IDCarritoIdempotencia) REFERENCES dbo.Carrito (IDCarrito),
    CONSTRAINT CK_Pedido_Montos CHECK (
        Subtotal >= 0 AND Descuento >= 0 AND Descuento <= Subtotal
        AND Total = Subtotal - Descuento AND MontoIVA >= 0
    )
);
GO
-- Misma llave del mismo cliente = misma solicitud: no se crea un segundo pedido
CREATE UNIQUE INDEX UX_Pedido_Idempotencia ON dbo.Pedido (IDUsuario, LlaveIdempotencia) WHERE LlaveIdempotencia IS NOT NULL;
CREATE INDEX IX_Pedido_CarritoIdempotencia ON dbo.Pedido (IDCarritoIdempotencia) WHERE IDCarritoIdempotencia IS NOT NULL;
CREATE INDEX IX_Pedido_Usuario ON dbo.Pedido (IDUsuario, FechaCreacion DESC);
CREATE INDEX IX_Pedido_Estado ON dbo.Pedido (IDEstadoPedido, FechaCreacion DESC);
GO

/* ------------------------------------------------------------
   dbo.PedidoDetalle
   Productos comprados con precios y datos historicos congelados.
   ------------------------------------------------------------ */
CREATE TABLE dbo.PedidoDetalle (
    IDPedidoDetalle   INT IDENTITY(1,1) NOT NULL,
    IDPedido          INT NOT NULL,
    IDVariante        INT NOT NULL,
    IDCategoriaSnapshot INT NOT NULL,              -- categoria al momento de la compra (reportes historicos)
    SKUSnapshot       NVARCHAR(50) NOT NULL,
    NombreSnapshot    NVARCHAR(250) NOT NULL,
    Cantidad          INT NOT NULL,
    PrecioUnitario    DECIMAL(18,2) NOT NULL,      -- precio congelado
    DescuentoLinea    DECIMAL(18,2) NOT NULL CONSTRAINT DF_PedidoDetalle_Descuento DEFAULT 0,
    TotalLinea        DECIMAL(18,2) NOT NULL,
    CantidadDevuelta  INT NOT NULL CONSTRAINT DF_PedidoDetalle_Devuelta DEFAULT 0,
    CONSTRAINT PK_PedidoDetalle PRIMARY KEY (IDPedidoDetalle),
    CONSTRAINT UQ_PedidoDetalle_Variante UNIQUE (IDPedido, IDVariante),
    CONSTRAINT UQ_PedidoDetalle_Pedido UNIQUE (IDPedidoDetalle, IDPedido),   -- destino de la FK compuesta de devoluciones
    CONSTRAINT FK_PedidoDetalle_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido),
    CONSTRAINT FK_PedidoDetalle_Variante FOREIGN KEY (IDVariante) REFERENCES dbo.Variante (IDVariante),
    CONSTRAINT FK_PedidoDetalle_Categoria FOREIGN KEY (IDCategoriaSnapshot) REFERENCES dbo.Categoria (IDCategoria),
    CONSTRAINT CK_PedidoDetalle_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_PedidoDetalle_Montos CHECK (
        PrecioUnitario >= 0 AND DescuentoLinea >= 0
        AND TotalLinea = (Cantidad * PrecioUnitario) - DescuentoLinea
        AND TotalLinea >= 0
    ),
    CONSTRAINT CK_PedidoDetalle_Devuelta CHECK (CantidadDevuelta >= 0 AND CantidadDevuelta <= Cantidad)
);
GO

/* ------------------------------------------------------------
   dbo.PedidoHistorialEstado
   Registro de cambios de estado y usuario responsable.
   ------------------------------------------------------------ */
CREATE TABLE dbo.PedidoHistorialEstado (
    IDHistorial       BIGINT IDENTITY(1,1) NOT NULL,
    IDPedido          INT NOT NULL,
    IDEstadoAnterior  INT NULL,                    -- NULL en la creacion del pedido
    IDEstadoNuevo     INT NOT NULL,
    IDUsuario         INT NOT NULL,
    Fecha             DATETIME2(0) NOT NULL CONSTRAINT DF_PedidoHistorial_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_PedidoHistorialEstado PRIMARY KEY (IDHistorial),
    CONSTRAINT FK_PedidoHistorial_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido),
    CONSTRAINT FK_PedidoHistorial_Anterior FOREIGN KEY (IDEstadoAnterior) REFERENCES dbo.EstadoPedido (IDEstadoPedido),
    CONSTRAINT FK_PedidoHistorial_Nuevo FOREIGN KEY (IDEstadoNuevo) REFERENCES dbo.EstadoPedido (IDEstadoPedido),
    CONSTRAINT FK_PedidoHistorial_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario)
);
GO
CREATE INDEX IX_PedidoHistorial_Pedido ON dbo.PedidoHistorialEstado (IDPedido, Fecha);
GO

/* ------------------------------------------------------------
   dbo.Pago
   Pago del pedido, estado y montos reembolsados.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Pago (
    IDPago      INT IDENTITY(1,1) NOT NULL,
    IDPedido    INT NOT NULL,
    Monto       DECIMAL(18,2) NOT NULL,
    MontoReembolsado DECIMAL(18,2) NOT NULL CONSTRAINT DF_Pago_Reembolsado DEFAULT 0,
    Metodo      NVARCHAR(30) NOT NULL,
    Estado      NVARCHAR(20) NOT NULL,
    Referencia  NVARCHAR(100) NULL,
    Fecha       DATETIME2(0) NOT NULL CONSTRAINT DF_Pago_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Pago PRIMARY KEY (IDPago),
    CONSTRAINT UQ_Pago_Pedido UNIQUE (IDPedido),
    CONSTRAINT FK_Pago_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido),
    CONSTRAINT CK_Pago_Monto CHECK (Monto >= 0),
    -- Los reembolsos acumulados nunca superan lo pagado
    CONSTRAINT CK_Pago_Reembolsado CHECK (MontoReembolsado >= 0 AND MontoReembolsado <= Monto),
    CONSTRAINT CK_Pago_Estado CHECK (Estado IN (N'PENDIENTE', N'APROBADO', N'REEMBOLSO_PARCIAL', N'REEMBOLSADO'))
);
GO

/* ------------------------------------------------------------
   dbo.CuponUso
   Uso de cupones por cliente y pedido.
   ------------------------------------------------------------ */
CREATE TABLE dbo.CuponUso (
    IDCuponUso  INT IDENTITY(1,1) NOT NULL,
    IDCupon     INT NOT NULL,
    IDUsuario   INT NOT NULL,
    IDPedido    INT NOT NULL,
    Fecha       DATETIME2(0) NOT NULL CONSTRAINT DF_CuponUso_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_CuponUso PRIMARY KEY (IDCuponUso),
    CONSTRAINT UQ_CuponUso_Pedido UNIQUE (IDPedido),     -- un cupon por pedido
    CONSTRAINT FK_CuponUso_Cupon FOREIGN KEY (IDCupon) REFERENCES dbo.Cupon (IDCupon),
    CONSTRAINT FK_CuponUso_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT FK_CuponUso_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido)
);
GO
CREATE INDEX IX_CuponUso_CuponUsuario ON dbo.CuponUso (IDCupon, IDUsuario);
GO

/* ------------------------------------------------------------
   dbo.Devolucion
   Devolucion registrada para un pedido y su monto reintegrado.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Devolucion (
    IDDevolucion      INT IDENTITY(1,1) NOT NULL,
    IDPedido          INT NOT NULL,
    IDUsuario         INT NOT NULL,                -- quien registra la devolucion
    Motivo            NVARCHAR(300) NOT NULL,
    MontoReintegrado  DECIMAL(18,2) NOT NULL,
    Fecha             DATETIME2(0) NOT NULL CONSTRAINT DF_Devolucion_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Devolucion PRIMARY KEY (IDDevolucion),
    CONSTRAINT UQ_Devolucion_Pedido UNIQUE (IDDevolucion, IDPedido),         -- destino de la FK compuesta
    CONSTRAINT FK_Devolucion_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido),
    CONSTRAINT FK_Devolucion_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT CK_Devolucion_Monto CHECK (MontoReintegrado >= 0)
);
GO

/* ------------------------------------------------------------
   dbo.DevolucionDetalle
   Lineas y cantidades incluidas en cada devolucion.
   ------------------------------------------------------------ */
CREATE TABLE dbo.DevolucionDetalle (
    IDDevolucionDetalle  INT IDENTITY(1,1) NOT NULL,
    IDDevolucion         INT NOT NULL,
    IDPedido             INT NOT NULL,
    IDPedidoDetalle      INT NOT NULL,
    Cantidad             INT NOT NULL,
    Monto                DECIMAL(18,2) NOT NULL,
    CONSTRAINT PK_DevolucionDetalle PRIMARY KEY (IDDevolucionDetalle),
    -- FK compuestas: la devolucion y la linea devuelta deben ser del MISMO pedido
    CONSTRAINT FK_DevolucionDetalle_Devolucion FOREIGN KEY (IDDevolucion, IDPedido)
        REFERENCES dbo.Devolucion (IDDevolucion, IDPedido),
    CONSTRAINT FK_DevolucionDetalle_PedidoDetalle FOREIGN KEY (IDPedidoDetalle, IDPedido)
        REFERENCES dbo.PedidoDetalle (IDPedidoDetalle, IDPedido),
    CONSTRAINT UQ_DevolucionDetalle_Linea UNIQUE (IDDevolucion, IDPedidoDetalle),
    CONSTRAINT CK_DevolucionDetalle_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_DevolucionDetalle_Monto CHECK (Monto >= 0)
);
GO

/* ============================================================
   007_Tablas_Inventario.sql
   TipoMovimiento, MovimientoInventario (kardex), ReservaExistencia
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.TipoMovimiento
   Tipos de movimiento y signo aplicado a la existencia.
   ------------------------------------------------------------ */
CREATE TABLE dbo.TipoMovimiento (
    IDTipoMovimiento  INT IDENTITY(1,1) NOT NULL,
    Nombre            NVARCHAR(30) NOT NULL,   -- ENTRADA, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, DEVOLUCION
    Signo             SMALLINT NOT NULL,       -- +1 suma existencia, -1 resta
    CONSTRAINT PK_TipoMovimiento PRIMARY KEY (IDTipoMovimiento),
    CONSTRAINT UQ_TipoMovimiento_Nombre UNIQUE (Nombre),
    CONSTRAINT CK_TipoMovimiento_Signo CHECK (Signo IN (-1, 1))
);
GO

/* ------------------------------------------------------------
   dbo.MovimientoInventario
   Kardex de movimientos de inventario y saldo resultante.
   ------------------------------------------------------------ */
CREATE TABLE dbo.MovimientoInventario (
    IDMovimiento          BIGINT IDENTITY(1,1) NOT NULL,
    IDVariante            INT NOT NULL,
    IDTipoMovimiento      INT NOT NULL,
    Cantidad              INT NOT NULL,         -- siempre positiva; el signo lo da el tipo
    ExistenciaResultante  INT NOT NULL,         -- saldo despues del movimiento
    IDUsuario             INT NOT NULL,
    Motivo                NVARCHAR(300) NOT NULL,
    IDPedido              INT NULL,
    Fecha                 DATETIME2(0) NOT NULL CONSTRAINT DF_Movimiento_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_MovimientoInventario PRIMARY KEY (IDMovimiento),
    CONSTRAINT FK_Movimiento_Variante FOREIGN KEY (IDVariante) REFERENCES dbo.Variante (IDVariante),
    CONSTRAINT FK_Movimiento_Tipo FOREIGN KEY (IDTipoMovimiento) REFERENCES dbo.TipoMovimiento (IDTipoMovimiento),
    CONSTRAINT FK_Movimiento_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT FK_Movimiento_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido),
    CONSTRAINT CK_Movimiento_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_Movimiento_Saldo CHECK (ExistenciaResultante >= 0)
);
GO
CREATE INDEX IX_Movimiento_Variante ON dbo.MovimientoInventario (IDVariante, Fecha);
GO

/* ------------------------------------------------------------
   dbo.ReservaExistencia
   Existencias reservadas temporalmente para un carrito.
   ------------------------------------------------------------ */
CREATE TABLE dbo.ReservaExistencia (
    IDReserva   INT IDENTITY(1,1) NOT NULL,
    IDVariante  INT NOT NULL,
    IDCarrito   INT NOT NULL,
    Cantidad    INT NOT NULL,
    ExpiraEn    DATETIME2(0) NOT NULL,
    Estado      NVARCHAR(12) NOT NULL CONSTRAINT DF_Reserva_Estado DEFAULT N'ACTIVA',
    CONSTRAINT PK_ReservaExistencia PRIMARY KEY (IDReserva),
    CONSTRAINT FK_Reserva_Variante FOREIGN KEY (IDVariante) REFERENCES dbo.Variante (IDVariante),
    CONSTRAINT FK_Reserva_Carrito FOREIGN KEY (IDCarrito) REFERENCES dbo.Carrito (IDCarrito),
    CONSTRAINT CK_Reserva_Cantidad CHECK (Cantidad > 0),
    CONSTRAINT CK_Reserva_Estado CHECK (Estado IN (N'ACTIVA', N'CONSUMIDA', N'LIBERADA', N'VENCIDA'))
);
GO
CREATE INDEX IX_Reserva_Variante ON dbo.ReservaExistencia (IDVariante, Estado, ExpiraEn);
CREATE INDEX IX_Reserva_Carrito ON dbo.ReservaExistencia (IDCarrito, Estado);
CREATE UNIQUE INDEX UX_Reserva_Carrito_Variante_Activa
ON dbo.ReservaExistencia (IDCarrito, IDVariante)
WHERE Estado = N'ACTIVA';
GO


/* ============================================================
   008_Tablas_Auditoria.sql
   Bitacora, Configuracion
   La bitacora se escribe explicitamente desde los procedimientos.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.Bitacora
   Eventos de auditoria con los valores anteriores y nuevos.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Bitacora (
    IDBitacora      BIGINT IDENTITY(1,1) NOT NULL,
    IDUsuario       INT NOT NULL,
    Modulo          NVARCHAR(30) NOT NULL,      -- PRODUCTOS, PRECIOS, INVENTARIO, CUPONES, PEDIDOS
    Entidad         NVARCHAR(50) NOT NULL,
    IDEntidad       INT NOT NULL,
    Accion          NVARCHAR(20) NOT NULL,      -- Incluye eventos de sesion
    ValorAnterior   NVARCHAR(MAX) NULL,         -- JSON
    ValorNuevo      NVARCHAR(MAX) NULL,         -- JSON
    Fecha           DATETIME2(0) NOT NULL CONSTRAINT DF_Bitacora_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Bitacora PRIMARY KEY (IDBitacora),
    CONSTRAINT FK_Bitacora_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT CK_Bitacora_Accion CHECK (Accion IN (
        N'CREAR', N'MODIFICAR', N'DESACTIVAR', N'CAMBIO_ESTADO',
        N'INICIAR_SESION', N'CERRAR_SESION', N'RENOVAR_SESION',
        N'TOKEN_REUTILIZADO', N'CAMBIO_CONTRASENA', N'CAMBIAR_CONTRASENA'
    )),
    CONSTRAINT CK_Bitacora_ValorAnterior_Json CHECK (ValorAnterior IS NULL OR ISJSON(ValorAnterior) = 1),
    CONSTRAINT CK_Bitacora_ValorNuevo_Json CHECK (ValorNuevo IS NULL OR ISJSON(ValorNuevo) = 1)
);
GO
CREATE INDEX IX_Bitacora_Modulo ON dbo.Bitacora (Modulo, Fecha DESC);
GO

/* ------------------------------------------------------------
   dbo.Configuracion
   Parametros configurables del sistema.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Configuracion (
    Clave                NVARCHAR(50) NOT NULL,
    Valor                NVARCHAR(100) NOT NULL,
    Descripcion          NVARCHAR(200) NULL,
    IDUsuarioCreacion    INT NULL,
    FechaCreacion        DATETIME2(0) NOT NULL CONSTRAINT DF_Configuracion_FechaCreacion DEFAULT SYSUTCDATETIME(),
    IDUsuarioModificacion INT NULL,
    FechaModificacion    DATETIME2(0) NULL,
    CONSTRAINT PK_Configuracion PRIMARY KEY (Clave)
    ,CONSTRAINT FK_Configuracion_UsuarioCreacion FOREIGN KEY (IDUsuarioCreacion) REFERENCES dbo.Usuario (IDUsuario)
    ,CONSTRAINT FK_Configuracion_UsuarioModificacion FOREIGN KEY (IDUsuarioModificacion) REFERENCES dbo.Usuario (IDUsuario)
);
GO