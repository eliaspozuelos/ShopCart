/* ============================================================
   010_Semillas.txt
   Inserta los roles base, crea una cuenta Administrador de
   demostracion si aun no existe uno y agrega datos de prueba
   del catalogo. Solo para desarrollo y pruebas locales.
   Ejecutar despues de crear las tablas y Stored Procedures.
   ============================================================ */
USE ShopCart;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE Nombre = N'Administrador')
  INSERT INTO dbo.Rol (Nombre) VALUES (N'Administrador');

IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE Nombre = N'Operador')
  INSERT INTO dbo.Rol (Nombre) VALUES (N'Operador');

IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE Nombre =  N'Cliente')
  INSERT INTO dbo.Rol (Nombre) VALUES ( N'Cliente');

IF OBJECT_ID(N'dbo.Configuracion', N'U') IS NULL
  THROW 51010, N'Falta la tabla Configuracion. Ejecute primero el script de tablas.', 1;

MERGE dbo.Configuracion AS destino
USING (VALUES
  (N'MONEDA', N'GTQ', N'Moneda en la que se expresan los montos.'),
  (N'SIMBOLO_MONEDA', N'Q', N'Simbolo visual de la moneda.'),
  (N'TASA_IVA', N'0.12', N'Tasa de IVA incluida en los precios publicados.'),
  (N'MINUTOS_CARRITO_ABANDONADO', N'60', N'Minutos sin actividad para considerar un carrito abandonado.'),
  (N'EXISTENCIA_BAJA', N'5', N'Una variante activa con esta existencia o menos se muestra como baja en reportes.')
) AS origen (Clave, Valor, Descripcion)
ON destino.Clave = origen.Clave
WHEN MATCHED THEN
  UPDATE SET Valor = origen.Valor, Descripcion = origen.Descripcion
WHEN NOT MATCHED THEN
  INSERT (Clave, Valor, Descripcion)
  VALUES (origen.Clave, origen.Valor, origen.Descripcion);

/*
  Cuenta publica de demostracion. Solo para desarrollo y pruebas locales.
*/
DECLARE @AdminCorreo NVARCHAR(256) = N'admin@example.com';
DECLARE @AdminContrasenaHash NVARCHAR(255) = N'$2b$12$W0jWVhUK.iN/4pYFS1Jpgu0SPUkeke8n5kZUDJFTLUWB/Y7Q5ZAN2';
DECLARE @AdminNombre NVARCHAR(100) = N'Administrador de prueba';

IF OBJECT_ID(N'dbo.SP_Usuarios_CrearAdministradorInicial', N'P') IS NULL
BEGIN
  THROW 51011, N'No existe SP_Usuarios_CrearAdministradorInicial. Ejecute primero los Stored Procedures del backend.', 1;
END

IF NOT EXISTS (
  SELECT 1
  FROM dbo.Usuario AS u
  INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
  WHERE r.Nombre = N'Administrador'
)
BEGIN
  EXEC dbo.SP_Usuarios_CrearAdministradorInicial
    @Correo = @AdminCorreo,
    @ContrasenaHash = @AdminContrasenaHash,
    @Nombre = @AdminNombre;
END
ELSE
BEGIN
  PRINT N'Ya existe un Administrador. No se creo otro usuario.';
END
GO

/*
  Tipos de ajuste y datos de catalogo para desarrollo y pruebas locales.
  Los nombres y SKU DEMO permiten identificarlos y limpiarlos.
*/
IF OBJECT_ID(N'dbo.Categoria', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Producto', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ProductoImagen', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Atributo', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Variante', N'U') IS NULL
   OR OBJECT_ID(N'dbo.VarianteAtributo', N'U') IS NULL
BEGIN
  THROW 51012, N'Faltan tablas del catalogo. Ejecute primero los scripts de tablas.', 1;
END
GO

IF OBJECT_ID(N'dbo.TipoMovimiento', N'U') IS NULL
   OR OBJECT_ID(N'dbo.MovimientoInventario', N'U') IS NULL
BEGIN
  THROW 51013, N'Faltan las tablas de inventario. Ejecute primero el script de tablas.', 1;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TipoMovimiento WHERE Nombre = N'ENTRADA')
  INSERT INTO dbo.TipoMovimiento (Nombre, Signo) VALUES (N'ENTRADA', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.TipoMovimiento WHERE Nombre = N'SALIDA')
  INSERT INTO dbo.TipoMovimiento (Nombre, Signo) VALUES (N'SALIDA', -1);

IF NOT EXISTS (SELECT 1 FROM dbo.TipoMovimiento WHERE Nombre = N'AJUSTE_POSITIVO')
  INSERT INTO dbo.TipoMovimiento (Nombre, Signo) VALUES (N'AJUSTE_POSITIVO', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.TipoMovimiento WHERE Nombre = N'AJUSTE_NEGATIVO')
  INSERT INTO dbo.TipoMovimiento (Nombre, Signo) VALUES (N'AJUSTE_NEGATIVO', -1);

IF NOT EXISTS (SELECT 1 FROM dbo.TipoMovimiento WHERE Nombre = N'DEVOLUCION')
  INSERT INTO dbo.TipoMovimiento (Nombre, Signo) VALUES (N'DEVOLUCION', 1);
GO

SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE Nombre = N'DEMO - Accesorios')
    INSERT INTO dbo.Categoria (Nombre) VALUES (N'DEMO - Accesorios');

  IF NOT EXISTS (SELECT 1 FROM dbo.Categoria WHERE Nombre = N'DEMO - Ropa')
    INSERT INTO dbo.Categoria (Nombre) VALUES (N'DEMO - Ropa');

  IF NOT EXISTS (SELECT 1 FROM dbo.Atributo WHERE Nombre = N'DEMO - Color')
    INSERT INTO dbo.Atributo (Nombre) VALUES (N'DEMO - Color');

  IF NOT EXISTS (SELECT 1 FROM dbo.Atributo WHERE Nombre = N'DEMO - Talla')
    INSERT INTO dbo.Atributo (Nombre) VALUES (N'DEMO - Talla');

  DECLARE @CategoriaAccesorios INT = (
    SELECT IDCategoria FROM dbo.Categoria WHERE Nombre = N'DEMO - Accesorios'
  );
  DECLARE @CategoriaRopa INT = (
    SELECT IDCategoria FROM dbo.Categoria WHERE Nombre = N'DEMO - Ropa'
  );
  DECLARE @AtributoColor INT = (
    SELECT IDAtributo FROM dbo.Atributo WHERE Nombre = N'DEMO - Color'
  );
  DECLARE @AtributoTalla INT = (
    SELECT IDAtributo FROM dbo.Atributo WHERE Nombre = N'DEMO - Talla'
  );

  IF NOT EXISTS (SELECT 1 FROM dbo.Producto WHERE Nombre = N'DEMO - Audifonos inalambricos')
    INSERT INTO dbo.Producto (IDCategoria, Nombre, Descripcion)
    VALUES (@CategoriaAccesorios, N'DEMO - Audifonos inalambricos',
            N'Producto de demostracion para probar busqueda, detalle e imagenes.');

  IF NOT EXISTS (SELECT 1 FROM dbo.Producto WHERE Nombre = N'DEMO - Camiseta clasica')
    INSERT INTO dbo.Producto (IDCategoria, Nombre, Descripcion)
    VALUES (@CategoriaRopa, N'DEMO - Camiseta clasica',
            N'Producto de demostracion con variantes de color y talla.');

  IF NOT EXISTS (SELECT 1 FROM dbo.Producto WHERE Nombre = N'DEMO - Mochila urbana')
    INSERT INTO dbo.Producto (IDCategoria, Nombre, Descripcion)
    VALUES (@CategoriaAccesorios, N'DEMO - Mochila urbana',
            N'Producto de demostracion adicional para probar paginacion y filtros.');

  DECLARE @ProductoAudifonos INT = (
    SELECT IDProducto FROM dbo.Producto WHERE Nombre = N'DEMO - Audifonos inalambricos'
  );
  DECLARE @ProductoCamiseta INT = (
    SELECT IDProducto FROM dbo.Producto WHERE Nombre = N'DEMO - Camiseta clasica'
  );
  DECLARE @ProductoMochila INT = (
    SELECT IDProducto FROM dbo.Producto WHERE Nombre = N'DEMO - Mochila urbana'
  );

  IF NOT EXISTS (SELECT 1 FROM dbo.Variante WHERE SKU = N'DEMO-AUD-BLK')
    INSERT INTO dbo.Variante (IDProducto, SKU, Precio)
    VALUES (@ProductoAudifonos, N'DEMO-AUD-BLK', 49.99);

  IF NOT EXISTS (SELECT 1 FROM dbo.Variante WHERE SKU = N'DEMO-CAM-AZ-M')
    INSERT INTO dbo.Variante (IDProducto, SKU, Precio)
    VALUES (@ProductoCamiseta, N'DEMO-CAM-AZ-M', 19.99);

  IF NOT EXISTS (SELECT 1 FROM dbo.Variante WHERE SKU = N'DEMO-CAM-AZ-G')
    INSERT INTO dbo.Variante (IDProducto, SKU, Precio)
    VALUES (@ProductoCamiseta, N'DEMO-CAM-AZ-G', 19.99);

  IF NOT EXISTS (SELECT 1 FROM dbo.Variante WHERE SKU = N'DEMO-MOC-GRY')
    INSERT INTO dbo.Variante (IDProducto, SKU, Precio)
    VALUES (@ProductoMochila, N'DEMO-MOC-GRY', 34.50);

  DECLARE @VarianteAudifonos INT = (SELECT IDVariante FROM dbo.Variante WHERE SKU = N'DEMO-AUD-BLK');
  DECLARE @VarianteCamisetaM INT = (SELECT IDVariante FROM dbo.Variante WHERE SKU = N'DEMO-CAM-AZ-M');
  DECLARE @VarianteCamisetaG INT = (SELECT IDVariante FROM dbo.Variante WHERE SKU = N'DEMO-CAM-AZ-G');
  DECLARE @VarianteMochila INT = (SELECT IDVariante FROM dbo.Variante WHERE SKU = N'DEMO-MOC-GRY');

  IF NOT EXISTS (SELECT 1 FROM dbo.VarianteAtributo WHERE IDVariante = @VarianteAudifonos AND IDAtributo = @AtributoColor)
    INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
    VALUES (@VarianteAudifonos, @AtributoColor, N'Negro');

  IF NOT EXISTS (SELECT 1 FROM dbo.VarianteAtributo WHERE IDVariante = @VarianteCamisetaM AND IDAtributo = @AtributoColor)
    INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
    VALUES (@VarianteCamisetaM, @AtributoColor, N'Azul');

  IF NOT EXISTS (SELECT 1 FROM dbo.VarianteAtributo WHERE IDVariante = @VarianteCamisetaM AND IDAtributo = @AtributoTalla)
    INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
    VALUES (@VarianteCamisetaM, @AtributoTalla, N'M');

  IF NOT EXISTS (SELECT 1 FROM dbo.VarianteAtributo WHERE IDVariante = @VarianteCamisetaG AND IDAtributo = @AtributoColor)
    INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
    VALUES (@VarianteCamisetaG, @AtributoColor, N'Azul');

  IF NOT EXISTS (SELECT 1 FROM dbo.VarianteAtributo WHERE IDVariante = @VarianteCamisetaG AND IDAtributo = @AtributoTalla)
    INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
    VALUES (@VarianteCamisetaG, @AtributoTalla, N'G');

  IF NOT EXISTS (SELECT 1 FROM dbo.VarianteAtributo WHERE IDVariante = @VarianteMochila AND IDAtributo = @AtributoColor)
    INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
    VALUES (@VarianteMochila, @AtributoColor, N'Gris');

  IF NOT EXISTS (SELECT 1 FROM dbo.ProductoImagen WHERE IDProducto = @ProductoAudifonos AND Url = N'https://placehold.co/600x600?text=DEMO+Audifonos')
    INSERT INTO dbo.ProductoImagen (IDProducto, Url, Orden)
    VALUES (@ProductoAudifonos, N'https://placehold.co/600x600?text=DEMO+Audifonos', 0);

  IF NOT EXISTS (SELECT 1 FROM dbo.ProductoImagen WHERE IDProducto = @ProductoCamiseta AND Url = N'https://placehold.co/600x600?text=DEMO+Camiseta')
    INSERT INTO dbo.ProductoImagen (IDProducto, Url, Orden)
    VALUES (@ProductoCamiseta, N'https://placehold.co/600x600?text=DEMO+Camiseta', 0);

  IF NOT EXISTS (SELECT 1 FROM dbo.ProductoImagen WHERE IDProducto = @ProductoMochila AND Url = N'https://placehold.co/600x600?text=DEMO+Mochila')
    INSERT INTO dbo.ProductoImagen (IDProducto, Url, Orden)
    VALUES (@ProductoMochila, N'https://placehold.co/600x600?text=DEMO+Mochila', 0);

  IF OBJECT_ID(N'dbo.Cupon', N'U') IS NOT NULL
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.Cupon WHERE Codigo = N'DEMO-10')
      INSERT INTO dbo.Cupon (
        Codigo, Tipo, Valor, MontoMinimo, VigenteDesde, VigenteHasta,
        LimiteUsosTotal, LimiteUsosPorCliente, IDCategoria, Activo
      )
      VALUES (
        N'DEMO-10', N'PORCENTAJE', 10.00, 50.00,
        DATEADD(DAY, -1, SYSUTCDATETIME()), DATEADD(YEAR, 1, SYSUTCDATETIME()),
        500, 3, NULL, 1
      );

    IF NOT EXISTS (SELECT 1 FROM dbo.Cupon WHERE Codigo = N'DEMO-ROPA25')
      INSERT INTO dbo.Cupon (
        Codigo, Tipo, Valor, MontoMinimo, VigenteDesde, VigenteHasta,
        LimiteUsosTotal, LimiteUsosPorCliente, IDCategoria, Activo
      )
      VALUES (
        N'DEMO-ROPA25', N'MONTO', 25.00, 40.00,
        DATEADD(DAY, -1, SYSUTCDATETIME()), DATEADD(YEAR, 1, SYSUTCDATETIME()),
        200, 2, @CategoriaRopa, 1
      );
  END

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH
GO
