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
