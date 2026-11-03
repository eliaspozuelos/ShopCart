/* ============================================================
   121_Migrar_Cancelacion_y_Reportes.sql
   Permite cancelar un pedido en PREPARANDO y agrega el umbral
   de carrito abandonado usado por el dashboard.
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

-- Cancelacion permitida solo en CONFIRMADO (Opcion B)
DELETE t FROM dbo.TransicionEstadoPedido t INNER JOIN dbo.EstadoPedido o ON o.IDEstadoPedido = t.IDEstadoOrigen INNER JOIN dbo.EstadoPedido d ON d.IDEstadoPedido = t.IDEstadoDestino WHERE o.Nombre = N'PREPARANDO' AND d.Nombre = N'CANCELADO';
GO

IF OBJECT_ID(N'dbo.Configuracion', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Configuracion WHERE Clave = N'MINUTOS_CARRITO_ABANDONADO')
BEGIN
  INSERT dbo.Configuracion (Clave, Valor, Descripcion)
  VALUES (
    N'MINUTOS_CARRITO_ABANDONADO',
    N'60',
    N'Minutos sin actividad para considerar un carrito abandonado.'
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'121_Migrar_Cancelacion_y_Reportes')
  INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'121_Migrar_Cancelacion_y_Reportes');
GO
