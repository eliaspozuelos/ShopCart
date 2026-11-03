/* ============================================================
   009_Tablas_Sistema.sql
   Control de migraciones y secuencia de números de pedido.
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

IF OBJECT_ID(N'dbo.Seq_NumeroPedido', N'SO') IS NULL
    CREATE SEQUENCE dbo.Seq_NumeroPedido AS BIGINT START WITH 1 INCREMENT BY 1;
GO
