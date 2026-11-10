/* ============================================================
   120_Verificar_Instalacion.sql
   Comprueba que los objetos críticos estén instalados.
   ============================================================ */
USE ShopCart;
GO

SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.Seq_NumeroPedido', N'SO') IS NULL
    THROW 51006, N'Falta la secuencia dbo.Seq_NumeroPedido.', 1;

IF OBJECT_ID(N'dbo.TR_Pedido_ValidarTransicionEstado', N'TR') IS NULL
    THROW 51006, N'Falta el trigger de transiciones de pedido.', 1;

IF OBJECT_ID(N'dbo.TR_Bitacora_Inmutable', N'TR') IS NULL
    THROW 51006, N'Falta el trigger de bitácora inmutable.', 1;

IF OBJECT_ID(N'dbo.SP_Pedidos_Checkout', N'P') IS NULL
    THROW 51006, N'Falta el procedimiento de checkout.', 1;

IF OBJECT_ID(N'dbo.SP_Pedidos_Listar', N'P') IS NULL
    THROW 51006, N'Falta el procedimiento de listado de pedidos.', 1;

IF OBJECT_ID(N'dbo.SP_Pedidos_CambiarEstado', N'P') IS NULL
    THROW 51006, N'Falta el procedimiento de cambio de estado de pedidos.', 1;

IF OBJECT_ID(N'dbo.SP_Devoluciones_Crear', N'P') IS NULL
    THROW 51006, N'Falta el procedimiento de devoluciones.', 1;

IF OBJECT_ID(N'dbo.SP_Devoluciones_Resolver', N'P') IS NULL
    THROW 51006, N'Falta el procedimiento que aprueba o rechaza una devolucion.', 1;

IF OBJECT_ID(N'dbo.SP_Devoluciones_Listar', N'P') IS NULL
    THROW 51006, N'Falta el procedimiento que lista las solicitudes de devolucion.', 1;

IF OBJECT_ID(N'dbo.SP_Reportes_Dashboard', N'P') IS NULL
    THROW 51006, N'Falta el procedimiento de reportes.', 1;

IF OBJECT_ID(N'dbo.SchemaMigration', N'U') IS NULL
    THROW 51006, N'Falta la tabla de control de migraciones.', 1;

SELECT N'Instalación válida' AS Resultado;
GO
