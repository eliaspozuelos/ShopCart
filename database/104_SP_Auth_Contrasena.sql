/* ============================================================
   104_SP_Auth_Contrasena.sql
   Consulta los datos de autenticacion y permite cambiar la
   contrasena, revocando las sesiones activas.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   SP_Auth_ObtenerCredencialesPorID
   Devuelve hash y estado de la cuenta para validar el acceso.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_ObtenerCredencialesPorID
  @IDUsuario INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT IDUsuario, ContrasenaHash, Activo
  FROM dbo.Usuario
  WHERE IDUsuario = @IDUsuario;
END;
GO

/* ------------------------------------------------------------
   SP_Auth_CambiarContrasena
   Cambia el hash y revoca las sesiones activas del usuario.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_CambiarContrasena
  @IDUsuarioActor INT,
  @ContrasenaHash NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NULLIF(@ContrasenaHash, N'') IS NULL
    THROW 50128, N'Debe indicar la nueva contrasena.', 1;

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

    UPDATE dbo.Usuario
    SET ContrasenaHash = @ContrasenaHash
    WHERE IDUsuario = @IDUsuarioActor AND Activo = 1;

    -- Obliga a iniciar sesión nuevamente en los demás dispositivos.
    UPDATE dbo.RefreshToken
    SET RevocadoEn = SYSUTCDATETIME()
    WHERE IDUsuario = @IDUsuarioActor AND RevocadoEn IS NULL;

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
    VALUES (
      @IDUsuarioActor,
      N'AUTH',
      N'Usuario',
      @IDUsuarioActor,
      N'MODIFICAR',
      N'{"CambioContrasena":true}'
    );

    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO
