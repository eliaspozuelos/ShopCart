/* ============================================================
   101_SP_Usuarios.sql
   Gestion de usuarios (RF-01): crear Operadores/Administradores,
   listar con paginacion y activar/desactivar sin borrar.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   SP_Usuarios_CrearAdministradorInicial
   SOLO para la instalacion (script de semillas). Funciona unicamente
   si todavia no existe ningun Administrador. En 800_Permisos se le
   niega EXECUTE al login que usa la API, de modo que la aplicacion
   normal no puede invocarlo.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_CrearAdministradorInicial
    @Correo          NVARCHAR(256),
    @ContrasenaHash  NVARCHAR(255),
    @Nombre          NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @IDRol INT = (SELECT IDRol FROM dbo.Rol WHERE Nombre = N'Administrador');
        IF @IDRol IS NULL
        BEGIN
            THROW 50190, N'Configuracion incompleta: no existe el rol Administrador. Ejecute 010_Semillas.sql.', 1;
        END

        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM dbo.Usuario WITH (UPDLOCK, HOLDLOCK) WHERE IDRol = @IDRol)
        BEGIN
            THROW 50121, N'Ya existe un Administrador; el usuario inicial solo se crea en una instalacion nueva.', 1;
        END

        IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE Correo = @Correo)
        BEGIN
            THROW 50101, N'El correo ya esta registrado.', 1;
        END

        INSERT INTO dbo.Usuario (IDRol, Correo, ContrasenaHash, Nombre)
        VALUES (@IDRol, @Correo, @ContrasenaHash, @Nombre);

        DECLARE @IDNuevo INT = SCOPE_IDENTITY();

        INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
        VALUES (@IDNuevo, N'USUARIOS', N'Usuario', @IDNuevo, N'CREAR',
                (SELECT @Correo AS Correo, @Nombre AS Nombre, N'Administrador' AS Rol
                 FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

        COMMIT TRANSACTION;

        SELECT @IDNuevo AS IDUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50101, N'El correo ya esta registrado.', 1;

        THROW;
    END CATCH
END
GO

/* ------------------------------------------------------------
   SP_Usuarios_CrearInterno
   Un Administrador activo crea Operadores u otros Administradores.
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_CrearInterno
    @IDUsuarioActor         INT,
    @Correo          NVARCHAR(256),
    @ContrasenaHash  NVARCHAR(255),
    @Nombre          NVARCHAR(100),
    @NombreRol       NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @NombreRol IS NULL OR @NombreRol NOT IN (N'Operador', N'Administrador')
        BEGIN
            THROW 50120, N'Solo se pueden crear usuarios con rol Operador o Administrador.', 1;
        END

        DECLARE @IDRol INT = (SELECT IDRol FROM dbo.Rol WHERE Nombre = @NombreRol);
        IF @IDRol IS NULL
        BEGIN
            THROW 50190, N'Configuracion incompleta: falta el rol solicitado. Ejecute 010_Semillas.sql.', 1;
        END

        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1
                       FROM dbo.Usuario AS u
                       INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
                       WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador')
        BEGIN
            THROW 50121, N'Solo un Administrador activo puede crear usuarios.', 1;
        END

        IF EXISTS (SELECT 1 FROM dbo.Usuario WHERE Correo = @Correo)
        BEGIN
            THROW 50101, N'El correo ya esta registrado.', 1;
        END

        INSERT INTO dbo.Usuario (IDRol, Correo, ContrasenaHash, Nombre)
        VALUES (@IDRol, @Correo, @ContrasenaHash, @Nombre);

        DECLARE @IDNuevo INT = SCOPE_IDENTITY();

        -- Bitacora: nunca se guarda el hash
        INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorNuevo)
        VALUES (@IDUsuarioActor, N'USUARIOS', N'Usuario', @IDNuevo, N'CREAR',
                (SELECT @Correo AS Correo, @Nombre AS Nombre, @NombreRol AS Rol
                 FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));

        COMMIT TRANSACTION;

        SELECT @IDNuevo AS IDUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

        IF ERROR_NUMBER() IN (2601, 2627)
            THROW 50101, N'El correo ya esta registrado.', 1;

        THROW;
    END CATCH
END
GO

/* ------------------------------------------------------------
   SP_Usuarios_Listar
   Solo para Administradores. Paginacion y filtros en el servidor.
   Devuelve dos resultados: total y pagina .
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_Listar
    @IDUsuarioActor       INT,
    @Pagina        INT = 1,
    @TamanoPagina  INT = 20,
    @Buscar        NVARCHAR(100) = NULL,
    @NombreRol     NVARCHAR(30)  = NULL,
    @Activo        BIT           = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1
                   FROM dbo.Usuario AS u
                   INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
                   WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador')
    BEGIN
        THROW 50121, N'Solo un Administrador activo puede listar usuarios.', 1;
    END

    -- NULL no cumple ninguna comparacion, por eso se trata de forma explicita
    IF @Pagina IS NULL OR @Pagina < 1 SET @Pagina = 1;
    IF @TamanoPagina IS NULL OR @TamanoPagina < 1 SET @TamanoPagina = 20;
    IF @TamanoPagina > 100 SET @TamanoPagina = 100;

    -- Resultado 1: total (siempre una fila)
    SELECT COUNT(*) AS TotalRegistros
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE (@Buscar IS NULL OR CHARINDEX(@Buscar, u.Nombre) > 0 OR CHARINDEX(@Buscar, u.Correo) > 0)
      AND (@NombreRol IS NULL OR r.Nombre = @NombreRol)
      AND (@Activo IS NULL OR u.Activo = @Activo)
    OPTION (RECOMPILE);

    -- Resultado 2: la pagina (mismos filtros que el total)
    SELECT u.IDUsuario,
           u.Correo,
           u.Nombre,
           r.Nombre AS Rol,
           u.Activo,
           u.FechaCreacion
    FROM dbo.Usuario AS u
    INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
    WHERE (@Buscar IS NULL OR CHARINDEX(@Buscar, u.Nombre) > 0 OR CHARINDEX(@Buscar, u.Correo) > 0)
      AND (@NombreRol IS NULL OR r.Nombre = @NombreRol)
      AND (@Activo IS NULL OR u.Activo = @Activo)
    ORDER BY u.Nombre, u.IDUsuario
    OFFSET (@Pagina - 1) * @TamanoPagina ROWS
    FETCH NEXT @TamanoPagina ROWS ONLY
    OPTION (RECOMPILE);   -- filtros opcionales: evita reutilizar un plan malo
END
GO

/* ------------------------------------------------------------
   SP_Usuarios_CambiarEstado
   Activa o desactiva (nunca borra) un usuario. Al desactivar,
   revoca todas sus sesiones. 
   ------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.SP_Usuarios_CambiarEstado
    @IDUsuarioActor    INT,
    @IDUsuario  INT,
    @Activo     BIT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @Activo IS NULL
        BEGIN
            THROW 50124, N'Debe indicar el estado deseado (activo o inactivo).', 1;
        END

        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1
                       FROM dbo.Usuario AS u
                       INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
                       WHERE u.IDUsuario = @IDUsuarioActor AND u.Activo = 1 AND r.Nombre = N'Administrador')
        BEGIN
            THROW 50121, N'Solo un Administrador activo puede cambiar el estado de un usuario.', 1;
        END

        DECLARE @ActivoActual BIT;

        SELECT @ActivoActual = Activo
        FROM dbo.Usuario WITH (UPDLOCK, HOLDLOCK)
        WHERE IDUsuario = @IDUsuario;

        IF @ActivoActual IS NULL
        BEGIN
            THROW 50122, N'El usuario no existe.', 1;
        END

        IF @Activo = 0 AND @IDUsuarioActor = @IDUsuario
        BEGIN
            THROW 50123, N'No puede desactivar su propia cuenta.', 1;
        END

        -- Nunca dejar el sistema sin un Administrador activo. El bloqueo de rango
        -- serializa dos desactivaciones cruzadas (A desactiva a B mientras B desactiva a A).
        IF @Activo = 0 AND @ActivoActual = 1
           AND EXISTS (SELECT 1
                       FROM dbo.Usuario AS u
                       INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
                       WHERE u.IDUsuario = @IDUsuario AND r.Nombre = N'Administrador')
        BEGIN
            IF NOT EXISTS (SELECT 1
                           FROM dbo.Usuario AS u WITH (UPDLOCK, HOLDLOCK)
                           INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
                           WHERE r.Nombre = N'Administrador' AND u.Activo = 1 AND u.IDUsuario <> @IDUsuario)
            BEGIN
                THROW 50125, N'No se puede desactivar al ultimo Administrador activo.', 1;
            END
        END

        IF @ActivoActual <> @Activo
        BEGIN
            UPDATE dbo.Usuario
            SET Activo = @Activo
            WHERE IDUsuario = @IDUsuario;

            IF @Activo = 0
            BEGIN
                UPDATE dbo.RefreshToken
                SET RevocadoEn = SYSUTCDATETIME()
                WHERE IDUsuario = @IDUsuario AND RevocadoEn IS NULL;
            END

            INSERT INTO dbo.Bitacora (IDUsuario, Modulo, Entidad, IDEntidad, Accion, ValorAnterior, ValorNuevo)
            VALUES (@IDUsuarioActor, N'USUARIOS', N'Usuario', @IDUsuario,
                    CASE WHEN @Activo = 0 THEN N'DESACTIVAR' ELSE N'MODIFICAR' END,
                    (SELECT @ActivoActual AS Activo FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
                    (SELECT @Activo       AS Activo FOR JSON PATH, WITHOUT_ARRAY_WRAPPER));
        END

        COMMIT TRANSACTION;

        SELECT IDUsuario, Activo FROM dbo.Usuario WHERE IDUsuario = @IDUsuario;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
