/* ============================================================
   009_Migrar_Configuracion_Auditoria.sql
   Agrega el usuario y las fechas de creación/modificación de
   los parámetros de configuración a una base ya existente.
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

IF COL_LENGTH(N'dbo.Configuracion', N'IDUsuarioCreacion') IS NULL
  ALTER TABLE dbo.Configuracion ADD IDUsuarioCreacion INT NULL;
GO

IF COL_LENGTH(N'dbo.Configuracion', N'FechaCreacion') IS NULL
BEGIN
  ALTER TABLE dbo.Configuracion
    ADD FechaCreacion DATETIME2(0) NOT NULL
      CONSTRAINT DF_Configuracion_FechaCreacion DEFAULT SYSUTCDATETIME();
END;
GO

IF COL_LENGTH(N'dbo.Configuracion', N'IDUsuarioModificacion') IS NULL
  ALTER TABLE dbo.Configuracion ADD IDUsuarioModificacion INT NULL;
GO

IF COL_LENGTH(N'dbo.Configuracion', N'FechaModificacion') IS NULL
  ALTER TABLE dbo.Configuracion ADD FechaModificacion DATETIME2(0) NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_Configuracion_UsuarioCreacion'
    AND parent_object_id = OBJECT_ID(N'dbo.Configuracion')
)
  ALTER TABLE dbo.Configuracion
    ADD CONSTRAINT FK_Configuracion_UsuarioCreacion
    FOREIGN KEY (IDUsuarioCreacion) REFERENCES dbo.Usuario (IDUsuario);
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = N'FK_Configuracion_UsuarioModificacion'
    AND parent_object_id = OBJECT_ID(N'dbo.Configuracion')
)
  ALTER TABLE dbo.Configuracion
    ADD CONSTRAINT FK_Configuracion_UsuarioModificacion
    FOREIGN KEY (IDUsuarioModificacion) REFERENCES dbo.Usuario (IDUsuario);
GO

  IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'009_Migrar_Configuracion_Auditoria')
    INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'009_Migrar_Configuracion_Auditoria');
  GO
