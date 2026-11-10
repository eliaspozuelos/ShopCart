/* ============================================================
   123_Migrar_Existencia_Disponible_Catalogo.sql
   La tienda muestra la existencia disponible: fisica menos
   reservas activas que no han vencido.
   ============================================================ */
USE ShopCart;
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
  @PrecioMinimo DECIMAL(18,2) = NULL,
  @PrecioMaximo DECIMAL(18,2) = NULL,
  @SoloDisponibles BIT = NULL,
  @OrdenarPor VARCHAR(20) = 'name_asc',
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
  IF @OrdenarPor NOT IN ('name_asc', 'name_desc', 'price_asc', 'price_desc')
    SET @OrdenarPor = 'name_asc';

  SELECT COUNT(*) AS TotalRegistros
  FROM dbo.Producto AS p
  INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
  WHERE (@IncluirInactivos = 1 OR (p.Activo = 1 AND c.Activa = 1))
    AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
    AND (@Buscar IS NULL OR CHARINDEX(@Buscar, p.Nombre) > 0
         OR CHARINDEX(@Buscar, COALESCE(p.Descripcion, N'')) > 0)
    AND (@PrecioMinimo IS NULL OR EXISTS (
      SELECT 1 FROM dbo.Variante v WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
        AND v.Precio >= @PrecioMinimo))
    AND (@PrecioMaximo IS NULL OR EXISTS (
      SELECT 1 FROM dbo.Variante v WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
        AND v.Precio <= @PrecioMaximo))
    AND (@SoloDisponibles IS NULL OR @SoloDisponibles = 0 OR EXISTS (
      SELECT 1
      FROM dbo.Variante AS v
      CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) AS disp
      WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
        AND disp.ExistenciaDisponible > 0));

  SELECT p.IDProducto, p.Nombre, p.Descripcion, p.Activo,
         c.IDCategoria, c.Nombre AS Categoria,
         imagen.Url AS ImagenPrincipal,
         precios.PrecioMinimo, precios.PrecioMaximo,
         existencias.ExistenciaTotal,
         existencias.ExistenciaDisponible,
         variantes.CantidadVariantes
  FROM dbo.Producto AS p
  INNER JOIN dbo.Categoria AS c ON c.IDCategoria = p.IDCategoria
  OUTER APPLY (
    SELECT TOP (1) candidato.Url
    FROM (
      SELECT v.UrlImagen AS Url,
             CASE
               WHEN v.Precio = (
                 SELECT MIN(barata.Precio)
                 FROM dbo.Variante AS barata
                 WHERE barata.IDProducto = p.IDProducto AND barata.Activa = 1
               ) THEN 0
               ELSE 1
             END AS Origen,
             v.Precio AS Orden,
             v.IDVariante AS ID
      FROM dbo.Variante AS v
      WHERE v.IDProducto = p.IDProducto
        AND v.Activa = 1
        AND NULLIF(LTRIM(RTRIM(v.UrlImagen)), N'') IS NOT NULL
      UNION ALL
      SELECT pi.Url, 2, pi.Orden, pi.IDProductoImagen
      FROM dbo.ProductoImagen AS pi
      WHERE pi.IDProducto = p.IDProducto
    ) AS candidato
    ORDER BY candidato.Origen, candidato.Orden, candidato.ID
  ) AS imagen
  OUTER APPLY (
    SELECT MIN(v.Precio) AS PrecioMinimo, MAX(v.Precio) AS PrecioMaximo
    FROM dbo.Variante AS v
    WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
  ) AS precios
  OUTER APPLY (
    SELECT
      SUM(v.ExistenciaFisica) AS ExistenciaTotal,
      SUM(CASE WHEN disp.ExistenciaDisponible < 0 THEN 0 ELSE disp.ExistenciaDisponible END) AS ExistenciaDisponible
    FROM dbo.Variante AS v
    CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) AS disp
    WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
  ) AS existencias
  OUTER APPLY (
    SELECT COUNT(*) AS CantidadVariantes
    FROM dbo.Variante AS v
    WHERE v.IDProducto = p.IDProducto AND v.Activa = 1
  ) AS variantes
  WHERE (@IncluirInactivos = 1 OR (p.Activo = 1 AND c.Activa = 1))
    AND (@IDCategoria IS NULL OR p.IDCategoria = @IDCategoria)
    AND (@Buscar IS NULL OR CHARINDEX(@Buscar, p.Nombre) > 0
         OR CHARINDEX(@Buscar, COALESCE(p.Descripcion, N'')) > 0)
    AND (@PrecioMinimo IS NULL OR precios.PrecioMaximo >= @PrecioMinimo)
    AND (@PrecioMaximo IS NULL OR precios.PrecioMinimo <= @PrecioMaximo)
    AND (@SoloDisponibles IS NULL OR @SoloDisponibles = 0 OR existencias.ExistenciaDisponible > 0)
  ORDER BY
    CASE WHEN @OrdenarPor = 'name_asc' THEN p.Nombre END ASC,
    CASE WHEN @OrdenarPor = 'name_desc' THEN p.Nombre END DESC,
    CASE WHEN @OrdenarPor = 'price_asc' THEN precios.PrecioMinimo END ASC,
    CASE WHEN @OrdenarPor = 'price_desc' THEN precios.PrecioMinimo END DESC,
    p.IDProducto
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

  SELECT v.IDVariante, v.SKU, v.Precio, v.ExistenciaFisica,
         CASE WHEN disp.ExistenciaDisponible < 0 THEN 0 ELSE disp.ExistenciaDisponible END AS ExistenciaDisponible,
         v.Activa, v.UrlImagen
  FROM dbo.Variante AS v
  CROSS APPLY dbo.FU_Inventario_ExistenciaDisponible(v.IDVariante) AS disp
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
