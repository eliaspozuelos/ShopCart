/* ============================================================
   112_SP_Devoluciones.sql
   Devoluciones parciales o totales con entrada al inventario.
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
  IF NOT EXISTS (SELECT 1 FROM dbo.Pedido p JOIN dbo.EstadoPedido e ON e.IDEstadoPedido=p.IDEstadoPedido
    WHERE p.IDPedido=@IDPedido AND e.Nombre IN (N'ENTREGADO',N'DEVUELTO'))
    THROW 50210,N'El pedido debe estar entregado para devolverlo.',1;
  IF NULLIF(LTRIM(RTRIM(@Motivo)),N'') IS NULL THROW 50211,N'El motivo de devolucion es requerido.',1;
  DECLARE @IDDevolucion INT,@Monto DECIMAL(18,2)=0,@IDTipo INT=(SELECT IDTipoMovimiento FROM dbo.TipoMovimiento WHERE Nombre=N'DEVOLUCION');
  INSERT dbo.Devolucion(IDPedido,IDUsuario,Motivo,MontoReintegrado) VALUES(@IDPedido,@IDUsuario,@Motivo,0);
  SET @IDDevolucion=CONVERT(INT,SCOPE_IDENTITY());
  INSERT dbo.DevolucionDetalle(IDDevolucion,IDPedido,IDPedidoDetalle,Cantidad,Monto)
  SELECT @IDDevolucion,@IDPedido,dd.IDPedidoDetalle,TRY_CONVERT(INT,JSON_VALUE(j.value,'$.quantity')),
    TRY_CONVERT(DECIMAL(18,2),JSON_VALUE(j.value,'$.amount'))
  FROM OPENJSON(@Detalle) j JOIN dbo.PedidoDetalle dd ON dd.IDPedidoDetalle=TRY_CONVERT(INT,JSON_VALUE(j.value,'$.orderDetailId'))
  WHERE dd.IDPedido=@IDPedido;
  IF NOT EXISTS (SELECT 1 FROM dbo.DevolucionDetalle WHERE IDDevolucion=@IDDevolucion) THROW 50212,N'El detalle de devolucion no es valido.',1;
  IF EXISTS (SELECT 1 FROM dbo.DevolucionDetalle x JOIN dbo.PedidoDetalle d ON d.IDPedidoDetalle=x.IDPedidoDetalle
    WHERE x.IDDevolucion=@IDDevolucion AND (x.Cantidad<=0 OR x.Cantidad>d.Cantidad-d.CantidadDevuelta))
    THROW 50213,N'La cantidad devuelta supera la cantidad disponible.',1;
  SELECT @Monto=SUM(Monto) FROM dbo.DevolucionDetalle WHERE IDDevolucion=@IDDevolucion;
  UPDATE d SET CantidadDevuelta=d.CantidadDevuelta+x.Cantidad
  FROM dbo.PedidoDetalle d JOIN dbo.DevolucionDetalle x ON x.IDPedidoDetalle=d.IDPedidoDetalle WHERE x.IDDevolucion=@IDDevolucion;
  UPDATE v SET ExistenciaFisica=v.ExistenciaFisica+x.Cantidad
  FROM dbo.Variante v JOIN dbo.PedidoDetalle d ON d.IDVariante=v.IDVariante
  JOIN dbo.DevolucionDetalle x ON x.IDPedidoDetalle=d.IDPedidoDetalle WHERE x.IDDevolucion=@IDDevolucion;
  INSERT dbo.MovimientoInventario(IDVariante,IDTipoMovimiento,Cantidad,ExistenciaResultante,IDUsuario,Motivo,IDPedido)
  SELECT d.IDVariante,@IDTipo,x.Cantidad,v.ExistenciaFisica,@IDUsuario,@Motivo,@IDPedido
  FROM dbo.DevolucionDetalle x JOIN dbo.PedidoDetalle d ON d.IDPedidoDetalle=x.IDPedidoDetalle JOIN dbo.Variante v ON v.IDVariante=d.IDVariante
  WHERE x.IDDevolucion=@IDDevolucion;
  UPDATE dbo.Devolucion SET MontoReintegrado=@Monto WHERE IDDevolucion=@IDDevolucion;
  UPDATE pa
  SET MontoReembolsado = pa.MontoReembolsado + @Monto,
      Estado = CASE WHEN pa.MontoReembolsado + @Monto >= pa.Monto THEN N'REEMBOLSADO' ELSE N'REEMBOLSO_PARCIAL' END
  FROM dbo.Pago pa WHERE pa.IDPedido=@IDPedido;
  DECLARE @IDEstadoAnterior INT = (SELECT IDEstadoPedido FROM dbo.Pedido WHERE IDPedido=@IDPedido);
  DECLARE @IDEstadoDevuelto INT = (SELECT IDEstadoPedido FROM dbo.EstadoPedido WHERE Nombre=N'DEVUELTO');
  IF @IDEstadoDevuelto IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM dbo.PedidoDetalle WHERE IDPedido=@IDPedido AND CantidadDevuelta<Cantidad)
    AND @IDEstadoAnterior <> @IDEstadoDevuelto
  BEGIN
    UPDATE dbo.Pedido SET IDEstadoPedido=@IDEstadoDevuelto WHERE IDPedido=@IDPedido;
    INSERT dbo.PedidoHistorialEstado (IDPedido, IDEstadoAnterior, IDEstadoNuevo, IDUsuario)
    VALUES (@IDPedido, @IDEstadoAnterior, @IDEstadoDevuelto, @IDUsuario);
    INSERT dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    SELECT @IDUsuario, N'PEDIDOS', N'Pedido', @IDPedido, N'CAMBIO_ESTADO',
      (SELECT Nombre FROM dbo.EstadoPedido WHERE IDEstadoPedido=@IDEstadoAnterior FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
      (SELECT Nombre FROM dbo.EstadoPedido WHERE IDEstadoPedido=@IDEstadoDevuelto FOR JSON PATH, WITHOUT_ARRAY_WRAPPER);
  END
  INSERT dbo.Bitacora(IDUsuario,Modulo,Entidad,IDEntidad,Accion,ValorNuevo)
  VALUES(@IDUsuario,N'PEDIDOS',N'Devolucion',@IDDevolucion,N'CREAR',
    (SELECT @IDPedido AS pedido,@Monto AS monto,@Motivo AS motivo FOR JSON PATH,WITHOUT_ARRAY_WRAPPER));
  COMMIT;
  SELECT IDDevolucion,IDPedido,IDUsuario,Motivo,MontoReintegrado,Fecha FROM dbo.Devolucion WHERE IDDevolucion=@IDDevolucion;
  SELECT IDDevolucionDetalle,IDPedidoDetalle,Cantidad,Monto FROM dbo.DevolucionDetalle WHERE IDDevolucion=@IDDevolucion;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

