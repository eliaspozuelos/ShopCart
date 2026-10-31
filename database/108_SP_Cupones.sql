/* ============================================================
   108_SP_Cupones.sql
   Gestion de cupones y promociones: creacion, actualizacion,
   consulta administrativa y validacion para clientes/carrito.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   FU_Cupones_CalculoDescuento
   Calcula el descuento de un cupon. Nunca supera el subtotal
   elegible ni el subtotal del carrito, para que el total no
   quede por debajo de cero.
   ------------------------------------------------------------ */
CREATE OR ALTER FUNCTION dbo.FU_Cupones_CalculoDescuento (
  @Tipo              NVARCHAR(12),
  @Valor             DECIMAL(18,2),
  @SubtotalElegible  DECIMAL(18,2),
  @SubtotalCarrito   DECIMAL(18,2)
)
RETURNS TABLE
AS
RETURN
(
  SELECT CAST(
    CASE
      WHEN @SubtotalElegible <= 0 OR @SubtotalCarrito <= 0 THEN 0
      WHEN @Tipo = N'PORCENTAJE' THEN
        CASE
          WHEN ROUND((@SubtotalElegible * @Valor) / 100.0, 2) > @SubtotalCarrito
            THEN @SubtotalCarrito
          ELSE ROUND((@SubtotalElegible * @Valor) / 100.0, 2)
        END
      WHEN @Valor > @SubtotalElegible THEN @SubtotalElegible
      WHEN @Valor > @SubtotalCarrito THEN @SubtotalCarrito
      ELSE @Valor
    END
  AS DECIMAL(18,2)) AS Descuento
);
GO

/* ------------------------------------------------------------
   SP_Cupones_Listar
   Lista cupones para el panel administrativo con paginacion,
   busqueda y filtros de estado y vigencia.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Cupones_Listar
  @IDUsuarioActor   INT,
  @Pagina           INT = 1,
  @TamanoPagina     INT = 20,
  @Busqueda         NVARCHAR(50) = NULL,
  @Activo           BIT = NULL,
  @Vigente          BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede consultar cupones.', 1;

  SET @Pagina = CASE WHEN @Pagina < 1 THEN 1 ELSE @Pagina END;
  SET @TamanoPagina = CASE WHEN @TamanoPagina < 1 THEN 20 WHEN @TamanoPagina > 100 THEN 100 ELSE @TamanoPagina END;
  SET @Busqueda = NULLIF(LTRIM(RTRIM(@Busqueda)), N'');

  DECLARE @Offset INT = (@Pagina - 1) * @TamanoPagina;
  DECLARE @FechaActual DATETIME2(0) = SYSUTCDATETIME();

  -- Total de registros
  SELECT COUNT(*) AS TotalRegistros
  FROM dbo.Cupon AS c
  LEFT JOIN dbo.Categoria AS cat ON cat.IDCategoria = c.IDCategoria
  WHERE (@Busqueda IS NULL OR c.Codigo LIKE N'%' + @Busqueda + N'%')
    AND (@Activo IS NULL OR c.Activo = @Activo)
    AND (@Vigente IS NULL OR (@Vigente = 1 AND @FechaActual BETWEEN c.VigenteDesde AND c.VigenteHasta)
                          OR (@Vigente = 0 AND (@FechaActual < c.VigenteDesde OR @FechaActual > c.VigenteHasta)));

  -- Registros paginados
  SELECT 
    c.IDCupon,
    c.Codigo,
    c.Tipo,
    c.Valor,
    c.MontoMinimo,
    c.VigenteDesde,
    c.VigenteHasta,
    c.LimiteUsosTotal,
    c.LimiteUsosPorCliente,
    c.UsosActuales,
    c.IDCategoria,
    cat.Nombre AS Categoria,
    c.Activo,
    CASE 
      WHEN c.Activo = 0 THEN 0
      WHEN @FechaActual BETWEEN c.VigenteDesde AND c.VigenteHasta THEN 1
      ELSE 0
    END AS EsVigente
  FROM dbo.Cupon AS c
  LEFT JOIN dbo.Categoria AS cat ON cat.IDCategoria = c.IDCategoria
  WHERE (@Busqueda IS NULL OR c.Codigo LIKE N'%' + @Busqueda + N'%')
    AND (@Activo IS NULL OR c.Activo = @Activo)
    AND (@Vigente IS NULL OR (@Vigente = 1 AND @FechaActual BETWEEN c.VigenteDesde AND c.VigenteHasta)
                          OR (@Vigente = 0 AND (@FechaActual < c.VigenteDesde OR @FechaActual > c.VigenteHasta)))
  ORDER BY c.IDCupon DESC
  OFFSET @Offset ROWS
  FETCH NEXT @TamanoPagina ROWS ONLY;
END;
GO

/* ------------------------------------------------------------
   SP_Cupones_ObtenerPorID
   Detalle de un cupon por su ID para administracion.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Cupones_ObtenerPorID
  @IDUsuarioActor INT,
  @IDCupon        INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede consultar cupones.', 1;

  DECLARE @FechaActual DATETIME2(0) = SYSUTCDATETIME();

  SELECT 
    c.IDCupon,
    c.Codigo,
    c.Tipo,
    c.Valor,
    c.MontoMinimo,
    c.VigenteDesde,
    c.VigenteHasta,
    c.LimiteUsosTotal,
    c.LimiteUsosPorCliente,
    c.UsosActuales,
    c.IDCategoria,
    cat.Nombre AS Categoria,
    c.Activo,
    CASE 
      WHEN c.Activo = 0 THEN 0
      WHEN @FechaActual BETWEEN c.VigenteDesde AND c.VigenteHasta THEN 1
      ELSE 0
    END AS EsVigente
  FROM dbo.Cupon AS c
  LEFT JOIN dbo.Categoria AS cat ON cat.IDCategoria = c.IDCategoria
  WHERE c.IDCupon = @IDCupon;

  IF @@ROWCOUNT = 0
    THROW 50140, N'El cupon no existe.', 1;
END;
GO

/* ------------------------------------------------------------
   SP_Cupones_Crear
   Crea un nuevo cupon de descuento con sus restricciones.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Cupones_Crear
  @IDUsuarioActor       INT,
  @Codigo               NVARCHAR(30),
  @Tipo                 NVARCHAR(12),
  @Valor                DECIMAL(18,2),
  @MontoMinimo          DECIMAL(18,2) = 0,
  @VigenteDesde         DATETIME2(0),
  @VigenteHasta         DATETIME2(0),
  @LimiteUsosTotal      INT,
  @LimiteUsosPorCliente INT,
  @IDCategoria          INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede crear cupones.', 1;

  SET @Codigo = UPPER(LTRIM(RTRIM(@Codigo)));

  IF NULLIF(@Codigo, N'') IS NULL
    THROW 50146, N'El codigo de cupon es requerido.', 1;

  IF @Tipo NOT IN (N'PORCENTAJE', N'MONTO')
    THROW 50146, N'El tipo de cupon debe ser PORCENTAJE o MONTO.', 1;

  IF @Tipo = N'PORCENTAJE' AND (@Valor <= 0 OR @Valor > 100)
    THROW 50146, N'Para tipo PORCENTAJE el valor debe ser entre 0.01 y 100.', 1;

  IF @Tipo = N'MONTO' AND @Valor <= 0
    THROW 50146, N'Para tipo MONTO el valor debe ser mayor a 0.', 1;

  IF @VigenteHasta <= @VigenteDesde
    THROW 50146, N'La fecha fin de vigencia debe ser posterior a la fecha de inicio.', 1;

  IF @LimiteUsosTotal <= 0 OR @LimiteUsosPorCliente <= 0
    THROW 50146, N'Los limites de uso deben ser mayores a 0.', 1;

  IF @IDCategoria IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM dbo.Categoria WHERE IDCategoria = @IDCategoria AND Activa = 1
  )
    THROW 50130, N'La categoria asignada al cupon no existe o esta inactiva.', 1;

  IF EXISTS (SELECT 1 FROM dbo.Cupon WHERE Codigo = @Codigo)
    THROW 50141, N'Ya existe un cupon con ese codigo.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.Cupon (
      Codigo, Tipo, Valor, MontoMinimo,
      VigenteDesde, VigenteHasta, LimiteUsosTotal,
      LimiteUsosPorCliente, IDCategoria, Activo
    )
    VALUES (
      @Codigo, @Tipo, @Valor, COALESCE(@MontoMinimo, 0),
      @VigenteDesde, @VigenteHasta, @LimiteUsosTotal,
      @LimiteUsosPorCliente, @IDCategoria, 1
    );

    DECLARE @IDCuponNuevo INT = CONVERT(INT, SCOPE_IDENTITY());

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
    VALUES (
      @IDUsuarioActor, N'CUPONES', N'Cupon', @IDCuponNuevo, N'CREAR',
      (SELECT @Codigo AS Codigo, @Tipo AS Tipo, @Valor AS Valor,
              @VigenteDesde AS VigenteDesde, @VigenteHasta AS VigenteHasta
       FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    );

    COMMIT TRANSACTION;

    EXEC dbo.SP_Cupones_ObtenerPorID @IDUsuarioActor = @IDUsuarioActor, @IDCupon = @IDCuponNuevo;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50141, N'Ya existe un cupon con ese codigo.', 1;
    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Cupones_Actualizar
   Modifica parametros, vigencia o limites de un cupon existente.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Cupones_Actualizar
  @IDUsuarioActor       INT,
  @IDCupon              INT,
  @MontoMinimo          DECIMAL(18,2) = NULL,
  @VigenteDesde         DATETIME2(0) = NULL,
  @VigenteHasta         DATETIME2(0) = NULL,
  @LimiteUsosTotal      INT = NULL,
  @LimiteUsosPorCliente INT = NULL,
  @IDCategoria          INT = NULL,
  @ActualizarCategoria  BIT = 0,
  @Activo               BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede modificar cupones.', 1;

  IF NOT EXISTS (SELECT 1 FROM dbo.Cupon WHERE IDCupon = @IDCupon)
    THROW 50140, N'El cupon no existe.', 1;

  IF @ActualizarCategoria = 1 AND @IDCategoria IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM dbo.Categoria WHERE IDCategoria = @IDCategoria AND Activa = 1
  )
    THROW 50130, N'La categoria asignada no existe o esta inactiva.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.Cupon WITH (UPDLOCK, HOLDLOCK) WHERE IDCupon = @IDCupon)
      THROW 50140, N'El cupon no existe.', 1;

    DECLARE @DesdeActual DATETIME2(0);
    DECLARE @HastaActual DATETIME2(0);
    DECLARE @UsosActuales INT;
    DECLARE @ValorAnterior NVARCHAR(MAX);

    SELECT 
      @DesdeActual = VigenteDesde,
      @HastaActual = VigenteHasta,
      @UsosActuales = UsosActuales,
      @ValorAnterior = (
        SELECT Codigo, Tipo, Valor, MontoMinimo, VigenteDesde, VigenteHasta,
               LimiteUsosTotal, LimiteUsosPorCliente, IDCategoria, Activo
        FROM dbo.Cupon WHERE IDCupon = @IDCupon
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
      )
    FROM dbo.Cupon WHERE IDCupon = @IDCupon;

    DECLARE @NuevoDesde DATETIME2(0) = COALESCE(@VigenteDesde, @DesdeActual);
    DECLARE @NuevoHasta DATETIME2(0) = COALESCE(@VigenteHasta, @HastaActual);

    IF @NuevoHasta <= @NuevoDesde
      THROW 50146, N'La fecha fin de vigencia debe ser posterior a la fecha de inicio.', 1;

    IF @LimiteUsosTotal IS NOT NULL AND @LimiteUsosTotal < @UsosActuales
      THROW 50146, N'El limite total no puede ser inferior a los usos ya consumidos.', 1;

    UPDATE dbo.Cupon
    SET MontoMinimo = COALESCE(@MontoMinimo, MontoMinimo),
        VigenteDesde = @NuevoDesde,
        VigenteHasta = @NuevoHasta,
        LimiteUsosTotal = COALESCE(@LimiteUsosTotal, LimiteUsosTotal),
        LimiteUsosPorCliente = COALESCE(@LimiteUsosPorCliente, LimiteUsosPorCliente),
        IDCategoria = CASE WHEN @ActualizarCategoria = 1 THEN @IDCategoria ELSE IDCategoria END,
        Activo = COALESCE(@Activo, Activo)
    WHERE IDCupon = @IDCupon;

    DECLARE @ValorNuevo NVARCHAR(MAX) = (
      SELECT Codigo, Tipo, Valor, MontoMinimo, VigenteDesde, VigenteHasta,
             LimiteUsosTotal, LimiteUsosPorCliente, IDCategoria, Activo
      FROM dbo.Cupon WHERE IDCupon = @IDCupon
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (
      @IDUsuarioActor, N'CUPONES', N'Cupon', @IDCupon,
      CASE WHEN @Activo = 0 THEN N'DESACTIVAR' ELSE N'MODIFICAR' END,
      @ValorAnterior, @ValorNuevo
    );

    COMMIT TRANSACTION;

    EXEC dbo.SP_Cupones_ObtenerPorID @IDUsuarioActor = @IDUsuarioActor, @IDCupon = @IDCupon;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Cupones_Validar
   Valida un cupon por codigo para un cliente y subtotal.
   Devuelve datos del cupon y el descuento calculado.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Cupones_Validar
  @Codigo            NVARCHAR(30),
  @Subtotal          DECIMAL(18,2),
  @IDUsuario         INT = NULL,
  @SubtotalElegible  DECIMAL(18,2) = NULL,
  @DevolverResultado BIT = 1
AS
BEGIN
  SET NOCOUNT ON;

  SET @Codigo = UPPER(LTRIM(RTRIM(@Codigo)));

  DECLARE @IDCupon INT;
  DECLARE @Tipo NVARCHAR(12);
  DECLARE @Valor DECIMAL(18,2);
  DECLARE @MontoMinimo DECIMAL(18,2);
  DECLARE @VigenteDesde DATETIME2(0);
  DECLARE @VigenteHasta DATETIME2(0);
  DECLARE @LimiteUsosTotal INT;
  DECLARE @LimiteUsosPorCliente INT;
  DECLARE @UsosActuales INT;
  DECLARE @IDCategoria INT;
  DECLARE @Activo BIT;
  DECLARE @FechaActual DATETIME2(0) = SYSUTCDATETIME();

  SELECT
    @IDCupon = IDCupon,
    @Tipo = Tipo,
    @Valor = Valor,
    @MontoMinimo = MontoMinimo,
    @VigenteDesde = VigenteDesde,
    @VigenteHasta = VigenteHasta,
    @LimiteUsosTotal = LimiteUsosTotal,
    @LimiteUsosPorCliente = LimiteUsosPorCliente,
    @UsosActuales = UsosActuales,
    @IDCategoria = IDCategoria,
    @Activo = Activo
  FROM dbo.Cupon
  WHERE Codigo = @Codigo;

  IF @IDCupon IS NULL OR @Activo = 0
    THROW 50140, N'El cupon no existe o no esta disponible.', 1;

  IF @FechaActual < @VigenteDesde OR @FechaActual > @VigenteHasta
    THROW 50142, N'El cupon se encuentra fuera de su periodo de vigencia.', 1;

  IF @UsosActuales >= @LimiteUsosTotal
    THROW 50143, N'El cupon ha alcanzado el limite maximo de usos disponibles.', 1;

  IF @Subtotal < @MontoMinimo
    THROW 50145, N'El monto de compra no alcanza el minimo requerido para este cupon.', 1;

  IF @IDUsuario IS NOT NULL
  BEGIN
    DECLARE @UsosPorCliente INT = 0;
    SELECT @UsosPorCliente = COUNT(*)
    FROM dbo.CuponUso
    WHERE IDCupon = @IDCupon AND IDUsuario = @IDUsuario;

    IF @UsosPorCliente >= @LimiteUsosPorCliente
      THROW 50144, N'Has alcanzado el limite de usos permitidos para este cupon.', 1;
  END

  DECLARE @BaseDescuento DECIMAL(18,2) = COALESCE(@SubtotalElegible, @Subtotal);

  IF @IDCategoria IS NOT NULL AND @SubtotalElegible IS NOT NULL AND @BaseDescuento <= 0
    THROW 50147, N'El cupon no aplica a los productos del carrito.', 1;

  DECLARE @DescuentoCalculado DECIMAL(18,2);
  SELECT @DescuentoCalculado = d.Descuento
  FROM dbo.FU_Cupones_CalculoDescuento(@Tipo, @Valor, @BaseDescuento, @Subtotal) AS d;

  IF @DevolverResultado = 0
    RETURN;

  SELECT
    c.IDCupon,
    c.Codigo,
    c.Tipo,
    c.Valor,
    c.MontoMinimo,
    c.IDCategoria,
    cat.Nombre AS Categoria,
    @DescuentoCalculado AS DescuentoCalculado
  FROM dbo.Cupon AS c
  LEFT JOIN dbo.Categoria AS cat ON cat.IDCategoria = c.IDCategoria
  WHERE c.IDCupon = @IDCupon;
END;
GO

