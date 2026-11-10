/* ============================================================
   006_Tablas_Pedidos.sql
   EstadoPedido, TransicionEstadoPedido, Pedido, PedidoDetalle,
   PedidoHistorialEstado, Pago, CuponUso, Devolucion,
   DevolucionDetalle
   ============================================================ */
USE ShopCart;
GO

IF OBJECT_ID(N'dbo.Seq_NumeroPedido', N'SO') IS NULL
    CREATE SEQUENCE dbo.Seq_NumeroPedido AS BIGINT START WITH 1 INCREMENT BY 1;
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
    Estado            NVARCHAR(20) NOT NULL CONSTRAINT DF_Devolucion_Estado DEFAULT N'SOLICITADA',
    IDUsuarioResolucion INT NULL,
    FechaResolucion   DATETIME2(0) NULL,
    Fecha             DATETIME2(0) NOT NULL CONSTRAINT DF_Devolucion_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Devolucion PRIMARY KEY (IDDevolucion),
    CONSTRAINT UQ_Devolucion_Pedido UNIQUE (IDDevolucion, IDPedido),         -- destino de la FK compuesta
    CONSTRAINT FK_Devolucion_Pedido FOREIGN KEY (IDPedido) REFERENCES dbo.Pedido (IDPedido),
    CONSTRAINT FK_Devolucion_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT FK_Devolucion_Resolucion FOREIGN KEY (IDUsuarioResolucion) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT CK_Devolucion_Monto CHECK (MontoReintegrado >= 0),
    CONSTRAINT CK_Devolucion_Estado CHECK (Estado IN (N'SOLICITADA', N'APROBADA', N'RECHAZADA'))
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
