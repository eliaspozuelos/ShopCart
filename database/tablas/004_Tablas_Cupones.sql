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
