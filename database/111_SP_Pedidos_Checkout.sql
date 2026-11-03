/* ============================================================
   111_SP_Pedidos_Checkout.sql
   Checkout transaccional, métodos de pago locales y consulta de pedidos.
   ============================================================ */
USE ShopCart;
GO

SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Pedidos_Checkout
  @IDUsuario INT,
  @IDDireccion INT,
  @MetodoPago NVARCHAR(30),
  @LlaveIdempotencia UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  IF @MetodoPago NOT IN (N'TARJETA', N'CONTRA_ENTREGA')
    THROW 50225, N'El método de pago debe ser TARJETA o CONTRA_ENTREGA.', 1;

  EXEC dbo.SP_Reservas_LiberarVencidas;

  BEGIN TRANSACTION;

  DECLARE @IDCarrito INT, @IDCupon INT, @Codigo NVARCHAR(30), @Descuento DECIMAL(18,2) = 0;
  SELECT @IDCarrito = IDCarrito, @IDCupon = IDCupon
  FROM dbo.Carrito WITH (UPDLOCK, HOLDLOCK)
  WHERE IDUsuario = @IDUsuario AND Estado = N'ACTIVO';

  DECLARE @Existente INT;
  SELECT @Existente = IDPedido FROM dbo.Pedido WITH (UPDLOCK, HOLDLOCK) /* Bloquea la fila para evitar duplicados */
  WHERE IDUsuario = @IDUsuario AND @LlaveIdempotencia IS NOT NULL
    AND LlaveIdempotencia = @LlaveIdempotencia;
  IF @Existente IS NOT NULL
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM dbo.Pedido
      WHERE IDPedido = @Existente
        AND IDCarritoIdempotencia IS NOT NULL
        AND @IDCarrito IS NOT NULL
        AND IDCarritoIdempotencia <> @IDCarrito
    )
      THROW 50230, N'La llave de idempotencia ya fue utilizada con otro carrito.', 1;
    COMMIT;
    EXEC dbo.SP_Pedidos_Obtener @IDPedido = @Existente, @IDUsuario = @IDUsuario;
    RETURN;
  END;

  IF @IDCarrito IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.CarritoDetalle WHERE IDCarrito = @IDCarrito)
    THROW 50200, N'El carrito esta vacio.', 1;

  IF EXISTS (
    SELECT 1
    FROM dbo.CarritoDetalle AS d
    INNER JOIN dbo.Variante AS v ON v.IDVariante = d.IDVariante
    INNER JOIN dbo.Producto AS p ON p.IDProducto = v.IDProducto
    WHERE d.IDCarrito = @IDCarrito
      AND (v.Activa = 0 OR p.Activo = 0)
  )
    THROW 50229, N'El carrito contiene un producto que ya no esta disponible.', 1;

  DECLARE @Direccion NVARCHAR(600);
  SELECT @Direccion = CONCAT(Alias, N': ', Linea1, COALESCE(N' ' + Linea2, N''), N', ',
    Municipio, N', ', Departamento, N'. Tel: ', Telefono)
  FROM dbo.Direccion WHERE IDDireccion = @IDDireccion AND IDUsuario = @IDUsuario AND Activa = 1;
  IF @Direccion IS NULL THROW 50201, N'La direccion de envio no es valida.', 1;

  DECLARE @Subtotal DECIMAL(18,2);
  SELECT @Subtotal = COALESCE(SUM(ROUND(v.Precio * d.Cantidad, 2)), 0)
  FROM dbo.CarritoDetalle d JOIN dbo.Variante v ON v.IDVariante = d.IDVariante
  WHERE d.IDCarrito = @IDCarrito;

  DECLARE @TasaIVA DECIMAL(9,6);
  SELECT @TasaIVA = TRY_CONVERT(DECIMAL(9,6), Valor)
  FROM dbo.Configuracion
  WHERE Clave = N'TASA_IVA';

  IF @TasaIVA IS NULL OR @TasaIVA < 0
    THROW 50190, N'Configuracion incompleta: falta una tasa de IVA valida.', 1;

  IF @IDCupon IS NOT NULL
  BEGIN
    DECLARE @UsosPorCliente INT;
    SELECT
      @Codigo = Codigo
    FROM dbo.Cupon WITH (UPDLOCK, HOLDLOCK)
    WHERE IDCupon = @IDCupon AND Activo = 1
      AND SYSUTCDATETIME() BETWEEN VigenteDesde AND VigenteHasta
      AND UsosActuales < LimiteUsosTotal;
    IF @Codigo IS NULL
      THROW 50228, N'El cupon alcanzo su limite de usos durante el checkout.', 1;
    ELSE
    BEGIN
      DECLARE @Elegible DECIMAL(18,2), @Tipo NVARCHAR(12), @Valor DECIMAL(18,2);
      SELECT @UsosPorCliente = COUNT(*)
      FROM dbo.CuponUso WITH (UPDLOCK, HOLDLOCK)
      WHERE IDCupon = @IDCupon AND IDUsuario = @IDUsuario;
      IF @UsosPorCliente >= (SELECT LimiteUsosPorCliente FROM dbo.Cupon WHERE IDCupon = @IDCupon)
        THROW 50226, N'Has alcanzado el limite de usos permitidos para este cupon.', 1;
      SELECT @Elegible = COALESCE(SUM(ROUND(v.Precio*d.Cantidad,2)),0)
      FROM dbo.CarritoDetalle d JOIN dbo.Variante v ON v.IDVariante=d.IDVariante
      JOIN dbo.Producto p ON p.IDProducto=v.IDProducto
      JOIN dbo.Cupon c ON c.IDCupon=@IDCupon
      WHERE d.IDCarrito=@IDCarrito AND (c.IDCategoria IS NULL OR p.IDCategoria=c.IDCategoria);
      SELECT @Tipo=Tipo,@Valor=Valor FROM dbo.Cupon WHERE IDCupon=@IDCupon;
      IF @Subtotal < (SELECT MontoMinimo FROM dbo.Cupon WHERE IDCupon = @IDCupon)
        THROW 50227, N'El monto de compra no alcanza el minimo requerido para este cupon.', 1;
      SELECT @Descuento=Descuento FROM dbo.FU_Cupones_CalculoDescuento(@Tipo,@Valor,@Elegible,@Subtotal);
    END
  END

  IF EXISTS (
    SELECT 1
    FROM dbo.CarritoDetalle AS d
    LEFT JOIN (
      SELECT IDVariante, SUM(Cantidad) AS Cantidad
      FROM dbo.ReservaExistencia WITH (UPDLOCK, HOLDLOCK)
      WHERE IDCarrito = @IDCarrito
        AND Estado = N'ACTIVA'
        AND ExpiraEn > SYSUTCDATETIME()
      GROUP BY IDVariante
    ) AS r ON r.IDVariante = d.IDVariante
    WHERE d.IDCarrito = @IDCarrito
      AND COALESCE(r.Cantidad, 0) < d.Cantidad
  )
    THROW 50231, N'La reserva del carrito vencio; vuelve a agregar los productos para continuar.', 1;

  DECLARE @Total DECIMAL(18,2) = ROUND(@Subtotal - @Descuento, 2);
  DECLARE @MontoIVA DECIMAL(18,2) =
    ROUND(@Total - (@Total / (1 + @TasaIVA)), 2);
    
  DECLARE @IDEstado INT = (SELECT IDEstadoPedido FROM dbo.EstadoPedido WHERE Nombre=N'CONFIRMADO');
  DECLARE @IDPedido INT, @Numero NVARCHAR(20);
  SELECT @Numero = CONCAT(
    N'SC-', CONVERT(CHAR(8), SYSUTCDATETIME(), 112),
    RIGHT(CONCAT(N'000000', CONVERT(VARCHAR(6), NEXT VALUE FOR dbo.Seq_NumeroPedido)), 6)
  );

  INSERT dbo.Pedido (NumeroPedido, IDUsuario, IDEstadoPedido, LlaveIdempotencia, IDCarritoIdempotencia, DireccionSnapshot,
    CodigoCuponSnapshot, Subtotal, Descuento, Total, MontoIVA)
  VALUES (@Numero,@IDUsuario,@IDEstado,@LlaveIdempotencia,@IDCarrito,@Direccion,@Codigo,@Subtotal,@Descuento,@Total,@MontoIVA);
  SET @IDPedido = CONVERT(INT,SCOPE_IDENTITY());

  DECLARE @IDSalida INT = (SELECT IDTipoMovimiento FROM dbo.TipoMovimiento WHERE Nombre=N'SALIDA');
  IF EXISTS (
    SELECT 1 FROM dbo.CarritoDetalle d JOIN dbo.Variante v WITH (UPDLOCK,HOLDLOCK) ON v.IDVariante=d.IDVariante
    WHERE d.IDCarrito=@IDCarrito AND v.ExistenciaFisica < d.Cantidad
  ) THROW 50202, N'No hay existencia suficiente para completar el pedido.', 1;

  INSERT dbo.PedidoDetalle (IDPedido,IDVariante,IDCategoriaSnapshot,SKUSnapshot,NombreSnapshot,Cantidad,PrecioUnitario,DescuentoLinea,TotalLinea)
  SELECT @IDPedido,v.IDVariante,p.IDCategoria,v.SKU,p.Nombre,d.Cantidad,v.Precio,0,ROUND(v.Precio*d.Cantidad,2)
  FROM dbo.CarritoDetalle d JOIN dbo.Variante v ON v.IDVariante=d.IDVariante JOIN dbo.Producto p ON p.IDProducto=v.IDProducto
  WHERE d.IDCarrito=@IDCarrito;

  UPDATE v SET ExistenciaFisica = v.ExistenciaFisica - d.Cantidad
  FROM dbo.Variante v JOIN dbo.CarritoDetalle d ON d.IDVariante=v.IDVariante WHERE d.IDCarrito=@IDCarrito;
  INSERT dbo.MovimientoInventario (IDVariante,IDTipoMovimiento,Cantidad,ExistenciaResultante,IDUsuario,Motivo,IDPedido)
  SELECT d.IDVariante,@IDSalida,d.Cantidad,v.ExistenciaFisica,@IDUsuario,N'Venta en checkout',@IDPedido
  FROM dbo.CarritoDetalle d JOIN dbo.Variante v ON v.IDVariante=d.IDVariante WHERE d.IDCarrito=@IDCarrito;
  UPDATE dbo.ReservaExistencia
  SET Estado = N'CONSUMIDA'
  WHERE IDCarrito = @IDCarrito
    AND Estado = N'ACTIVA';

  INSERT dbo.Pago (IDPedido,Monto,Metodo,Estado,Referencia)
  VALUES (
    @IDPedido,
    @Total,
    @MetodoPago,
    CASE WHEN @MetodoPago = N'TARJETA' THEN N'APROBADO' ELSE N'PENDIENTE' END,
    CASE WHEN @MetodoPago = N'TARJETA' THEN CONVERT(NVARCHAR(100),NEWID()) ELSE NULL END
  );
  INSERT dbo.PedidoHistorialEstado (IDPedido,IDEstadoAnterior,IDEstadoNuevo,IDUsuario)
  VALUES (@IDPedido,NULL,@IDEstado,@IDUsuario);
  IF @IDCupon IS NOT NULL
  BEGIN
    INSERT dbo.CuponUso (IDCupon,IDUsuario,IDPedido) VALUES (@IDCupon,@IDUsuario,@IDPedido);
    UPDATE dbo.Cupon
    SET UsosActuales = UsosActuales + 1
    WHERE IDCupon = @IDCupon
      AND UsosActuales < LimiteUsosTotal;
    IF @@ROWCOUNT <> 1
      THROW 50228, N'El cupon alcanzo su limite de usos durante el checkout.', 1;
  END
  UPDATE dbo.Carrito SET Estado=N'CONVERTIDO', UltimaActividad=SYSUTCDATETIME() WHERE IDCarrito=@IDCarrito;
  INSERT dbo.Bitacora (IDUsuario,Modulo,Entidad,IDEntidad,Accion,ValorNuevo)
  VALUES (@IDUsuario,N'PEDIDOS',N'Pedido',@IDPedido,N'CREAR',
    (SELECT @Numero AS numeroPedido,@Subtotal AS subtotal,@Descuento AS descuento,@Total AS total,@MontoIVA AS montoIVA
     FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));
  COMMIT;
  EXEC dbo.SP_Pedidos_Obtener @IDPedido=@IDPedido,@IDUsuario=@IDUsuario;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Pedidos_Obtener
  @IDPedido INT, @IDUsuario INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SELECT p.IDPedido,p.NumeroPedido,p.IDUsuario,e.Nombre AS Estado,p.DireccionSnapshot,p.CodigoCuponSnapshot,
    p.Subtotal,p.Descuento,p.Total,p.MontoIVA,p.FechaCreacion,pa.Metodo,pa.Estado AS EstadoPago
  FROM dbo.Pedido p JOIN dbo.EstadoPedido e ON e.IDEstadoPedido=p.IDEstadoPedido
  LEFT JOIN dbo.Pago pa ON pa.IDPedido=p.IDPedido
  WHERE p.IDPedido=@IDPedido AND (@IDUsuario IS NULL OR p.IDUsuario=@IDUsuario);
  SELECT IDPedidoDetalle,IDVariante,IDCategoriaSnapshot,SKUSnapshot,NombreSnapshot,Cantidad,PrecioUnitario,DescuentoLinea,TotalLinea,CantidadDevuelta
  FROM dbo.PedidoDetalle WHERE IDPedido=@IDPedido ORDER BY IDPedidoDetalle;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Pedidos_Listar
  @IDUsuario INT = NULL,
  @IDCliente INT = NULL,
  @Estado NVARCHAR(30) = NULL,
  @Desde DATETIME2(0) = NULL,
  @Hasta DATETIME2(0) = NULL,
  @Pagina INT = 1,
  @TamanoPagina INT = 20
AS
BEGIN
  SET NOCOUNT ON;
  IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
  IF @TamanoPagina IS NULL OR @TamanoPagina < 1 SET @TamanoPagina = 20;
  IF @TamanoPagina > 100 SET @TamanoPagina = 100;
  SELECT COUNT(*) AS TotalRegistros
  FROM dbo.Pedido p
  JOIN dbo.EstadoPedido e ON e.IDEstadoPedido = p.IDEstadoPedido
  WHERE (@IDUsuario IS NULL OR p.IDUsuario = @IDUsuario)
    AND (@IDCliente IS NULL OR p.IDUsuario = @IDCliente)
    AND (@Estado IS NULL OR e.Nombre = @Estado)
    AND (@Desde IS NULL OR p.FechaCreacion >= @Desde)
    AND (@Hasta IS NULL OR p.FechaCreacion <= @Hasta);
  SELECT p.IDPedido, p.NumeroPedido, p.IDUsuario, e.Nombre AS Estado, p.Subtotal, p.Descuento, p.Total, p.FechaCreacion
  FROM dbo.Pedido p
  JOIN dbo.EstadoPedido e ON e.IDEstadoPedido = p.IDEstadoPedido
  WHERE (@IDUsuario IS NULL OR p.IDUsuario = @IDUsuario)
    AND (@IDCliente IS NULL OR p.IDUsuario = @IDCliente)
    AND (@Estado IS NULL OR e.Nombre = @Estado)
    AND (@Desde IS NULL OR p.FechaCreacion >= @Desde)
    AND (@Hasta IS NULL OR p.FechaCreacion <= @Hasta)
  ORDER BY p.FechaCreacion DESC
  OFFSET (@Pagina - 1) * @TamanoPagina ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
END;
GO
