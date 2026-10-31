/* ============================================================
   105_SP_Configuracion.sql
   Consulta y administracion de parametros generales del sistema.
   ============================================================ */
USE ShopCart;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Configuracion_ObtenerMoneda
AS
BEGIN
  SET NOCOUNT ON;

  SELECT Clave, Valor
  FROM dbo.Configuracion
  WHERE Clave IN (N'MONEDA', N'SIMBOLO_MONEDA');
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Configuracion_Listar
  @IDUsuarioActor INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor
      AND u.Activo = 1
      AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede consultar la configuracion.', 1;

  SELECT Clave, Valor, Descripcion
  FROM dbo.Configuracion
  ORDER BY Clave;
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Configuracion_Crear
  @IDUsuarioActor INT,
  @Clave NVARCHAR(50),
  @Valor NVARCHAR(100),
  @Descripcion NVARCHAR(200) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor
      AND u.Activo = 1
      AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar la configuracion.', 1;

  IF NULLIF(LTRIM(RTRIM(@Clave)), N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(@Valor)), N'') IS NULL
    THROW 50146, N'La clave y el valor de configuracion son requeridos.', 1;

  IF EXISTS (SELECT 1 FROM dbo.Configuracion WHERE Clave = LTRIM(RTRIM(@Clave)))
    THROW 50160, N'La clave de configuracion ya existe.', 1;

  INSERT INTO dbo.Configuracion (Clave, Valor, Descripcion)
  VALUES (LTRIM(RTRIM(@Clave)), LTRIM(RTRIM(@Valor)), NULLIF(LTRIM(RTRIM(@Descripcion)), N''));

  SELECT Clave, Valor, Descripcion
  FROM dbo.Configuracion
  WHERE Clave = LTRIM(RTRIM(@Clave));
END;
GO

CREATE OR ALTER PROCEDURE dbo.SP_Configuracion_Actualizar
  @IDUsuarioActor INT,
  @Clave NVARCHAR(50),
  @Valor NVARCHAR(100),
  @Descripcion NVARCHAR(200) = NULL,
  @ActualizarDescripcion BIT = 0
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor
      AND u.Activo = 1
      AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede administrar la configuracion.', 1;

  IF NULLIF(LTRIM(RTRIM(@Clave)), N'') IS NULL
     OR NULLIF(LTRIM(RTRIM(@Valor)), N'') IS NULL
    THROW 50146, N'La clave y el valor de configuracion son requeridos.', 1;

  IF NOT EXISTS (SELECT 1 FROM dbo.Configuracion WHERE Clave = LTRIM(RTRIM(@Clave)))
    THROW 50161, N'La configuracion solicitada no existe.', 1;

  UPDATE dbo.Configuracion
  SET Valor = LTRIM(RTRIM(@Valor)),
      Descripcion = CASE WHEN @ActualizarDescripcion = 1
        THEN NULLIF(LTRIM(RTRIM(@Descripcion)), N'')
        ELSE Descripcion
      END
  WHERE Clave = LTRIM(RTRIM(@Clave));

  SELECT Clave, Valor, Descripcion
  FROM dbo.Configuracion
  WHERE Clave = LTRIM(RTRIM(@Clave));
END;
GO

