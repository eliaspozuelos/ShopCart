/* ============================================================
   113_SP_Reportes.sql
   Dashboard administrativo: ventas netas de pedidos completados,
   descontando devoluciones, y series por periodo.
   ============================================================ */
USE ShopCart;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Reportes_Dashboard
  @Desde DATETIME2(0)=NULL, @Hasta DATETIME2(0)=NULL
AS
BEGIN
  SET NOCOUNT ON;

  SET @Desde = COALESCE(@Desde, DATEADD(DAY, -30, SYSUTCDATETIME()));
  SET @Hasta = COALESCE(@Hasta, SYSUTCDATETIME());

  DECLARE @MinutosAbandono INT = 60;
  SELECT @MinutosAbandono = COALESCE(TRY_CONVERT(INT, Valor), 60)
  FROM dbo.Configuracion
  WHERE Clave = N'MINUTOS_CARRITO_ABANDONADO';

  IF @MinutosAbandono IS NULL OR @MinutosAbandono < 1
    SET @MinutosAbandono = 60;

  CREATE TABLE #Completados (
    IDPedido INT NOT NULL,
    FechaCreacion DATETIME2(0) NOT NULL,
    Total DECIMAL(18,2) NOT NULL,
    MontoDevuelto DECIMAL(18,2) NOT NULL,
    VentaNeta DECIMAL(18,2) NOT NULL
  );

  INSERT #Completados (IDPedido, FechaCreacion, Total, MontoDevuelto, VentaNeta)
  SELECT
    p.IDPedido,
    p.FechaCreacion,
    p.Total,
    COALESCE((
      SELECT SUM(dv.MontoReintegrado)
      FROM dbo.Devolucion AS dv
      WHERE dv.IDPedido = p.IDPedido
    ), 0),
    p.Total - COALESCE((
      SELECT SUM(dv.MontoReintegrado)
      FROM dbo.Devolucion AS dv
      WHERE dv.IDPedido = p.IDPedido
    ), 0)
  FROM dbo.Pedido AS p
  INNER JOIN dbo.EstadoPedido AS e ON e.IDEstadoPedido = p.IDEstadoPedido
  WHERE e.Nombre IN (N'ENTREGADO', N'DEVUELTO')
    AND p.FechaCreacion BETWEEN @Desde AND @Hasta;

  SELECT
    COUNT(*) AS Pedidos,
    COALESCE(SUM(VentaNeta), 0) AS Ventas,
    CASE
      WHEN COUNT(*) = 0 THEN CONVERT(DECIMAL(18,2), 0)
      ELSE CONVERT(DECIMAL(18,2), COALESCE(SUM(VentaNeta), 0) / COUNT(*))
    END AS TicketPromedio
  FROM #Completados;

  SELECT
    CONVERT(date, FechaCreacion) AS Periodo,
    COUNT(*) AS Pedidos,
    COALESCE(SUM(VentaNeta), 0) AS Ventas
  FROM #Completados
  GROUP BY CONVERT(date, FechaCreacion)
  ORDER BY Periodo;

  SELECT
    CONCAT(
      CONVERT(NVARCHAR(4), DATEPART(YEAR, FechaCreacion)),
      N'-W',
      RIGHT(CONCAT(N'00', DATEPART(ISO_WEEK, FechaCreacion)), 2)
    ) AS Periodo,
    COUNT(*) AS Pedidos,
    COALESCE(SUM(VentaNeta), 0) AS Ventas
  FROM #Completados
  GROUP BY
    DATEPART(YEAR, FechaCreacion),
    DATEPART(ISO_WEEK, FechaCreacion)
  ORDER BY DATEPART(YEAR, FechaCreacion), DATEPART(ISO_WEEK, FechaCreacion);

  SELECT
    CONVERT(char(7), FechaCreacion, 126) AS Periodo,
    COUNT(*) AS Pedidos,
    COALESCE(SUM(VentaNeta), 0) AS Ventas
  FROM #Completados
  GROUP BY CONVERT(char(7), FechaCreacion, 126)
  ORDER BY Periodo;

  SELECT
    COALESCE(c.Nombre, N'Sin categoria') AS Categoria,
    SUM(d.Cantidad - d.CantidadDevuelta) AS Unidades,
    SUM(
      CONVERT(DECIMAL(18,2), (d.Cantidad - d.CantidadDevuelta)) * d.PrecioUnitario
      - CASE
          WHEN d.Cantidad = 0 THEN 0
          ELSE ROUND(d.DescuentoLinea * CONVERT(DECIMAL(18,4), d.Cantidad - d.CantidadDevuelta) / d.Cantidad, 2)
        END
    ) AS Ventas
  FROM dbo.PedidoDetalle AS d
  INNER JOIN #Completados AS p ON p.IDPedido = d.IDPedido
  LEFT JOIN dbo.Categoria AS c ON c.IDCategoria = d.IDCategoriaSnapshot
  GROUP BY COALESCE(c.Nombre, N'Sin categoria')
  ORDER BY Ventas DESC;

  SELECT TOP (10)
    d.SKUSnapshot,
    d.NombreSnapshot,
    SUM(d.Cantidad - d.CantidadDevuelta) AS Unidades,
    SUM(
      CONVERT(DECIMAL(18,2), (d.Cantidad - d.CantidadDevuelta)) * d.PrecioUnitario
      - CASE
          WHEN d.Cantidad = 0 THEN 0
          ELSE ROUND(d.DescuentoLinea * CONVERT(DECIMAL(18,4), d.Cantidad - d.CantidadDevuelta) / d.Cantidad, 2)
        END
    ) AS Ventas
  FROM dbo.PedidoDetalle AS d
  INNER JOIN #Completados AS p ON p.IDPedido = d.IDPedido
  GROUP BY d.SKUSnapshot, d.NombreSnapshot
  HAVING SUM(d.Cantidad - d.CantidadDevuelta) > 0
  ORDER BY Unidades DESC, Ventas DESC;

  SELECT e.Nombre AS Estado, COUNT(*) AS Cantidad
  FROM dbo.Pedido AS p
  INNER JOIN dbo.EstadoPedido AS e ON e.IDEstadoPedido = p.IDEstadoPedido
  WHERE p.FechaCreacion BETWEEN @Desde AND @Hasta
  GROUP BY e.Nombre
  ORDER BY e.Nombre;

  SELECT
    COUNT(*) AS CarritosAbandonados,
    @MinutosAbandono AS MinutosSinActividad
  FROM dbo.Carrito AS c
  WHERE c.Estado = N'ACTIVO'
    AND c.UltimaActividad <= DATEADD(MINUTE, -@MinutosAbandono, SYSUTCDATETIME())
    AND EXISTS (
      SELECT 1 FROM dbo.CarritoDetalle AS d WHERE d.IDCarrito = c.IDCarrito
    );
END;
GO
