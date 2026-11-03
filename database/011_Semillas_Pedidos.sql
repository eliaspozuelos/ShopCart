/* ============================================================
   011_Semillas_Pedidos.sql
   Estados y transiciones iniciales para el flujo de pedidos.
   Ejecutar cuando se habiliten checkout, pedidos y devoluciones.
   ============================================================ */
USE ShopCart;
GO

IF OBJECT_ID(N'dbo.EstadoPedido', N'U') IS NULL
   OR OBJECT_ID(N'dbo.TransicionEstadoPedido', N'U') IS NULL
BEGIN
  THROW 51014, N'Faltan las tablas de pedidos. Ejecute primero el script de tablas.', 1;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'PENDIENTE')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'PENDIENTE', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'CONFIRMADO')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'CONFIRMADO', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'PREPARANDO')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'PREPARANDO', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'DESPACHADO')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'DESPACHADO', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'EN_RUTA')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'EN_RUTA', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'ENTREGADO')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'ENTREGADO', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'CANCELADO')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'CANCELADO', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE Nombre = N'DEVUELTO')
  INSERT dbo.EstadoPedido (Nombre, EsFinal) VALUES (N'DEVUELTO', 1);

DELETE t
FROM dbo.TransicionEstadoPedido t
INNER JOIN dbo.EstadoPedido origen
  ON origen.IDEstadoPedido = t.IDEstadoOrigen
INNER JOIN dbo.EstadoPedido destino
  ON destino.IDEstadoPedido = t.IDEstadoDestino
WHERE origen.Nombre = N'DESPACHADO'
  AND destino.Nombre = N'ENTREGADO';

INSERT dbo.TransicionEstadoPedido (IDEstadoOrigen, IDEstadoDestino)
SELECT o.IDEstadoPedido, d.IDEstadoPedido
FROM dbo.EstadoPedido o CROSS JOIN dbo.EstadoPedido d
WHERE (
     (o.Nombre = N'PENDIENTE' AND d.Nombre = N'CONFIRMADO')
  OR (o.Nombre = N'CONFIRMADO' AND d.Nombre IN (N'PREPARANDO', N'CANCELADO'))
  OR (o.Nombre = N'PREPARANDO' AND d.Nombre = N'DESPACHADO')
  OR (o.Nombre = N'DESPACHADO' AND d.Nombre = N'EN_RUTA')
  OR (o.Nombre = N'EN_RUTA' AND d.Nombre = N'ENTREGADO')
  OR (o.Nombre = N'ENTREGADO' AND d.Nombre = N'DEVUELTO')
)
AND NOT EXISTS (
    SELECT 1 FROM dbo.TransicionEstadoPedido t
    WHERE t.IDEstadoOrigen = o.IDEstadoPedido
      AND t.IDEstadoDestino = d.IDEstadoPedido
  );
GO
