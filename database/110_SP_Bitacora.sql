/* ============================================================
   110_SP_Bitacora.sql
   Consulta administrativa de auditoría.
   ============================================================ */
USE ShopCart;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_Bitacora_Fecha'
    AND object_id = OBJECT_ID(N'dbo.Bitacora')
)
  CREATE INDEX IX_Bitacora_Fecha ON dbo.Bitacora (Fecha DESC, IDBitacora DESC);
GO

CREATE OR ALTER PROCEDURE dbo.SP_Bitacora_Listar
  @Modulo NVARCHAR(30)=NULL, @Pagina INT=1, @TamanoPagina INT=20
AS
BEGIN
  SET NOCOUNT ON;

  IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
  IF @TamanoPagina IS NULL OR @TamanoPagina < 1 SET @TamanoPagina = 20;
  IF @TamanoPagina > 100 SET @TamanoPagina = 100;
  IF NULLIF(LTRIM(RTRIM(@Modulo)), N'') IS NULL SET @Modulo = NULL;

  DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;

  -- La página se arma solo con la llave. Ordenar también ValorAnterior y
  -- ValorNuevo pedía una concesión de memoria que dejaba la consulta en espera.
  IF @Modulo IS NULL
  BEGIN
    SELECT COUNT(*) AS TotalRegistros FROM dbo.Bitacora;

    SELECT b.IDBitacora, b.IDUsuario, u.Correo, b.Modulo, b.Entidad, b.IDEntidad,
           b.Accion, b.ValorAnterior, b.ValorNuevo, b.Fecha
    FROM (
      SELECT IDBitacora
      FROM dbo.Bitacora
      ORDER BY Fecha DESC, IDBitacora DESC
      OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY
    ) AS pagina
    INNER JOIN dbo.Bitacora AS b ON b.IDBitacora = pagina.IDBitacora
    INNER JOIN dbo.Usuario AS u ON u.IDUsuario = b.IDUsuario
    ORDER BY b.Fecha DESC, b.IDBitacora DESC;
  END
  ELSE
  BEGIN
    SELECT COUNT(*) AS TotalRegistros FROM dbo.Bitacora WHERE Modulo = @Modulo;

    SELECT b.IDBitacora, b.IDUsuario, u.Correo, b.Modulo, b.Entidad, b.IDEntidad,
           b.Accion, b.ValorAnterior, b.ValorNuevo, b.Fecha
    FROM (
      SELECT IDBitacora
      FROM dbo.Bitacora
      WHERE Modulo = @Modulo
      ORDER BY Fecha DESC, IDBitacora DESC
      OFFSET @Offset ROWS FETCH NEXT @TamanoPagina ROWS ONLY
    ) AS pagina
    INNER JOIN dbo.Bitacora AS b ON b.IDBitacora = pagina.IDBitacora
    INNER JOIN dbo.Usuario AS u ON u.IDUsuario = b.IDUsuario
    ORDER BY b.Fecha DESC, b.IDBitacora DESC;
  END
END;
GO

/* ------------------------------------------------------------
   SP_Bitacora_Resumen
   Totales de toda la bitácora para los gráficos del panel.
   Los eventos por día cubren los últimos 30 días, incluidos los días en cero.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Bitacora_Resumen
AS
BEGIN
  SET NOCOUNT ON;

  SELECT Modulo AS Nombre, COUNT(*) AS Total
  FROM dbo.Bitacora
  GROUP BY Modulo
  ORDER BY Total DESC, Modulo;

  SELECT Accion AS Nombre, COUNT(*) AS Total
  FROM dbo.Bitacora
  GROUP BY Accion
  ORDER BY Total DESC, Accion;

  DECLARE @Hasta DATE = CAST(SYSUTCDATETIME() AS DATE);
  DECLARE @Desde DATE = DATEADD(DAY, -29, @Hasta);

  WITH dias AS (
    SELECT @Desde AS Fecha
    UNION ALL
    SELECT DATEADD(DAY, 1, Fecha)
    FROM dias
    WHERE Fecha < @Hasta
  ),
  conteo AS (
    SELECT CAST(Fecha AS DATE) AS Fecha, COUNT(*) AS Total
    FROM dbo.Bitacora
    WHERE Fecha >= CAST(@Desde AS DATETIME2(0))
      AND Fecha < DATEADD(DAY, 1, CAST(@Hasta AS DATETIME2(0)))
    GROUP BY CAST(Fecha AS DATE)
  )
  SELECT CONVERT(CHAR(10), d.Fecha, 23) AS Fecha,
         COALESCE(c.Total, 0) AS Total
  FROM dias AS d
  LEFT JOIN conteo AS c
    ON c.Fecha = d.Fecha
  ORDER BY d.Fecha
  OPTION (MAXRECURSION 30);
END;
GO
