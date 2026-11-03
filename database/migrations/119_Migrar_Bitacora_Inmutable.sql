/* ============================================================
   119_Migrar_Bitacora_Inmutable.sql
   Impide modificar o eliminar registros de auditoria.
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

CREATE OR ALTER TRIGGER dbo.TR_Bitacora_Inmutable
ON dbo.Bitacora
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51004, N'La bitacora es inmutable; no se permiten UPDATE ni DELETE.', 1;
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'119_Migrar_Bitacora_Inmutable')
    INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'119_Migrar_Bitacora_Inmutable');
GO
