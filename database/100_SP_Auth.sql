/* ============================================================
   100_SP_Auth.sql
   Modulo de autenticacion (RF-01)

   El hash de la contrasena y el hash del refresh token los
   calcula el backend: la base nunca ve contrasenas ni tokens
   en claro.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   SP_Auth_RegistrarCliente
   Crea un usuario con rol Cliente y devuelve su IDUsuario.
   Un solo INSERT es atomico por si mismo, no necesita BEGIN TRAN.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_RegistrarCliente
    @Correo          NVARCHAR(256),
    @ContrasenaHash  NVARCHAR(255),
    @Nombre          NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @IDRol INT = (SELECT IDRol FROM dbo.Rol WHERE Nombre = N'Cliente');

        IF @IDRol IS NULL
        BEGIN
            THROW 50190, N'Configuracion incompleta: no existe el rol Cliente. Ejecute 010_Semillas.sql.', 1;
        END

        IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE Correo = @Correo)
        BEGIN
            THROW 50101, N'El correo ya esta registrado.', 1;
        END

        INSERT INTO dbo.Usuario (IDRol, Correo, ContrasenaHash, Nombre)
        VALUES (@IDRol, @Correo, @ContrasenaHash, @Nombre);

        SELECT SCOPE_IDENTITY() AS IDUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

        -- Dos registros simultaneos con el mismo correo: gana uno, el otro
        -- cae en la restriccion UNIQUE y se reporta con el mismo error de negocio.
        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50101, N'El correo ya esta registrado.', 1;

        THROW;
    END CATCH
END
GO

/* ------------------------------------------------------------
   SP_Auth_ObtenerUsuarioPorCorreo
   Para el login: devuelve el hash para que Node compare la
   contrasena. Si no existe, devuelve cero filas.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_ObtenerUsuarioPorCorreo
    @Correo NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT u.IDUsuario,
           u.Correo,
           u.ContrasenaHash,
           u.Nombre,
           r.Nombre AS Rol,
           u.Activo
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.Correo = @Correo;
END
GO

/* ------------------------------------------------------------
   SP_Auth_ObtenerUsuarioPorID
   Datos del usuario sin el hash de contrasena.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_ObtenerUsuarioPorID
    @IDUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT u.IDUsuario,
           u.Correo,
           u.Nombre,
           r.Nombre AS Rol,
           u.Activo
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE u.IDUsuario = @IDUsuario;
END
GO

/* ------------------------------------------------------------
   SP_Auth_CrearSesion
   Se llama despues de un login correcto. Abre una "familia"
   nueva de refresh tokens y guarda el primer token (solo su hash).
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_CrearSesion
    @IDUsuario  INT,
    @TokenHash  CHAR(64),
    @ExpiraEn   DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        -- Node  valida, pero la base no confia en el llamador.
        IF LEN(@TokenHash) <> 64 OR @TokenHash LIKE N'%[^0-9a-fA-F]%'
        BEGIN
            THROW 50110, N'El hash del token no tiene el formato esperado (64 caracteres hexadecimales).', 1;
        END

        IF @ExpiraEn <= SYSUTCDATETIME()
        BEGIN
            THROW 50110, N'La fecha de expiracion debe estar en el futuro.', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE IDUsuario = @IDUsuario AND Activo = 1)
        BEGIN
            THROW 50114, N'El usuario esta inactivo.', 1;
        END

        BEGIN TRANSACTION;

        INSERT INTO dbo.RefreshToken (IDUsuario, TokenHash, IDFamilia, ExpiraEn)
        VALUES (@IDUsuario, @TokenHash, NEWID(), @ExpiraEn);

        INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
        VALUES (@IDUsuario, N'AUTH', N'Usuario', @IDUsuario, N'INICIAR_SESION',
                N'{"evento":"inicio_sesion"}');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/* ------------------------------------------------------------
   SP_Auth_RotarRefreshToken
   Cada refresh token se usa UNA sola vez: al usarlo se revoca y
   se emite uno nuevo de la misma familia.
   Si llega un token ya usado, alguien lo esta reutilizando
   (posible robo): se revoca toda la familia.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_RotarRefreshToken
    @TokenHashActual  CHAR(64),
    @TokenHashNuevo   CHAR(64),
    @ExpiraEn         DATETIME2(0)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF LEN(@TokenHashActual) <> 64 OR @TokenHashActual LIKE N'%[^0-9a-fA-F]%'
           OR LEN(@TokenHashNuevo) <> 64 OR @TokenHashNuevo LIKE N'%[^0-9a-fA-F]%'
        BEGIN
            THROW 50110, N'El hash del token no tiene el formato esperado (64 caracteres hexadecimales).', 1;
        END

        IF @ExpiraEn <= SYSUTCDATETIME()
        BEGIN
            THROW 50110, N'La fecha de expiracion debe estar en el futuro.', 1;
        END

        BEGIN TRANSACTION;

        DECLARE @IDToken    INT,
                @IDUsuario  INT,
                @IDFamilia  UNIQUEIDENTIFIER,
                @Expira     DATETIME2(0),
                @Revocado   DATETIME2(0),
                @Ahora      DATETIME2(0) = SYSUTCDATETIME();

        -- UPDLOCK + HOLDLOCK: si llegan dos peticiones con el mismo token,
        -- se atienden una detras de otra.
        SELECT @IDToken   = IDRefreshToken,
               @IDUsuario = IDUsuario,
               @IDFamilia = IDFamilia,
               @Expira    = ExpiraEn,
               @Revocado  = RevocadoEn
        FROM dbo.RefreshToken WITH (UPDLOCK, HOLDLOCK)
        WHERE TokenHash = @TokenHashActual;

        IF @IDToken IS NULL
        BEGIN
            THROW 50111, N'Refresh token invalido.', 1;
        END

        -- Token ya usadoo se revoca toda la familia y se confirma ANTES de fallar.
        IF @Revocado IS NOT NULL
        BEGIN
            UPDATE dbo.RefreshToken
            SET RevocadoEn = @Ahora
            WHERE IDFamilia = @IDFamilia AND RevocadoEn IS NULL;

            INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
            VALUES (@IDUsuario, N'AUTH', N'Usuario', @IDUsuario, N'TOKEN_REUTILIZADO',
                    N'{"evento":"token_reutilizado","sesionRevocada":true}');

            COMMIT TRANSACTION;
            THROW 50112, N'Refresh token reutilizado. La sesion fue revocada.', 1;
        END

        IF @Expira <= @Ahora
        BEGIN
            THROW 50113, N'Refresh token expirado.', 1;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.Usuario WHERE IDUsuario = @IDUsuario AND Activo = 1)
        BEGIN
            UPDATE dbo.RefreshToken
            SET RevocadoEn = @Ahora
            WHERE IDFamilia = @IDFamilia AND RevocadoEn IS NULL;

            COMMIT TRANSACTION;
            THROW 50114, N'El usuario esta inactivo.', 1;
        END

        INSERT INTO dbo.RefreshToken (IDUsuario, TokenHash, IDFamilia, ExpiraEn)
        VALUES (@IDUsuario, @TokenHashNuevo, @IDFamilia, @ExpiraEn);

        UPDATE dbo.RefreshToken
        SET RevocadoEn = @Ahora,
            IDReemplazadoPor = SCOPE_IDENTITY()
        WHERE IDRefreshToken = @IDToken;

        INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
        VALUES (@IDUsuario, N'AUTH', N'Usuario', @IDUsuario, N'RENOVAR_SESION',
                N'{"evento":"renovacion_sesion"}');

        COMMIT TRANSACTION;

        -- Datos para que Node emita el nuevo access token
        SELECT u.IDUsuario, u.Correo, u.Nombre, r.Nombre AS Rol
        FROM dbo.Usuario AS u
        INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
        WHERE u.IDUsuario = @IDUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

/* ------------------------------------------------------------
   SP_Auth_CerrarSesion
   Logout: revoca toda la familia del token recibido.
   Es idempotente: si el token no existe, no falla.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Auth_CerrarSesion
    @TokenHash CHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @IDUsuario INT,
                @SesionesRevocadas INT;

        SELECT @IDUsuario = IDUsuario
        FROM dbo.RefreshToken
        WHERE TokenHash = @TokenHash;

        UPDATE rt
        SET rt.RevocadoEn = SYSUTCDATETIME()
        FROM dbo.RefreshToken AS rt
        WHERE rt.RevocadoEn IS NULL
          AND rt.IDFamilia = (SELECT IDFamilia FROM dbo.RefreshToken WHERE TokenHash = @TokenHash);

        SET @SesionesRevocadas = @@ROWCOUNT;

        IF @SesionesRevocadas > 0 AND @IDUsuario IS NOT NULL
        BEGIN
            INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
            VALUES (@IDUsuario, N'AUTH', N'Usuario', @IDUsuario, N'CERRAR_SESION',
                    N'{"evento":"cierre_sesion"}');
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
