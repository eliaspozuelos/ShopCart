/* ============================================================
   121_Migrar_Cancelacion_y_Reportes.sql
   Permite cancelar un pedido en confirmado y agrega el umbral
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

-- La cancelacion solo sale de CONFIRMADO. 124 quita PREPARANDO -> CANCELADO.
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
