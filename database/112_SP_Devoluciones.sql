/* ============================================================
   112_SP_Devoluciones.sql
   El cliente solicita la devolucion. El inventario vuelve
   cuando un Operador o Administrador la aprueba.
   ============================================================ */
USE ShopCart;
GO
IF NOT EXISTS (SELECT 1 FROM dbo.TipoMovimiento WHERE Nombre=N'DEVOLUCION')
  INSERT dbo.TipoMovimiento (Nombre,Signo) VALUES (N'DEVOLUCION',1);
GO

CREATE OR ALTER PROCEDURE dbo.SP_Devoluciones_Crear
  @IDPedido INT, @IDUsuario INT, @Motivo NVARCHAR(300), @Detalle NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON; SET XACT_ABORT ON;
  BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @Rol NVARCHAR(30);
  DECLARE @Dueno INT;
  DECLARE @EstadoPedido NVARCHAR(30);
  SELECT @Rol = r.Nombre
  FROM dbo.Usuario AS u
  INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
  WHERE u.IDUsuario = @IDUsuario AND u.Activo = 1;

  SELECT @Dueno = p.IDUsuario, @EstadoPedido = e.Nombre
  FROM dbo.Pedido AS p WITH (UPDLOCK, HOLDLOCK)
  INNER JOIN dbo.EstadoPedido AS e ON e.IDEstadoPedido = p.IDEstadoPedido
  WHERE p.IDPedido = @IDPedido;

  IF @Dueno IS NULL OR @Rol IS NULL OR (@Rol = N'Cliente' AND @Dueno <> @IDUsuario)
    THROW 50220, N'No se encontró el pedido.', 1;
  IF @Rol NOT IN (N'Cliente', N'Operador', N'Administrador')
    THROW 50121, N'No tienes permiso para solicitar la devolucion.', 1;
  IF @EstadoPedido NOT IN (N'ENTREGADO', N'DEVUELTO')
    THROW 50210, N'El pedido debe estar entregado para devolverlo.', 1;
  IF NULLIF(LTRIM(RTRIM(@Motivo)), N'') IS NULL
    THROW 50211, N'El motivo de devolucion es requerido.', 1;

  DECLARE @Bloqueo INT;
  SELECT @Bloqueo = COUNT(*)
  FROM dbo.Devolucion WITH (UPDLOCK, HOLDLOCK)
  WHERE IDPedido = @IDPedido;

  DECLARE @IDDevolucion INT;
  INSERT dbo.Devolucion (IDPedido, IDUsuario, Motivo, MontoReintegrado, Estado)
  VALUES (@IDPedido, @IDUsuario, LTRIM(RTRIM(@Motivo)), 0, N'SOLICITADA');
  SET @IDDevolucion = CONVERT(INT, SCOPE_IDENTITY());

  INSERT dbo.DevolucionDetalle (IDDevolucion, IDPedido, IDPedidoDetalle, Cantidad, Monto)
  SELECT @IDDevolucion, @IDPedido, dd.IDPedidoDetalle,
    TRY_CONVERT(INT, JSON_VALUE(j.value, '$.quantity')),
    TRY_CONVERT(DECIMAL(18,2), JSON_VALUE(j.value, '$.amount'))
  FROM OPENJSON(@Detalle) AS j
  INNER JOIN dbo.PedidoDetalle AS dd WITH (UPDLOCK, HOLDLOCK)
    ON dd.IDPedidoDetalle = TRY_CONVERT(INT, JSON_VALUE(j.value, '$.orderDetailId'))
   AND dd.IDPedido = @IDPedido;

  IF NOT EXISTS (SELECT 1 FROM dbo.DevolucionDetalle WHERE IDDevolucion = @IDDevolucion)
    THROW 50212, N'El detalle de devolucion no es valido.', 1;

  IF EXISTS (
    SELECT 1
    FROM dbo.DevolucionDetalle AS x
    INNER JOIN dbo.PedidoDetalle AS d ON d.IDPedidoDetalle = x.IDPedidoDetalle
    WHERE x.IDDevolucion = @IDDevolucion
      AND (
        x.Cantidad <= 0
        OR x.Cantidad > d.Cantidad - d.CantidadDevuelta - COALESCE((
          SELECT SUM(o.Cantidad)
          FROM dbo.DevolucionDetalle AS o
          INNER JOIN dbo.Devolucion AS dv ON dv.IDDevolucion = o.IDDevolucion
          WHERE o.IDPedidoDetalle = d.IDPedidoDetalle
            AND dv.Estado = N'SOLICITADA'
            AND dv.IDDevolucion <> @IDDevolucion
        ), 0)
      )
  )
    THROW 50213, N'La cantidad devuelta supera la cantidad disponible.', 1;

  INSERT dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
  VALUES (
    @IDUsuario, N'PEDIDOS', N'Devolucion', @IDDevolucion, N'CREAR',
    (SELECT @IDPedido AS pedido, @Motivo AS motivo, N'SOLICITADA' AS estado
     FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
  );

  COMMIT TRANSACTION;
  SELECT IDDevolucion, IDPedido, IDUsuario, Motivo, MontoReintegrado, Estado, Fecha, FechaResolucion
  FROM dbo.Devolucion WHERE IDDevolucion = @IDDevolucion;
  SELECT IDDevolucionDetalle, IDPedidoDetalle, Cantidad, Monto
  FROM dbo.DevolucionDetalle WHERE IDDevolucion = @IDDevolucion;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Devoluciones_Resolver
  @IDDevolucion INT,
  @IDPedido INT,
  @IDUsuarioActor INT,
  @Decision NVARCHAR(20)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  BEGIN TRY
  BEGIN TRANSACTION;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1
      AND r.Nombre IN (N'Operador', N'Administrador')
  )
    THROW 50121, N'Solo un Operador o Administrador puede resolver una devolucion.', 1;

  IF @Decision NOT IN (N'APROBAR', N'RECHAZAR')
    THROW 50212, N'El detalle de devolucion no es valido.', 1;

  DECLARE @Estado NVARCHAR(20);
  DECLARE @Motivo NVARCHAR(300);
  SELECT @Estado = Estado, @Motivo = Motivo
  FROM dbo.Devolucion WITH (UPDLOCK, HOLDLOCK)
  WHERE IDDevolucion = @IDDevolucion AND IDPedido = @IDPedido;

  IF @Estado IS NULL
    THROW 50237, N'No se encontro la solicitud de devolucion.', 1;
  IF @Estado <> N'SOLICITADA'
    THROW 50233, N'La solicitud de devolucion ya fue resuelta.', 1;

  IF @Decision = N'RECHAZAR'
  BEGIN
    UPDATE dbo.Devolucion
    SET Estado = N'RECHAZADA',
        IDUsuarioResolucion = @IDUsuarioActor,
        FechaResolucion = SYSUTCDATETIME()
    WHERE IDDevolucion = @IDDevolucion;

    INSERT dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (
      @IDUsuarioActor, N'PEDIDOS', N'Devolucion', @IDDevolucion, N'MODIFICAR',
      (SELECT N'SOLICITADA' AS estado FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
      (SELECT N'RECHAZADA' AS estado FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    );
  END
  ELSE
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM dbo.Pedido AS p
      INNER JOIN dbo.EstadoPedido AS e ON e.IDEstadoPedido = p.IDEstadoPedido
      WHERE p.IDPedido = @IDPedido AND e.Nombre IN (N'ENTREGADO', N'DEVUELTO')
    )
      THROW 50210, N'El pedido debe estar entregado para devolverlo.', 1;

    IF EXISTS (
      SELECT 1
      FROM dbo.DevolucionDetalle AS x
      INNER JOIN dbo.PedidoDetalle AS d WITH (UPDLOCK, HOLDLOCK) ON d.IDPedidoDetalle = x.IDPedidoDetalle
      WHERE x.IDDevolucion = @IDDevolucion
        AND x.Cantidad > d.Cantidad - d.CantidadDevuelta
    )
      THROW 50213, N'La cantidad devuelta supera la cantidad disponible.', 1;

    DECLARE @Monto DECIMAL(18,2) = 0;
    DECLARE @IDTipo INT = (SELECT IDTipoMovimiento FROM dbo.TipoMovimiento WHERE Nombre = N'DEVOLUCION');
    IF @IDTipo IS NULL
      THROW 50138, N'Faltan tipos de movimiento de inventario en la semilla.', 1;

    SELECT @Monto = SUM(Monto) FROM dbo.DevolucionDetalle WHERE IDDevolucion = @IDDevolucion;

    UPDATE d
    SET CantidadDevuelta = d.CantidadDevuelta + x.Cantidad
    FROM dbo.PedidoDetalle AS d
    INNER JOIN dbo.DevolucionDetalle AS x ON x.IDPedidoDetalle = d.IDPedidoDetalle
    WHERE x.IDDevolucion = @IDDevolucion;

    UPDATE v
    SET ExistenciaFisica = v.ExistenciaFisica + x.Cantidad
    FROM dbo.Variante AS v
    INNER JOIN dbo.PedidoDetalle AS d ON d.IDVariante = v.IDVariante
    INNER JOIN dbo.DevolucionDetalle AS x ON x.IDPedidoDetalle = d.IDPedidoDetalle
    WHERE x.IDDevolucion = @IDDevolucion;

    INSERT dbo.MovimientoInventario
      (IDVariante, IDTipoMovimiento, Cantidad, ExistenciaResultante, IDUsuario, Motivo, IDPedido)
    SELECT d.IDVariante, @IDTipo, x.Cantidad, v.ExistenciaFisica, @IDUsuarioActor, @Motivo, @IDPedido
    FROM dbo.DevolucionDetalle AS x
    INNER JOIN dbo.PedidoDetalle AS d ON d.IDPedidoDetalle = x.IDPedidoDetalle
    INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
    WHERE x.IDDevolucion = @IDDevolucion;

    UPDATE pa
    SET MontoReembolsado = pa.MontoReembolsado + @Monto,
        Estado = CASE WHEN pa.MontoReembolsado + @Monto >= pa.Monto THEN N'REEMBOLSADO' ELSE N'REEMBOLSO_PARCIAL' END
    FROM dbo.Pago AS pa
    WHERE pa.IDPedido = @IDPedido;

    DECLARE @IDEstadoAnterior INT = (SELECT IDEstadoPedido FROM dbo.Pedido WHERE IDPedido = @IDPedido);
    DECLARE @IDEstadoDevuelto INT = (SELECT IDEstadoPedido FROM dbo.EstadoPedido WHERE Nombre = N'DEVUELTO');
    IF @IDEstadoDevuelto IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM dbo.PedidoDetalle WHERE IDPedido = @IDPedido AND CantidadDevuelta < Cantidad)
      AND @IDEstadoAnterior <> @IDEstadoDevuelto
    BEGIN
      UPDATE dbo.Pedido SET IDEstadoPedido = @IDEstadoDevuelto WHERE IDPedido = @IDPedido;
      INSERT dbo.PedidoHistorialEstado (IDPedido, IDEstadoAnterior, IDEstadoNuevo, IDUsuario)
      VALUES (@IDPedido, @IDEstadoAnterior, @IDEstadoDevuelto, @IDUsuarioActor);
      INSERT dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
      SELECT @IDUsuarioActor, N'PEDIDOS', N'Pedido', @IDPedido, N'CAMBIO_ESTADO',
        (SELECT Nombre FROM dbo.EstadoPedido WHERE IDEstadoPedido = @IDEstadoAnterior FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        (SELECT Nombre FROM dbo.EstadoPedido WHERE IDEstadoPedido = @IDEstadoDevuelto FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
    END

    UPDATE dbo.Devolucion
    SET Estado = N'APROBADA',
        MontoReintegrado = @Monto,
        IDUsuarioResolucion = @IDUsuarioActor,
        FechaResolucion = SYSUTCDATETIME()
    WHERE IDDevolucion = @IDDevolucion;

    INSERT dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (
      @IDUsuarioActor, N'PEDIDOS', N'Devolucion', @IDDevolucion, N'MODIFICAR',
      (SELECT N'SOLICITADA' AS estado FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
      (SELECT N'APROBADA' AS estado, @Monto AS monto FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    );
  END

  COMMIT TRANSACTION;
  SELECT IDDevolucion, IDPedido, IDUsuario, Motivo, MontoReintegrado, Estado, Fecha, FechaResolucion
  FROM dbo.Devolucion WHERE IDDevolucion = @IDDevolucion;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Devoluciones_Listar
  @IDPedido INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT d.IDDevolucion, d.IDPedido, d.IDUsuario, u.Nombre AS NombreUsuario,
         d.Motivo, d.MontoReintegrado, d.Estado, d.Fecha, d.FechaResolucion
  FROM dbo.Devolucion AS d
  INNER JOIN dbo.Usuario AS u ON u.IDUsuario = d.IDUsuario
  WHERE d.IDPedido = @IDPedido
  ORDER BY d.Fecha DESC, d.IDDevolucion DESC;

  SELECT x.IDDevolucionDetalle, x.IDDevolucion, x.IDPedidoDetalle, x.Cantidad, x.Monto,
         dd.NombreSnapshot, dd.SKUSnapshot
  FROM dbo.DevolucionDetalle AS x
  INNER JOIN dbo.Devolucion AS d ON d.IDDevolucion = x.IDDevolucion
  INNER JOIN dbo.PedidoDetalle AS dd ON dd.IDPedidoDetalle = x.IDPedidoDetalle
  WHERE d.IDPedido = @IDPedido;
END;
GO
