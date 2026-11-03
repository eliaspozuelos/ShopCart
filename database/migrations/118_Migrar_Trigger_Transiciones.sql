/* ============================================================
   118_Migrar_Trigger_Transiciones.sql
   La tabla TransicionEstadoPedido es la autoridad para permitir
   cambios. Esto permite ENTREGADO -> DEVUELTO aunque ENTREGADO
   sea un estado final del flujo de entrega.
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

CREATE OR ALTER TRIGGER dbo.TR_Pedido_ValidarTransicionEstado
ON dbo.Pedido
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN deleted AS d ON d.IDPedido = i.IDPedido
        WHERE i.IDEstadoPedido <> d.IDEstadoPedido
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.TransicionEstadoPedido AS t
              WHERE t.IDEstadoOrigen = d.IDEstadoPedido
                AND t.IDEstadoDestino = i.IDEstadoPedido
          )
    )
    BEGIN
        THROW 50222, N'La transicion de estado del pedido no esta permitida.', 1;
    END
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'118_Migrar_Trigger_Transiciones')
    INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'118_Migrar_Trigger_Transiciones');
GO
