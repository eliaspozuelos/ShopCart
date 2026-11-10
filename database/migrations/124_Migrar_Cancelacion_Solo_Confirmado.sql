/* ============================================================
   124_Migrar_Cancelacion_Solo_Confirmado.sql
   Quita la cancelacion desde PREPARANDO. Solo CONFIRMADO
   puede pasar a CANCELADO, antes de que empiece la preparacion.
   ============================================================ */
USE ShopCart;
GO

DELETE t
FROM dbo.TransicionEstadoPedido AS t
INNER JOIN dbo.EstadoPedido AS o ON o.IDEstadoPedido = t.IDEstadoOrigen
INNER JOIN dbo.EstadoPedido AS d ON d.IDEstadoPedido = t.IDEstadoDestino
WHERE o.Nombre = N'PREPARANDO'
  AND d.Nombre = N'CANCELADO';
GO

IF OBJECT_ID(N'dbo.SchemaMigration', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'124_Migrar_Cancelacion_Solo_Confirmado')
  INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'124_Migrar_Cancelacion_Solo_Confirmado');
GO
