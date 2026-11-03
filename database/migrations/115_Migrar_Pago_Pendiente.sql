/* Permite el estado inicial de pagos contra entrega. */
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

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_Pago_Estado'
      AND parent_object_id = OBJECT_ID(N'dbo.Pago')
)
BEGIN
    ALTER TABLE dbo.Pago DROP CONSTRAINT CK_Pago_Estado;
END;
GO

ALTER TABLE dbo.Pago
ADD CONSTRAINT CK_Pago_Estado
CHECK (Estado IN (N'PENDIENTE', N'APROBADO', N'REEMBOLSO_PARCIAL', N'REEMBOLSADO'));
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'115_Migrar_Pago_Pendiente')
    INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'115_Migrar_Pago_Pendiente');
GO
