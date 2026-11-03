/* ============================================================
   117_Verificar_Invariante_Inventario.sql
   Verifica que la existencia fisica de cada variante sea igual
   a la suma firmada de todos sus movimientos de kardex.

   El script devuelve el detalle de todas las variantes y aborta
   con 51003 si encuentra una diferencia o un saldo inconsistente.
   ============================================================ */
USE ShopCart;
GO

SET NOCOUNT ON;

IF OBJECT_ID('tempdb..#Kardex') IS NOT NULL DROP TABLE #Kardex;
IF OBJECT_ID('tempdb..#Secuencia') IS NOT NULL DROP TABLE #Secuencia;

SELECT
  mi.IDVariante,
  SUM(CONVERT(BIGINT, tm.Signo) * mi.Cantidad) AS SaldoKardex,
  SUM(CASE WHEN mi.ExistenciaResultante < 0 THEN 1 ELSE 0 END) AS MovimientosConSaldoNegativo
INTO #Kardex
FROM dbo.MovimientoInventario AS mi
INNER JOIN dbo.TipoMovimiento AS tm
  ON tm.IDTipoMovimiento = mi.IDTipoMovimiento
GROUP BY mi.IDVariante;

SELECT
  mi.IDVariante,
  mi.IDMovimiento,
  mi.ExistenciaResultante,
  SUM(CONVERT(BIGINT, tm.Signo) * mi.Cantidad) OVER (
    PARTITION BY mi.IDVariante
    ORDER BY mi.IDMovimiento
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS SaldoAcumulado
INTO #Secuencia
FROM dbo.MovimientoInventario AS mi
INNER JOIN dbo.TipoMovimiento AS tm
  ON tm.IDTipoMovimiento = mi.IDTipoMovimiento;

SELECT
  v.IDVariante,
  v.SKU,
  v.ExistenciaFisica,
  COALESCE(k.SaldoKardex, 0) AS SaldoKardex,
  COALESCE(k.MovimientosConSaldoNegativo, 0) AS MovimientosConSaldoNegativo,
  CASE WHEN EXISTS (
    SELECT 1 FROM #Secuencia AS s
    WHERE s.IDVariante = v.IDVariante
      AND CONVERT(BIGINT, s.ExistenciaResultante) <> s.SaldoAcumulado
  ) THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END AS SecuenciaConsistente,
  CASE
    WHEN CONVERT(BIGINT, v.ExistenciaFisica) = COALESCE(k.SaldoKardex, 0)
      AND COALESCE(k.MovimientosConSaldoNegativo, 0) = 0
      AND NOT EXISTS (
        SELECT 1 FROM #Secuencia AS s
        WHERE s.IDVariante = v.IDVariante
          AND CONVERT(BIGINT, s.ExistenciaResultante) <> s.SaldoAcumulado
      )
    THEN CAST(1 AS BIT)
    ELSE CAST(0 AS BIT)
  END AS InvarianteCumplida
FROM dbo.Variante AS v
LEFT JOIN #Kardex AS k ON k.IDVariante = v.IDVariante
ORDER BY v.IDVariante;

IF EXISTS (
  SELECT 1
  FROM dbo.Variante AS v
  LEFT JOIN #Kardex AS k ON k.IDVariante = v.IDVariante
  WHERE CONVERT(BIGINT, v.ExistenciaFisica) <> COALESCE(k.SaldoKardex, 0)
)
  THROW 51003, N'La existencia fisica no coincide con el saldo firmado del kardex.', 1;

IF EXISTS (
  SELECT 1
  FROM #Secuencia
  WHERE CONVERT(BIGINT, ExistenciaResultante) <> SaldoAcumulado
)
  THROW 51003, N'La secuencia de saldos resultantes del kardex es inconsistente.', 1;
GO
