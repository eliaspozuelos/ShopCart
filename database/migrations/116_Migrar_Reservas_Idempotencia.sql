/* ============================================================
   116_Migrar_Reservas_Idempotencia.sql
   Agrega el carrito asociado a la idempotencia y garantiza una
   sola reserva activa por variante dentro de cada carrito.
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

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.Pedido', N'IDCarritoIdempotencia') IS NULL
BEGIN
  ALTER TABLE dbo.Pedido ADD IDCarritoIdempotencia INT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_Pedido_CarritoIdempotencia'
    AND parent_object_id = OBJECT_ID(N'dbo.Pedido')
)
BEGIN
  ALTER TABLE dbo.Pedido
    ADD CONSTRAINT FK_Pedido_CarritoIdempotencia
    FOREIGN KEY (IDCarritoIdempotencia) REFERENCES dbo.Carrito (IDCarrito);
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_Pedido_CarritoIdempotencia'
    AND object_id = OBJECT_ID(N'dbo.Pedido')
)
BEGIN
  CREATE INDEX IX_Pedido_CarritoIdempotencia
    ON dbo.Pedido (IDCarritoIdempotencia)
    WHERE IDCarritoIdempotencia IS NOT NULL;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'UX_Reserva_Carrito_Variante_Activa'
    AND object_id = OBJECT_ID(N'dbo.ReservaExistencia')
)
BEGIN
  CREATE UNIQUE INDEX UX_Reserva_Carrito_Variante_Activa
    ON dbo.ReservaExistencia (IDCarrito, IDVariante)
    WHERE Estado = N'ACTIVA';
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'116_Migrar_Reservas_Idempotencia')
  INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'116_Migrar_Reservas_Idempotencia');
GO
