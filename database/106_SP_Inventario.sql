/* ============================================================
   106_SP_Inventario.sql
   Consultas y ajustes atomicos de existencias e historial.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   FU_Inventario_ExistenciaDisponible
   Existencia fisica menos reservas activas no vencidas.
   ------------------------------------------------------------ */
CREATE OR ALTER FUNCTION dbo.FU_Inventario_ExistenciaDisponible (
  @IDVariante INT
)
RETURNS TABLE
AS
RETURN
(
  SELECT
    v.ExistenciaFisica,
    CONVERT(INT, COALESCE((
      SELECT SUM(r.Cantidad)
      FROM dbo.ReservaExistencia AS r
      WHERE r.IDVariante = v.IDVariante
        AND r.Estado = N'ACTIVA'
        AND r.ExpiraEn > SYSUTCDATETIME()
    ), 0)) AS CantidadReservada,
    v.ExistenciaFisica - CONVERT(INT, COALESCE((
      SELECT SUM(r.Cantidad)
      FROM dbo.ReservaExistencia AS r
      WHERE r.IDVariante = v.IDVariante
        AND r.Estado = N'ACTIVA'
        AND r.ExpiraEn > SYSUTCDATETIME()
    ), 0)) AS ExistenciaDisponible
  FROM dbo.Variante AS v
  WHERE v.IDVariante = @IDVariante
);
GO

/* ------------------------------------------------------------
   SP_Inventario_ObtenerExistencia
   Consulta la existencia y las reservas de una variante.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_ObtenerExistencia
  @IDUsuarioActor INT,
  @IDVariante INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1
      AND r.Nombre IN (N'Operador', N'Administrador')
  )
    THROW 50121, N'Solo un Operador o Administrador activo puede consultar inventario.', 1;

  SELECT v.IDVariante, v.IDProducto, v.SKU, disp.ExistenciaFisica,
         disp.CantidadReservada, disp.ExistenciaDisponible
  FROM dbo.Variante AS v
  CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) AS disp
  WHERE v.IDVariante = @IDVariante;
END;
GO

/* ------------------------------------------------------------
   SP_Inventario_AjustarExistencia
   Actualiza el saldo absoluto y registra el movimiento en una
   transaccion; el ajuste no puede quedar debajo de reservas.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_AjustarExistencia
  @IDUsuarioActor INT,
  @IDVariante INT,
  @NuevaExistencia INT,
  @Motivo NVARCHAR(300),
  @DevolverResultado BIT = 1
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1
      AND r.Nombre IN (N'Operador', N'Administrador')
  )
    THROW 50121, N'Solo un Operador o Administrador activo puede ajustar inventario.', 1;

  IF @NuevaExistencia IS NULL OR @NuevaExistencia < 0
    THROW 50137, N'La existencia no puede ser negativa.', 1;

  IF NULLIF(LTRIM(RTRIM(@Motivo)), N'') IS NULL
    THROW 50157, N'El motivo del ajuste es requerido.', 1;

  DECLARE @ExistenciaAnterior INT;
  DECLARE @Diferencia INT;
  DECLARE @IDTipoMovimiento INT;
  DECLARE @ExistenciaReservada BIGINT;

  BEGIN TRY
    BEGIN TRANSACTION;

    SELECT @ExistenciaAnterior = ExistenciaFisica
    FROM dbo.Variante WITH (UPDLOCK, HOLDLOCK)
    WHERE IDVariante = @IDVariante;

    IF @ExistenciaAnterior IS NULL
      THROW 50156, N'La variante de inventario no existe.', 1;

    SELECT @ExistenciaReservada = COALESCE(SUM(CONVERT(BIGINT, r.Cantidad)), 0)
    FROM dbo.ReservaExistencia AS r WITH (UPDLOCK, HOLDLOCK)
    WHERE r.IDVariante = @IDVariante
      AND r.Estado = N'ACTIVA'
      AND r.ExpiraEn > SYSUTCDATETIME();

    IF @NuevaExistencia < @ExistenciaReservada
      THROW 50139, N'La existencia no puede quedar por debajo de las unidades reservadas.', 1;

    SET @Diferencia = @NuevaExistencia - @ExistenciaAnterior;

    IF @Diferencia <> 0
    BEGIN
      SELECT @IDTipoMovimiento = IDTipoMovimiento
      FROM dbo.TipoMovimiento
      WHERE Nombre = CASE WHEN @Diferencia > 0 THEN N'AJUSTE_POSITIVO' ELSE N'AJUSTE_NEGATIVO' END
        AND Signo = CASE WHEN @Diferencia > 0 THEN 1 ELSE -1 END;

      IF @IDTipoMovimiento IS NULL
        THROW 50138, N'Faltan configurar los tipos de ajuste de inventario. Ejecuta nuevamente la semilla.', 1;

      UPDATE dbo.Variante
      SET ExistenciaFisica = @NuevaExistencia
      WHERE IDVariante = @IDVariante;

      INSERT INTO dbo.MovimientoInventario
        (IDVariante, IDTipoMovimiento, Cantidad, ExistenciaResultante, IDUsuario, Motivo)
      VALUES
        (@IDVariante, @IDTipoMovimiento, ABS(@Diferencia), @NuevaExistencia,
         @IDUsuarioActor, LTRIM(RTRIM(@Motivo)));
    END

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  IF @DevolverResultado = 1
  BEGIN
    SELECT v.IDVariante, v.IDProducto, v.SKU, disp.ExistenciaFisica,
           disp.CantidadReservada, disp.ExistenciaDisponible
    FROM dbo.Variante AS v
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) AS disp
    WHERE v.IDVariante = @IDVariante;
  END
END;
GO

/* ------------------------------------------------------------
   SP_Inventario_ListarMovimientos
   Historial paginado del kardex para administracion.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Inventario_ListarMovimientos
  @IDUsuarioActor INT,
  @IDVariante INT = NULL,
  @Pagina INT = 1,
  @TamanoPagina INT = 20
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1
      AND r.Nombre IN (N'Operador', N'Administrador')
  )
    THROW 50121, N'Solo un Operador o Administrador activo puede consultar inventario.', 1;

  SET @Pagina = CASE WHEN @Pagina < 1 THEN 1 ELSE @Pagina END;
  SET @TamanoPagina = CASE WHEN @TamanoPagina < 1 THEN 20 WHEN @TamanoPagina > 100 THEN 100 ELSE @TamanoPagina END;

  DECLARE @Offset BIGINT = (CONVERT(BIGINT, @Pagina) - 1) * @TamanoPagina;

  SELECT COUNT(*) AS TotalRegistros
  FROM dbo.MovimientoInventario AS mi
  WHERE @IDVariante IS NULL OR mi.IDVariante = @IDVariante;

  SELECT mi.IDMovimiento, mi.IDVariante, v.SKU, v.IDProducto,
         p.Nombre AS NombreProducto, tm.Nombre AS TipoMovimiento,
         mi.Cantidad, mi.ExistenciaResultante, mi.Motivo, mi.Fecha
  FROM dbo.MovimientoInventario AS mi
  INNER JOIN dbo.Variante AS v ON v.IDVariante = mi.IDVariante
  INNER JOIN dbo.Producto AS p ON p.IDProducto = v.IDProducto
  INNER JOIN dbo.TipoMovimiento AS tm ON tm.IDTipoMovimiento = mi.IDTipoMovimiento
  WHERE @IDVariante IS NULL OR mi.IDVariante = @IDVariante
  ORDER BY mi.Fecha DESC, mi.IDMovimiento DESC
  OFFSET @Offset ROWS
  FETCH NEXT @TamanoPagina ROWS ONLY;
END;
GO

