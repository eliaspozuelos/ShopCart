/* ============================================================
   109_SP_Carrito.sql
   Carrito de compras para clientes e invitados: alta de lineas,
   cambio de cantidad, cupon y totales con redondeo a 2 decimales.
   ============================================================ */
USE ShopCart;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'UX_Carrito_UsuarioActivo'
    AND object_id = OBJECT_ID(N'dbo.Carrito')
)
BEGIN
  CREATE UNIQUE INDEX UX_Carrito_UsuarioActivo
    ON dbo.Carrito (IDUsuario)
    WHERE IDUsuario IS NOT NULL AND Estado = N'ACTIVO';
END
GO

/* ------------------------------------------------------------
   SP_Reservas_LiberarVencidas
   Marca como vencidas las reservas cuyo plazo de 15 minutos
   terminó. Puede ejecutarse manualmente o desde un job.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Reservas_LiberarVencidas
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.ReservaExistencia
  SET Estado = N'VENCIDA'
  WHERE Estado = N'ACTIVA'
    AND ExpiraEn <= SYSUTCDATETIME();
END;
GO

/* ------------------------------------------------------------
   SP_Reservas_LiberarCarrito
   Libera las reservas activas de un carrito que ya no las necesita.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Reservas_LiberarCarrito
  @IDCarrito INT
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.ReservaExistencia
  SET Estado = N'LIBERADA'
  WHERE IDCarrito = @IDCarrito
    AND Estado = N'ACTIVA';
END;
GO

/* ------------------------------------------------------------
   SP_Reservas_SincronizarCarrito
   Reserva durante 15 minutos la cantidad actual de cada línea.
   La variante se bloquea para que dos carritos no reserven la
   última unidad simultáneamente.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Reservas_SincronizarCarrito
  @IDCarrito INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  EXEC dbo.SP_Reservas_LiberarVencidas;

  UPDATE r
  SET Estado = N'LIBERADA'
  FROM dbo.ReservaExistencia AS r
  WHERE r.IDCarrito = @IDCarrito
    AND r.Estado = N'ACTIVA'
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.CarritoDetalle AS d
      WHERE d.IDCarrito = r.IDCarrito
        AND d.IDVariante = r.IDVariante
    );

  DECLARE @IDVariante INT;
  DECLARE @Cantidad INT;
  DECLARE @ExistenciaFisica INT;
  DECLARE @ReservadaPorOtros BIGINT;
  DECLARE @IDReserva INT;

  DECLARE lineas CURSOR LOCAL FAST_FORWARD FOR
    SELECT IDVariante, Cantidad
    FROM dbo.CarritoDetalle
    WHERE IDCarrito = @IDCarrito;

  OPEN lineas;
  FETCH NEXT FROM lineas INTO @IDVariante, @Cantidad;
  WHILE @@FETCH_STATUS = 0
  BEGIN
    SET @ExistenciaFisica = NULL;
    SET @ReservadaPorOtros = 0;
    SET @IDReserva = NULL;

    SELECT @ExistenciaFisica = v.ExistenciaFisica
    FROM dbo.Variante AS v WITH (UPDLOCK, HOLDLOCK)
    WHERE v.IDVariante = @IDVariante;

    IF @ExistenciaFisica IS NULL
      THROW 50132, N'La variante no existe.', 1;

    SELECT @ReservadaPorOtros = COALESCE(SUM(CONVERT(BIGINT, r.Cantidad)), 0)
    FROM dbo.ReservaExistencia AS r WITH (UPDLOCK, HOLDLOCK)
    WHERE r.IDVariante = @IDVariante
      AND r.IDCarrito <> @IDCarrito
      AND r.Estado = N'ACTIVA'
      AND r.ExpiraEn > SYSUTCDATETIME();

    IF CONVERT(BIGINT, @Cantidad) > CONVERT(BIGINT, @ExistenciaFisica) - @ReservadaPorOtros
      THROW 50152, N'No hay existencia suficiente para esa cantidad.', 1;

    SELECT @IDReserva = IDReserva
    FROM dbo.ReservaExistencia WITH (UPDLOCK, HOLDLOCK)
    WHERE IDCarrito = @IDCarrito
      AND IDVariante = @IDVariante
      AND Estado = N'ACTIVA';

    IF @IDReserva IS NULL
      INSERT dbo.ReservaExistencia (IDVariante, IDCarrito, Cantidad, ExpiraEn, Estado)
      VALUES (@IDVariante, @IDCarrito, @Cantidad, DATEADD(MINUTE, 15, SYSUTCDATETIME()), N'ACTIVA');
    ELSE
      UPDATE dbo.ReservaExistencia
      SET Cantidad = @Cantidad,
          ExpiraEn = DATEADD(MINUTE, 15, SYSUTCDATETIME())
      WHERE IDReserva = @IDReserva;

    FETCH NEXT FROM lineas INTO @IDVariante, @Cantidad;
  END;
  CLOSE lineas;
  DEALLOCATE lineas;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_Devolver
   Devuelve encabezado, totales y lineas de un carrito activo.
   Recalcula precios vigentes y el descuento del cupon.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_Devolver
  @IDCarrito INT
AS
BEGIN
  SET NOCOUNT ON;

  EXEC dbo.SP_Reservas_LiberarVencidas;

  IF NOT EXISTS (SELECT 1 FROM dbo.Carrito WHERE IDCarrito = @IDCarrito AND Estado = N'ACTIVO')
    THROW 50150, N'No se encontro el carrito.', 1;

  DECLARE @Subtotal DECIMAL(18,2);
  DECLARE @SubtotalElegible DECIMAL(18,2);
  DECLARE @Descuento DECIMAL(18,2) = 0;
  DECLARE @IDCupon INT;
  DECLARE @TipoCupon NVARCHAR(12);
  DECLARE @ValorCupon DECIMAL(18,2);
  DECLARE @MontoMinimo DECIMAL(18,2);
  DECLARE @IDCategoriaCupon INT;
  DECLARE @FechaActual DATETIME2(0) = SYSUTCDATETIME();

  SELECT
    @Subtotal = COALESCE(SUM(ROUND(v.Precio * d.Cantidad, 2)), 0)
  FROM dbo.CarritoDetalle AS d
  INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
  WHERE d.IDCarrito = @IDCarrito;

  SELECT @IDCupon = c.IDCupon
  FROM dbo.Carrito AS ca
  LEFT JOIN dbo.Cupon AS c ON c.IDCupon = ca.IDCupon
  WHERE ca.IDCarrito = @IDCarrito;

  IF @IDCupon IS NOT NULL
  BEGIN
    SELECT
      @TipoCupon = Tipo,
      @ValorCupon = Valor,
      @MontoMinimo = MontoMinimo,
      @IDCategoriaCupon = IDCategoria
    FROM dbo.Cupon
    WHERE IDCupon = @IDCupon
      AND Activo = 1
      AND @FechaActual BETWEEN VigenteDesde AND VigenteHasta
      AND UsosActuales < LimiteUsosTotal;

    IF @TipoCupon IS NULL OR @Subtotal < @MontoMinimo
    BEGIN
      UPDATE dbo.Carrito SET IDCupon = NULL WHERE IDCarrito = @IDCarrito;
      SET @IDCupon = NULL;
    END
    ELSE
    BEGIN
      SELECT
        @SubtotalElegible = COALESCE(SUM(ROUND(v.Precio * d.Cantidad, 2)), 0)
      FROM dbo.CarritoDetalle AS d
      INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
      INNER JOIN dbo.Producto AS p ON p.IDProducto = v.IDProducto
      WHERE d.IDCarrito = @IDCarrito
        AND (@IDCategoriaCupon IS NULL OR p.IDCategoria = @IDCategoriaCupon);

      IF @IDCategoriaCupon IS NOT NULL AND @SubtotalElegible <= 0
      BEGIN
        UPDATE dbo.Carrito SET IDCupon = NULL WHERE IDCarrito = @IDCarrito;
        SET @IDCupon = NULL;
      END
      ELSE
      BEGIN
        SELECT @Descuento = f.Descuento
        FROM dbo.FU_Cupones_CalculoDescuento(
          @TipoCupon, @ValorCupon, @SubtotalElegible, @Subtotal
        ) AS f;
      END
    END
  END

  SELECT
    ca.IDCarrito,
    ca.IDUsuario,
    CONVERT(NVARCHAR(36), ca.TokenInvitado) AS TokenInvitado,
    ca.Estado,
    ca.IDCupon,
    c.Codigo,
    c.Tipo,
    c.Valor,
    c.MontoMinimo,
    c.IDCategoria AS IDCategoriaCupon,
    cat.Nombre AS CategoriaCupon,
    @Subtotal AS Subtotal,
    @Descuento AS Descuento,
    CAST(@Subtotal - @Descuento AS DECIMAL(18,2)) AS Total
  FROM dbo.Carrito AS ca
  LEFT JOIN dbo.Cupon AS c ON c.IDCupon = ca.IDCupon
  LEFT JOIN dbo.Categoria AS cat ON cat.IDCategoria = c.IDCategoria
  WHERE ca.IDCarrito = @IDCarrito;

  SELECT
    d.IDCarritoDetalle,
    d.IDVariante,
    p.IDProducto,
    p.Nombre AS NombreProducto,
    p.IDCategoria,
    cat.Nombre AS Categoria,
    v.SKU,
    v.Precio,
    d.Cantidad,
    ROUND(v.Precio * d.Cantidad, 2) AS Importe,
    disp.ExistenciaDisponible,
    COALESCE(
      NULLIF(LTRIM(RTRIM(v.UrlImagen)), N''),
      (
        SELECT TOP (1) img.Url
        FROM dbo.ProductoImagen AS img
        WHERE img.IDProducto = p.IDProducto
        ORDER BY img.Orden, img.IDProductoImagen
      )
    ) AS Imagen
  FROM dbo.CarritoDetalle AS d
  INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
  INNER JOIN dbo.Producto AS p ON p.IDProducto = v.IDProducto
  INNER JOIN dbo.Categoria AS cat ON cat.IDCategoria = p.IDCategoria
  CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) AS disp
  WHERE d.IDCarrito = @IDCarrito
  ORDER BY d.IDCarritoDetalle;

  SELECT
    d.IDCarritoDetalle,
    va.IDAtributo,
    a.Nombre AS Atributo,
    va.Valor
  FROM dbo.CarritoDetalle AS d
  INNER JOIN dbo.VarianteAtributo AS va ON va.IDVariante = d.IDVariante
  INNER JOIN dbo.Atributo AS a ON a.IDAtributo = va.IDAtributo
  WHERE d.IDCarrito = @IDCarrito
  ORDER BY d.IDCarritoDetalle, a.Nombre;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_Resolver
   Obtiene o crea el carrito activo del usuario o del invitado.
   Si llegan ambos, fusiona el carrito de invitado en el del usuario.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_Resolver
  @IDUsuario      INT = NULL,
  @TokenInvitado  UNIQUEIDENTIFIER = NULL,
  @CrearSiNoExiste BIT = 1,
  @IDCarrito      INT OUTPUT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF @IDUsuario IS NULL AND @TokenInvitado IS NULL AND @CrearSiNoExiste = 0
    THROW 50150, N'No se encontro el carrito.', 1;

  DECLARE @IDCarritoUsuario INT;
  DECLARE @IDCarritoInvitado INT;

  IF @IDUsuario IS NOT NULL
    SELECT @IDCarritoUsuario = IDCarrito
    FROM dbo.Carrito
    WHERE IDUsuario = @IDUsuario AND Estado = N'ACTIVO';

  IF @TokenInvitado IS NOT NULL
    SELECT @IDCarritoInvitado = IDCarrito
    FROM dbo.Carrito
    WHERE TokenInvitado = @TokenInvitado AND Estado = N'ACTIVO';

  IF @IDUsuario IS NOT NULL AND @IDCarritoInvitado IS NOT NULL
     AND (@IDCarritoUsuario IS NULL OR @IDCarritoUsuario <> @IDCarritoInvitado)
  BEGIN
    EXEC dbo.SP_Reservas_LiberarCarrito @IDCarrito = @IDCarritoInvitado;

    IF @IDCarritoUsuario IS NULL
    BEGIN
      INSERT INTO dbo.Carrito (IDUsuario, Estado)
      VALUES (@IDUsuario, N'ACTIVO');
      SET @IDCarritoUsuario = CONVERT(INT, SCOPE_IDENTITY());
    END

    MERGE dbo.CarritoDetalle AS destino
    USING (
      SELECT IDVariante, Cantidad
      FROM dbo.CarritoDetalle
      WHERE IDCarrito = @IDCarritoInvitado
    ) AS origen
    ON destino.IDCarrito = @IDCarritoUsuario AND destino.IDVariante = origen.IDVariante
    WHEN MATCHED THEN
      UPDATE SET Cantidad = destino.Cantidad + origen.Cantidad
    WHEN NOT MATCHED THEN
      INSERT (IDCarrito, IDVariante, Cantidad)
      VALUES (@IDCarritoUsuario, origen.IDVariante, origen.Cantidad);

    IF NOT EXISTS (SELECT 1 FROM dbo.Carrito WHERE IDCarrito = @IDCarritoUsuario AND IDCupon IS NOT NULL)
    BEGIN
      UPDATE destino
      SET IDCupon = origen.IDCupon
      FROM dbo.Carrito AS destino
      INNER JOIN dbo.Carrito AS origen ON origen.IDCarrito = @IDCarritoInvitado
      WHERE destino.IDCarrito = @IDCarritoUsuario
        AND origen.IDCupon IS NOT NULL;
    END

    DELETE FROM dbo.CarritoDetalle WHERE IDCarrito = @IDCarritoInvitado;
    UPDATE dbo.Carrito
    SET Estado = N'CONVERTIDO', UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarritoInvitado;

    UPDATE d
    SET Cantidad = disp.ExistenciaDisponible
    FROM dbo.CarritoDetalle AS d
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(d.IDVariante) AS disp
    WHERE d.IDCarrito = @IDCarritoUsuario
      AND d.Cantidad > disp.ExistenciaDisponible;

    DELETE FROM dbo.CarritoDetalle
    WHERE IDCarrito = @IDCarritoUsuario AND Cantidad <= 0;

    EXEC dbo.SP_Reservas_SincronizarCarrito @IDCarrito = @IDCarritoUsuario;

    SET @IDCarrito = @IDCarritoUsuario;
    UPDATE dbo.Carrito
    SET UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarrito;
    RETURN;
  END

  SET @IDCarrito = COALESCE(@IDCarritoUsuario, @IDCarritoInvitado);

  IF @IDCarrito IS NULL
  BEGIN
    IF @CrearSiNoExiste = 0
      THROW 50150, N'No se encontro el carrito.', 1;

    IF @IDUsuario IS NOT NULL
    BEGIN
      INSERT INTO dbo.Carrito (IDUsuario, Estado)
      VALUES (@IDUsuario, N'ACTIVO');
    END
    ELSE
    BEGIN
      IF @TokenInvitado IS NULL
        SET @TokenInvitado = NEWID();

      INSERT INTO dbo.Carrito (TokenInvitado, Estado)
      VALUES (@TokenInvitado, N'ACTIVO');
    END

    SET @IDCarrito = CONVERT(INT, SCOPE_IDENTITY());
  END
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_Obtener
   Consulta el carrito activo; lo crea si aun no existe.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_Obtener
  @IDUsuario     INT = NULL,
  @TokenInvitado UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @IDCarrito INT;

  BEGIN TRY
    BEGIN TRANSACTION;
    EXEC dbo.SP_Carrito_Resolver
      @IDUsuario = @IDUsuario,
      @TokenInvitado = @TokenInvitado,
      @CrearSiNoExiste = 1,
      @IDCarrito = @IDCarrito OUTPUT;
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  EXEC dbo.SP_Carrito_Devolver @IDCarrito = @IDCarrito;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_AgregarItem
   Suma una cantidad de variante. No permite superar la existencia
   disponible (fisica menos reservas activas).
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_AgregarItem
  @IDUsuario     INT = NULL,
  @TokenInvitado UNIQUEIDENTIFIER = NULL,
  @IDVariante    INT,
  @Cantidad      INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF @Cantidad IS NULL OR @Cantidad <= 0
    THROW 50154, N'La cantidad debe ser mayor a 0.', 1;

  DECLARE @IDCarrito INT;
  DECLARE @Activa BIT;
  DECLARE @ProductoActivo BIT;

  BEGIN TRY
    BEGIN TRANSACTION;

    EXEC dbo.SP_Carrito_Resolver
      @IDUsuario = @IDUsuario,
      @TokenInvitado = @TokenInvitado,
      @CrearSiNoExiste = 1,
      @IDCarrito = @IDCarrito OUTPUT;

    SELECT
      @Activa = v.Activa,
      @ProductoActivo = p.Activo
    FROM dbo.Variante AS v WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN dbo.Producto AS p ON p.IDProducto = v.IDProducto
    WHERE v.IDVariante = @IDVariante;

    IF @Activa IS NULL
      THROW 50132, N'La variante no existe.', 1;

    IF @Activa = 0 OR @ProductoActivo = 0
      THROW 50153, N'La variante no esta disponible para la venta.', 1;

    MERGE dbo.CarritoDetalle AS destino
    USING (SELECT @IDCarrito AS IDCarrito, @IDVariante AS IDVariante) AS origen
    ON destino.IDCarrito = origen.IDCarrito AND destino.IDVariante = origen.IDVariante
    WHEN MATCHED THEN
      UPDATE SET Cantidad = destino.Cantidad + @Cantidad
    WHEN NOT MATCHED THEN
      INSERT (IDCarrito, IDVariante, Cantidad)
      VALUES (origen.IDCarrito, origen.IDVariante, @Cantidad);

    EXEC dbo.SP_Reservas_SincronizarCarrito @IDCarrito = @IDCarrito;

    UPDATE dbo.Carrito
    SET UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarrito;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  EXEC dbo.SP_Carrito_Devolver @IDCarrito = @IDCarrito;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_ActualizarItem
   Reemplaza la cantidad de una linea del carrito propio.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_ActualizarItem
  @IDUsuario         INT = NULL,
  @TokenInvitado     UNIQUEIDENTIFIER = NULL,
  @IDCarritoDetalle  INT,
  @Cantidad          INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF @Cantidad IS NULL OR @Cantidad <= 0
    THROW 50154, N'La cantidad debe ser mayor a 0.', 1;

  DECLARE @IDCarrito INT;
  DECLARE @IDVariante INT;

  BEGIN TRY
    BEGIN TRANSACTION;

    EXEC dbo.SP_Carrito_Resolver
      @IDUsuario = @IDUsuario,
      @TokenInvitado = @TokenInvitado,
      @CrearSiNoExiste = 0,
      @IDCarrito = @IDCarrito OUTPUT;

    SELECT @IDVariante = IDVariante
    FROM dbo.CarritoDetalle WITH (UPDLOCK, HOLDLOCK)
    WHERE IDCarritoDetalle = @IDCarritoDetalle AND IDCarrito = @IDCarrito;

    IF @IDVariante IS NULL
      THROW 50151, N'No se encontro el producto en el carrito.', 1;

    UPDATE dbo.CarritoDetalle
    SET Cantidad = @Cantidad
    WHERE IDCarritoDetalle = @IDCarritoDetalle AND IDCarrito = @IDCarrito;

    EXEC dbo.SP_Reservas_SincronizarCarrito @IDCarrito = @IDCarrito;

    UPDATE dbo.Carrito
    SET UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarrito;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  EXEC dbo.SP_Carrito_Devolver @IDCarrito = @IDCarrito;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_EliminarItem
   Quita una linea del carrito propio.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_EliminarItem
  @IDUsuario        INT = NULL,
  @TokenInvitado    UNIQUEIDENTIFIER = NULL,
  @IDCarritoDetalle INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @IDCarrito INT;

  BEGIN TRY
    BEGIN TRANSACTION;

    EXEC dbo.SP_Carrito_Resolver
      @IDUsuario = @IDUsuario,
      @TokenInvitado = @TokenInvitado,
      @CrearSiNoExiste = 0,
      @IDCarrito = @IDCarrito OUTPUT;

    DELETE FROM dbo.CarritoDetalle
    WHERE IDCarritoDetalle = @IDCarritoDetalle AND IDCarrito = @IDCarrito;

    IF @@ROWCOUNT = 0
      THROW 50151, N'No se encontro el producto en el carrito.', 1;

    EXEC dbo.SP_Reservas_SincronizarCarrito @IDCarrito = @IDCarrito;

    UPDATE dbo.Carrito
    SET UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarrito;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  EXEC dbo.SP_Carrito_Devolver @IDCarrito = @IDCarrito;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_AplicarCupon
   Asocia un unico cupon al carrito luego de validar vigencia,
   minimo de compra y aplicacion por categoria.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_AplicarCupon
  @IDUsuario     INT = NULL,
  @TokenInvitado UNIQUEIDENTIFIER = NULL,
  @Codigo        NVARCHAR(30)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @IDCarrito INT;
  DECLARE @Subtotal DECIMAL(18,2);
  DECLARE @SubtotalElegible DECIMAL(18,2);
  DECLARE @IDCategoriaCupon INT;

  BEGIN TRY
    BEGIN TRANSACTION;

    EXEC dbo.SP_Carrito_Resolver
      @IDUsuario = @IDUsuario,
      @TokenInvitado = @TokenInvitado,
      @CrearSiNoExiste = 1,
      @IDCarrito = @IDCarrito OUTPUT;

    IF EXISTS (
      SELECT 1
      FROM dbo.Carrito
      WHERE IDCarrito = @IDCarrito
        AND IDCupon IS NOT NULL
        AND IDCupon <> (
          SELECT IDCupon
          FROM dbo.Cupon
          WHERE Codigo = UPPER(LTRIM(RTRIM(@Codigo)))
        )
    )
      THROW 50148, N'El carrito ya tiene un cupon aplicado.', 1;

    SELECT
      @Subtotal = COALESCE(SUM(ROUND(v.Precio * d.Cantidad, 2)), 0)
    FROM dbo.CarritoDetalle AS d
    INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
    WHERE d.IDCarrito = @IDCarrito;

    DECLARE @IDCupon INT;
    SELECT @IDCupon = IDCupon, @IDCategoriaCupon = IDCategoria
    FROM dbo.Cupon
    WHERE Codigo = UPPER(LTRIM(RTRIM(@Codigo)));

    SELECT
      @SubtotalElegible = COALESCE(SUM(ROUND(v.Precio * d.Cantidad, 2)), 0)
    FROM dbo.CarritoDetalle AS d
    INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
    INNER JOIN dbo.Producto AS p ON p.IDProducto = v.IDProducto
    WHERE d.IDCarrito = @IDCarrito
      AND (@IDCategoriaCupon IS NULL OR p.IDCategoria = @IDCategoriaCupon);

    EXEC dbo.SP_Cupones_Validar
      @Codigo = @Codigo,
      @Subtotal = @Subtotal,
      @IDUsuario = @IDUsuario,
      @SubtotalElegible = @SubtotalElegible,
      @DevolverResultado = 0;

    UPDATE dbo.Carrito
    SET IDCupon = @IDCupon, UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarrito;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  EXEC dbo.SP_Carrito_Devolver @IDCarrito = @IDCarrito;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_QuitarCupon
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_QuitarCupon
  @IDUsuario     INT = NULL,
  @TokenInvitado UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @IDCarrito INT;

  BEGIN TRY
    BEGIN TRANSACTION;

    EXEC dbo.SP_Carrito_Resolver
      @IDUsuario = @IDUsuario,
      @TokenInvitado = @TokenInvitado,
      @CrearSiNoExiste = 0,
      @IDCarrito = @IDCarrito OUTPUT;

    UPDATE dbo.Carrito
    SET IDCupon = NULL, UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarrito;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  EXEC dbo.SP_Carrito_Devolver @IDCarrito = @IDCarrito;
END;
GO

/* ------------------------------------------------------------
   SP_Carrito_Vaciar
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Carrito_Vaciar
  @IDUsuario     INT = NULL,
  @TokenInvitado UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  DECLARE @IDCarrito INT;

  BEGIN TRY
    BEGIN TRANSACTION;

    EXEC dbo.SP_Carrito_Resolver
      @IDUsuario = @IDUsuario,
      @TokenInvitado = @TokenInvitado,
      @CrearSiNoExiste = 0,
      @IDCarrito = @IDCarrito OUTPUT;

    DELETE FROM dbo.CarritoDetalle WHERE IDCarrito = @IDCarrito;
    EXEC dbo.SP_Reservas_SincronizarCarrito @IDCarrito = @IDCarrito;

    UPDATE dbo.Carrito
    SET IDCupon = NULL, UltimaActividad = SYSUTCDATETIME()
    WHERE IDCarrito = @IDCarrito;

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  EXEC dbo.SP_Carrito_Devolver @IDCarrito = @IDCarrito;
END;
GO
