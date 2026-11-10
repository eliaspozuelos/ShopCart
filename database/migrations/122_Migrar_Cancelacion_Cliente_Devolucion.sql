/* ============================================================
   122_Migrar_Cancelacion_Cliente_Devolucion.sql
   La devolucion nace como solicitud y las ya registradas
   quedan aprobadas. La cancelacion no sale de PREPARANDO.
   ============================================================ */
USE ShopCart;
GO

IF COL_LENGTH(N'dbo.Devolucion', N'Estado') IS NULL
  ALTER TABLE dbo.Devolucion ADD Estado NVARCHAR(20) NULL;
GO

IF COL_LENGTH(N'dbo.Devolucion', N'IDUsuarioResolucion') IS NULL
  ALTER TABLE dbo.Devolucion ADD IDUsuarioResolucion INT NULL;
GO

IF COL_LENGTH(N'dbo.Devolucion', N'FechaResolucion') IS NULL
  ALTER TABLE dbo.Devolucion ADD FechaResolucion DATETIME2(0) NULL;
GO

UPDATE dbo.Devolucion SET Estado = N'APROBADA' WHERE Estado IS NULL;
GO

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.Devolucion')
    AND name = N'Estado'
    AND is_nullable = 1
)
  ALTER TABLE dbo.Devolucion ALTER COLUMN Estado NVARCHAR(20) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_Devolucion_Estado')
  ALTER TABLE dbo.Devolucion ADD CONSTRAINT DF_Devolucion_Estado DEFAULT N'SOLICITADA' FOR Estado;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Devolucion_Estado')
  ALTER TABLE dbo.Devolucion ADD CONSTRAINT CK_Devolucion_Estado
    CHECK (Estado IN (N'SOLICITADA', N'APROBADA', N'RECHAZADA'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Devolucion_Resolucion')
  ALTER TABLE dbo.Devolucion ADD CONSTRAINT FK_Devolucion_Resolucion
    FOREIGN KEY (IDUsuarioResolucion) REFERENCES dbo.Usuario (IDUsuario);
GO

IF OBJECT_ID(N'dbo.SchemaMigration', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'122_Migrar_Cancelacion_Cliente_Devolucion')
  INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'122_Migrar_Cancelacion_Cliente_Devolucion');
GO
