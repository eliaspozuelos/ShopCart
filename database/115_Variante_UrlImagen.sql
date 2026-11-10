/* ------------------------------------------------------------
   Foto propia de cada variante.
   Si UrlImagen es NULL, la ficha sigue usando ProductoImagen.
   ------------------------------------------------------------ */
IF COL_LENGTH(N'dbo.Variante', N'UrlImagen') IS NULL
  ALTER TABLE dbo.Variante ADD UrlImagen NVARCHAR(500) NULL;
