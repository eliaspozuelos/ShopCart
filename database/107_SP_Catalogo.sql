/* ============================================================
   107_SP_Catalogo.sql
   Consultas publicas y administracion del catalogo:
   categorias, atributos, productos, variantes e imagenes.
   Las existencias de variantes se consultan y ajustan con registro
   en el kardex de Inventario.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   SP_Catalogo_ListarCategorias
   Lista categorias activas o todas para administracion.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_ListarCategorias
  @IncluirInactivas BIT = 0,
  @IDUsuarioActor INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @IncluirInactivas = 1 AND NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede consultar el catalogo completo.', 1;

  SELECT IDCategoria, Nombre, Activa
  FROM dbo.Categoria
  WHERE @IncluirInactivas = 1 OR Activa = 1
  ORDER BY Nombre, IDCategoria;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_CrearCategoria
   Crea una categoria y registra el evento de auditoria.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_CrearCategoria
  @IDUsuarioActor INT,
  @Nombre NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF EXISTS (SELECT 1 FROM dbo.Categoria WHERE Nombre = @Nombre)
    THROW 50135, N'Ya existe una categoria con ese nombre.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.Categoria (Nombre) VALUES (@Nombre);
    DECLARE @IDCategoria INT = CONVERT(INT, SCOPE_IDENTITY());

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'Categoria', @IDCategoria, N'CREAR',
            (SELECT @Nombre AS Nombre FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

    COMMIT TRANSACTION;

    SELECT IDCategoria, Nombre, Activa
    FROM dbo.Categoria
    WHERE IDCategoria = @IDCategoria;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50135, N'Ya existe una categoria con ese nombre.', 1;
    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_ActualizarCategoria
   Cambia el nombre o la disponibilidad de una categoria.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_ActualizarCategoria
  @IDUsuarioActor INT,
  @IDCategoria INT,
  @Nombre NVARCHAR(100) = NULL,
  @Activa BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF @Nombre IS NULL AND @Activa IS NULL
    THROW 50137, N'Debe indicar el nombre o el estado de la categoria.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WITH (UPDLOCK, HOLDLOCK) WHERE IDCategoria = @IDCategoria)
      THROW 50130, N'La categoria no existe.', 1;

    IF @Nombre IS NOT NULL AND EXISTS (
      SELECT 1 FROM dbo.Categoria WHERE Nombre = @Nombre AND IDCategoria <> @IDCategoria
    )
      THROW 50135, N'Ya existe una categoria con ese nombre.', 1;

    DECLARE @ValorAnterior NVARCHAR(MAX);
    SELECT @ValorAnterior = (
      SELECT Nombre, Activa FROM dbo.Categoria
      WHERE IDCategoria = @IDCategoria FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.Categoria
    SET Nombre = COALESCE(@Nombre, Nombre),
        Activa = COALESCE(@Activa, Activa)
    WHERE IDCategoria = @IDCategoria;

    DECLARE @ValorNuevo NVARCHAR(MAX);
    SELECT @ValorNuevo = (
      SELECT Nombre, Activa FROM dbo.Categoria
      WHERE IDCategoria = @IDCategoria FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'Categoria', @IDCategoria,
            CASE WHEN @Activa = 0 THEN N'DESACTIVAR' ELSE N'MODIFICAR' END,
            @ValorAnterior, @ValorNuevo);

    COMMIT TRANSACTION;

    SELECT IDCategoria, Nombre, Activa
    FROM dbo.Categoria
    WHERE IDCategoria = @IDCategoria;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50135, N'Ya existe una categoria con ese nombre.', 1;
    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_ListarAtributos
   Devuelve el catalogo de atributos usado por variantes.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_ListarAtributos
AS
BEGIN
  SET NOCOUNT ON;

  SELECT IDAtributo, Nombre
  FROM dbo.Atributo
  ORDER BY Nombre, IDAtributo;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_CrearAtributo
   Crea un tipo de atributo para las variantes.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_CrearAtributo
  @IDUsuarioActor INT,
  @Nombre NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF EXISTS (SELECT 1 FROM dbo.Atributo WHERE Nombre = @Nombre)
    THROW 50135, N'Ya existe un atributo con ese nombre.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.Atributo (Nombre) VALUES (@Nombre);

    DECLARE @IDAtributo INT = CONVERT(INT, SCOPE_IDENTITY());
    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'Atributo', @IDAtributo, N'CREAR',
            (SELECT @Nombre AS Nombre FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50135, N'Ya existe un atributo con ese nombre.', 1;
    THROW;
  END CATCH

  SELECT IDAtributo, Nombre
  FROM dbo.Atributo WHERE IDAtributo = @IDAtributo;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_ListarProductos
   Devuelve resumen paginado para publico o administracion.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_ListarProductos
  @Pagina INT = 1,
  @TamanoPagina INT = 20,
  @IDCategoria INT = NULL,
  @Buscar NVARCHAR(100) = NULL,
  @IncluirInactivos BIT = 0,
  @IDUsuarioActor INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @IncluirInactivos = 1 AND NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede consultar el catalogo completo.', 1;

  IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
  IF @TamanoPagina IS NULL OR @TamanoPagina < 1 SET @TamanoPagina = 20;
  IF @TamanoPagina > 100 SET @TamanoPagina = 100;

  SELECT COUNT(*) AS TotalRegistros
  FROM dbo.Producto AS p
  INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
  WHERE (@IncluirInactivos = 1 OR (p.Activo = 1 AND c.Activa = 1))
    AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
    AND (@Buscar IS NULL OR CHARINDEX(@Buscar, p.Nombre) > 0
         OR CHARINDEX(@Buscar, COALESCE(p.Descripcion, N'')) > 0);

  SELECT p.IDProducto, p.Nombre, p.Descripcion, p.Activo,
         c.IDCategoria, c.Nombre AS Categoria,
         imagen.Url AS ImagenPrincipal,
         precios.PrecioMinimo, precios.PrecioMaximo,
         existencias.ExistenciaTotal
  FROM dbo.Producto AS p
  INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
  OUTER APPLY (
    SELECT TOP (1) pi.Url
    FROM dbo.ProductoImagen AS pi
    WHERE pi.IDProducto = p.IDProducto
    ORDER BY pi.Orden, pi.IDProductoImagen
  ) AS imagen
  OUTER APPLY (
    SELECT MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo
    FROM dbo.Variante AS v
    WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
  ) AS precios
  OUTER APPLY (
    SELECT SUM(v.ExistenciaFisica) AS ExistenciaTotal
    FROM dbo.Variante AS v
    WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
  ) AS existencias
  WHERE (@IncluirInactivos = 1 OR (p.Activo = 1 AND c.Activa = 1))
    AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
    AND (@Buscar IS NULL OR CHARINDEX(@Buscar, p.Nombre) > 0
         OR CHARINDEX(@Buscar, COALESCE(p.Descripcion, N'')) > 0)
  ORDER BY p.Nombre, p.IDProducto
  OFFSET (@Pagina - 1) * @TamanoPagina ROWS
  FETCH NEXT @TamanoPagina ROWS ONLY;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_ObtenerProducto
   Devuelve producto, imagenes, variantes y atributos asociados.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_ObtenerProducto
  @IDProducto INT,
  @IncluirInactivos BIT = 0,
  @IDUsuarioActor INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @IncluirInactivos = 1 AND NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede consultar el catalogo completo.', 1;

  SELECT p.IDProducto, p.Nombre, p.Descripcion, p.Activo,
         c.IDCategoria, c.Nombre AS Categoria
  FROM dbo.Producto AS p
  INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
  WHERE p.IDProducto = @IDProducto
    AND (@IncluirInactivos = 1 OR (p.Activo = 1 AND c.Activa = 1));

  SELECT pi.IDProductoImagen, pi.Url, pi.Orden
  FROM dbo.ProductoImagen AS pi
  WHERE pi.IDProducto = @IDProducto
    AND (@IncluirInactivos = 1 OR EXISTS (
      SELECT 1 FROM dbo.Producto AS p
      INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
      WHERE p.IDProducto = pi.IDProducto AND p.Activo = 1 AND c.Activa = 1
    ))
  ORDER BY pi.Orden, pi.IDProductoImagen;

  SELECT v.IDVariante, v.SKU, v.Precio, v.ExistenciaFisica, v.Activa
  FROM dbo.Variante AS v
  WHERE v.IDProducto = @IDProducto
    AND (@IncluirInactivos = 1 OR (
      v.Activa = 1 AND EXISTS (
        SELECT 1 FROM dbo.Producto AS p
        INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
        WHERE p.IDProducto = v.IDProducto AND p.Activo = 1 AND c.Activa = 1
      )
    ))
  ORDER BY v.SKU, v.IDVariante;

  SELECT va.IDVariante, a.IDAtributo, a.Nombre AS Atributo, va.Valor
  FROM dbo.VarianteAtributo AS va
  INNER JOIN dbo.Atributo AS a ON a.IDAtributo = va.IDAtributo
  INNER JOIN dbo.Variante AS v ON v.IDVariante = va.IDVariante
  WHERE v.IDProducto = @IDProducto
    AND (@IncluirInactivos = 1 OR (v.Activa = 1 AND EXISTS (
      SELECT 1 FROM dbo.Producto AS p
      INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
      WHERE p.IDProducto = v.IDProducto AND p.Activo = 1 AND c.Activa = 1
    )))
  ORDER BY va.IDVariante, a.Nombre;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_CrearProducto
   Crea un producto dentro de una categoria activa.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_CrearProducto
  @IDUsuarioActor INT,
  @IDCategoria INT,
  @Nombre NVARCHAR(150),
  @Descripcion NVARCHAR(2000) = NULL,
  @VariantesJson NVARCHAR(MAX) = N'[]',
  @ImagenesJson NVARCHAR(MAX) = N'[]'
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF @VariantesJson IS NULL OR ISJSON(@VariantesJson) <> 1
     OR LEFT(LTRIM(@VariantesJson), 1) <> N'['
    THROW 50137, N'Las variantes deben enviarse como una lista valida.', 1;

  IF @ImagenesJson IS NULL OR ISJSON(@ImagenesJson) <> 1
     OR LEFT(LTRIM(@ImagenesJson), 1) <> N'['
    THROW 50137, N'Las imagenes deben enviarse como una lista valida.', 1;

  DECLARE @Variantes TABLE (
    Indice INT IDENTITY(1,1) PRIMARY KEY,
    SKU NVARCHAR(50),
    Precio DECIMAL(18,2),
    ExistenciaFisica INT,
    AtributosJson NVARCHAR(MAX)
  );
  INSERT INTO @Variantes (SKU, Precio, ExistenciaFisica, AtributosJson)
  SELECT SKU, Precio, ExistenciaFisica, AtributosJson
  FROM OPENJSON(@VariantesJson)
  WITH (
    SKU NVARCHAR(50) '$.sku',
    Precio DECIMAL(18,2) '$.price',
    ExistenciaFisica INT '$.stock',
    AtributosJson NVARCHAR(MAX) '$.attributes' AS JSON
  );

  IF (SELECT COUNT(*) FROM @Variantes) > 100
     OR EXISTS (
       SELECT 1 FROM @Variantes
       WHERE NULLIF(LTRIM(RTRIM(SKU)), N'') IS NULL
          OR Precio IS NULL OR Precio <= 0
          OR ExistenciaFisica < 0
     )
    THROW 50137, N'Una o mas variantes tienen datos invalidos.', 1;

  IF EXISTS (
    SELECT 1 FROM @Variantes
    WHERE AtributosJson IS NULL OR ISJSON(AtributosJson) <> 1
      OR LEFT(LTRIM(AtributosJson), 1) <> N'['
  )
    THROW 50137, N'Los atributos de una variante deben enviarse como una lista valida.', 1;

  IF EXISTS (
    SELECT 1
    FROM @Variantes AS v
    CROSS APPLY OPENJSON(v.AtributosJson)
      WITH (AttributeId INT '$.attributeId', Value NVARCHAR(100) '$.value') AS a
    WHERE a.AttributeId IS NULL OR NULLIF(LTRIM(RTRIM(a.Value)), N'') IS NULL
  )
    THROW 50137, N'Uno o mas atributos de una variante tienen datos invalidos.', 1;

  IF EXISTS (
    SELECT v.Indice, a.AttributeId
    FROM @Variantes AS v
    CROSS APPLY OPENJSON(v.AtributosJson)
      WITH (AttributeId INT '$.attributeId') AS a
    GROUP BY v.Indice, a.AttributeId
    HAVING COUNT(*) > 1
  )
    THROW 50137, N'Una variante no puede repetir atributos.', 1;

  IF EXISTS (
    SELECT 1
    FROM @Variantes AS v
    CROSS APPLY OPENJSON(v.AtributosJson)
      WITH (AttributeId INT '$.attributeId') AS input
    LEFT JOIN dbo.Atributo AS a ON a.IDAtributo = input.AttributeId
    WHERE a.IDAtributo IS NULL
  )
    THROW 50136, N'Uno o mas atributos de la variante no existen.', 1;

  DECLARE @Imagenes TABLE (
    Indice INT IDENTITY(1,1) PRIMARY KEY,
    Url NVARCHAR(500),
    Orden INT
  );
  INSERT INTO @Imagenes (Url, Orden)
  SELECT Url, Orden
  FROM OPENJSON(@ImagenesJson)
  WITH (
    Url NVARCHAR(500) '$.url',
    Orden INT '$.order'
  );

  IF (SELECT COUNT(*) FROM @Imagenes) > 20
     OR EXISTS (
       SELECT 1 FROM @Imagenes
       WHERE NULLIF(LTRIM(RTRIM(Url)), N'') IS NULL OR Orden IS NULL OR Orden < 0
     )
    THROW 50137, N'Una o mas imagenes tienen datos invalidos.', 1;

  DECLARE @IDProducto INT;
  DECLARE @IDVariante INT;
  DECLARE @IDProductoImagen INT;
  DECLARE @Indice INT;
  DECLARE @Total INT;
  DECLARE @SKU NVARCHAR(50);
  DECLARE @Precio DECIMAL(18,2);
  DECLARE @ExistenciaFisica INT;
  DECLARE @AtributosJson NVARCHAR(MAX);
  DECLARE @Url NVARCHAR(500);
  DECLARE @Orden INT;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (
      SELECT 1 FROM dbo.Categoria WITH (UPDLOCK, HOLDLOCK)
      WHERE IDCategoria = @IDCategoria AND Activa = 1
    )
      THROW 50130, N'La categoria no existe o esta inactiva.', 1;

    INSERT INTO dbo.Producto (IDCategoria, Nombre, Descripcion)
    VALUES (@IDCategoria, @Nombre, @Descripcion);
    SET @IDProducto = CONVERT(INT, SCOPE_IDENTITY());

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'Producto', @IDProducto, N'CREAR',
            (SELECT @Nombre AS Nombre, @IDCategoria AS IDCategoria FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

    SET @Indice = 1;
    SELECT @Total = COUNT(*) FROM @Variantes;
    WHILE @Indice <= @Total
    BEGIN
      SELECT @SKU = SKU, @Precio = Precio, @ExistenciaFisica = COALESCE(ExistenciaFisica, 0),
             @AtributosJson = AtributosJson
      FROM @Variantes WHERE Indice = @Indice;

      INSERT INTO dbo.Variante (IDProducto, SKU, Precio, ExistenciaFisica)
      VALUES (@IDProducto, @SKU, @Precio, 0);
      SET @IDVariante = CONVERT(INT, SCOPE_IDENTITY());

      IF @ExistenciaFisica > 0
      BEGIN
        EXEC dbo.SP_Inventario_AjustarExistencia
          @IDUsuarioActor = @IDUsuarioActor,
          @IDVariante = @IDVariante,
          @NuevaExistencia = @ExistenciaFisica,
          @Motivo = N'Existencia inicial al crear variante desde Catalogo',
          @DevolverResultado = 0;
      END

      INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
      SELECT @IDVariante, input.AttributeId, LTRIM(RTRIM(input.Value))
      FROM OPENJSON(@AtributosJson)
        WITH (AttributeId INT '$.attributeId', Value NVARCHAR(100) '$.value') AS input;

      INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
      VALUES (@IDUsuarioActor, N'CATALOGO', N'Variante', @IDVariante, N'CREAR',
              (SELECT @SKU AS SKU, @Precio AS Precio, @ExistenciaFisica AS ExistenciaFisica
               FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

      SET @Indice += 1;
    END

    SET @Indice = 1;
    SELECT @Total = COUNT(*) FROM @Imagenes;
    WHILE @Indice <= @Total
    BEGIN
      SELECT @Url = Url, @Orden = Orden FROM @Imagenes WHERE Indice = @Indice;

      INSERT INTO dbo.ProductoImagen (IDProducto, Url, Orden)
      VALUES (@IDProducto, @Url, @Orden);
      SET @IDProductoImagen = CONVERT(INT, SCOPE_IDENTITY());

      INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
      VALUES (@IDUsuarioActor, N'CATALOGO', N'ProductoImagen', @IDProductoImagen, N'CREAR',
              (SELECT @Url AS Url, @Orden AS Orden FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

      SET @Indice += 1;
    END

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF ERROR_NUMBER() IN (2601, 2627)
    BEGIN
      IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
      THROW 50134, N'Ya existe una variante con ese SKU.', 1;
    END
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT p.IDProducto, p.IDCategoria, p.Nombre, p.Descripcion, p.Activo, c.Nombre AS Categoria
  FROM dbo.Producto AS p
  INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
  WHERE p.IDProducto = @IDProducto;

  SELECT IDProductoImagen, IDProducto, Url, Orden
  FROM dbo.ProductoImagen
  WHERE IDProducto = @IDProducto
  ORDER BY Orden, IDProductoImagen;

  SELECT IDVariante, IDProducto, SKU, Precio, ExistenciaFisica, Activa
  FROM dbo.Variante
  WHERE IDProducto = @IDProducto
  ORDER BY SKU, IDVariante;

  SELECT va.IDVariante, a.IDAtributo, a.Nombre AS Atributo, va.Valor
  FROM dbo.VarianteAtributo AS va
  INNER JOIN dbo.Atributo AS a ON a.IDAtributo = va.IDAtributo
  INNER JOIN dbo.Variante AS v ON v.IDVariante = va.IDVariante
  WHERE v.IDProducto = @IDProducto
  ORDER BY va.IDVariante, a.Nombre;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_ActualizarProducto
   Cambia datos, categoria o disponibilidad del producto.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_ActualizarProducto
  @IDUsuarioActor INT,
  @IDProducto INT,
  @IDCategoria INT = NULL,
  @Nombre NVARCHAR(150) = NULL,
  @Descripcion NVARCHAR(2000) = NULL,
  @ActualizarDescripcion BIT = 0,
  @Activo BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF @IDCategoria IS NULL AND @Nombre IS NULL AND @ActualizarDescripcion = 0 AND @Activo IS NULL
    THROW 50137, N'Debe indicar al menos un campo del producto.', 1;

  IF @IDCategoria IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM dbo.Categoria WHERE IDCategoria = @IDCategoria AND Activa = 1
  )
    THROW 50130, N'La categoria no existe o esta inactiva.', 1;

  IF NOT EXISTS (SELECT 1 FROM dbo.Producto WHERE IDProducto = @IDProducto)
    THROW 50131, N'El producto no existe.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.Producto WITH (UPDLOCK, HOLDLOCK) WHERE IDProducto = @IDProducto)
      THROW 50131, N'El producto no existe.', 1;

    DECLARE @ValorAnterior NVARCHAR(MAX);
    SELECT @ValorAnterior = (
      SELECT IDCategoria, Nombre, Descripcion, Activo
      FROM dbo.Producto WHERE IDProducto = @IDProducto
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.Producto
    SET IDCategoria = COALESCE(@IDCategoria, IDCategoria),
        Nombre = COALESCE(@Nombre, Nombre),
        Descripcion = CASE WHEN @ActualizarDescripcion = 1 THEN @Descripcion ELSE Descripcion END,
        Activo = COALESCE(@Activo, Activo)
    WHERE IDProducto = @IDProducto;

    DECLARE @ValorNuevo NVARCHAR(MAX);
    SELECT @ValorNuevo = (
      SELECT IDCategoria, Nombre, Descripcion, Activo
      FROM dbo.Producto WHERE IDProducto = @IDProducto
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'Producto', @IDProducto,
            CASE WHEN @Activo = 0 THEN N'DESACTIVAR' ELSE N'MODIFICAR' END,
            @ValorAnterior, @ValorNuevo);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT IDProducto, IDCategoria, Nombre, Descripcion, Activo
  FROM dbo.Producto WHERE IDProducto = @IDProducto;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_CambiarEstadoVariante
   Activa o desactiva una variante sin alterar existencias.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_CambiarEstadoVariante
  @IDUsuarioActor INT,
  @IDProducto INT,
  @IDVariante INT,
  @Activa BIT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Variante WHERE IDVariante = @IDVariante AND IDProducto = @IDProducto
  )
    THROW 50132, N'La variante no existe para este producto.', 1;

  DECLARE @EstadoAnterior BIT;
  SELECT @EstadoAnterior = Activa
  FROM dbo.Variante
  WHERE IDVariante = @IDVariante AND IDProducto = @IDProducto;

  BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE dbo.Variante SET Activa = @Activa
    WHERE IDVariante = @IDVariante AND IDProducto = @IDProducto;

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'Variante', @IDVariante,
            CASE WHEN @Activa = 0 THEN N'DESACTIVAR' ELSE N'MODIFICAR' END,
            (SELECT @EstadoAnterior AS Activa FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
            (SELECT @Activa AS Activa FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT IDVariante, IDProducto, SKU, Precio, ExistenciaFisica, Activa
  FROM dbo.Variante WHERE IDVariante = @IDVariante;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_GuardarVariante
   Crea o actualiza SKU, precio, existencia y atributos.
   Los cambios de existencia se registran en el kardex.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_GuardarVariante
  @IDUsuarioActor INT,
  @IDProducto INT,
  @IDVariante INT = NULL,
  @SKU NVARCHAR(50),
  @Precio DECIMAL(18,2),
  @AtributosJson NVARCHAR(MAX),
  @ExistenciaFisica INT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF NOT EXISTS (SELECT 1 FROM dbo.Producto WHERE IDProducto = @IDProducto)
    THROW 50131, N'El producto no existe.', 1;

  IF @IDVariante IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM dbo.Variante WHERE IDVariante = @IDVariante AND IDProducto = @IDProducto
  )
    THROW 50132, N'La variante no existe para este producto.', 1;

  IF @AtributosJson IS NULL OR ISJSON(@AtributosJson) <> 1
    THROW 50137, N'Los atributos de la variante no tienen un formato valido.', 1;

  IF @ExistenciaFisica < 0
    THROW 50137, N'La existencia de la variante no puede ser negativa.', 1;

  IF EXISTS (
    SELECT AttributeId
    FROM OPENJSON(@AtributosJson) WITH (AttributeId INT '$.attributeId')
    GROUP BY AttributeId
    HAVING AttributeId IS NULL OR COUNT(*) > 1
  )
    THROW 50137, N'Los atributos de la variante estan repetidos o son invalidos.', 1;

  IF EXISTS (
    SELECT 1
    FROM OPENJSON(@AtributosJson) WITH (AttributeId INT '$.attributeId', Value NVARCHAR(100) '$.value') AS input
    LEFT JOIN dbo.Atributo AS a ON a.IDAtributo = input.AttributeId
    WHERE a.IDAtributo IS NULL OR NULLIF(LTRIM(RTRIM(input.Value)), N'') IS NULL
  )
    THROW 50136, N'Uno o mas atributos de la variante no existen o no tienen valor.', 1;

  DECLARE @EsNueva BIT = CASE WHEN @IDVariante IS NULL THEN 1 ELSE 0 END;
  DECLARE @ExistenciaAnterior INT = 0;
  DECLARE @ExistenciaResultante INT;
  BEGIN TRY
    BEGIN TRANSACTION;

    IF @IDVariante IS NULL
    BEGIN
      INSERT INTO dbo.Variante (IDProducto, SKU, Precio, ExistenciaFisica)
      VALUES (@IDProducto, @SKU, @Precio, 0);
      SET @IDVariante = CONVERT(INT, SCOPE_IDENTITY());
      SET @ExistenciaAnterior = 0;
    END
    ELSE
    BEGIN
      SELECT @ExistenciaAnterior = ExistenciaFisica
      FROM dbo.Variante WITH (UPDLOCK, HOLDLOCK)
      WHERE IDVariante = @IDVariante AND IDProducto = @IDProducto;

      IF @@ROWCOUNT = 0
        THROW 50132, N'La variante no existe para este producto.', 1;

      UPDATE dbo.Variante
      SET SKU = @SKU, Precio = @Precio
      WHERE IDVariante = @IDVariante AND IDProducto = @IDProducto;
      DELETE FROM dbo.VarianteAtributo WHERE IDVariante = @IDVariante;
    END

    SET @ExistenciaResultante = COALESCE(@ExistenciaFisica, @ExistenciaAnterior);
    IF @ExistenciaFisica IS NOT NULL
    BEGIN
      EXEC dbo.SP_Inventario_AjustarExistencia
        @IDUsuarioActor = @IDUsuarioActor,
        @IDVariante = @IDVariante,
        @NuevaExistencia = @ExistenciaFisica,
        @Motivo = N'Ajuste de existencia desde Catalogo',
        @DevolverResultado = 0;
    END

    INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
    SELECT @IDVariante, input.AttributeId, LTRIM(RTRIM(input.Value))
    FROM OPENJSON(@AtributosJson)
      WITH (AttributeId INT '$.attributeId', Value NVARCHAR(100) '$.value') AS input;

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'Variante', @IDVariante,
            CASE WHEN @EsNueva = 1 THEN N'CREAR' ELSE N'MODIFICAR' END,
            (SELECT @SKU AS SKU, @Precio AS Precio, @ExistenciaResultante AS ExistenciaFisica
             FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

    COMMIT TRANSACTION;

    SELECT IDVariante, IDProducto, SKU, Precio, ExistenciaFisica, Activa
    FROM dbo.Variante WHERE IDVariante = @IDVariante;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50134, N'Ya existe una variante con ese SKU.', 1;
    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_GuardarImagen
   Agrega o actualiza URL y orden de imagen de un producto.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_GuardarImagen
  @IDUsuarioActor INT,
  @IDProducto INT,
  @IDProductoImagen INT = NULL,
  @Url NVARCHAR(500),
  @Orden INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  IF NOT EXISTS (SELECT 1 FROM dbo.Producto WHERE IDProducto = @IDProducto)
    THROW 50131, N'El producto no existe.', 1;

  DECLARE @ValorAnterior NVARCHAR(MAX);
  DECLARE @Accion NVARCHAR(20);

  BEGIN TRY
    BEGIN TRANSACTION;

    IF @IDProductoImagen IS NULL
    BEGIN
      INSERT INTO dbo.ProductoImagen (IDProducto, Url, Orden)
      VALUES (@IDProducto, @Url, @Orden);
      SET @IDProductoImagen = CONVERT(INT, SCOPE_IDENTITY());
      SET @Accion = N'CREAR';
    END
    ELSE
    BEGIN
      SELECT @ValorAnterior = (
        SELECT Url, Orden FROM dbo.ProductoImagen WITH (UPDLOCK, HOLDLOCK)
        WHERE IDProductoImagen = @IDProductoImagen AND IDProducto = @IDProducto
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
      );

      IF @ValorAnterior IS NULL
        THROW 50133, N'La imagen no existe para este producto.', 1;

      UPDATE dbo.ProductoImagen
      SET Url = @Url, Orden = @Orden
      WHERE IDProductoImagen = @IDProductoImagen AND IDProducto = @IDProducto;
      SET @Accion = N'MODIFICAR';
    END

    DECLARE @ValorNuevo NVARCHAR(MAX);
    SELECT @ValorNuevo = (
      SELECT Url, Orden FROM dbo.ProductoImagen
      WHERE IDProductoImagen = @IDProductoImagen
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'ProductoImagen', @IDProductoImagen,
            @Accion, @ValorAnterior, @ValorNuevo);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH

  SELECT IDProductoImagen, IDProducto, Url, Orden
  FROM dbo.ProductoImagen
  WHERE IDProductoImagen = @IDProductoImagen;
END;
GO

/* ------------------------------------------------------------
   SP_Catalogo_EliminarImagen
   Elimina una imagen sin eliminar el producto.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Catalogo_EliminarImagen
  @IDUsuarioActor INT,
  @IDProducto INT,
  @IDProductoImagen INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1 FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar el catalogo.', 1;

  DECLARE @ValorAnterior NVARCHAR(MAX);

  BEGIN TRY
    BEGIN TRANSACTION;

    SELECT @ValorAnterior = (
      SELECT Url, Orden FROM dbo.ProductoImagen WITH (UPDLOCK, HOLDLOCK)
      WHERE IDProductoImagen = @IDProductoImagen AND IDProducto = @IDProducto
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    IF @ValorAnterior IS NULL
      THROW 50133, N'La imagen no existe para este producto.', 1;

    DELETE FROM dbo.ProductoImagen
    WHERE IDProductoImagen = @IDProductoImagen AND IDProducto = @IDProducto;

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'CATALOGO', N'ProductoImagen', @IDProductoImagen,
            N'MODIFICAR', @ValorAnterior, N'{"eliminada":true}');

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

