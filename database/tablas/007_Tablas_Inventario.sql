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
GO
