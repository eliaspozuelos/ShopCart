/* ============================================================
   103_SP_Direcciones.sql
   Lista, crea y actualiza las direcciones del usuario autenticado.
   Las modificaciones quedan registradas en la bitacora.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   SP_Direcciones_ListarPorUsuario
   Lista las direcciones activas del usuario autenticado.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Direcciones_ListarPorUsuario
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

  SELECT IDDireccion, Alias, Linea1, Linea2, Municipio, Departamento, Telefono
  FROM dbo.Direccion
  WHERE IDUsuario = @IDUsuarioActor AND Activa = 1
  ORDER BY IDDireccion;
END;
GO

/* ------------------------------------------------------------
   SP_Direcciones_CrearPropia
   Crea una direccion para el usuario autenticado y audita el cambio.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Direcciones_CrearPropia
  @IDUsuarioActor INT,
  @Alias NVARCHAR(50),
  @Linea1 NVARCHAR(200),
  @Linea2 NVARCHAR(200) = NULL,
  @Municipio NVARCHAR(100),
  @Departamento NVARCHAR(100),
  @Telefono NVARCHAR(20)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

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

    INSERT INTO dbo.Direccion (
      IDUsuario,
      Alias,
      Linea1,
      Linea2,
      Municipio,
      Departamento,
      Telefono
    )
    VALUES (
      @IDUsuarioActor,
      @Alias,
      @Linea1,
      @Linea2,
      @Municipio,
      @Departamento,
      @Telefono
    );

    DECLARE @IDDireccion INT = CONVERT(INT, SCOPE_IDENTITY());
    DECLARE @ValorNuevo NVARCHAR(MAX);
    SELECT @ValorNuevo = (
      SELECT Alias, Linea1, Linea2, Municipio, Departamento, Telefono
      FROM dbo.Direccion
      WHERE IDDireccion = @IDDireccion
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
    VALUES (@IDUsuarioActor, N'USUARIOS', N'Direccion', @IDDireccion, N'CREAR', @ValorNuevo);

    COMMIT TRANSACTION;

    SELECT IDDireccion, Alias, Linea1, Linea2, Municipio, Departamento, Telefono
    FROM dbo.Direccion
    WHERE IDDireccion = @IDDireccion;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO

/* ------------------------------------------------------------
   SP_Direcciones_ActualizarPropia
   Actualiza una direccion activa que pertenece al usuario autenticado.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Direcciones_ActualizarPropia
  @IDUsuarioActor INT,
  @IDDireccion INT,
  @Alias NVARCHAR(50),
  @Linea1 NVARCHAR(200),
  @Linea2 NVARCHAR(200) = NULL,
  @Municipio NVARCHAR(100),
  @Departamento NVARCHAR(100),
  @Telefono NVARCHAR(20)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

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

    IF NOT EXISTS (
      SELECT 1
      FROM dbo.Direccion WITH (UPDLOCK, HOLDLOCK)
      WHERE IDDireccion = @IDDireccion AND IDUsuario = @IDUsuarioActor AND Activa = 1
    )
      THROW 50127, N'La direccion activa no existe.', 1;

    DECLARE @ValorAnterior NVARCHAR(MAX);
    SELECT @ValorAnterior = (
      SELECT Alias, Linea1, Linea2, Municipio, Departamento, Telefono
      FROM dbo.Direccion
      WHERE IDDireccion = @IDDireccion AND IDUsuario = @IDUsuarioActor
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    UPDATE dbo.Direccion
    SET Alias = @Alias,
        Linea1 = @Linea1,
        Linea2 = @Linea2,
        Municipio = @Municipio,
        Departamento = @Departamento,
        Telefono = @Telefono
    WHERE IDDireccion = @IDDireccion AND IDUsuario = @IDUsuarioActor AND Activa = 1;

    DECLARE @ValorNuevo NVARCHAR(MAX);
    SELECT @ValorNuevo = (
      SELECT Alias, Linea1, Linea2, Municipio, Departamento, Telefono
      FROM dbo.Direccion
      WHERE IDDireccion = @IDDireccion AND IDUsuario = @IDUsuarioActor
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    );

    INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
    VALUES (@IDUsuarioActor, N'USUARIOS', N'Direccion', @IDDireccion, N'MODIFICAR', @ValorAnterior, @ValorNuevo);

    COMMIT TRANSACTION;

    SELECT IDDireccion, Alias, Linea1, Linea2, Municipio, Departamento, Telefono
    FROM dbo.Direccion
    WHERE IDDireccion = @IDDireccion AND IDUsuario = @IDUsuarioActor;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END;
GO
