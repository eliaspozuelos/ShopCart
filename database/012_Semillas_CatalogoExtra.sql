/* ============================================================
   012_Semillas_CatalogoExtra.sql
   Agrega 5 categorias DEMO con 10 productos cada una.
   Cada producto trae varias variantes, atributos, imagen y
   una entrada de inventario para que se puedan comprar.
   Idempotente: se puede ejecutar mas de una vez.
   Ejecutar despues de 010_Semillas.sql.
   ============================================================ */
USE ShopCart;
GO

IF OBJECT_ID(N'dbo.Categoria', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Producto', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ProductoImagen', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Atributo', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Variante', N'U') IS NULL
   OR OBJECT_ID(N'dbo.VarianteAtributo', N'U') IS NULL
   OR OBJECT_ID(N'dbo.TipoMovimiento', N'U') IS NULL
   OR OBJECT_ID(N'dbo.MovimientoInventario', N'U') IS NULL
BEGIN
  THROW 51017, N'Faltan tablas de catalogo o inventario. Ejecute primero los scripts de tablas y 010_Semillas.sql.', 1;
END
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  DECLARE @Atributos TABLE (
    Codigo NVARCHAR(3) NOT NULL PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL
  );

  INSERT INTO @Atributos (Codigo, Nombre)
  VALUES
    (N'COL', N'DEMO - Color'),
    (N'TAL', N'DEMO - Talla'),
    (N'MAT', N'DEMO - Material'),
    (N'CAP', N'DEMO - Capacidad'),
    (N'PRE', N'DEMO - Presentacion'),
    (N'MOD', N'DEMO - Modelo');

  DECLARE @Catalogo TABLE (
    Categoria NVARCHAR(100) NOT NULL,
    Producto NVARCHAR(150) NOT NULL,
    Descripcion NVARCHAR(2000) NOT NULL,
    Imagen NVARCHAR(120) NOT NULL,
    SKU NVARCHAR(50) NOT NULL PRIMARY KEY,
    Precio DECIMAL(18, 2) NOT NULL,
    Existencia INT NOT NULL,
    Atributo1 NVARCHAR(3) NOT NULL,
    Valor1 NVARCHAR(100) NOT NULL,
    Atributo2 NVARCHAR(3) NULL,
    Valor2 NVARCHAR(100) NULL
  );

  INSERT INTO @Catalogo (
    Categoria, Producto, Descripcion, Imagen, SKU, Precio, Existencia,
    Atributo1, Valor1, Atributo2, Valor2
  )
  VALUES
    (N'DEMO - Calzado', N'DEMO - Tenis runner', N'Tenis ligeros para uso diario y caminatas.', N'DEMO+Tenis+runner', N'DEMO-CAL01-NEG-40', 449.00, 20, N'COL', N'Negro', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Tenis runner', N'Tenis ligeros para uso diario y caminatas.', N'DEMO+Tenis+runner', N'DEMO-CAL01-BLA-41', 449.00, 14, N'COL', N'Blanco', N'TAL', N'41'),
    (N'DEMO - Calzado', N'DEMO - Tenis runner', N'Tenis ligeros para uso diario y caminatas.', N'DEMO+Tenis+runner', N'DEMO-CAL01-AZU-42', 459.00, 8, N'COL', N'Azul', N'TAL', N'42'),
    (N'DEMO - Calzado', N'DEMO - Zapatilla urbana', N'Zapatilla comoda para uso en la ciudad.', N'DEMO+Zapatilla+urbana', N'DEMO-CAL02-NEG-38', 329.00, 16, N'COL', N'Negro', N'TAL', N'38'),
    (N'DEMO - Calzado', N'DEMO - Zapatilla urbana', N'Zapatilla comoda para uso en la ciudad.', N'DEMO+Zapatilla+urbana', N'DEMO-CAL02-GRI-39', 329.00, 11, N'COL', N'Gris', N'TAL', N'39'),
    (N'DEMO - Calzado', N'DEMO - Zapatilla urbana', N'Zapatilla comoda para uso en la ciudad.', N'DEMO+Zapatilla+urbana', N'DEMO-CAL02-BLA-40', 339.00, 6, N'COL', N'Blanco', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Bota de cuero', N'Bota resistente para lluvia ligera.', N'DEMO+Bota+cuero', N'DEMO-CAL03-CAF-40', 589.00, 10, N'COL', N'Cafe', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Bota de cuero', N'Bota resistente para lluvia ligera.', N'DEMO+Bota+cuero', N'DEMO-CAL03-NEG-41', 589.00, 9, N'COL', N'Negro', N'TAL', N'41'),
    (N'DEMO - Calzado', N'DEMO - Bota de cuero', N'Bota resistente para lluvia ligera.', N'DEMO+Bota+cuero', N'DEMO-CAL03-CAF-42', 599.00, 4, N'COL', N'Cafe', N'TAL', N'42'),
    (N'DEMO - Calzado', N'DEMO - Sandalia de playa', N'Sandalia ligera para clima calido.', N'DEMO+Sandalia', N'DEMO-CAL04-AZU-36', 129.00, 25, N'COL', N'Azul', N'TAL', N'36'),
    (N'DEMO - Calzado', N'DEMO - Sandalia de playa', N'Sandalia ligera para clima calido.', N'DEMO+Sandalia', N'DEMO-CAL04-ROS-37', 129.00, 18, N'COL', N'Rosa', N'TAL', N'37'),
    (N'DEMO - Calzado', N'DEMO - Sandalia de playa', N'Sandalia ligera para clima calido.', N'DEMO+Sandalia', N'DEMO-CAL04-NEG-38', 129.00, 12, N'COL', N'Negro', N'TAL', N'38'),
    (N'DEMO - Calzado', N'DEMO - Zapato formal', N'Zapato de vestir con acabado liso.', N'DEMO+Zapato+formal', N'DEMO-CAL05-NEG-40', 679.00, 8, N'COL', N'Negro', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Zapato formal', N'Zapato de vestir con acabado liso.', N'DEMO+Zapato+formal', N'DEMO-CAL05-CAF-41', 679.00, 7, N'COL', N'Cafe', N'TAL', N'41'),
    (N'DEMO - Calzado', N'DEMO - Zapato formal', N'Zapato de vestir con acabado liso.', N'DEMO+Zapato+formal', N'DEMO-CAL05-NEG-42', 689.00, 5, N'COL', N'Negro', N'TAL', N'42'),
    (N'DEMO - Calzado', N'DEMO - Tenis de cancha', N'Tenis con suela para pista.', N'DEMO+Tenis+cancha', N'DEMO-CAL06-BLA-39', 399.00, 15, N'COL', N'Blanco', N'TAL', N'39'),
    (N'DEMO - Calzado', N'DEMO - Tenis de cancha', N'Tenis con suela para pista.', N'DEMO+Tenis+cancha', N'DEMO-CAL06-ROJ-40', 399.00, 10, N'COL', N'Rojo', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Tenis de cancha', N'Tenis con suela para pista.', N'DEMO+Tenis+cancha', N'DEMO-CAL06-NEG-41', 409.00, 6, N'COL', N'Negro', N'TAL', N'41'),
    (N'DEMO - Calzado', N'DEMO - Mocasin clasico', N'Mocasin flexible para uso diario.', N'DEMO+Mocasin', N'DEMO-CAL07-CAF-40', 459.00, 12, N'COL', N'Cafe', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Mocasin clasico', N'Mocasin flexible para uso diario.', N'DEMO+Mocasin', N'DEMO-CAL07-NEG-41', 459.00, 9, N'COL', N'Negro', N'TAL', N'41'),
    (N'DEMO - Calzado', N'DEMO - Mocasin clasico', N'Mocasin flexible para uso diario.', N'DEMO+Mocasin', N'DEMO-CAL07-BEI-42', 469.00, 4, N'COL', N'Beige', N'TAL', N'42'),
    (N'DEMO - Calzado', N'DEMO - Botin casual', N'Botin de media cana para temporada fresca.', N'DEMO+Botin', N'DEMO-CAL08-NEG-39', 519.00, 11, N'COL', N'Negro', N'TAL', N'39'),
    (N'DEMO - Calzado', N'DEMO - Botin casual', N'Botin de media cana para temporada fresca.', N'DEMO+Botin', N'DEMO-CAL08-GRI-40', 519.00, 8, N'COL', N'Gris', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Botin casual', N'Botin de media cana para temporada fresca.', N'DEMO+Botin', N'DEMO-CAL08-CAF-41', 529.00, 5, N'COL', N'Cafe', N'TAL', N'41'),
    (N'DEMO - Calzado', N'DEMO - Chancla basica', N'Chancla antideslizante para casa y playa.', N'DEMO+Chancla', N'DEMO-CAL09-NEG-38', 79.00, 30, N'COL', N'Negro', N'TAL', N'38'),
    (N'DEMO - Calzado', N'DEMO - Chancla basica', N'Chancla antideslizante para casa y playa.', N'DEMO+Chancla', N'DEMO-CAL09-AZU-40', 79.00, 22, N'COL', N'Azul', N'TAL', N'40'),
    (N'DEMO - Calzado', N'DEMO - Chancla basica', N'Chancla antideslizante para casa y playa.', N'DEMO+Chancla', N'DEMO-CAL09-VER-42', 79.00, 16, N'COL', N'Verde', N'TAL', N'42'),
    (N'DEMO - Calzado', N'DEMO - Zapato escolar', N'Zapato negro de uso escolar.', N'DEMO+Zapato+escolar', N'DEMO-CAL10-NEG-34', 249.00, 18, N'COL', N'Negro', N'TAL', N'34'),
    (N'DEMO - Calzado', N'DEMO - Zapato escolar', N'Zapato negro de uso escolar.', N'DEMO+Zapato+escolar', N'DEMO-CAL10-NEG-36', 259.00, 14, N'COL', N'Negro', N'TAL', N'36'),
    (N'DEMO - Calzado', N'DEMO - Zapato escolar', N'Zapato negro de uso escolar.', N'DEMO+Zapato+escolar', N'DEMO-CAL10-NEG-38', 269.00, 9, N'COL', N'Negro', N'TAL', N'38'),
    (N'DEMO - Hogar', N'DEMO - Juego de sabanas', N'Juego de sabanas para cama matrimonial.', N'DEMO+Sabanas', N'DEMO-HOG01-BLA-ALG', 189.00, 20, N'COL', N'Blanco', N'MAT', N'Algodon'),
    (N'DEMO - Hogar', N'DEMO - Juego de sabanas', N'Juego de sabanas para cama matrimonial.', N'DEMO+Sabanas', N'DEMO-HOG01-GRI-LIN', 199.00, 12, N'COL', N'Gris', N'MAT', N'Lino'),
    (N'DEMO - Hogar', N'DEMO - Juego de sabanas', N'Juego de sabanas para cama matrimonial.', N'DEMO+Sabanas', N'DEMO-HOG01-BEI-MIC', 179.00, 8, N'COL', N'Beige', N'MAT', N'Microfibra'),
    (N'DEMO - Hogar', N'DEMO - Lampara de mesa', N'Lampara con pantalla de tela.', N'DEMO+Lampara', N'DEMO-HOG02-NEG-MET', 249.00, 10, N'COL', N'Negro', N'MAT', N'Metal'),
    (N'DEMO - Hogar', N'DEMO - Lampara de mesa', N'Lampara con pantalla de tela.', N'DEMO+Lampara', N'DEMO-HOG02-BLA-MAD', 259.00, 7, N'COL', N'Blanco', N'MAT', N'Madera'),
    (N'DEMO - Hogar', N'DEMO - Lampara de mesa', N'Lampara con pantalla de tela.', N'DEMO+Lampara', N'DEMO-HOG02-GRI-MET', 249.00, 5, N'COL', N'Gris', N'MAT', N'Metal'),
    (N'DEMO - Hogar', N'DEMO - Cojin decorativo', N'Cojin suave para sala.', N'DEMO+Cojin', N'DEMO-HOG03-AZU-ALG', 69.00, 24, N'COL', N'Azul', N'MAT', N'Algodon'),
    (N'DEMO - Hogar', N'DEMO - Cojin decorativo', N'Cojin suave para sala.', N'DEMO+Cojin', N'DEMO-HOG03-ROJ-LIN', 75.00, 15, N'COL', N'Rojo', N'MAT', N'Lino'),
    (N'DEMO - Hogar', N'DEMO - Cojin decorativo', N'Cojin suave para sala.', N'DEMO+Cojin', N'DEMO-HOG03-BEI-MIC', 65.00, 11, N'COL', N'Beige', N'MAT', N'Microfibra'),
    (N'DEMO - Hogar', N'DEMO - Toalla de bano', N'Toalla grande de secado rapido.', N'DEMO+Toalla', N'DEMO-HOG04-BLA-ALG', 89.00, 28, N'COL', N'Blanco', N'MAT', N'Algodon'),
    (N'DEMO - Hogar', N'DEMO - Toalla de bano', N'Toalla grande de secado rapido.', N'DEMO+Toalla', N'DEMO-HOG04-AZU-ALG', 89.00, 18, N'COL', N'Azul', N'MAT', N'Algodon'),
    (N'DEMO - Hogar', N'DEMO - Toalla de bano', N'Toalla grande de secado rapido.', N'DEMO+Toalla', N'DEMO-HOG04-GRI-MIC', 79.00, 10, N'COL', N'Gris', N'MAT', N'Microfibra'),
    (N'DEMO - Hogar', N'DEMO - Cortina blackout', N'Cortina que bloquea la luz de la recamara.', N'DEMO+Cortina', N'DEMO-HOG05-NEG-POL', 159.00, 12, N'COL', N'Negro', N'MAT', N'Poliester'),
    (N'DEMO - Hogar', N'DEMO - Cortina blackout', N'Cortina que bloquea la luz de la recamara.', N'DEMO+Cortina', N'DEMO-HOG05-GRI-POL', 159.00, 9, N'COL', N'Gris', N'MAT', N'Poliester'),
    (N'DEMO - Hogar', N'DEMO - Cortina blackout', N'Cortina que bloquea la luz de la recamara.', N'DEMO+Cortina', N'DEMO-HOG05-BEI-LIN', 169.00, 6, N'COL', N'Beige', N'MAT', N'Lino'),
    (N'DEMO - Hogar', N'DEMO - Alfombra pequena', N'Alfombra para recamara o sala.', N'DEMO+Alfombra', N'DEMO-HOG06-GRI-MIC', 219.00, 8, N'COL', N'Gris', N'MAT', N'Microfibra'),
    (N'DEMO - Hogar', N'DEMO - Alfombra pequena', N'Alfombra para recamara o sala.', N'DEMO+Alfombra', N'DEMO-HOG06-BEI-ALG', 229.00, 6, N'COL', N'Beige', N'MAT', N'Algodon'),
    (N'DEMO - Hogar', N'DEMO - Alfombra pequena', N'Alfombra para recamara o sala.', N'DEMO+Alfombra', N'DEMO-HOG06-AZU-MIC', 219.00, 4, N'COL', N'Azul', N'MAT', N'Microfibra'),
    (N'DEMO - Hogar', N'DEMO - Organizador de closet', N'Caja plegable para guardar ropa.', N'DEMO+Organizador', N'DEMO-HOG07-BLA-TEL', 99.00, 20, N'COL', N'Blanco', N'MAT', N'Tela'),
    (N'DEMO - Hogar', N'DEMO - Organizador de closet', N'Caja plegable para guardar ropa.', N'DEMO+Organizador', N'DEMO-HOG07-GRI-TEL', 99.00, 14, N'COL', N'Gris', N'MAT', N'Tela'),
    (N'DEMO - Hogar', N'DEMO - Organizador de closet', N'Caja plegable para guardar ropa.', N'DEMO+Organizador', N'DEMO-HOG07-NEG-TEL', 109.00, 7, N'COL', N'Negro', N'MAT', N'Tela'),
    (N'DEMO - Hogar', N'DEMO - Vaso termico', N'Vaso que conserva la temperatura de la bebida.', N'DEMO+Vaso+termico', N'DEMO-HOG08-NEG-ACE', 119.00, 16, N'COL', N'Negro', N'MAT', N'Acero'),
    (N'DEMO - Hogar', N'DEMO - Vaso termico', N'Vaso que conserva la temperatura de la bebida.', N'DEMO+Vaso+termico', N'DEMO-HOG08-BLA-ACE', 119.00, 11, N'COL', N'Blanco', N'MAT', N'Acero'),
    (N'DEMO - Hogar', N'DEMO - Vaso termico', N'Vaso que conserva la temperatura de la bebida.', N'DEMO+Vaso+termico', N'DEMO-HOG08-ROJ-ACE', 125.00, 6, N'COL', N'Rojo', N'MAT', N'Acero'),
    (N'DEMO - Hogar', N'DEMO - Set de sartenes', N'Juego de tres sartenes para cocina.', N'DEMO+Sartenes', N'DEMO-HOG09-NEG-ALU', 349.00, 9, N'COL', N'Negro', N'MAT', N'Aluminio'),
    (N'DEMO - Hogar', N'DEMO - Set de sartenes', N'Juego de tres sartenes para cocina.', N'DEMO+Sartenes', N'DEMO-HOG09-ROJ-ALU', 359.00, 6, N'COL', N'Rojo', N'MAT', N'Aluminio'),
    (N'DEMO - Hogar', N'DEMO - Set de sartenes', N'Juego de tres sartenes para cocina.', N'DEMO+Sartenes', N'DEMO-HOG09-GRI-ACE', 389.00, 4, N'COL', N'Gris', N'MAT', N'Acero'),
    (N'DEMO - Hogar', N'DEMO - Reloj de pared', N'Reloj silencioso para la sala.', N'DEMO+Reloj', N'DEMO-HOG10-NEG-MAD', 149.00, 10, N'COL', N'Negro', N'MAT', N'Madera'),
    (N'DEMO - Hogar', N'DEMO - Reloj de pared', N'Reloj silencioso para la sala.', N'DEMO+Reloj', N'DEMO-HOG10-BLA-MAD', 149.00, 8, N'COL', N'Blanco', N'MAT', N'Madera'),
    (N'DEMO - Hogar', N'DEMO - Reloj de pared', N'Reloj silencioso para la sala.', N'DEMO+Reloj', N'DEMO-HOG10-CAF-MAD', 155.00, 5, N'COL', N'Cafe', N'MAT', N'Madera'),
    (N'DEMO - Electronica', N'DEMO - Power bank', N'Bateria portatil para cargar el telefono.', N'DEMO+Power+bank', N'DEMO-ELE01-NEG-10K', 149.00, 22, N'COL', N'Negro', N'CAP', N'10000 mAh'),
    (N'DEMO - Electronica', N'DEMO - Power bank', N'Bateria portatil para cargar el telefono.', N'DEMO+Power+bank', N'DEMO-ELE01-BLA-20K', 199.00, 15, N'COL', N'Blanco', N'CAP', N'20000 mAh'),
    (N'DEMO - Electronica', N'DEMO - Power bank', N'Bateria portatil para cargar el telefono.', N'DEMO+Power+bank', N'DEMO-ELE01-NEG-30K', 249.00, 8, N'COL', N'Negro', N'CAP', N'30000 mAh'),
    (N'DEMO - Electronica', N'DEMO - Bocina bluetooth', N'Bocina portatil con conexion inalambrica.', N'DEMO+Bocina', N'DEMO-ELE02-NEG-5W', 179.00, 18, N'COL', N'Negro', N'CAP', N'5 W'),
    (N'DEMO - Electronica', N'DEMO - Bocina bluetooth', N'Bocina portatil con conexion inalambrica.', N'DEMO+Bocina', N'DEMO-ELE02-AZU-10W', 229.00, 12, N'COL', N'Azul', N'CAP', N'10 W'),
    (N'DEMO - Electronica', N'DEMO - Bocina bluetooth', N'Bocina portatil con conexion inalambrica.', N'DEMO+Bocina', N'DEMO-ELE02-ROJ-20W', 299.00, 6, N'COL', N'Rojo', N'CAP', N'20 W'),
    (N'DEMO - Electronica', N'DEMO - Disco externo', N'Almacenamiento portatil por USB.', N'DEMO+Disco+externo', N'DEMO-ELE03-NEG-500', 289.00, 14, N'COL', N'Negro', N'CAP', N'500 GB'),
    (N'DEMO - Electronica', N'DEMO - Disco externo', N'Almacenamiento portatil por USB.', N'DEMO+Disco+externo', N'DEMO-ELE03-NEG-1TB', 399.00, 10, N'COL', N'Negro', N'CAP', N'1 TB'),
    (N'DEMO - Electronica', N'DEMO - Disco externo', N'Almacenamiento portatil por USB.', N'DEMO+Disco+externo', N'DEMO-ELE03-GRI-2TB', 549.00, 5, N'COL', N'Gris', N'CAP', N'2 TB'),
    (N'DEMO - Electronica', N'DEMO - Cargador rapido', N'Cargador de pared con puerto USB-C.', N'DEMO+Cargador', N'DEMO-ELE04-BLA-20W', 89.00, 30, N'COL', N'Blanco', N'CAP', N'20 W'),
    (N'DEMO - Electronica', N'DEMO - Cargador rapido', N'Cargador de pared con puerto USB-C.', N'DEMO+Cargador', N'DEMO-ELE04-NEG-30W', 119.00, 18, N'COL', N'Negro', N'CAP', N'30 W'),
    (N'DEMO - Electronica', N'DEMO - Cargador rapido', N'Cargador de pared con puerto USB-C.', N'DEMO+Cargador', N'DEMO-ELE04-NEG-65W', 169.00, 9, N'COL', N'Negro', N'CAP', N'65 W'),
    (N'DEMO - Electronica', N'DEMO - Memoria USB', N'Memoria flash para documentos y fotos.', N'DEMO+Memoria+USB', N'DEMO-ELE05-NEG-32', 49.00, 40, N'COL', N'Negro', N'CAP', N'32 GB'),
    (N'DEMO - Electronica', N'DEMO - Memoria USB', N'Memoria flash para documentos y fotos.', N'DEMO+Memoria+USB', N'DEMO-ELE05-AZU-64', 69.00, 26, N'COL', N'Azul', N'CAP', N'64 GB'),
    (N'DEMO - Electronica', N'DEMO - Memoria USB', N'Memoria flash para documentos y fotos.', N'DEMO+Memoria+USB', N'DEMO-ELE05-ROJ-128', 99.00, 12, N'COL', N'Rojo', N'CAP', N'128 GB'),
    (N'DEMO - Electronica', N'DEMO - Audifonos studio', N'Audifonos de diadema para escuchar musica.', N'DEMO+Audifonos+studio', N'DEMO-ELE06-NEG-BAS', 259.00, 12, N'COL', N'Negro', N'MOD', N'Basico'),
    (N'DEMO - Electronica', N'DEMO - Audifonos studio', N'Audifonos de diadema para escuchar musica.', N'DEMO+Audifonos+studio', N'DEMO-ELE06-BLA-PLU', 329.00, 8, N'COL', N'Blanco', N'MOD', N'Plus'),
    (N'DEMO - Electronica', N'DEMO - Audifonos studio', N'Audifonos de diadema para escuchar musica.', N'DEMO+Audifonos+studio', N'DEMO-ELE06-NEG-PRO', 449.00, 4, N'COL', N'Negro', N'MOD', N'Pro'),
    (N'DEMO - Electronica', N'DEMO - Teclado compacto', N'Teclado pequeno para el escritorio.', N'DEMO+Teclado', N'DEMO-ELE07-NEG-BAS', 189.00, 15, N'COL', N'Negro', N'MOD', N'Basico'),
    (N'DEMO - Electronica', N'DEMO - Teclado compacto', N'Teclado pequeno para el escritorio.', N'DEMO+Teclado', N'DEMO-ELE07-BLA-PLU', 249.00, 9, N'COL', N'Blanco', N'MOD', N'Plus'),
    (N'DEMO - Electronica', N'DEMO - Teclado compacto', N'Teclado pequeno para el escritorio.', N'DEMO+Teclado', N'DEMO-ELE07-GRI-PRO', 319.00, 5, N'COL', N'Gris', N'MOD', N'Pro'),
    (N'DEMO - Electronica', N'DEMO - Mouse ergonomico', N'Mouse comodo para uso prolongado.', N'DEMO+Mouse', N'DEMO-ELE08-NEG-BAS', 99.00, 24, N'COL', N'Negro', N'MOD', N'Basico'),
    (N'DEMO - Electronica', N'DEMO - Mouse ergonomico', N'Mouse comodo para uso prolongado.', N'DEMO+Mouse', N'DEMO-ELE08-BLA-PLU', 139.00, 14, N'COL', N'Blanco', N'MOD', N'Plus'),
    (N'DEMO - Electronica', N'DEMO - Mouse ergonomico', N'Mouse comodo para uso prolongado.', N'DEMO+Mouse', N'DEMO-ELE08-GRI-PRO', 189.00, 7, N'COL', N'Gris', N'MOD', N'Pro'),
    (N'DEMO - Electronica', N'DEMO - Webcam HD', N'Camara para videollamadas.', N'DEMO+Webcam', N'DEMO-ELE09-NEG-720', 159.00, 16, N'COL', N'Negro', N'MOD', N'720p'),
    (N'DEMO - Electronica', N'DEMO - Webcam HD', N'Camara para videollamadas.', N'DEMO+Webcam', N'DEMO-ELE09-NEG-1080', 229.00, 11, N'COL', N'Negro', N'MOD', N'1080p'),
    (N'DEMO - Electronica', N'DEMO - Webcam HD', N'Camara para videollamadas.', N'DEMO+Webcam', N'DEMO-ELE09-BLA-4K', 499.00, 3, N'COL', N'Blanco', N'MOD', N'4K'),
    (N'DEMO - Electronica', N'DEMO - Smartwatch fit', N'Reloj para actividad y notificaciones.', N'DEMO+Smartwatch', N'DEMO-ELE10-NEG-42', 599.00, 10, N'COL', N'Negro', N'TAL', N'42 mm'),
    (N'DEMO - Electronica', N'DEMO - Smartwatch fit', N'Reloj para actividad y notificaciones.', N'DEMO+Smartwatch', N'DEMO-ELE10-NEG-44', 649.00, 8, N'COL', N'Negro', N'TAL', N'44 mm'),
    (N'DEMO - Electronica', N'DEMO - Smartwatch fit', N'Reloj para actividad y notificaciones.', N'DEMO+Smartwatch', N'DEMO-ELE10-PLA-46', 699.00, 4, N'COL', N'Plata', N'TAL', N'46 mm'),
    (N'DEMO - Deportes', N'DEMO - Playera dry fit', N'Playera ligera para entrenar.', N'DEMO+Playera+dry', N'DEMO-DEP01-NEG-S', 129.00, 18, N'COL', N'Negro', N'TAL', N'S'),
    (N'DEMO - Deportes', N'DEMO - Playera dry fit', N'Playera ligera para entrenar.', N'DEMO+Playera+dry', N'DEMO-DEP01-AZU-M', 129.00, 22, N'COL', N'Azul', N'TAL', N'M'),
    (N'DEMO - Deportes', N'DEMO - Playera dry fit', N'Playera ligera para entrenar.', N'DEMO+Playera+dry', N'DEMO-DEP01-ROJ-L', 139.00, 10, N'COL', N'Rojo', N'TAL', N'L'),
    (N'DEMO - Deportes', N'DEMO - Short running', N'Short comodo para correr.', N'DEMO+Short+running', N'DEMO-DEP02-NEG-S', 99.00, 16, N'COL', N'Negro', N'TAL', N'S'),
    (N'DEMO - Deportes', N'DEMO - Short running', N'Short comodo para correr.', N'DEMO+Short+running', N'DEMO-DEP02-GRI-M', 99.00, 20, N'COL', N'Gris', N'TAL', N'M'),
    (N'DEMO - Deportes', N'DEMO - Short running', N'Short comodo para correr.', N'DEMO+Short+running', N'DEMO-DEP02-AZU-L', 109.00, 9, N'COL', N'Azul', N'TAL', N'L'),
    (N'DEMO - Deportes', N'DEMO - Leggings deporte', N'Leggings elasticos para ejercicio.', N'DEMO+Leggings', N'DEMO-DEP03-NEG-S', 149.00, 14, N'COL', N'Negro', N'TAL', N'S'),
    (N'DEMO - Deportes', N'DEMO - Leggings deporte', N'Leggings elasticos para ejercicio.', N'DEMO+Leggings', N'DEMO-DEP03-NEG-M', 149.00, 17, N'COL', N'Negro', N'TAL', N'M'),
    (N'DEMO - Deportes', N'DEMO - Leggings deporte', N'Leggings elasticos para ejercicio.', N'DEMO+Leggings', N'DEMO-DEP03-MOR-L', 159.00, 6, N'COL', N'Morado', N'TAL', N'L'),
    (N'DEMO - Deportes', N'DEMO - Sudadera ligera', N'Sudadera delgada para calentar.', N'DEMO+Sudadera', N'DEMO-DEP04-GRI-M', 219.00, 12, N'COL', N'Gris', N'TAL', N'M'),
    (N'DEMO - Deportes', N'DEMO - Sudadera ligera', N'Sudadera delgada para calentar.', N'DEMO+Sudadera', N'DEMO-DEP04-NEG-L', 219.00, 10, N'COL', N'Negro', N'TAL', N'L'),
    (N'DEMO - Deportes', N'DEMO - Sudadera ligera', N'Sudadera delgada para calentar.', N'DEMO+Sudadera', N'DEMO-DEP04-AZU-XL', 229.00, 5, N'COL', N'Azul', N'TAL', N'XL'),
    (N'DEMO - Deportes', N'DEMO - Guantes de gym', N'Guantes para pesas y barras.', N'DEMO+Guantes+gym', N'DEMO-DEP05-NEG-S', 89.00, 15, N'COL', N'Negro', N'TAL', N'S'),
    (N'DEMO - Deportes', N'DEMO - Guantes de gym', N'Guantes para pesas y barras.', N'DEMO+Guantes+gym', N'DEMO-DEP05-NEG-M', 89.00, 18, N'COL', N'Negro', N'TAL', N'M'),
    (N'DEMO - Deportes', N'DEMO - Guantes de gym', N'Guantes para pesas y barras.', N'DEMO+Guantes+gym', N'DEMO-DEP05-ROJ-L', 95.00, 7, N'COL', N'Rojo', N'TAL', N'L'),
    (N'DEMO - Deportes', N'DEMO - Gorra deportiva', N'Gorra para sol durante el entrenamiento.', N'DEMO+Gorra', N'DEMO-DEP06-NEG-UNI', 69.00, 24, N'COL', N'Negro', N'TAL', N'Unica'),
    (N'DEMO - Deportes', N'DEMO - Gorra deportiva', N'Gorra para sol durante el entrenamiento.', N'DEMO+Gorra', N'DEMO-DEP06-BLA-UNI', 69.00, 16, N'COL', N'Blanco', N'TAL', N'Unica'),
    (N'DEMO - Deportes', N'DEMO - Gorra deportiva', N'Gorra para sol durante el entrenamiento.', N'DEMO+Gorra', N'DEMO-DEP06-AZU-UNI', 75.00, 11, N'COL', N'Azul', N'TAL', N'Unica'),
    (N'DEMO - Deportes', N'DEMO - Balon de futbol', N'Balon para partido o entrenamiento.', N'DEMO+Balon', N'DEMO-DEP07-BLA-N4', 149.00, 12, N'COL', N'Blanco', N'MOD', N'No. 4'),
    (N'DEMO - Deportes', N'DEMO - Balon de futbol', N'Balon para partido o entrenamiento.', N'DEMO+Balon', N'DEMO-DEP07-BLA-N5', 169.00, 15, N'COL', N'Blanco', N'MOD', N'No. 5'),
    (N'DEMO - Deportes', N'DEMO - Balon de futbol', N'Balon para partido o entrenamiento.', N'DEMO+Balon', N'DEMO-DEP07-AMA-SAL', 139.00, 8, N'COL', N'Amarillo', N'MOD', N'Sala'),
    (N'DEMO - Deportes', N'DEMO - Botella deportiva', N'Botella reutilizable para entrenar.', N'DEMO+Botella', N'DEMO-DEP08-AZU-500', 59.00, 28, N'COL', N'Azul', N'CAP', N'500 ml'),
    (N'DEMO - Deportes', N'DEMO - Botella deportiva', N'Botella reutilizable para entrenar.', N'DEMO+Botella', N'DEMO-DEP08-NEG-750', 69.00, 20, N'COL', N'Negro', N'CAP', N'750 ml'),
    (N'DEMO - Deportes', N'DEMO - Botella deportiva', N'Botella reutilizable para entrenar.', N'DEMO+Botella', N'DEMO-DEP08-VER-1L', 79.00, 12, N'COL', N'Verde', N'CAP', N'1 L'),
    (N'DEMO - Deportes', N'DEMO - Cuerda para saltar', N'Cuerda ajustable para cardio.', N'DEMO+Cuerda', N'DEMO-DEP09-NEG-PVC', 45.00, 26, N'COL', N'Negro', N'MAT', N'PVC'),
    (N'DEMO - Deportes', N'DEMO - Cuerda para saltar', N'Cuerda ajustable para cardio.', N'DEMO+Cuerda', N'DEMO-DEP09-ROJ-ACE', 79.00, 14, N'COL', N'Rojo', N'MAT', N'Acero'),
    (N'DEMO - Deportes', N'DEMO - Cuerda para saltar', N'Cuerda ajustable para cardio.', N'DEMO+Cuerda', N'DEMO-DEP09-NEG-ALG', 39.00, 18, N'COL', N'Negro', N'MAT', N'Algodon'),
    (N'DEMO - Deportes', N'DEMO - Bandas elasticas', N'Bandas de resistencia para fuerza.', N'DEMO+Bandas', N'DEMO-DEP10-AMA-LIG', 55.00, 20, N'COL', N'Amarillo', N'MOD', N'Ligera'),
    (N'DEMO - Deportes', N'DEMO - Bandas elasticas', N'Bandas de resistencia para fuerza.', N'DEMO+Bandas', N'DEMO-DEP10-ROJ-MED', 65.00, 16, N'COL', N'Rojo', N'MOD', N'Media'),
    (N'DEMO - Deportes', N'DEMO - Bandas elasticas', N'Bandas de resistencia para fuerza.', N'DEMO+Bandas', N'DEMO-DEP10-NEG-FUE', 75.00, 9, N'COL', N'Negro', N'MOD', N'Fuerte'),
    (N'DEMO - Belleza', N'DEMO - Crema hidratante', N'Crema para hidratar el rostro.', N'DEMO+Crema', N'DEMO-BEL01-50', 79.00, 20, N'PRE', N'50 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Crema hidratante', N'Crema para hidratar el rostro.', N'DEMO+Crema', N'DEMO-BEL01-100', 119.00, 14, N'PRE', N'100 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Crema hidratante', N'Crema para hidratar el rostro.', N'DEMO+Crema', N'DEMO-BEL01-200', 169.00, 7, N'PRE', N'200 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Serum facial', N'Serum ligero para rutina de noche.', N'DEMO+Serum', N'DEMO-BEL02-30', 149.00, 16, N'PRE', N'30 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Serum facial', N'Serum ligero para rutina de noche.', N'DEMO+Serum', N'DEMO-BEL02-50', 199.00, 11, N'PRE', N'50 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Serum facial', N'Serum ligero para rutina de noche.', N'DEMO+Serum', N'DEMO-BEL02-100', 279.00, 5, N'PRE', N'100 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Labial mate', N'Labial de acabado mate.', N'DEMO+Labial', N'DEMO-BEL03-ROJ', 55.00, 22, N'COL', N'Rojo', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Labial mate', N'Labial de acabado mate.', N'DEMO+Labial', N'DEMO-BEL03-NUD', 55.00, 18, N'COL', N'Nude', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Labial mate', N'Labial de acabado mate.', N'DEMO+Labial', N'DEMO-BEL03-VIN', 59.00, 9, N'COL', N'Vino', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Shampoo nutritivo', N'Shampoo para cabello seco.', N'DEMO+Shampoo', N'DEMO-BEL04-250', 49.00, 30, N'PRE', N'250 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Shampoo nutritivo', N'Shampoo para cabello seco.', N'DEMO+Shampoo', N'DEMO-BEL04-400', 69.00, 18, N'PRE', N'400 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Shampoo nutritivo', N'Shampoo para cabello seco.', N'DEMO+Shampoo', N'DEMO-BEL04-750', 99.00, 10, N'PRE', N'750 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Perfume citrico', N'Fragancia fresca para uso diario.', N'DEMO+Perfume', N'DEMO-BEL05-30', 189.00, 12, N'PRE', N'30 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Perfume citrico', N'Fragancia fresca para uso diario.', N'DEMO+Perfume', N'DEMO-BEL05-50', 259.00, 8, N'PRE', N'50 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Perfume citrico', N'Fragancia fresca para uso diario.', N'DEMO+Perfume', N'DEMO-BEL05-100', 399.00, 4, N'PRE', N'100 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Protector solar', N'Protector para rostro y cuerpo.', N'DEMO+Protector+solar', N'DEMO-BEL06-50-F30', 89.00, 18, N'PRE', N'50 ml', N'MOD', N'FPS 30'),
    (N'DEMO - Belleza', N'DEMO - Protector solar', N'Protector para rostro y cuerpo.', N'DEMO+Protector+solar', N'DEMO-BEL06-50-F50', 109.00, 14, N'PRE', N'50 ml', N'MOD', N'FPS 50'),
    (N'DEMO - Belleza', N'DEMO - Protector solar', N'Protector para rostro y cuerpo.', N'DEMO+Protector+solar', N'DEMO-BEL06-100-F50', 149.00, 8, N'PRE', N'100 ml', N'MOD', N'FPS 50'),
    (N'DEMO - Belleza', N'DEMO - Mascarilla capilar', N'Mascarilla para reparar el cabello.', N'DEMO+Mascarilla', N'DEMO-BEL07-200', 69.00, 16, N'PRE', N'200 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Mascarilla capilar', N'Mascarilla para reparar el cabello.', N'DEMO+Mascarilla', N'DEMO-BEL07-300', 89.00, 12, N'PRE', N'300 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Mascarilla capilar', N'Mascarilla para reparar el cabello.', N'DEMO+Mascarilla', N'DEMO-BEL07-500', 119.00, 6, N'PRE', N'500 ml', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Esmalte de unas', N'Esmalte de secado rapido.', N'DEMO+Esmalte', N'DEMO-BEL08-ROJ', 29.00, 32, N'COL', N'Rojo', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Esmalte de unas', N'Esmalte de secado rapido.', N'DEMO+Esmalte', N'DEMO-BEL08-NEG', 29.00, 24, N'COL', N'Negro', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Esmalte de unas', N'Esmalte de secado rapido.', N'DEMO+Esmalte', N'DEMO-BEL08-NUD', 32.00, 15, N'COL', N'Nude', NULL, NULL),
    (N'DEMO - Belleza', N'DEMO - Gel de ducha', N'Gel para ducha de uso diario.', N'DEMO+Gel+ducha', N'DEMO-BEL09-250-VER', 35.00, 26, N'PRE', N'250 ml', N'COL', N'Verde'),
    (N'DEMO - Belleza', N'DEMO - Gel de ducha', N'Gel para ducha de uso diario.', N'DEMO+Gel+ducha', N'DEMO-BEL09-400-AZU', 49.00, 18, N'PRE', N'400 ml', N'COL', N'Azul'),
    (N'DEMO - Belleza', N'DEMO - Gel de ducha', N'Gel para ducha de uso diario.', N'DEMO+Gel+ducha', N'DEMO-BEL09-750-BLA', 69.00, 10, N'PRE', N'750 ml', N'COL', N'Blanco'),
    (N'DEMO - Belleza', N'DEMO - Base de maquillaje', N'Base liquida de cobertura media.', N'DEMO+Base', N'DEMO-BEL10-CLA-30', 99.00, 12, N'COL', N'Claro', N'PRE', N'30 ml'),
    (N'DEMO - Belleza', N'DEMO - Base de maquillaje', N'Base liquida de cobertura media.', N'DEMO+Base', N'DEMO-BEL10-MED-30', 99.00, 14, N'COL', N'Medio', N'PRE', N'30 ml'),
    (N'DEMO - Belleza', N'DEMO - Base de maquillaje', N'Base liquida de cobertura media.', N'DEMO+Base', N'DEMO-BEL10-OSC-30', 99.00, 8, N'COL', N'Oscuro', N'PRE', N'30 ml');

  IF (SELECT COUNT(DISTINCT Categoria) FROM @Catalogo) <> 5
    THROW 51018, N'La semilla extra debe incluir 5 categorias.', 1;

  IF (SELECT COUNT(DISTINCT Producto) FROM @Catalogo) <> 50
    THROW 51019, N'La semilla extra debe incluir 50 productos.', 1;

  IF (SELECT COUNT(*) FROM @Catalogo) <> 150
    THROW 51020, N'La semilla extra debe incluir 150 variantes.', 1;

  IF EXISTS (
    SELECT Producto
    FROM @Catalogo
    GROUP BY Producto
    HAVING COUNT(*) < 2
  )
    THROW 51021, N'Cada producto de la semilla extra debe tener varias variantes.', 1;

  INSERT INTO dbo.Categoria (Nombre)
  SELECT DISTINCT c.Categoria
  FROM @Catalogo AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Categoria AS existente WHERE existente.Nombre = c.Categoria
  );

  INSERT INTO dbo.Atributo (Nombre)
  SELECT a.Nombre
  FROM @Atributos AS a
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Atributo AS existente WHERE existente.Nombre = a.Nombre
  );

  INSERT INTO dbo.Producto (IDCategoria, Nombre, Descripcion)
  SELECT cat.IDCategoria, datos.Producto, datos.Descripcion
  FROM (
    SELECT DISTINCT Categoria, Producto, Descripcion
    FROM @Catalogo
  ) AS datos
  INNER JOIN dbo.Categoria AS cat ON cat.Nombre = datos.Categoria
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Producto AS existente WHERE existente.Nombre = datos.Producto
  );

  INSERT INTO dbo.ProductoImagen (IDProducto, Url, Orden)
  SELECT p.IDProducto, N'https://placehold.co/600x600?text=' + datos.Imagen, 0
  FROM (
    SELECT DISTINCT Producto, Imagen
    FROM @Catalogo
  ) AS datos
  INNER JOIN dbo.Producto AS p ON p.Nombre = datos.Producto
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.ProductoImagen AS existente
    WHERE existente.IDProducto = p.IDProducto
      AND existente.Url = N'https://placehold.co/600x600?text=' + datos.Imagen
  );

  INSERT INTO dbo.Variante (IDProducto, SKU, Precio, ExistenciaFisica)
  SELECT p.IDProducto, c.SKU, c.Precio, c.Existencia
  FROM @Catalogo AS c
  INNER JOIN dbo.Producto AS p ON p.Nombre = c.Producto
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Variante AS existente WHERE existente.SKU = c.SKU
  );

  INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
  SELECT v.IDVariante, atributo.IDAtributo, c.Valor1
  FROM @Catalogo AS c
  INNER JOIN dbo.Variante AS v ON v.SKU = c.SKU
  INNER JOIN @Atributos AS codigo ON codigo.Codigo = c.Atributo1
  INNER JOIN dbo.Atributo AS atributo ON atributo.Nombre = codigo.Nombre
  WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.VarianteAtributo AS existente
    WHERE existente.IDVariante = v.IDVariante
      AND existente.IDAtributo = atributo.IDAtributo
  );

  INSERT INTO dbo.VarianteAtributo (IDVariante, IDAtributo, Valor)
  SELECT v.IDVariante, atributo.IDAtributo, c.Valor2
  FROM @Catalogo AS c
  INNER JOIN dbo.Variante AS v ON v.SKU = c.SKU
  INNER JOIN @Atributos AS codigo ON codigo.Codigo = c.Atributo2
  INNER JOIN dbo.Atributo AS atributo ON atributo.Nombre = codigo.Nombre
  WHERE c.Atributo2 IS NOT NULL
    AND c.Valor2 IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.VarianteAtributo AS existente
      WHERE existente.IDVariante = v.IDVariante
        AND existente.IDAtributo = atributo.IDAtributo
    );

  DECLARE @IDUsuarioAdmin INT = (
    SELECT TOP (1) u.IDUsuario
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE r.Nombre = N'Administrador'
      AND u.Activo = 1
    ORDER BY u.IDUsuario
  );

  IF @IDUsuarioAdmin IS NULL
    THROW 51014, N'No hay un Administrador activo. Ejecute 010_Semillas.sql antes de esta semilla.', 1;

  DECLARE @IDEntrada INT = (
    SELECT IDTipoMovimiento
    FROM dbo.TipoMovimiento
    WHERE Nombre = N'ENTRADA'
      AND Signo = 1
  );

  IF @IDEntrada IS NULL
    THROW 51016, N'Falta el tipo de movimiento ENTRADA. Ejecute 010_Semillas.sql.', 1;

  UPDATE v
  SET ExistenciaFisica = c.Existencia
  FROM dbo.Variante AS v
  INNER JOIN @Catalogo AS c ON c.SKU = v.SKU
  WHERE v.ExistenciaFisica = 0
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.MovimientoInventario AS movimiento
      WHERE movimiento.IDVariante = v.IDVariante
    );

  INSERT INTO dbo.MovimientoInventario (
    IDVariante, IDTipoMovimiento, Cantidad, ExistenciaResultante, IDUsuario, Motivo
  )
  SELECT
    v.IDVariante,
    @IDEntrada,
    v.ExistenciaFisica,
    v.ExistenciaFisica,
    @IDUsuarioAdmin,
    N'Entrada inicial de la semilla extra de catalogo.'
  FROM dbo.Variante AS v
  INNER JOIN @Catalogo AS c ON c.SKU = v.SKU
  WHERE v.ExistenciaFisica > 0
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.MovimientoInventario AS movimiento
      WHERE movimiento.IDVariante = v.IDVariante
    );

  COMMIT TRANSACTION;

  SELECT
    (SELECT COUNT(DISTINCT c.Categoria) FROM @Catalogo AS c INNER JOIN dbo.Categoria AS cat ON cat.Nombre = c.Categoria) AS CategoriasExtra,
    (SELECT COUNT(DISTINCT p.IDProducto) FROM dbo.Producto AS p INNER JOIN @Catalogo AS c ON c.Producto = p.Nombre) AS ProductosSemilla,
    (SELECT COUNT(*) FROM dbo.Variante AS v INNER JOIN @Catalogo AS c ON c.SKU = v.SKU) AS VariantesSemilla;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH
GO
