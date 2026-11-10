/* ============================================================
   122_Migrar_Reportes_Operacion.sql
   Umbral de existencia baja para el dashboard.
   El procedimiento actualizado está en 113_SP_Reportes.sql.
   ============================================================ */
USE ShopCart;
GO

IF OBJECT_ID(N'dbo.Configuracion', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.Configuracion WHERE Clave = N'EXISTENCIA_BAJA')
BEGIN
  INSERT dbo.Configuracion (Clave, Valor, Descripcion)
  VALUES (
    N'EXISTENCIA_BAJA',
    N'5',
    N'Una variante activa con esta existencia o menos se muestra como baja en reportes.'
  );
END
GO

IF OBJECT_ID(N'dbo.SchemaMigration', N'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.SchemaMigration WHERE MigrationKey = N'122_Migrar_Reportes_Operacion')
  INSERT dbo.SchemaMigration (MigrationKey) VALUES (N'122_Migrar_Reportes_Operacion');
GO
