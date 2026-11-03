/* ============================================================
   120_Migrar_Infraestructura.sql
   Agrega control de migraciones y la secuencia de pedidos a
   bases existentes.
   ============================================================ */
USE ShopCart;
GO

SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.SchemaMigration', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.SchemaMigration (
            MigrationKey NVARCHAR(150) NOT NULL,
            AppliedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SchemaMigration_AppliedAt DEFAULT SYSUTCDATETIME(),
            CONSTRAINT PK_SchemaMigration PRIMARY KEY (MigrationKey)
        );
    END;

    IF OBJECT_ID(N'dbo.Seq_NumeroPedido', N'SO') IS NULL
        CREATE SEQUENCE dbo.Seq_NumeroPedido AS BIGINT START WITH 1 INCREMENT BY 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.SchemaMigration
        WHERE MigrationKey = N'120_Migrar_Infraestructura'
    )
    BEGIN
        INSERT dbo.SchemaMigration (MigrationKey)
        VALUES (N'120_Migrar_Infraestructura');
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
