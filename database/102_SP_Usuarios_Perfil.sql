/* ============================================================
   102_SP_Usuarios_Perfil.sql
   Consulta y actualiza perfiles de usuario. Las operaciones
   administrativas requieren un Administrador activo.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   SP_Usuarios_ObtenerPerfil
   Devuelve el perfil de la cuenta autenticada.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_ObtenerPerfil
  @IDUsuarioActor INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE IDUsuario = @IDUsuarioActor AND Activo = 1)
  BEGIN
    IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE IDUsuario = @IDUsuarioActor)
      THROW 50114, N'El usuario esta inactivo.', 1;

    THROW 50122, N'El usuario no existe.', 1;
  END

  SELECT IDUsuario, Correo, Nombre
  FROM dbo.Usuario
  WHERE IDUsuario = @IDUsuarioActor;
END;
GO

/* ------------------------------------------------------------
   SP_Usuarios_ActualizarPerfil
   Actualiza los datos del perfil propio y registra el cambio.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_ActualizarPerfil
  @IDUsuarioActor INT,
  @Nombre NVARCHAR(100) = NULL,
  @Correo NVARCHAR(256) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF @Nombre IS NULL AND @Correo IS NULL
    THROW 50126, N'Debe indicar al menos un dato del perfil.', 1;

  IF (@Nombre IS NOT NULL AND NULLIF(LTRIM(RTRIM(@Nombre)), N'') IS NULL)
     OR (@Correo IS NOT NULL AND NULLIF(LTRIM(RTRIM(@Correo)), N'') IS NULL)
    THROW 50126, N'Los datos del perfil no pueden estar vacios.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (
      SELECT 1
      FROM dbo.Usuario WITH (UPDLOCK, HOLDLOCK)
      WHERE IDUsuario = @IDUsuarioActor AND Activo = 1
    )
    BEGIN
      IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE IDUsuario = @IDUsuarioActor)
        THROW 50114, N'El usuario esta inactivo.', 1;

      THROW 50122, N'El usuario no existe.', 1;
    END

    DECLARE @ValorAnterior NVARCHAR(MAX);
    SELECT @ValorAnterior = (
      SELECT Correo, Nombre
      FROM dbo.Usuario
      WHERE IDUsuario = @IDUsuarioActor
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.Usuario
    SET Nombre = COALESCE(@Nombre, Nombre),
        Correo = COALESCE(@Correo, Correo)
    WHERE IDUsuario = @IDUsuarioActor;

    DECLARE @ValorNuevo NVARCHAR(MAX);
    SELECT @ValorNuevo = (
      SELECT Correo, Nombre
      FROM dbo.Usuario
      WHERE IDUsuario = @IDUsuarioActor
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'USUARIOS', N'Usuario', @IDUsuarioActor, N'MODIFICAR', @ValorAnterior, @ValorNuevo);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50101, N'El correo ya esta registrado.', 1;

    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Usuarios_ActualizarPerfilAdmin
   Permite a un Administrador actualizar el perfil de otro usuario.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_ActualizarPerfilAdmin
  @IDUsuarioActor INT,
  @IDUsuario INT,
  @Nombre NVARCHAR(100) = NULL,
  @Correo NVARCHAR(256) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF @Nombre IS NULL AND @Correo IS NULL
    THROW 50126, N'Debe indicar al menos un dato del perfil.', 1;

  IF (@Nombre IS NOT NULL AND NULLIF(LTRIM(RTRIM(@Nombre)), N'') IS NULL)
     OR (@Correo IS NOT NULL AND NULLIF(LTRIM(RTRIM(@Correo)), N'') IS NULL)
    THROW 50126, N'Los datos del perfil no pueden estar vacios.', 1;

  BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (
      SELECT 1
      FROM dbo.Usuario AS u WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
      WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
    )
      THROW 50121, N'Solo un Administrador activo puede modificar otros perfiles.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Usuario WITH (UPDLOCK, HOLDLOCK) WHERE IDUsuario = @IDUsuario)
      THROW 50122, N'El usuario no existe.', 1;

    DECLARE @ValorAnterior NVARCHAR(MAX);
    SELECT @ValorAnterior = (
      SELECT Correo, Nombre
      FROM dbo.Usuario
      WHERE IDUsuario = @IDUsuario
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.Usuario
    SET Nombre = COALESCE(@Nombre, Nombre),
        Correo = COALESCE(@Correo, Correo)
    WHERE IDUsuario = @IDUsuario;

    DECLARE @ValorNuevo NVARCHAR(MAX);
    SELECT @ValorNuevo = (
      SELECT Correo, Nombre
      FROM dbo.Usuario
      WHERE IDUsuario = @IDUsuario
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'USUARIOS', N'Usuario', @IDUsuario, N'MODIFICAR', @ValorAnterior, @ValorNuevo);

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

    IF ERROR_NUMBER() IN (2601, 2627)
      THROW 50101, N'El correo ya esta registrado.', 1;

    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Usuarios_ObtenerDetalle
   Devuelve el perfil y las direcciones de un usuario para un Administrador.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_ObtenerDetalle
  @IDUsuarioActor INT,
  @IDUsuario INT
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador'
  )
    THROW 50121, N'Solo un Administrador activo puede consultar el detalle de usuarios.', 1;

  IF NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE IDUsuario = @IDUsuario)
    THROW 50122, N'El usuario no existe.', 1;

  SELECT u.IDUsuario, u.Correo, u.Nombre, r.Nombre AS Rol, u.Activo, u.FechaCreacion
  FROM dbo.Usuario AS u
  INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
  WHERE u.IDUsuario = @IDUsuario;

  SELECT IDDireccion, Alias, Linea1, Linea2, Municipio, Departamento, Telefono
  FROM dbo.Direccion
  WHERE IDUsuario = @IDUsuario AND Activa = 1
  ORDER BY IDDireccion;
END;
GO
