/* ============================================================
   114_SP_Pedidos_Estado.sql
   Cambio de estado de pedidos.
   El cliente solo puede cancelar el suyo en CONFIRMADO, antes de preparar.
   ============================================================ */
USE ShopCart;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Pedidos_CambiarEstado
  @IDPedido INT,
  @IDUsuarioActor INT,
  @NombreEstadoDestino NVARCHAR(30)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  BEGIN TRY
    DECLARE @IDEstadoDestino INT =
      (SELECT IDEstadoPedido FROM dbo.EstadoPedido WHERE Nombre = @NombreEstadoDestino);

    IF @IDEstadoDestino IS NULL
      THROW 50221, N'El estado de destino no existe.', 1;

    DECLARE @Rol NVARCHAR(30);
    SELECT @Rol = r.Nombre
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor
      AND u.Activo = 1;

    IF @Rol IS NULL
      THROW 50223, N'Solo un Operador o Administrador puede cambiar el estado del pedido.', 1;

    BEGIN TRANSACTION;

    DECLARE @IDEstadoOrigen INT;
    DECLARE @Dueno INT;
    DECLARE @NombreOrigen NVARCHAR(30);
    SELECT @IDEstadoOrigen = p.IDEstadoPedido, @Dueno = p.IDUsuario, @NombreOrigen = e.Nombre
    FROM dbo.Pedido AS p WITH (UPDLOCK, HOLDLOCK)
    INNER JOIN dbo.EstadoPedido AS e ON e.IDEstadoPedido = p.IDEstadoPedido
    WHERE p.IDPedido = @IDPedido;

    IF @IDEstadoOrigen IS NULL
      THROW 50220, N'No se encontró el pedido.', 1;

    IF @Rol = N'Cliente'
    BEGIN
      IF @Dueno <> @IDUsuarioActor OR @NombreEstadoDestino <> N'CANCELADO'
        OR @NombreOrigen <> N'CONFIRMADO'
        THROW 50232, N'Solo puedes cancelar tu propio pedido mientras está confirmado, antes de la preparación.', 1;
    END
    ELSE IF @Rol NOT IN (N'Operador', N'Administrador')
      THROW 50223, N'Solo un Operador o Administrador puede cambiar el estado del pedido.', 1;

    IF EXISTS (
      SELECT 1
      FROM dbo.EstadoPedido
      WHERE IDEstadoPedido = @IDEstadoOrigen AND EsFinal = 1
    )
      THROW 50224, N'El pedido ya se encuentra en un estado final.', 1;

    IF NOT EXISTS (
      SELECT 1
      FROM dbo.TransicionEstadoPedido
      WHERE IDEstadoOrigen = @IDEstadoOrigen
        AND IDEstadoDestino = @IDEstadoDestino
    )
      THROW 50222, N'La transición de estado del pedido no está permitida.', 1;

    UPDATE dbo.Pedido
    SET IDEstadoPedido = @IDEstadoDestino
    WHERE IDPedido = @IDPedido;

    IF @NombreEstadoDestino = N'CANCELADO'
    BEGIN
      DECLARE @IDEntrada INT =
        (SELECT IDTipoMovimiento FROM dbo.TipoMovimiento WHERE Nombre = N'ENTRADA' AND Signo = 1);

      IF @IDEntrada IS NULL
        THROW 50138, N'Faltan tipos de movimiento de inventario en la semilla.', 1;

      UPDATE v
      SET ExistenciaFisica = v.ExistenciaFisica + (d.Cantidad - d.CantidadDevuelta)
      FROM dbo.Variante AS v WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.PedidoDetalle AS d ON d.IDVariante = v.IDVariante
      WHERE d.IDPedido = @IDPedido
        AND (d.Cantidad - d.CantidadDevuelta) > 0;

      INSERT dbo.MovimientoInventario
        (IDVariante, IDTipoMovimiento, Cantidad, ExistenciaResultante, IDUsuario, Motivo, IDPedido)
      SELECT
        d.IDVariante,
        @IDEntrada,
        d.Cantidad - d.CantidadDevuelta,
        v.ExistenciaFisica,
        @IDUsuarioActor,
        N'Cancelacion de pedido',
        @IDPedido
      FROM dbo.PedidoDetalle AS d
      INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
      WHERE d.IDPedido = @IDPedido
        AND (d.Cantidad - d.CantidadDevuelta) > 0;

      DECLARE @CodigoCupon NVARCHAR(30) =
        (SELECT CodigoCuponSnapshot FROM dbo.Pedido WHERE IDPedido = @IDPedido);

      IF @CodigoCupon IS NOT NULL
      BEGIN
        DECLARE @IDCupon INT;
        SELECT @IDCupon = IDCupon
        FROM dbo.Cupon WITH (UPDLOCK, HOLDLOCK)
        WHERE Codigo = @CodigoCupon;

        DELETE FROM dbo.CuponUso WHERE IDPedido = @IDPedido;

        IF @IDCupon IS NOT NULL
          UPDATE dbo.Cupon
          SET UsosActuales = CASE WHEN UsosActuales > 0 THEN UsosActuales - 1 ELSE 0 END
          WHERE IDCupon = @IDCupon;
      END
    END

    INSERT dbo.PedidoHistorialEstado
      (IDPedido, IDEstadoAnterior, IDEstadoNuevo, IDUsuario)
    VALUES
      (@IDPedido, @IDEstadoOrigen, @IDEstadoDestino, @IDUsuarioActor);

    INSERT dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    SELECT @IDUsuarioActor, N'PEDIDOS', N'Pedido', @IDPedido, N'CAMBIO_ESTADO',
      (SELECT Nombre FROM dbo.EstadoPedido WHERE IDEstadoPedido = @IDEstadoOrigen
       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
      (SELECT Nombre FROM dbo.EstadoPedido WHERE IDEstadoPedido = @IDEstadoDestino
       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);

    COMMIT TRANSACTION;

    EXEC dbo.SP_Pedidos_Obtener @IDPedido = @IDPedido, @IDUsuario = NULL;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO
